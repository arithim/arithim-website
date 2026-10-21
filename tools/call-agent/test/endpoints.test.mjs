import test from "node:test";
import assert from "node:assert/strict";
import { makeDb, seedCall, anthropicSse, mockFetch } from "./helpers.mjs";
import { onRequestPost as start } from "../../../functions/api/call/start.js";
import { onRequestPost as webhook, BANNER, cleanupOld } from "../../../functions/api/call/webhook.js";
import { onRequestGet as summaryGet, onRequestPost as summaryPost } from "../../../functions/api/call/summary.js";
import { signElevenLabs } from "../../../functions/_lib/hmac.js";

const ID = "c".repeat(32);
const startReq = (body, headers = {}) => new Request("https://arithim.com/api/call/start", { method: "POST", headers: { origin: "https://arithim.com", "cf-connecting-ip": "203.0.113.5", ...headers }, body: JSON.stringify(body) });

test("start: mock mode returns the documented contract and creates a row", async () => {
  const db = makeDb(); const env = { CALLS_DB: db, CALL_MOCK: "1" };
  const res = await start({ request: startReq({ mode: "voice" }), env });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.mock, true);
  assert.match(j.callId, /^[0-9a-f]{32}$/);
  assert.ok(j.conversationToken);
  assert.equal(j.agent.name, "Hannah");
  assert.equal(j.agents[j.agent.id], "Hannah");
  assert.deepEqual(j.dynamicVariables, { call_id: j.callId });
  const row = await db.prepare("SELECT * FROM calls").first();
  assert.equal(row.call_id, j.callId); assert.equal(row.reserved_minutes, 15); assert.notEqual(row.ip_key, "203.0.113.5");
});

test("start: calls off 503, wrong origin 403, bad mode 400, Turnstile failure 403", async () => {
  const off = makeDb({ enabled: false });
  assert.equal((await start({ request: startReq({ mode: "voice" }), env: { CALLS_DB: off, CALL_MOCK: "1" } })).status, 503);
  const db = makeDb(); const env = { CALLS_DB: db, CALL_MOCK: "1" };
  assert.equal((await start({ request: startReq({ mode: "voice" }, { origin: "https://evil.example" }), env })).status, 403);
  assert.equal((await start({ request: startReq({ mode: "fax" }), env })).status, 400);
  const m = mockFetch([], { other: async () => new Response(JSON.stringify({ success: false }), { status: 200 }) });
  try { assert.equal((await start({ request: startReq({ mode: "voice", turnstileToken: "t" }), env: { ...env, TURNSTILE_SECRET: "x" } })).status, 403); } finally { m.restore(); }
});

test("start: Turnstile must be action call-start on arithim.com", async () => {
  const db = makeDb(); const env = { CALLS_DB: db, CALL_MOCK: "1", TURNSTILE_SECRET: "x" };
  let m = mockFetch([], { other: async () => new Response(JSON.stringify({ success: true, action: "contact-form", hostname: "arithim.com" })) });
  try { assert.equal((await start({ request: startReq({ mode: "voice", turnstileToken: "t" }), env })).status, 403); } finally { m.restore(); }
  m = mockFetch([], { other: async () => new Response(JSON.stringify({ success: true, action: "call-start", hostname: "arithim.com" })) });
  try { assert.equal((await start({ request: startReq({ mode: "voice", turnstileToken: "t" }), env })).status, 200); } finally { m.restore(); }
});

test("start: third call from one IP gets 429; budget refusals release earlier reservations", async () => {
  const db = makeDb(); const env = { CALLS_DB: db, CALL_MOCK: "1" };
  assert.equal((await start({ request: startReq({ mode: "voice" }), env })).status, 200);
  assert.equal((await start({ request: startReq({ mode: "voice" }), env })).status, 200);
  assert.equal((await start({ request: startReq({ mode: "voice" }), env })).status, 429);
  // concurrency: two active already, a different IP is refused and its reservations are rolled back
  const r = await start({ request: startReq({ mode: "voice" }, { "cf-connecting-ip": "198.51.100.7" }), env });
  assert.equal(r.status, 429);
  const g = await db.prepare("SELECT reserved_minutes AS r FROM budgets").first();
  assert.equal(g.r, 30);
});

test("start: real mode calls the ElevenLabs token endpoint and stores the conversation id", async () => {
  const db = makeDb(); const env = { CALLS_DB: db, ELEVENLABS_API_KEY: "xi", TURNSTILE_SECRET: "x" };
  const m = mockFetch([], { other: async (u) => u.includes("turnstile")
    ? new Response(JSON.stringify({ success: true, action: "call-start", hostname: "arithim.com" }))
    : new Response(JSON.stringify({ token: "tok_1", conversation_id: "conv_77" })) });
  try {
    const j = await (await start({ request: startReq({ mode: "text", turnstileToken: "t" }), env })).json();
    assert.equal(j.conversationToken, "tok_1"); assert.equal(j.agent.id, "agent_prod"); assert.ok(!j.mock);
    const el = m.calls.find((c) => c.url.includes("elevenlabs"));
    assert.match(el.url, /agent_id=agent_prod/); assert.equal(el.init.headers["xi-api-key"], "xi");
    assert.equal((await db.prepare("SELECT el_conversation_id AS c FROM calls").first()).c, "conv_77");
  } finally { m.restore(); }
});

test("start: ElevenLabs token failure -> 502 and budgets rolled back", async () => {
  const db = makeDb(); const env = { CALLS_DB: db, ELEVENLABS_API_KEY: "xi", TURNSTILE_SECRET: "x" };
  const m = mockFetch([], { other: async (u) => u.includes("turnstile") ? new Response(JSON.stringify({ success: true, action: "call-start", hostname: "arithim.com" })) : new Response("no", { status: 500 }) });
  try {
    assert.equal((await start({ request: startReq({ mode: "voice", turnstileToken: "t" }), env })).status, 502);
    assert.equal((await db.prepare("SELECT reserved_minutes AS r FROM budgets").first()).r, 0);
    assert.equal((await db.prepare("SELECT status FROM calls").first()).status, "failed");
  } finally { m.restore(); }
});

// ---- webhook ----
async function hook(env, payload, { secret = "whsec", t } = {}) {
  const raw = JSON.stringify(payload);
  const sig = await signElevenLabs(raw, secret, t);
  return webhook({ request: new Request("https://x/api/call/webhook", { method: "POST", headers: { "elevenlabs-signature": sig }, body: raw }), env, waitUntil: (p) => p });
}
const payload = (over = {}) => ({
  type: "post_call_transcription", event_timestamp: 1,
  data: { conversation_id: "conv_1", metadata: { call_duration_secs: 200 }, transcript: [
    { role: "agent", message: "Hello, Hannah here.", time_in_call_secs: 0 },
    { role: "user", message: "I need to change bank details <script>alert(1)</script>", time_in_call_secs: 3 },
    { role: "agent", message: "We guarantee that. It is £100.", time_in_call_secs: 6 },
  ], conversation_initiation_client_data: { dynamic_variables: { call_id: ID } }, ...over },
});

test("webhook: rejects bad signature and stale timestamps", async () => {
  const db = makeDb(); const env = { CALLS_DB: db, CALL_WEBHOOK_SECRET: "whsec" };
  assert.equal((await hook(env, payload(), { secret: "wrong" })).status, 401);
  assert.equal((await hook(env, payload(), { t: Math.floor(Date.now() / 1000) - 4000 })).status, 401);
});

test("webhook: finalises once, releases budget, one email with fixed subject, banner, escaping, flag", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID, el_conversation_id: "conv_1", ip_key: "ipX" });
  await db.prepare("INSERT INTO budgets (day, reserved_minutes) VALUES (?, 15)").bind(new Date().toISOString().slice(0, 10)).run();
  await db.prepare("INSERT INTO ip_budgets (ip_key, day, calls, minutes) VALUES ('ipX', ?, 1, 15)").bind(new Date().toISOString().slice(0, 10)).run();
  await db.prepare("INSERT INTO messages VALUES ('ARC-261021-ABCD', ?, 'billing_query', ?, 1)").bind(ID, JSON.stringify({ name: "Evil <b>Name</b>", summary: "[FLAG] bank change" })).run();
  const env = { CALLS_DB: db, CALL_WEBHOOK_SECRET: "whsec", RESEND_API_KEY: "re", TO_EMAIL: "tarun@example.com", CALL_FROM_EMAIL: "calls@mail.example.com" };
  const m = mockFetch([], { other: async () => new Response("{}", { status: 200 }) });
  try {
    assert.equal((await hook(env, payload())).status, 200);
    assert.equal((await hook(env, payload())).status, 200); // duplicate delivery
    const sent = m.calls.filter((c) => c.url.includes("resend"));
    assert.equal(sent.length, 1);
    const mail = sent[0].body;
    assert.equal(mail.subject, "[Call] billing_query ARC-261021-ABCD [FLAG]");
    assert.equal(mail.from, "calls@mail.example.com");
    assert.ok(mail.text.startsWith(BANNER));
    assert.ok(mail.html.includes(BANNER));
    assert.ok(!mail.html.includes("<script>")); assert.ok(!mail.html.includes("<b>Name"));
    assert.ok(!mail.subject.includes("bank"));
    const c = await db.prepare("SELECT status, used_minutes, email_sent FROM calls").first();
    assert.equal(c.status, "ended"); assert.equal(c.used_minutes, 3.4); assert.equal(c.email_sent, 1);
    const g = await db.prepare("SELECT reserved_minutes AS r, used_minutes AS u FROM budgets").first();
    assert.ok(Math.abs(g.r - 3.4) < 1e-9); assert.ok(Math.abs(g.u - 3.4) < 1e-9);
  } finally { m.restore(); }
});

test("webhook: non-billing, unflagged call has no banner and no FLAG; email failure -> 500 then retry sends only the email", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID, el_conversation_id: "conv_1" });
  const env = { CALLS_DB: db, CALL_WEBHOOK_SECRET: "whsec", RESEND_API_KEY: "re", TO_EMAIL: "t@example.com", CALL_FROM_EMAIL: "c@m.example.com" };
  const clean = payload(); clean.data.transcript = [{ role: "agent", message: "Hello.", time_in_call_secs: 0 }];
  let ok = false;
  const m = mockFetch([], { other: async () => new Response("{}", { status: ok ? 200 : 500 }) });
  try {
    assert.equal((await hook(env, clean)).status, 500);
    ok = true;
    assert.equal((await hook(env, clean)).status, 200);
    const sent = m.calls.filter((c) => c.url.includes("resend"));
    assert.equal(sent.length, 2);
    assert.equal(sent[1].body.subject, "[Call] no-message no-ref");
    assert.ok(!sent[1].body.text.includes(BANNER));
    assert.equal((await db.prepare("SELECT used_minutes AS u FROM calls").first()).u, 3.4);
    const g = await db.prepare("SELECT COUNT(*) AS n FROM budgets").first();
    assert.ok(g.n >= 0);
  } finally { m.restore(); }
});

test("webhook: audio events ignored, unknown calls acknowledged", async () => {
  const db = makeDb(); const env = { CALLS_DB: db, CALL_WEBHOOK_SECRET: "whsec" };
  assert.equal((await (await hook(env, { type: "post_call_audio", data: { conversation_id: "x", full_audio: "AAA" } })).json()).ignored, true);
  assert.equal((await hook(env, payload())).status, 200);
});

test("cleanup deletes rows older than 90 days", async () => {
  const db = makeDb(); const now = 1_800_000_000;
  await seedCall(db, { call_id: "d".repeat(32), created_at: now - 91 * 86400 });
  await seedCall(db, { call_id: "e".repeat(32), created_at: now - 10 * 86400 });
  for (const id of ["d", "e"]) {
    await db.prepare("INSERT INTO turns VALUES (?,1,'front-desk','caller','x',1)").bind(id.repeat(32)).run();
    await db.prepare("INSERT INTO messages VALUES (?, ?, 'other', '{}', ?)").bind("ARC-" + id, id.repeat(32), id === "d" ? now - 91 * 86400 : now - 86400).run();
  }
  await cleanupOld(db, now);
  for (const t of ["calls", "turns", "messages"]) assert.equal((await db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n, 1, t);
});

// ---- summary ----
test("summary: generated once, filtered, refs appended; second GET returns stored; helpful flag", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID });
  for (const [i, s, t] of [[1, "caller", "I need automation"], [2, "agent", "Sure."]]) await db.prepare("INSERT INTO turns VALUES (?,?,?,?,?,1)").bind(ID, i, "front-desk", s, t).run();
  await db.prepare("INSERT INTO messages VALUES ('ARC-261021-ZZZZ', ?, 'enquiry', '{}', 1)").bind(ID).run();
  const env = { CALLS_DB: db, ANTHROPIC_API_KEY: "k" };
  const m = mockFetch([new Response(JSON.stringify({ content: [{ type: "text", text: "You asked about automation. It would cost £500. A person will reply within one working day." }] }), { status: 200 })]);
  try {
    const url = `https://arithim.com/api/call/summary?callId=${ID}`;
    const r1 = await summaryGet({ request: new Request(url), env });
    const j1 = await r1.json();
    assert.equal(r1.status, 200);
    assert.ok(!j1.summary.includes("£")); assert.match(j1.summary, /ARC-261021-ZZZZ/);
    assert.deepEqual(j1.references, ["ARC-261021-ZZZZ"]);
    const r2 = await summaryGet({ request: new Request(url), env });
    assert.equal((await r2.json()).summary, j1.summary);
    assert.equal(m.calls.length, 1);
  } finally { m.restore(); }
  const p = await summaryPost({ request: new Request("https://x", { method: "POST", headers: { origin: "https://arithim.com" }, body: JSON.stringify({ callId: ID, helpful: true }) }), env });
  assert.equal((await p.json()).ok, true);
  assert.equal((await db.prepare("SELECT helpful FROM calls").first()).helpful, 1);
});

test("summary: bad id 400, unknown 404, concurrent generation gets 202, no-turn call gets the fixed text", async () => {
  const db = makeDb(); const env = { CALLS_DB: db };
  assert.equal((await summaryGet({ request: new Request("https://x/api/call/summary?callId=zz"), env })).status, 400);
  assert.equal((await summaryGet({ request: new Request(`https://x/api/call/summary?callId=${ID}`), env })).status, 404);
  await seedCall(db, { call_id: ID });
  await db.prepare("UPDATE calls SET summary_started = ?").bind(Math.floor(Date.now() / 1000)).run();
  assert.equal((await summaryGet({ request: new Request(`https://x/api/call/summary?callId=${ID}`), env })).status, 202);
  await db.prepare("UPDATE calls SET summary_started = NULL").run();
  const r = await summaryGet({ request: new Request(`https://x/api/call/summary?callId=${ID}`), env });
  assert.match((await r.json()).summary, /no written summary/);
});

test("start: no CALLS_DB -> mock on preview hosts, 503 on production", async () => {
  const req = (host) => new Request(`https://${host}/api/call/start`, { method: "POST", headers: { origin: `https://${host}`, "cf-connecting-ip": "203.0.113.9" }, body: JSON.stringify({ mode: "voice" }) });
  const prev = await start({ request: req("call-us.arithim.pages.dev"), env: {} });
  assert.equal(prev.status, 200);
  const j = await prev.json();
  assert.equal(j.mock, true);
  assert.ok(j.callId && j.conversationToken);
  for (const h of ["arithim.com", "www.arithim.com"]) {
    const r = await start({ request: req(h), env: {} });
    assert.equal(r.status, 503);
    assert.equal((await r.json()).fallback, "form");
  }
  // a cross-origin caller to a preview host is still refused
  const bad = new Request("https://call-us.arithim.pages.dev/api/call/start", { method: "POST", headers: { origin: "https://evil.example" }, body: JSON.stringify({ mode: "voice" }) });
  assert.equal((await start({ request: bad, env: {} })).status, 403);
});
