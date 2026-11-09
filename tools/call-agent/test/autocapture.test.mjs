import test from "node:test";
import assert from "node:assert/strict";
import { makeDb, seedCall, mockFetch } from "./helpers.mjs";
import { onRequestPost as webhook } from "../../../functions/api/call/webhook.js";
import { signElevenLabs } from "../../../functions/_lib/hmac.js";
import { parseModelJson, leadSignals, regexExtract } from "../../../functions/_lib/auto-capture.js";

const ID = "d".repeat(32);
const baseEnv = (db, over = {}) => ({ CALLS_DB: db, CALL_WEBHOOK_SECRET: "whsec", RESEND_API_KEY: "re", TO_EMAIL: "t@example.com", CALL_FROM_EMAIL: "c@m.example.com", ANTHROPIC_API_KEY: "k", ...over });
async function hook(env, transcript) {
  const raw = JSON.stringify({ type: "post_call_transcription", event_timestamp: 1, data: { conversation_id: "conv_ac", metadata: { call_duration_secs: 60 }, transcript, conversation_initiation_client_data: { dynamic_variables: { call_id: ID } } } });
  const sig = await signElevenLabs(raw, "whsec");
  const pending = [];
  const res = await webhook({ request: new Request("https://x/api/call/webhook", { method: "POST", headers: { "elevenlabs-signature": sig }, body: raw }), env, waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  return res;
}
const T = (pairs) => pairs.map(([role, message], i) => ({ role, message, time_in_call_secs: i * 3 }));
const withEmail = T([
  ["agent", "Hello, Hannah here."], ["user", "Can I speak to Tarun?"], ["agent", "Of course. Who am I speaking with?"], ["user", "Anaya."],
  ["agent", "Best email?"], ["user", "anaya at example dot com"], ["agent", "What would you like me to put in the message?"], ["user", "Uh, call me back. Are you getting this? Okay, end."],
]);
const modelReply = (obj) => new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(obj) }] }), { status: 200 });
const isResend = (c) => c.url.includes("resend");

test("auto-capture: transcript with an email and no message creates an enquiry, flagged in the email", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID, el_conversation_id: "conv_ac" });
  const m = mockFetch([modelReply({ name: "Anaya", organisation: "", contact: "anaya@example.com", summary: "Wants to speak to Tarun and asked for a call back.", wants_callback: true, urgency: "normal" })], { other: async () => new Response("{}", { status: 200 }) });
  try {
    assert.equal((await hook(baseEnv(db), withEmail)).status, 200);
    const rows = (await db.prepare("SELECT * FROM messages").all()).results;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, "enquiry");
    assert.match(rows[0].ref, /^ARC-\d{6}-[A-Z0-9]{4}$/);
    const f = JSON.parse(rows[0].fields);
    assert.equal(f.auto_captured, true); assert.equal(f.name, "Anaya"); assert.equal(f.contact, "anaya@example.com"); assert.equal(f.wants_callback, true);
    const mail = m.calls.find(isResend).body;
    assert.match(mail.text, /Captured from the transcript after the caller hung up/);
    assert.match(mail.html, /Captured from the transcript after the caller hung up/);
    assert.match(mail.subject, /^\[Call\] enquiry ARC-/);
    assert.equal((await db.prepare("SELECT outcome FROM calls").first()).outcome, "enquiry");
  } finally { m.restore(); }
});

test("auto-capture: no name, contact or callback request means no message", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID, el_conversation_id: "conv_ac" });
  const m = mockFetch([], { other: async () => new Response("{}", { status: 200 }) });
  try {
    await hook(baseEnv(db), T([["agent", "Hello."], ["user", "It's"], ["agent", "Take your time."], ["user", "..."]]));
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM messages").first()).n, 0);
    assert.equal(m.calls.filter((c) => c.url.includes("anthropic")).length, 0, "no model call without a lead signal");
    assert.match(m.calls.find(isResend).body.subject, /no-message/);
  } finally { m.restore(); }
});

test("auto-capture: a model that returns nothing usable for a call with no contact makes no message", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID, el_conversation_id: "conv_ac" });
  const m = mockFetch([modelReply({ name: "", organisation: "", contact: "", summary: "", wants_callback: false, urgency: "normal" })], { other: async () => new Response("{}", { status: 200 }) });
  try {
    await hook(baseEnv(db), T([["agent", "Hi"], ["user", "Call me back please"]]));
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM messages").first()).n, 0);
  } finally { m.restore(); }
});

test("auto-capture: model failure falls back to regex extraction of the email", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID, el_conversation_id: "conv_ac" });
  const m = mockFetch([new Response("down", { status: 400 })], { other: async () => new Response("{}", { status: 200 }) });
  try {
    await hook(baseEnv(db), T([["agent", "Hello."], ["user", "My name is Sam Taylor, email sam.taylor@acme.co.uk, please call me back about reporting."]]));
    const rows = (await db.prepare("SELECT * FROM messages").all()).results;
    assert.equal(rows.length, 1);
    const f = JSON.parse(rows[0].fields);
    assert.equal(f.contact, "sam.taylor@acme.co.uk"); assert.equal(f.name, "Sam Taylor"); assert.equal(f.extracted_by, "regex"); assert.equal(f.auto_captured, true);
    assert.match(f.summary, /reporting/);
  } finally { m.restore(); }
});

test("auto-capture: no API key falls back to a phone number", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID, el_conversation_id: "conv_ac" });
  const m = mockFetch([], { other: async () => new Response("{}", { status: 200 }) });
  try {
    await hook(baseEnv(db, { ANTHROPIC_API_KEY: "" }), T([["agent", "Hello."], ["user", "Ring me on 07700 900123 please"]]));
    const f = JSON.parse((await db.prepare("SELECT fields FROM messages").first()).fields);
    assert.equal(f.contact, "07700 900123");
  } finally { m.restore(); }
});

test("auto-capture: a repeat webhook adds no second message; a message the agent logged is left alone", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID, el_conversation_id: "conv_ac" });
  const reply = { name: "Anaya", organisation: "", contact: "anaya@example.com", summary: "Call back.", wants_callback: true, urgency: "normal" };
  const m = mockFetch([modelReply(reply), modelReply(reply)], { other: async () => new Response("{}", { status: 200 }) });
  try {
    await hook(baseEnv(db), withEmail); await hook(baseEnv(db), withEmail);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM messages").first()).n, 1);
    assert.equal(m.calls.filter(isResend).length, 1);
  } finally { m.restore(); }
  const db2 = makeDb(); await seedCall(db2, { call_id: ID, el_conversation_id: "conv_ac" });
  await db2.prepare("INSERT INTO messages VALUES ('ARC-261021-ABCD', ?, 'enquiry', '{\"summary\":\"x\"}', ?)").bind(ID, Math.floor(Date.now() / 1000)).run();
  const m2 = mockFetch([], { other: async () => new Response("{}", { status: 200 }) });
  try {
    await hook(baseEnv(db2), withEmail);
    assert.equal((await db2.prepare("SELECT COUNT(*) AS n FROM messages").first()).n, 1);
    assert.equal(m2.calls.filter((c) => c.url.includes("anthropic")).length, 0);
  } finally { m2.restore(); }
});

test("auto-capture: caller text is escaped in the email and model output is clamped", async () => {
  const db = makeDb(); await seedCall(db, { call_id: ID, el_conversation_id: "conv_ac" });
  const m = mockFetch([modelReply({ name: "<script>x</script>", contact: "a@b.co", summary: "<img src=x onerror=1>", wants_callback: true, urgency: "whenever" })], { other: async () => new Response("{}", { status: 200 }) });
  try {
    await hook(baseEnv(db), T([["agent", "Hi"], ["user", "mail a@b.co call me back"]]));
    const mail = m.calls.find(isResend).body;
    assert.ok(!mail.html.includes("<script>")); assert.ok(!mail.html.includes("<img"));
    assert.equal(JSON.parse((await db.prepare("SELECT fields FROM messages").first()).fields).urgency, "normal");
  } finally { m.restore(); }
});

test("auto-capture helpers: parseModelJson tolerates fences, rejects junk; signals", () => {
  assert.equal(parseModelJson("```json\n{\"name\":\"A\",\"contact\":\"a@b.co\",\"summary\":\"s\"}\n```").name, "A");
  assert.equal(parseModelJson("nope"), null);
  assert.equal(parseModelJson("[1]"), null);
  assert.equal(leadSignals(T([["user", "hello there"]])).any, false);
  assert.equal(leadSignals(T([["user", "Can I speak to Tarun"]])).callback, true);
  assert.equal(regexExtract(T([["user", "no details"]])), null);
});
