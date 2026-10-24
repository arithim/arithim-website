import test from "node:test";
import assert from "node:assert/strict";
import { makeDb, seedCall, anthropicSse, mockFetch, llmRequest, readSse, EL_TOOLS } from "./helpers.mjs";
import { handle } from "../../../functions/api/call/llm/[role].js";
import { LINES_FIGURES } from "../../../functions/_lib/filter.js";
import { FALLBACK_LINE } from "../../../functions/_lib/brain.js";

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
  // limit
  const m2 = mockFetch([
    anthropicSse([tm(2), tm(3), tm(4)], "tool_use"),
    anthropicSse([{ type: "text", text: "ok" }]),
  ]);
  try {
    await readSse(await call(env, "front-desk", [user("more")]));
    const n = await db.prepare("SELECT COUNT(*) AS n FROM messages").first();
    assert.equal(n.n, 3);
    const results = m2.calls[1].body.messages.at(-1).content;
    assert.match(results[2].content, /limit reached/i);
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
    assert.match(out.text, /^Right, got it\. Thanks, Sam\. Your reference is A R C, [a-z ]+, [a-z ]+, then [A-Za-z ]+\. Tarun will pick it up himself and get back to you at sam@example\.com within one working day\. Bye for now\.$/);
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
    assert.equal(out.text, "Your reference is on its way by email. Goodbye.");
    assert.equal(out.toolCalls[0].name, "end_call");
  } finally { m.restore(); }
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
