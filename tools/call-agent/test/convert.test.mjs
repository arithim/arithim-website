import test from "node:test";
import assert from "node:assert/strict";
import { openaiToAnthropic, openaiToolsToAnthropic, sseEvents } from "../../../functions/_lib/convert.js";

test("system messages are separated; conversation starts and ends with user", () => {
  const r = openaiToAnthropic([
    { role: "system", content: "platform" },
    { role: "assistant", content: "Hello, Arithim." },
    { role: "user", content: "Hi" },
  ]);
  assert.deepEqual(r.system, ["platform"]);
  assert.equal(r.messages[0].role, "user");
  assert.match(r.messages[0].content[0].text, /connected/);
  assert.equal(r.messages[1].role, "assistant");
  assert.equal(r.messages.at(-1).role, "user");
});
test("consecutive same-role messages merge", () => {
  const r = openaiToAnthropic([{ role: "user", content: "a" }, { role: "user", content: "b" }]);
  assert.equal(r.messages.length, 1);
  assert.equal(r.messages[0].content.length, 2);
});
test("tool_calls and tool results map to tool_use / tool_result", () => {
  const r = openaiToAnthropic([
    { role: "user", content: "transfer me" },
    { role: "assistant", content: "One moment.", tool_calls: [{ id: "call_1", type: "function", function: { name: "transfer_to_agent", arguments: '{"agent_number":0}' } }] },
    { role: "tool", tool_call_id: "call_1", content: "ok" },
    { role: "user", content: "hello?" },
  ]);
  const a = r.messages[1];
  assert.equal(a.content[1].type, "tool_use");
  assert.deepEqual(a.content[1].input, { agent_number: 0 });
  const u = r.messages[2];
  assert.equal(u.content[0].type, "tool_result");
  assert.equal(u.content[0].tool_use_id, "call_1");
  assert.equal(u.content[1].type, "text");
});
test("a tool_use with no result is dropped; an orphan tool result becomes text", () => {
  const r = openaiToAnthropic([
    { role: "user", content: "x" },
    { role: "assistant", content: "ok", tool_calls: [{ id: "c9", type: "function", function: { name: "end_call", arguments: "{}" } }] },
    { role: "user", content: "y" },
    { role: "tool", tool_call_id: "nope", content: "stray" },
  ]);
  assert.ok(!JSON.stringify(r.messages).includes("tool_use"));
  assert.match(JSON.stringify(r.messages), /\[tool result\] stray/);
});
test("bad arguments JSON becomes empty input; array content handled", () => {
  const r = openaiToAnthropic([
    { role: "user", content: [{ type: "text", text: "hi" }] },
    { role: "assistant", content: null, tool_calls: [{ id: "c", type: "function", function: { name: "x", arguments: "{bad" } }] },
    { role: "tool", tool_call_id: "c", content: "r" },
  ]);
  assert.deepEqual(r.messages[1].content[0].input, {});
});
test("tools convert to Anthropic input_schema", () => {
  const t = openaiToolsToAnthropic([{ type: "function", function: { name: "end_call", description: "d", parameters: { type: "object", properties: { reason: { type: "string" } } } } }, { type: "bogus" }]);
  assert.equal(t.length, 1);
  assert.equal(t[0].input_schema.properties.reason.type, "string");
});
test("sse parser handles chunk boundaries inside events", async () => {
  const enc = new TextEncoder();
  const s = 'event: a\ndata: {"type":"a","n":1}\n\nevent: b\ndata: {"type":"b"}\n\ndata: [DONE]\n\n';
  const stream = new ReadableStream({ start(c) { c.enqueue(enc.encode(s.slice(0, 17))); c.enqueue(enc.encode(s.slice(17, 45))); c.enqueue(enc.encode(s.slice(45))); c.close(); } });
  const got = [];
  for await (const e of sseEvents(stream)) got.push(e.type);
  assert.deepEqual(got, ["a", "b"]);
});
