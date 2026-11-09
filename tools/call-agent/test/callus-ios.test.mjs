import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Runs the iOS audio tracker block of assets/callus.js (between the ios-tracker markers) against a fake window.
const src = readFileSync(new URL("../../../assets/callus.js", import.meta.url), "utf8");
const block = src.slice(src.indexOf("/* ios-tracker:start */"), src.indexOf("/* ios-tracker:end */"));

class FakeCtx {
  constructor(opts) { this.state = "suspended"; this.sampleRate = (opts && opts.sampleRate) || 48000; this.l = []; this.resumed = 0; FakeCtx.all.push(this); }
  addEventListener(n, f) { if (n === "statechange") this.l.push(f); }
  resume() { this.resumed++; return Promise.resolve(); }
  set(st) { this.state = st; this.l.forEach((f) => f()); }
}
FakeCtx.all = [];

function make(ua, platform, touch) {
  FakeCtx.all = [];
  const events = [];
  const docL = {};
  const win = { navigator: { userAgent: ua, platform }, AudioContext: FakeCtx };
  const doc = { addEventListener: (n, f) => { (docL[n] ||= []).push(f); }, removeEventListener: (n, f) => { docL[n] = (docL[n] || []).filter((x) => x !== f); } };
  if (touch) doc.ontouchend = null;
  const ctx = vm.createContext({ window: win, document: doc, tr: (c, d) => events.push([c, d]), Promise });
  vm.runInContext(block + "; this.api = { PLAT, AC, acInstall, acUninstall, acResumeAll, acStates, acAdd };", ctx);
  return { api: ctx.api, win, events, docL };
}
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CRIOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
const DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

test("platform flags: iPhone Safari and Chrome on iOS are iOS + WebKit mobile; desktop Safari is neither", () => {
  assert.equal(JSON.stringify(make(IPHONE, "iPhone").api.PLAT), '{"isIOS":true,"isWebKitMobile":true}');
  assert.equal(JSON.stringify(make(CRIOS, "iPhone").api.PLAT), '{"isIOS":true,"isWebKitMobile":true}');
  assert.equal(JSON.stringify(make(DESKTOP, "MacIntel").api.PLAT), '{"isIOS":false,"isWebKitMobile":false}');
  assert.equal(make(DESKTOP, "MacIntel", true).api.PLAT.isIOS, true); // iPadOS in desktop mode
});

test("tracker: not installed off iOS", () => {
  const m = make(DESKTOP, "MacIntel");
  m.api.acInstall();
  assert.equal(m.win.AudioContext, FakeCtx);
});

test("tracker: wraps AudioContext, records creation, resumes on suspended and interrupted, restores on uninstall", () => {
  const m = make(IPHONE, "iPhone");
  m.api.acInstall();
  assert.notEqual(m.win.AudioContext, FakeCtx);
  const c = new m.win.AudioContext({ sampleRate: 16000 });
  assert.ok(c instanceof FakeCtx);
  assert.equal(c.sampleRate, 16000);
  assert.equal(m.api.acStates().join(), "sdk:suspended");
  assert.ok(m.events.some((e) => e[0] === "ac_new" && e[1] === "sdk:suspended:16000"));
  c.set("running"); assert.equal(c.resumed, 0);
  c.set("interrupted"); assert.equal(c.resumed, 1);
  c.set("running"); c.set("suspended"); assert.equal(c.resumed, 2);
  assert.ok(m.events.some((e) => e[0] === "ac_state" && e[1] === "sdk:interrupted"));
  // a tap resumes anything not running, regardless of the retry cap
  c.state = "suspended"; m.docL.click.forEach((f) => f());
  assert.equal(c.resumed, 3);
  m.api.acUninstall();
  assert.equal(m.win.AudioContext, FakeCtx);
  assert.equal(m.docL.click.length, 0);
});

test("tracker: automatic resumes are capped so a suspend loop cannot spin", () => {
  const m = make(IPHONE, "iPhone");
  m.api.acInstall();
  const c = new m.win.AudioContext();
  for (let i = 0; i < 30; i++) c.set(i % 2 ? "suspended" : "interrupted");
  assert.ok(c.resumed <= 8, "resumed " + c.resumed);
});

test("callus.js wires recovery and diag fields", () => {
  for (const needle of ["recoverInput", "recovery_try", "recovery_worked", "recovery_failed", "preloadSdk", "obj.acs", "wkm: PLAT.isWebKitMobile", "changeInputDevice"]) {
    assert.ok(src.includes(needle), needle);
  }
});
