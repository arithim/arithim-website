#!/usr/bin/env node
// Visual regression check for style refactors. Loads every page from two copies of the site
// (A = before, B = after) in headless Chrome, and compares the computed style and box of every
// element, in document order, at two widths. A difference is real only if B's value matches none of three loads of A. Exit code 1 if any real difference remains.
//
//   node tools/style_diff.mjs --a /path/to/before --b /path/to/after [--pages index.html,about.html] [--widths 1440,390] [--max 8] [--samples 3] [--skip main,a.tsg-skip]
//
// Needs Google Chrome on macOS or CHROME_PATH, and Node 22 or later (global WebSocket). No npm packages.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, readdir, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
if (!args.a || !args.b) { console.error('usage: style_diff.mjs --a <dirA> --b <dirB> [--pages x.html,y.html] [--widths 1440,390] [--max 8] [--samples 3] [--skip main,a.tsg-skip]'); process.exit(2); }
const WIDTHS = (args.widths || '1440,390').split(',').map(Number);
const MAX_SHOW = Number(args.max || 8);
const SAMPLES = Number(args.samples || 3);
// Timer and SMIL animations nudge numbers a little between loads; treat small numeric changes as equal.
const close = (u, v) => { if (u === v) return true; const a = parseFloat(u), b = parseFloat(v); return Number.isFinite(a) && Number.isFinite(b) && String(u).replace(/[-0-9.e+ px%]/g, '') === String(v).replace(/[-0-9.e+ px%]/g, '') && Math.abs(a - b) <= Math.max(1.5, 0.03 * Math.abs(a)); };
const boxClose = (u, v) => u.length === v.length && u.every((n, i) => Math.abs(n - v[i]) <= 3);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

function serve(root, port) {
  const base = resolve(root);
  const srv = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(base, p);
    if (!file.startsWith(base) || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}

class CDP {
  constructor(url) { this.id = 0; this.cb = new Map(); this.waiters = []; this.ws = new WebSocket(url); this.ready = new Promise((ok) => (this.ws.onopen = ok));
    this.ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && this.cb.has(d.id)) { this.cb.get(d.id)(d); this.cb.delete(d.id); } else if (d.method) this.waiters = this.waiters.filter((w) => !(w.method === d.method && w.sessionId === d.sessionId && (w.ok(d), true))); }; }
  send(method, params = {}, sessionId) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params, sessionId })); return new Promise((ok, no) => this.cb.set(id, (d) => (d.error ? no(new Error(method + ': ' + d.error.message)) : ok(d.result)))); }
  once(method, sessionId, ms = 30000) { return new Promise((ok, no) => { const t = setTimeout(() => no(new Error('timeout ' + method)), ms); this.waiters.push({ method, sessionId, ok: (d) => { clearTimeout(t); ok(d); } }); }); }
}

const SKIP = JSON.stringify(args.skip || '');
const COLLECT = `(async () => {
  const SKIP = ${SKIP};
  try { await document.fonts.ready; } catch (e) {}
  const out = []; let i = 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT','STYLE','NOSCRIPT','TEMPLATE'].includes(el.tagName)) continue;
    if (SKIP && el.matches(SKIP)) continue;
    const cs = getComputedStyle(el); const s = {};
    for (const p of cs) s[p] = cs.getPropertyValue(p);
    const r = el.getBoundingClientRect();
    out.push({ i: i++, tag: el.tagName.toLowerCase(), t: (el.childNodes[0] && el.childNodes[0].nodeType === 3 ? el.childNodes[0].textContent.trim().slice(0, 28) : ''), box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], s });
  }
  return JSON.stringify(out);
})()`;

const NO_ANIM = `window.setInterval = () => 0; document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.documentElement.appendChild(s); });`;

async function load(cdp, url, width) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: NO_ANIM }, sessionId);
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  await loaded;
  await new Promise((r) => setTimeout(r, 1800));
  const r = await cdp.send('Runtime.evaluate', { expression: COLLECT, awaitPromise: true, returnByValue: true }, sessionId);
  await cdp.send('Target.closeTarget', { targetId });
  return JSON.parse(r.result.value);
}

// Compare B against several loads of A. A value counts as different only if it matches none of
// the A loads, so states that cycle on a timer (tabs, carousels) do not show up as differences.
function diff(As, y) {
  const out = []; const x = As[0]; const n = Math.min(x.length, y.length);
  if (x.length !== y.length) out.push({ k: 'count', msg: `element count ${x.length} vs ${y.length}` });
  for (let i = 0; i < n; i++) {
    const b = y[i];
    if (As.some((a) => a[i] && a[i].tag !== b.tag) && !As.some((a) => a[i] && a[i].tag === b.tag)) { out.push({ k: `tag:${i}`, msg: `#${i} tag ${x[i].tag} vs ${b.tag}` }); continue; }
    if (!As.some((a) => a[i] && boxClose(a[i].box, b.box))) out.push({ k: `box:${i}`, msg: `#${i} <${b.tag}> "${b.t}" box ${x[i].box} vs ${b.box}` });
    for (const p of Object.keys(b.s)) if (!p.startsWith('--') && !As.some((a) => a[i] && close(a[i].s[p], b.s[p]))) out.push({ k: `${i}:${p}`, msg: `#${i} <${b.tag}> "${b.t}" ${p}: ${x[i].s[p]} vs ${b.s[p]}` });
  }
  return out;
}

const pagesFor = async (dir) => (await readdir(dir)).filter((f) => f.endsWith('.html') && f !== '404.html').sort();
const pages = args.pages ? args.pages.split(',') : await pagesFor(args.a);

const sA = await serve(args.a, 8241), sB = await serve(args.b, 8242);
const udd = await mkdtemp(join(tmpdir(), 'sd-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${udd}`, '--remote-debugging-port=9411', 'about:blank'], { stdio: 'ignore' });
let ver; for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch('http://127.0.0.1:9411/json/version')).json(); } catch { await new Promise((r) => setTimeout(r, 200)); } }
const cdp = new CDP(ver.webSocketDebuggerUrl); await cdp.ready;

let bad = 0;
for (const page of pages) for (const w of WIDTHS) {
  const As = [];
  for (let k = 0; k < SAMPLES; k++) As.push(await load(cdp, `http://127.0.0.1:8241/${page}`, w));
  const b = await load(cdp, `http://127.0.0.1:8242/${page}`, w);
  const real = diff(As, b);
  const tag = real.length ? 'DIFF' : 'same';
  console.log(`${tag}  ${page} @${w}  (${As[0].length} elements, ${real.length} differences)`);
  real.slice(0, MAX_SHOW).forEach((d) => console.log('      ' + d.msg));
  if (real.length) bad++;
}
chrome.kill(); sA.close(); sB.close();
console.log(bad ? `\n${bad} page/width combinations differ` : '\nAll pages match.');
process.exit(bad ? 1 : 0);
