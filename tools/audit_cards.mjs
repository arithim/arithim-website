#!/usr/bin/env node
// Card consistency audit. Loads every page in headless Chrome and lists boxes that look like cards (a border, rounded corners and a
// background, inside <main>) but do not carry the shared card behaviour (data-fx-glow="card": the lift, the amber edge and the pointer glow
// that arithim-fx.js adds). Exit code 1 if any are found, so a new kind of box cannot ship looking different.
//
//   node tools/audit_cards.mjs [--pages index.html,products.html] [--width 1280] [--allow selector,selector]
//
// Needs Google Chrome (macOS path or CHROME_PATH) and Node 22 or later. No npm packages.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, readdir, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = Number(args.width || 1280);
const ALLOW = (args.allow || '').split(',').filter(Boolean);
const CHROME = process.env.CHROME_PATH || (existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const PORT = 8251, DEBUG = 9421;

const srv = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(await readFile(f));
});
await new Promise((ok) => srv.listen(PORT, '127.0.0.1', ok));
const udd = await mkdtemp(join(tmpdir(), 'ac-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${udd}`, `--remote-debugging-port=${DEBUG}`, 'about:blank'], { stdio: 'ignore' });
let ver; for (let i = 0; i < 60 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${DEBUG}/json/version`)).json(); } catch { await new Promise((r) => setTimeout(r, 200)); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((ok) => (ws.onopen = ok));
let id = 0; const cb = new Map(); const waiters = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && cb.has(d.id)) { cb.get(d.id)(d); cb.delete(d.id); } else if (d.method) { const i = waiters.findIndex((w) => w.method === d.method && w.sessionId === d.sessionId); if (i >= 0) waiters.splice(i, 1)[0].ok(d); } };
const send = (method, params = {}, sessionId) => new Promise((ok, no) => { const n = ++id; cb.set(n, (d) => (d.error ? no(new Error(method + ': ' + d.error.message)) : ok(d.result))); ws.send(JSON.stringify({ id: n, method, params, sessionId })); });
const once = (method, sessionId) => new Promise((ok, no) => { const t = setTimeout(() => no(new Error('timeout ' + method)), 30000); waiters.push({ method, sessionId, ok: (d) => { clearTimeout(t); ok(d); } }); });

const CHECK = `(async () => {
  await new Promise(r => setTimeout(r, 1800));
  const ALLOW = ${JSON.stringify(ALLOW)};
  const out = [];
  for (const el of document.querySelectorAll('main *')) {
    if (el.classList.contains('ah-fx-glow')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' || cs.display === 'contents' || cs.display === 'none') continue;
    const r = parseFloat(cs.borderTopLeftRadius);
    if (!(r >= 8 && r < 60) || !(parseFloat(cs.borderTopWidth) > 0) || cs.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
    const b = el.getBoundingClientRect();
    if (b.width < 120 || b.height < 48) continue;
    if (el.closest('header, footer, nav, figure, summary, details, [data-pm-scene], [data-home-scene], [data-sf-scene], [data-tsg-scene], .tsg-fig, canvas') || el.matches('button, input, select, textarea, label, .tsg-faq *')) continue;
    if (ALLOW.some(s => el.matches(s))) continue;
    if (el.getAttribute('data-fx-glow') === 'card') { if (!/transform|all/.test(cs.transitionProperty)) out.push('no shared lift: ' + el.tagName.toLowerCase() + '.' + [...el.classList].join('.')); continue; }
    out.push((el.tagName.toLowerCase() + '.' + [...el.classList].join('.')).slice(0, 90) + '  ' + Math.round(b.width) + 'x' + Math.round(b.height));
  }
  return JSON.stringify(out);
})()`;

// Buttons: every .ah-btn-ring must use the shared inner markup, so no page can carry its own copy of the button.
let bad = 0;
for (const f of (await readdir(ROOT)).filter((n) => n.endsWith('.html'))) {
  const html = await readFile(join(ROOT, f), 'utf8');
  for (const m of html.matchAll(/class="ah-btn-ring"[^>]*>\s*<span class="([^"]+)"><\/span>\s*<span class="([^"]+)"/g)) {
    if (m[1] !== 'ah-ring-spin' || !/^ah-btn-face( ah-btn-face-sm)?$/.test(m[2])) { bad++; console.log(`DIFF  ${f}  button uses its own classes: ${m[1]} / ${m[2]}`); }
  }
}

const pages = args.pages ? args.pages.split(',') : (await readdir(ROOT)).filter((f) => f.endsWith('.html') && f !== '404.html').sort();
for (const page of pages) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  const loaded = once('Page.loadEventFired', sessionId);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${page}` }, sessionId); await loaded;
  const r = await send('Runtime.evaluate', { expression: CHECK, awaitPromise: true, returnByValue: true }, sessionId);
  const list = [...new Set(JSON.parse(r.result.value))];
  // Hover probe: point at the first card of each kind and confirm it lifts.
  const kinds = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => { const seen = new Set(), out = []; for (const el of document.querySelectorAll('main [data-fx-glow="card"]')) { const k = [...el.classList].filter(c => !c.startsWith('ah-fx')).join('.'); if (seen.has(k)) continue; seen.add(k); out.push(k); } return JSON.stringify(out); })()` }, sessionId);
  for (const k of JSON.parse(kinds.result.value)) {
    const sel = `[...document.querySelectorAll('main [data-fx-glow="card"]')].find(e => [...e.classList].filter(c => !c.startsWith('ah-fx')).join('.') === ${JSON.stringify(k)})`;
    await send('Runtime.evaluate', { expression: `(() => { document.documentElement.style.scrollBehavior = 'auto'; ${sel}.scrollIntoView({ block: 'center', behavior: 'instant' }); })()` }, sessionId);
    await new Promise((r) => setTimeout(r, 250));
    const pos = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => { const b = ${sel}.getBoundingClientRect(); return JSON.stringify([b.left + b.width / 2, b.top + Math.min(b.height / 2, 40)]); })()` }, sessionId);
    const [x, y] = JSON.parse(pos.result.value);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 }, sessionId);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId);
    await new Promise((r) => setTimeout(r, 450));
    const t = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => { const el = document.querySelector('main [data-fx-glow="card"]:hover'); return el ? getComputedStyle(el).transform : 'nothing under the pointer'; })()` }, sessionId);
    if (t.result.value === 'none' || t.result.value === 'nothing under the pointer') list.push('does not lift on hover: .' + k + ' (' + t.result.value + ')');
  }
  await send('Target.closeTarget', { targetId });
  if (list.length) { bad++; console.log(`DIFF  ${page}  (${list.length} boxes without the shared card behaviour)`); list.slice(0, 8).forEach((l) => console.log('      ' + l)); } else console.log(`same  ${page}`);
}
chrome.kill(); srv.close();
console.log(bad ? `\n${bad} pages have boxes that do not use the shared card behaviour` : '\nEvery card-like box uses the shared card behaviour.');
process.exit(bad ? 1 : 0);
