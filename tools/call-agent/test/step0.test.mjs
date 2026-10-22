import test from "node:test";
import assert from "node:assert/strict";
import { makeDb, seedCall, llmRequest, readSse, EL_TOOLS } from "./helpers.mjs";
import { handle } from "../../../functions/api/call/llm/[role].js";
import { parseIntent } from "../../../functions/_lib/step0.js";

const env = (db, extra = {}) => ({ CALLS_DB: db, CALL_LLM_SECRET: "s3cret", CALL_STEP0_SCRIPT: "1", CALL_ENV: "preview", ...extra });
const user = (t) => ({ role: "user", content: t });
const go = (e, role, text, opts = {}) => {
  const req = llmRequest(role, [user(text)], { tools: EL_TOOLS, ...opts });
  const url = opts.host ? req.url.replace("arithim.com", opts.host) : "https://call-us.arithim.pages.dev/api/call/llm/" + role + "/chat/completions";
  return handle({ request: new Request(url, { method: "POST", headers: req.headers, body: req.body, duplex: "half" }), env: e, params: { role }, waitUntil: (p) => p });
};
const rows = (db) => db.raw.prepare("SELECT * FROM step0_log ORDER BY id").all();

test("intent parsing", () => {
  assert.equal(parseIntent("please transfer to consulting").target, "consulting");
  assert.equal(parseIntent("Transfer to the customer desk").target, "customer-desk");
  assert.equal(parseIntent("transfer to front desk").target, "front-desk");
  assert.equal(parseIntent("end call now").kind, "end");
  assert.equal(parseIntent("hello").kind, "reply");
});

test("scripted reply, transfers with the right agent_number, limit of two, end_call, and logging", async () => {
  const db = makeDb(); await seedCall(db, { el_conversation_id: "conv_a" }); const e = env(db);
  assert.equal((await readSse(await go(e, "front-desk", "hello"))).text, "Step zero test reply from Hannah.");
  const t1 = await readSse(await go(e, "front-desk", "transfer to consulting"));
  assert.equal(t1.finish, "tool_calls");
  assert.equal(t1.toolCalls[0].name, "transfer_to_agent");
  assert.equal(JSON.parse(t1.toolCalls[0].arguments).agent_number, 0);
  const t2 = await readSse(await go(e, "consulting", "transfer to tsg"));
  assert.equal(JSON.parse(t2.toolCalls[0].arguments).agent_number, 1);
  const t3 = await readSse(await go(e, "tsg", "transfer to customer desk"));
  assert.equal(t3.toolCalls.length, 0);
  assert.match(t3.text, /refused/);
  const end = await readSse(await go(e, "tsg", "end call"));
  assert.equal(end.toolCalls[0].name, "end_call");
  const r = rows(db);
  assert.equal(r.length, 5);
  assert.equal(r[0].path, "/api/call/llm/front-desk/chat/completions");
  assert.equal(r[0].conversation_id, "conv_a");
  assert.equal(r[0].call_id, "a".repeat(32));
  assert.equal(r[0].secret_header, "x-call-secret");
  assert.ok(JSON.parse(r[0].tool_names).includes("transfer_to_agent"));
  assert.ok(JSON.parse(r[0].body_keys).includes("messages"));
  assert.ok(!JSON.stringify(r).includes("s3cret"));
  assert.equal(r[4].action, "end_call");
});

test("rejected requests are logged without the secret; disabled on production hosts and without the flag", async () => {
  const db = makeDb(); await seedCall(db); const e = env(db);
  assert.equal((await go(e, "front-desk", "hi", { secret: "wrong-value" })).status, 401);
  const r = rows(db);
  assert.equal(r.length, 1); assert.equal(r[0].auth_ok, 0); assert.equal(r[0].action, "http_401");
  assert.ok(!JSON.stringify(r).includes("wrong-value"));
  // production host: scripted mode off, so the normal brain would run (no Anthropic key here -> fallback text, nothing logged)
  const before = rows(db).length;
  await go(env(db), "front-desk", "hello", { host: "www.arithim.com" }).catch(() => {});
  await go({ ...env(db), CALL_STEP0_SCRIPT: undefined }, "front-desk", "hello").catch(() => {});
  await go({ ...env(db), CALL_ENV: "prod" }, "front-desk", "hello").catch(() => {});
  assert.equal(rows(db).length, before);
});
