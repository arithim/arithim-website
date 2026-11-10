import test from "node:test";
import assert from "node:assert/strict";
import { makeDb, seedCall, anthropicSse, mockFetch, llmRequest, readSse, EL_TOOLS } from "./helpers.mjs";
import { handle } from "../../../functions/api/call/llm/[role].js";
import { LINES_FIGURES } from "../../../functions/_lib/filter.js";
import { FALLBACK_LINE, spokenRef, toolTakeMessage, cacheControl, loggedNote, isNarration, NOTE_FILLER, callerNames } from "../../../functions/_lib/brain.js";
import { anthropicStream } from "../../../functions/_lib/anthropic.js";

const ID = "a".repeat(32);
const baseEnv = (db, extra = {}) => ({ CALLS_DB: db, CALL_LLM_SECRET: "s3cret", ANTHROPIC_API_KEY: "k", ...extra });
const user = (t) => ({ role: "user", content: t });
const call = (env, role, msgs, opts) => handle({ request: llmRequest(role, msgs, opts), env, params: { role }, waitUntil: (p) => p });
const settle = () => new Promise((r) => setTimeout(r, 20));

test("rejects missing/wrong secret, unknown role, unknown call, inactive call", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  assert.equal((await call(env, "front-desk", [user("hi")], { secret: "bad" })).status, 401);
  assert.equal((await call(env, "nope", [user("hi")])).status, 404);
  assert.equal((await call(env, "front-desk", [user("hi")], { callId: "b".repeat(32) })).status, 404);
  assert.equal((await call(env, "front-desk", [user("hi")], { callId: "not-hex" })).status, 404);
  await db.prepare("UPDATE calls SET status='ended'").run();
  assert.equal((await call(env, "front-desk", [user("hi")])).status, 410);
});

test("accepts Authorization: Bearer and resolves the call by conversation id", async () => {
  const db = makeDb(); await seedCall(db, { el_conversation_id: "conv_9" }); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "text", text: "Hello there." }])]);
  try {
    const req = new Request("https://x/api/call/llm/front-desk", { method: "POST", headers: { authorization: "Bearer s3cret", "x-conversation-id": "conv_9" }, body: JSON.stringify({ messages: [user("hi")] }) });
    const res = await handle({ request: req, env, params: { role: "front-desk" } });
    assert.equal(res.status, 200);
    assert.equal((await readSse(res)).text, "Hello there.");
  } finally { m.restore(); }
});

test("streams sentences, writes turns, sends cached system prompt and the configured model params", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "text", text: "Hello, this is Hannah. How can I help you today?" }])]);
  try {
    const res = await call(env, "front-desk", [{ role: "system", content: "platform note" }, user("Hi, I need help")]);
    assert.match(res.headers.get("content-type"), /event-stream/);
    const out = await readSse(res);
    assert.equal(out.text, "Hello, this is Hannah. How can I help you today?");
    assert.equal(out.finish, "stop"); assert.ok(out.done);
    await settle();
    const req = m.calls[0].body;
    assert.equal(req.model, "claude-sonnet-5-5");
    assert.deepEqual(req.thinking, { type: "between_tools" });
    assert.deepEqual(req.output_config, { effort: "low" });
    assert.equal(req.stream, true);
    assert.equal(req.system[0].cache_control.type, "ephemeral");
    assert.match(req.system[1].text, /platform note/);
    assert.equal(m.calls[0].init.headers["x-api-key"], "k");
    assert.equal(m.calls[0].init.headers["anthropic-version"], "2023-06-01");
    const turns = await db.prepare("SELECT speaker, text FROM turns ORDER BY seq").all();
    assert.deepEqual(turns.results.map((t) => t.speaker), ["caller", "agent"]);
  } finally { m.restore(); }
});

test("haiku: thinking omitted, effort low", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db, { CALL_TALKER_MODEL: "claude-haiku-5-5" });
  const m = mockFetch([anthropicSse([{ type: "text", text: "Hi." }])]);
  try {
    await readSse(await call(env, "consulting", [user("hi")]));
    assert.equal("thinking" in m.calls[0].body, false);
    assert.deepEqual(m.calls[0].body.output_config, { effort: "low" });
  } finally { m.restore(); }
});

test("pre-speech filter replaces a price sentence and denylisted name, flags the call", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db, { CALL_DENYLIST: "Secretco\n" });
  const m = mockFetch([anthropicSse([{ type: "text", text: "We help with automation. It costs £5,000 a month. We worked with Secretco before. Anything else?" }])]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("price?")]));
    assert.ok(!out.text.includes("£")); assert.ok(!out.text.includes("Secretco"));
    assert.ok(LINES_FIGURES.some((l) => out.text.includes(l)));
    assert.ok(out.text.startsWith("We help with automation."));
    await settle();
    const row = await db.prepare("SELECT flags FROM calls").first();
    assert.match(row.flags, /price/); assert.match(row.flags, /denylist/);
  } finally { m.restore(); }
});

test("take_message tool runs in-process, writes a row, result goes back to the model, max 3", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = (n) => ({ type: "tool_use", name: "take_message", id: "toolu_" + n, input: { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Needs help " + n } });
  const script = [
    anthropicSse([{ type: "text", text: "Let me note that." }, tm(1)], "tool_use"),
    anthropicSse([{ type: "text", text: "Done." }]),
  ];
  const m = mockFetch(script);
  try {
    const out = await readSse(await call(env, "front-desk", [user("please take a message")]));
    assert.match(out.text, /Let me note that\. Done\./);
    const second = m.calls[1].body.messages;
    const tr = second.at(-1).content[0];
    assert.equal(tr.type, "tool_result");
    assert.match(tr.content, /Reference ARC-\d{6}-[A-Z0-9]{4}/);
    const row = await db.prepare("SELECT * FROM messages").first();
    assert.equal(row.type, "enquiry");
    assert.equal(JSON.parse(row.fields).contact, "sam@example.com");
    assert.equal(JSON.parse(row.fields).urgency, "normal");
  } finally { m.restore(); }
  // within 20 s of the last message, more take_message calls (a platform retry of the same turn) update that row rather than add rows
  const m2 = mockFetch([
    anthropicSse([tm(2), tm(3), tm(4)], "tool_use"),
    anthropicSse([{ type: "text", text: "ok" }]),
  ]);
  try {
    await readSse(await call(env, "front-desk", [user("more")]));
    const n = await db.prepare("SELECT COUNT(*) AS n FROM messages").first();
    assert.equal(n.n, 1);
    assert.match(JSON.parse((await db.prepare("SELECT fields FROM messages").first()).fields).summary, /Needs help 4/);
    const results = m2.calls[1].body.messages.at(-1).content;
    assert.match(results[2].content, /added to the message logged a moment ago/);
  } finally { m2.restore(); }
});

test("take_message validates type and requires content", async () => {
  const { toolTakeMessage } = await import("../../../functions/_lib/brain.js");
  const db = makeDb(); const c = await seedCall(db);
  assert.match(await toolTakeMessage(db, c, { type: "bogus", summary: "x" }), /type must be/);
  assert.match(await toolTakeMessage(db, c, { type: "enquiry" }), /required/);
  assert.match(await toolTakeMessage(db, c, { type: "billing_query", summary: "unpaid", details: { invoice_number: "INV-1", evil: "x" } }), /Reference/);
  const f = JSON.parse((await db.prepare("SELECT fields FROM messages").first()).fields);
  assert.deepEqual(f.details, { invoice_number: "INV-1" });
});

test("transfer_to_agent is passed to ElevenLabs as a tool call and counted; blocked at 2", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tr = (n) => anthropicSse([{ type: "text", text: "I'll pass you to Oliver." }, { type: "tool_use", name: "transfer_to_agent", id: "toolu_t" + n, input: { agent_number: 0, reason: "needs consulting" } }], "tool_use");
  let m = mockFetch([tr(1)]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("business problem")], { tools: EL_TOOLS }));
    assert.equal(out.finish, "tool_calls");
    assert.equal(out.toolCalls[0].name, "transfer_to_agent");
    assert.deepEqual(JSON.parse(out.toolCalls[0].arguments), { agent_number: 0, reason: "needs consulting" });
    assert.match(out.text, /Oliver/);
    // transfer_to_number never offered to the model
    assert.ok(!m.calls[0].body.tools.some((t) => t.name === "transfer_to_number"));
    assert.ok(m.calls[0].body.tools.some((t) => t.name === "transfer_to_agent"));
  } finally { m.restore(); }
  m = mockFetch([tr(2)]);
  try { assert.equal((await readSse(await call(env, "consulting", [user("again")], { tools: EL_TOOLS }))).finish, "tool_calls"); } finally { m.restore(); }
  assert.equal((await db.prepare("SELECT transfers, current_role FROM calls").first()).transfers, 2);
  // third attempt is refused inside the loop and the model is told to take a message
  m = mockFetch([tr(3), anthropicSse([{ type: "text", text: "I'll take a message instead." }])]);
  try {
    const out = await readSse(await call(env, "tsg", [user("third")], { tools: EL_TOOLS }));
    assert.equal(out.toolCalls.length, 0);
    assert.equal(out.finish, "stop");
    assert.match(out.text, /take a message/);
    assert.match(m.calls[1].body.messages.at(-1).content[0].content, /Transfer refused/);
    assert.equal((await db.prepare("SELECT transfers FROM calls").first()).transfers, 2);
    await settle();
    assert.match((await db.prepare("SELECT flags FROM calls").first()).flags, /transfer-blocked/);
  } finally { m.restore(); }
});

test("end_call passes through", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "text", text: "Goodbye." }, { type: "tool_use", name: "end_call", id: "toolu_e", input: { reason: "done" } }], "tool_use")]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("bye")], { tools: EL_TOOLS }));
    assert.equal(out.toolCalls[0].name, "end_call"); assert.equal(out.finish, "tool_calls");
  } finally { m.restore(); }
});

test("end_call after take_message with no closing text: reference and goodbye are streamed before the tool call", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_c1", input: { type: "enquiry", name: "Sam Jones", contact: "sam@example.com", summary: "Needs help" } };
  const m = mockFetch([
    anthropicSse([{ type: "text", text: "Right, got it." }, tm], "tool_use"),
    anthropicSse([{ type: "tool_use", name: "end_call", id: "toolu_c2", input: { reason: "done" } }], "tool_use"),
  ]);
  try {
    const out = await readSse(await call(env, "customer-desk", [user("Thanks, that's everything, I have to dash.")], { tools: EL_TOOLS }));
    assert.match(out.text, /^Right, got it\. Thanks, Sam\. Your reference is A R C, [a-z ]+, [a-z ]+, then [A-Za-z ]+\. Tarun will get back to you at sam@example\.com within one working day\. Bye for now\.$/);
    assert.equal(out.toolCalls[0].name, "end_call"); assert.equal(out.finish, "tool_calls");
    await settle();
    const agent = (await db.prepare("SELECT text FROM turns WHERE speaker='agent'").all()).results.map((t) => t.text).join(" ");
    assert.match(agent, /Bye for now/);
  } finally { m.restore(); }
});

test("end_call after take_message with a closing line already spoken is unchanged", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_c3", input: { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Needs help" } };
  const m = mockFetch([
    anthropicSse([tm], "tool_use"),
    anthropicSse([{ type: "text", text: "Your reference is on its way by email. Goodbye." }, { type: "tool_use", name: "end_call", id: "toolu_c4", input: {} }], "tool_use"),
  ]);
  try {
    const out = await readSse(await call(env, "customer-desk", [user("bye")], { tools: EL_TOOLS }));
    assert.equal(out.text, NOTE_FILLER + " Your reference is on its way by email. Goodbye.");
    assert.equal(out.toolCalls[0].name, "end_call");
  } finally { m.restore(); }
});

test("planning out loud before end_call is not spoken, and the reference closing line still is (live call 9 Nov)", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_n1", input: { type: "enquiry", name: "Priya", contact: "priya@example.com", summary: "Month-end reporting" } };
  const m = mockFetch([
    anthropicSse([{ type: "text", text: "Thanks Priya, that's helpful. I'll take that down for Tarun so you're covered." }, tm], "tool_use"),
    anthropicSse([{ type: "text", text: "Priya's message is already logged, and she's now signalling she's done. I'll close with the reference and next step." }, { type: "tool_use", name: "end_call", id: "toolu_n2", input: {} }], "tool_use"),
  ]);
  try {
    const out = await readSse(await call(env, "consulting", [user("That's all, thanks.")], { tools: EL_TOOLS }));
    assert.doesNotMatch(out.text, /signalling|already logged|I'll close/);
    assert.match(out.text, /^Thanks Priya, that's helpful\. I'll take that down for Tarun so you're covered\. Thanks, Priya\. Your reference is A R C, .* Bye for now\.$/);
    assert.equal(out.toolCalls[0].name, "end_call");
    await settle();
    assert.match((await db.prepare("SELECT flags FROM calls").first()).flags, /narration/);
  } finally { m.restore(); }
});

test("isNarration: planning lines are caught, ordinary speech is not", () => {
  const yes = ["Priya's message is already logged, and she's now signalling she's done.", "I'll close with the reference and next step.", "The caller wants a call back.", "I'll call take_message now.", "She's confirmed the email."];
  const no = ["Thanks Priya, that's helpful.", "Let me bring in Oliver, he's the one for this.", "He's great with reporting.", "Tarun will get back to you within one working day.", "Right, so the next step is Tarun emails you.", "Tarun's the one you want."];
  for (const s of yes) assert.equal(isNarration(s, ["Priya Shah"]), true, s);
  for (const s of no) assert.equal(isNarration(s, ["Priya Shah", "Tarun"]), false, s);
});

test("end_call alone, nothing spoken and no message taken: generic goodbye first", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "tool_use", name: "end_call", id: "toolu_c5", input: {} }], "tool_use")]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("bye")], { tools: EL_TOOLS }));
    assert.equal(out.text, "Thanks for calling Arithim. Bye for now.");
    assert.equal(out.toolCalls[0].name, "end_call");
  } finally { m.restore(); }
});

test("think runs the thinker with the pack, adds a holding line, and is capped at 3", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const th = (n) => anthropicSse([{ type: "tool_use", name: "think", id: "toolu_k" + n, input: { question: "Which service fits?" } }], "tool_use");
  const m = mockFetch([
    th(1),
    new Response(JSON.stringify({ content: [{ type: "text", text: "Automation fits best." }] }), { status: 200 }),
    anthropicSse([{ type: "text", text: "Automation looks like the best fit." }]),
  ]);
  try {
    const out = await readSse(await call(env, "consulting", [user("what do I need?")]));
    assert.match(out.text, /^Let me think about that\.\.\./);
    assert.match(out.text, /Automation looks like the best fit\./);
    const thinker = m.calls[1].body;
    assert.equal(thinker.model, "claude-opus-5-5");
    assert.deepEqual(thinker.output_config, { effort: "medium" });
    assert.ok(thinker.system[0].text.includes("KNOWLEDGE PACK"));
    assert.ok(m.calls[1].init.signal);
    assert.match(m.calls[2].body.messages.at(-1).content[0].content, /Automation fits best/);
  } finally { m.restore(); }
  const { toolThink } = await import("../../../functions/_lib/brain.js");
  await db.prepare("UPDATE calls SET think_count = 3").run();
  assert.match(await toolThink(env, db, { call_id: ID }, { question: "q" }, []), /limit reached/);
});

test("think timeout gives a notice and the model carries on", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([
    anthropicSse([{ type: "tool_use", name: "think", id: "toolu_k", input: { question: "q" } }], "tool_use"),
    () => { const e = new Error("timeout"); e.name = "TimeoutError"; throw e; },
    anthropicSse([{ type: "text", text: "Let me take a message instead." }]),
  ]);
  try {
    const out = await readSse(await call(env, "consulting", [user("hard")]));
    assert.match(m.calls[2].body.messages.at(-1).content[0].content, /timed out/);
    assert.match(out.text, /take a message/);
  } finally { m.restore(); }
});

test("Anthropic error before any output gives the fixed spoken fallback", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([new Response("boom", { status: 400 })]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("hi")]));
    assert.equal(out.text, FALLBACK_LINE); assert.ok(out.done);
  } finally { m.restore(); }
});

test("retryable 529 is retried once", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([new Response("busy", { status: 529 }), anthropicSse([{ type: "text", text: "Hello." }])]);
  try { assert.equal((await readSse(await call(env, "front-desk", [user("hi")]))).text, "Hello."); } finally { m.restore(); }
});

test("no API key: fallback line, or mock line in mock mode", async () => {
  const db = makeDb(); await seedCall(db);
  const a = await readSse(await call({ CALLS_DB: db, CALL_LLM_SECRET: "s3cret" }, "front-desk", [user("hi")]));
  assert.equal(a.text, FALLBACK_LINE);
  const b = await readSse(await call({ CALLS_DB: db, CALL_LLM_SECRET: "s3cret", CALL_MOCK: "1" }, "front-desk", [user("hi")]));
  assert.match(b.text, /mock call agent/);
});

test("non-streaming JSON response", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "text", text: "Hello." }])]);
  try {
    const res = await call(env, "front-desk", [user("hi")], { stream: false });
    const j = await res.json();
    assert.equal(j.choices[0].message.content, "Hello.");
  } finally { m.restore(); }
});

test("text mode turn cap ends the chat with a fixed line", async () => {
  const db = makeDb(); await seedCall(db, { mode: "text" }); const env = baseEnv(db);
  for (let i = 0; i < 41; i++) await db.prepare("INSERT INTO turns VALUES (?,?,?,?,?,?)").bind(ID, i + 1, "front-desk", "caller", "m" + i, 1).run();
  const m = mockFetch([]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("one more")], { tools: EL_TOOLS }));
    assert.match(out.text, /limit for this chat/);
    assert.equal(out.toolCalls[0].name, "end_call");
    assert.equal(m.calls.length, 0);
  } finally { m.restore(); }
});

test("duplicate caller message on a retry is not logged twice", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "text", text: "A." }]), anthropicSse([{ type: "text", text: "A." }])]);
  try {
    await readSse(await call(env, "front-desk", [user("same")])); await settle();
    // simulate platform retry before agent turn was stored: remove agent turn
    await db.prepare("DELETE FROM turns WHERE speaker='agent'").run();
    await readSse(await call(env, "front-desk", [user("same")])); await settle();
    const n = await db.prepare("SELECT COUNT(*) AS n FROM turns WHERE speaker='caller'").first();
    assert.equal(n.n, 1);
  } finally { m.restore(); }
});

// ---- code review fixes ----
test("M7: the conversation id is required, bound on first use, and a different id is then rejected", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "text", text: "Hello there." }]), anthropicSse([{ type: "text", text: "Hello again." }]), anthropicSse([{ type: "text", text: "x" }])]);
  try {
    const noConv = new Request("https://arithim.com/api/call/llm/front-desk", { method: "POST", headers: { "x-call-secret": "s3cret", "x-call-id": ID }, body: JSON.stringify({ messages: [user("hi")] }) });
    assert.equal((await handle({ request: noConv, env, params: { role: "front-desk" } })).status, 400);
    assert.equal((await call(env, "front-desk", [user("hi")], { conversationId: "conv_one" })).status, 200);
    assert.equal((await db.prepare("SELECT el_conversation_id AS c FROM calls").first()).c, "conv_one");
    assert.equal((await call(env, "front-desk", [user("again")], { conversationId: "conv_one" })).status, 200);
    assert.equal((await call(env, "front-desk", [user("hi")], { conversationId: "conv_two" })).status, 404);
    assert.equal((await db.prepare("SELECT el_conversation_id AS c FROM calls").first()).c, "conv_one");
    // a conversation id already bound to another call cannot be claimed by this one
    await seedCall(db, { call_id: "b".repeat(32), el_conversation_id: "conv_taken" });
    await db.prepare("UPDATE calls SET el_conversation_id = NULL WHERE call_id = ?").bind(ID).run();
    assert.equal((await call(env, "front-desk", [user("hi")], { conversationId: "conv_taken" })).status, 404);
  } finally { m.restore(); }
});

test("M8: whitespace-only text blocks are not replayed to Anthropic", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_ws", input: { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Needs help" } };
  const m = mockFetch([anthropicSse([{ type: "text", text: "\n\n" }, tm], "tool_use"), anthropicSse([{ type: "text", text: "Done." }])]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("take a message")]));
    assert.match(out.text, /Done\./);
    const replayed = m.calls[1].body.messages.find((x) => x.role === "assistant" && Array.isArray(x.content));
    assert.ok(replayed.content.every((b) => b.type !== "text" || b.text.trim()), JSON.stringify(replayed.content));
    assert.ok(replayed.content.some((b) => b.type === "tool_use"));
  } finally { m.restore(); }
});

test("H2/M3 in the brain: a date promise split across a long-clause comma and an open-ended promise are replaced", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const long = "Tarun will go through everything you have told me about the supplier approvals process and the spreadsheets your team use today and then, reply by Friday. You'll hear back next week. A person will reply within one working day. It is about ten grand.";
  const m = mockFetch([anthropicSse([{ type: "text", text: long }])]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("hi")]));
    assert.ok(!/Friday|next week|ten grand/.test(out.text), out.text);
    assert.match(out.text, /A person will reply within one working day\./);
    assert.ok(LINES_FIGURES.some((l) => out.text.includes(l)));
  } finally { m.restore(); }
});

test("L14: when the client has gone, nothing is written or logged and no tool runs", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_ab", input: { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Needs help" } };
  const ctl = new AbortController();
  const m = mockFetch([() => { ctl.abort(); return anthropicSse([{ type: "text", text: "Sure." }, tm], "tool_use"); }]);
  try {
    const req = llmRequest("front-desk", [user("take a message")]);
    const aborted = new Request(req, { signal: ctl.signal });
    await handle({ request: aborted, env, params: { role: "front-desk" }, waitUntil: (p) => p }).then((r) => r.text());
    await settle();
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM messages").first()).n, 0);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM turns WHERE speaker = 'agent'").first()).n, 0);
  } finally { m.restore(); }
});

test("filter in the brain: the caller's own amount is read back, a new amount is replaced, stray CJK is stripped", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "text", text: "I have an invoice for four thousand eight hundred pounds. It is also £900 extra. The reference is A R C, two six one,零 two two." }])]);
  try {
    const out = await readSse(await call(env, "customer-desk", [user("My invoice is for £4,800")]));
    assert.ok(out.text.includes("four thousand eight hundred pounds"), out.text);
    assert.ok(!out.text.includes("£900")); assert.ok(LINES_FIGURES.some((l) => out.text.includes(l)));
    assert.ok(!out.text.includes("零")); assert.ok(out.text.includes("two six one, two two"), out.text);
  } finally { m.restore(); }
});


// ---- cycle 2: deterministic reference read-back, cache lifetime, cut-off tool input, early text flush ----
test("take_message hands the model the reference already in spoken form", async () => {
  const db = makeDb(); const c = await seedCall(db);
  const r = await toolTakeMessage(db, c, { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Needs help" });
  const ref = /Reference (ARC-\d{6}-[A-Z0-9]{4})\./.exec(r)[1];
  assert.ok(r.includes(`"${spokenRef(ref)}"`), "the spoken form is in the result, in quotes");
  assert.match(r, /say exactly this, word for word/);
  // every digit survives: six digits and four tail characters
  const spoken = spokenRef(ref);
  assert.match(spoken, /^A R C, (?:\w+ ){2}\w+, (?:\w+ ){2}\w+, then (?:\w+ ){3}\w+$/);
  assert.equal(spokenRef("ARC-261024-J3ZE"), "A R C, two six one, zero two four, then J three Z E");
  assert.equal(spokenRef("ARC-261109-K7Q2"), "A R C, two six one, one zero nine, then K seven Q two");
});

test("the role prompt is cached for an hour, volatile platform notes sit after the breakpoint; CALL_CACHE_TTL=5m reverts", async () => {
  assert.deepEqual(cacheControl({}), { type: "ephemeral", ttl: "1h" });
  assert.deepEqual(cacheControl({ CALL_CACHE_TTL: "5m" }), { type: "ephemeral" });
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "text", text: "Hello." }])]);
  try {
    await readSse(await call(env, "front-desk", [{ role: "system", content: "Time is 10:42:07" }, user("hi")]));
    const b = m.calls[0].body;
    assert.deepEqual(b.system[0].cache_control, { type: "ephemeral", ttl: "1h" });
    assert.ok(!b.system[0].text.includes("10:42"), "nothing volatile in the cached block");
    assert.equal(b.system[1].cache_control, undefined);
    assert.ok(b.max_tokens >= 1000, "room for thinking plus a long take_message input");
  } finally { m.restore(); }
});

function rawSse(events) {
  const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

test("a take_message input cut off at the token limit is not run: the model is told and tries again", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const cut = rawSse([
    { type: "message_start", message: { usage: { input_tokens: 5 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Got it." } },
    { type: "content_block_stop", index: 0 },
    { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "toolu_cut", name: "take_message", input: {} } },
    { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"type":"enquiry","summary":"Needs a long' } },
    { type: "content_block_stop", index: 1 },
    { type: "message_delta", delta: { stop_reason: "max_tokens" }, usage: { output_tokens: 400 } },
    { type: "message_stop" },
  ]);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_ok", input: { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Needs help" } };
  const m = mockFetch([cut, anthropicSse([tm], "tool_use"), anthropicSse([{ type: "text", text: "All logged." }])]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("please log it")]));
    assert.match(m.calls[1].body.messages.at(-1).content[0].content, /cut off, so nothing was done/);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM messages").first()).n, 1);
    assert.match(out.text, /Got it\. All logged\./);
  } finally { m.restore(); }
});

test("the last words before a tool call are released when the text block ends, not after the tool input", async () => {
  const enc = new TextEncoder();
  const ev = (e) => enc.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
  let ctl;
  const stream = new ReadableStream({ start(c) { ctl = c; } });
  const m = mockFetch([new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } })]);
  try {
    const events = [];
    const p = anthropicStream({ env: { ANTHROPIC_API_KEY: "k" }, params: { model: "x" }, onText: (d) => events.push("text:" + d), onTextEnd: () => events.push("end") });
    for (const e of [
      { type: "message_start", message: { usage: {} } },
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Got it." } },
      { type: "content_block_stop", index: 0 },
    ]) ctl.enqueue(ev(e));
    await new Promise((r) => setTimeout(r, 30));
    assert.deepEqual(events, ["text:Got it.", "end"], "released while the stream is still open");
    for (const e of [{ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: {} }, { type: "message_stop" }]) ctl.enqueue(ev(e));
    ctl.close();
    await p;
  } finally { m.restore(); }
});

test("messages logged earlier in the call are listed for the model after the cache breakpoint, and quote marks are not spoken", async () => {
  const db = makeDb(); const c = await seedCall(db); const env = baseEnv(db);
  assert.equal(await loggedNote(db, c.call_id), "");
  const r = await toolTakeMessage(db, c, { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Needs help" });
  const ref = /Reference (ARC-\d{6}-[A-Z0-9]{4})\./.exec(r)[1];
  const note = await loggedNote(db, c.call_id);
  assert.ok(note.includes(`"${spokenRef(ref)}"`) && note.includes("name Sam") && note.includes("1 of 3"));
  const m = mockFetch([anthropicSse([{ type: "text", text: `Your reference is "${spokenRef(ref)}". Bye.` }])]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("did you get that?")]));
    const sys = m.calls[0].body.system;
    assert.equal(sys.length, 2);
    assert.equal(sys[1].cache_control, undefined);
    assert.ok(sys[1].text.includes(spokenRef(ref)));
    assert.ok(!sys[0].text.includes(ref), "the cached block never holds call data");
    assert.ok(!out.text.includes('"'));
    assert.ok(out.text.includes(spokenRef(ref)));
  } finally { m.restore(); }
});

test("a second message on the same call is an update: the model is told to add it silently and re-read the first reference only if asked", async () => {
  const db = makeDb(); const c = await seedCall(db);
  const r1 = await toolTakeMessage(db, c, { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Needs help" });
  const ref1 = /Reference (ARC-\d{6}-[A-Z0-9]{4})\./.exec(r1)[1];
  assert.match(r1, /say exactly this, word for word/);
  await db.prepare("UPDATE messages SET created_at = created_at - 60").run(); // outside the retry window
  const r2 = await toolTakeMessage(db, c, { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Needs help, and a number: 07700 900123" });
  const ref2 = /Reference (ARC-\d{6}-[A-Z0-9]{4})\./.exec(r2)[1];
  assert.notEqual(ref1, ref2);
  assert.match(r2, /update to a message already logged/);
  assert.match(r2, /do not read this reference out/);
  assert.ok(r2.includes(`"${spokenRef(ref1)}"`), "the first reference is the one to re-read");
  assert.ok(!r2.includes(spokenRef(ref2)), "the update's own reference is never offered in spoken form");
});

test("a take_message within 20 s of the last (a platform retry) merges into that row and keeps the caller's reference", async () => {
  const db = makeDb(); const c = await seedCall(db);
  const r1 = await toolTakeMessage(db, c, { type: "enquiry", name: "Priya", contact: "priya@example.com", summary: "Month-end reporting" });
  const ref1 = /Reference (ARC-\d{6}-[A-Z0-9]{4})\./.exec(r1)[1];
  const r2 = await toolTakeMessage(db, c, { type: "meeting_request", name: "Priya Shah", summary: "Month-end reporting, wants a call" });
  assert.equal(/Reference (ARC-\d{6}-[A-Z0-9]{4})\./.exec(r2)[1], ref1);
  assert.match(r2, /added to the message logged a moment ago/);
  assert.ok(r2.includes(`"${spokenRef(ref1)}"`));
  const rows = (await db.prepare("SELECT type, fields FROM messages").all()).results;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, "meeting_request");
  const f = JSON.parse(rows[0].fields);
  assert.equal(f.name, "Priya Shah"); assert.equal(f.contact, "priya@example.com"); // the earlier contact is kept
});

test("message cap of 3 still holds for messages spread across a call", async () => {
  const db = makeDb(); const c = await seedCall(db);
  for (let i = 0; i < 3; i++) {
    assert.match(await toolTakeMessage(db, c, { type: "enquiry", name: "Sam", summary: "Item " + i }), /Message recorded/);
    await db.prepare("UPDATE messages SET created_at = created_at - 60").run();
  }
  assert.match(await toolTakeMessage(db, c, { type: "enquiry", name: "Sam", summary: "Item 4" }), /Message limit reached/);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM messages").first()).n, 3);
});

test("take_message as the first thing in a reply: a holding line is streamed before the tool runs, so the platform does not time out", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_h1", input: { type: "enquiry", name: "Priya", contact: "priya@example.com", summary: "Reporting" } };
  const m = mockFetch([anthropicSse([tm], "tool_use"), anthropicSse([{ type: "text", text: "All noted." }])]);
  try {
    const out = await readSse(await call(env, "consulting", [user("That's all, thanks.")], { tools: EL_TOOLS }));
    assert.equal(out.text, NOTE_FILLER + " All noted.");
  } finally { m.restore(); }
});

test("callerNames picks up a name the caller gave, so narration about them is caught before anything is logged (staging call 9 Nov)", () => {
  const names = callerNames("Hi, I'm Priya from Northwind Chemicals. Our month-end reporting takes three people.");
  assert.deepEqual(names, ["Priya"]);
  assert.equal(isNarration("Priya is leaving, so I'll log it now with what I have.", names), true);
  assert.deepEqual(callerNames("I'm just ringing about an invoice. It's Sam Jones here."), ["Sam"]);
  assert.deepEqual(callerNames("i'm calling about our reporting"), []);
});

test("first turn after a transfer: the agent is told it has just been brought in, and a silent bounce back is refused (staging logs 9 Nov)", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db); // seedCall leaves current_role front-desk, so consulting is a fresh arrival
  const m = mockFetch([
    anthropicSse([{ type: "tool_use", name: "transfer_to_agent", id: "toolu_b1", input: { agent_number: 0 } }], "tool_use"),
    anthropicSse([{ type: "text", text: "Hi Priya, Oliver here, Hannah says month-end reporting takes three people a week. How does it work today?" }]),
  ]);
  try {
    const msgs = [user("Hi, I'm Priya. Month-end reporting takes three people a week."), { role: "assistant", content: "Let me bring in Oliver, he's the one for this." }];
    const out = await readSse(await call(env, "consulting", msgs, { tools: EL_TOOLS }));
    assert.equal(out.toolCalls.length, 0);
    assert.match(out.text, /^Hi Priya, Oliver here/);
    const sys = m.calls[0].body.system.map((b) => b.text).join("\n");
    assert.match(sys, /You have just joined this call: Hannah brought you in/);
    assert.match(m.calls[1].body.messages.at(-1).content[0].content, /Not transferred: you are Oliver/);
    await settle();
    const c = await db.prepare("SELECT transfers, flags FROM calls").first();
    assert.equal(c.transfers, 0);
    assert.match(c.flags, /arrival-bounce/);
  } finally { m.restore(); }
});

test("no arrival note when the role has not changed", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const m = mockFetch([anthropicSse([{ type: "text", text: "Hello." }])]);
  try {
    await readSse(await call(env, "front-desk", [user("hello")]));
    assert.doesNotMatch(m.calls[0].body.system.map((b) => b.text).join("\n"), /You have just joined this call/);
  } finally { m.restore(); }
});

test("message logged, then only silenced planning and no end_call: the reference is read out for the model (production call 9 Nov)", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_r1", input: { type: "enquiry", name: "Priya", contact: "priya@example.com", summary: "Month-end reporting" } };
  const m = mockFetch([
    anthropicSse([tm], "tool_use"),
    anthropicSse([{ type: "text", text: "Priya's message is logged, so I'll close with the reference." }]),
  ]);
  try {
    const out = await readSse(await call(env, "consulting", [user("Hi, I'm Priya."), { role: "assistant", content: "Hi Priya, Oliver here." }, user("That's all, thanks.")], { tools: EL_TOOLS }));
    assert.match(out.text, /^Let me just note that down\. Your reference is A R C, [a-z ]+, [a-z ]+, then [A-Za-z ]+\. Tarun will get back to you at priya@example\.com within one working day\.$/);
    await settle();
    assert.match((await db.prepare("SELECT flags FROM calls").first()).flags, /readback-added/);
  } finally { m.restore(); }
});

test("no extra read-back when the model read the reference itself", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_r2", input: { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Help" } };
  const m = mockFetch([
    anthropicSse([{ type: "text", text: "Right." }, tm], "tool_use"),
    anthropicSse([{ type: "text", text: "All noted, Sam. Anything else on your mind?" }]),
  ]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("Sam here, please pass a message on")], { tools: EL_TOOLS }));
    assert.equal(out.text, "Right. All noted, Sam. Anything else on your mind?");
  } finally { m.restore(); }
});

test("a retried turn whose last agent turn already had the holding line uses the other one", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_r3", input: { type: "enquiry", name: "Sam", contact: "sam@example.com", summary: "Help" } };
  const m = mockFetch([anthropicSse([tm], "tool_use"), anthropicSse([{ type: "text", text: "Done." }])]);
  try {
    const out = await readSse(await call(env, "front-desk", [user("bye"), { role: "assistant", content: NOTE_FILLER }, user("bye")], { tools: EL_TOOLS }));
    assert.match(out.text, /^One moment\. /);
    assert.doesNotMatch(out.text, /note that down/);
  } finally { m.restore(); }
});

test("the automatic goodbye leaves out the reference when the caller already heard it earlier in the call", async () => {
  const { closingLine } = await import("../../../functions/_lib/brain.js");
  const msg = { ref: "ARC-261110-R5EG", name: "Priya Shah", contact: "priya@example.com" };
  assert.equal(closingLine(msg, `Earlier: A R C, two six one, one one zero, then R five E G. Tarun will pick it up.`), "Thanks, Priya. Tarun will get back to you at priya@example.com within one working day. Bye for now.");
  assert.match(closingLine(msg, "nothing yet"), /Your reference is A R C/);
});

test("isNarration catches the planning lines from the 10 Nov staging suite", () => {
  for (const s of [
    "That's an existing customer with a product problem, which belongs to Daniel.",
    "I have enough to log this now: product, problem, contact, and a team-wide outage.",
    "The reference hasn't been read out yet on this call.",
    "Tom has pressed only for prices,",
  ]) assert.equal(isNarration(s, ["Tom"]), true, s);
  for (const s of ["Let me log this for Tarun.", "Okay, let me log that now.", "That's a pain, Mark. When did it start?", "I can't take or change bank details on a call."]) assert.equal(isNarration(s, ["Mark"]), false, s);
});

test("planning that gets silenced before anything is said still puts a holding line on the stream at once (staging suite 10 Nov)", async () => {
  const db = makeDb(); await seedCall(db); const env = baseEnv(db);
  const tm = { type: "tool_use", name: "take_message", id: "toolu_s1", input: { type: "enquiry", name: "Priya", contact: "priya@example.com", summary: "Reporting" } };
  const m = mockFetch([
    anthropicSse([{ type: "text", text: "Priya is signing off, so I'm logging what I have now." }, tm], "tool_use"),
    anthropicSse([{ type: "text", text: "She's signalled she's done." }]),
  ]);
  try {
    const out = await readSse(await call(env, "consulting", [user("Hi, I'm Priya."), { role: "assistant", content: "Hi Priya, Oliver here." }, user("That's all, thanks.")], { tools: EL_TOOLS }));
    assert.match(out.text, /^One moment\. Your reference is A R C, .* within one working day\.$/);
  } finally { m.restore(); }
});
