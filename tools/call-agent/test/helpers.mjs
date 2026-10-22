// Test helpers: a D1 shim over node:sqlite and a scripted Anthropic streaming mock.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const MIGRATION = join(here, "../../../migrations/0001_calls.sql");
export const MIGRATION2 = join(here, "../../../migrations/0002_step0_log.sql");

class Stmt {
  constructor(db, sql) { this.stmt = db.prepare(sql); this.args = []; }
  bind(...a) { this.args = a; return this; }
  async run() { const r = this.stmt.run(...this.args); return { success: true, meta: { changes: Number(r.changes) } }; }
  async first() { const r = this.stmt.get(...this.args); return r === undefined ? null : { ...r }; }
  async all() { return { results: this.stmt.all(...this.args).map((r) => ({ ...r })) }; }
}

export function makeDb({ enabled = true } = {}) {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync(MIGRATION, "utf8"));
  raw.exec(readFileSync(MIGRATION2, "utf8"));
  if (enabled) raw.exec("UPDATE config SET calls_enabled = 1, front_desk_agent_id_prod = 'agent_prod', front_desk_agent_id_preview = 'agent_prev' WHERE id = 1");
  // D1 batch: statements run in order inside one transaction
  const batch = async (stmts) => {
    raw.exec("BEGIN");
    try { const out = []; for (const st of stmts) out.push(await st.run()); raw.exec("COMMIT"); return out; }
    catch (e) { raw.exec("ROLLBACK"); throw e; }
  };
  return { raw, prepare: (sql) => new Stmt(raw, sql), batch };
}

export async function seedCall(db, over = {}) {
  const c = { call_id: "a".repeat(32), created_at: Math.floor(Date.now() / 1000), day: new Date().toISOString().slice(0, 10), ip_key: "ip1", mode: "voice", reserved_minutes: 15, ...over };
  await db.prepare("INSERT INTO calls (call_id, created_at, day, ip_key, mode, status, reserved_minutes, el_conversation_id) VALUES (?,?,?,?,?, 'active', ?, ?)")
    .bind(c.call_id, c.created_at, c.day, c.ip_key, c.mode, c.reserved_minutes, c.el_conversation_id || null).run();
  return c;
}

// ---- Anthropic SSE mock ----
const enc = new TextEncoder();

// blocks: [{type:'text', text}, {type:'tool_use', name, input, id}] ; text is split into small deltas
export function anthropicSse(blocks, stopReason = "end_turn", { splitSize = 7 } = {}) {
  const ev = [{ type: "message_start", message: { usage: { input_tokens: 10, cache_read_input_tokens: 5 } } }];
  blocks.forEach((b, index) => {
    if (b.type === "text") {
      ev.push({ type: "content_block_start", index, content_block: { type: "text", text: "" } });
      for (let i = 0; i < b.text.length; i += splitSize) ev.push({ type: "content_block_delta", index, delta: { type: "text_delta", text: b.text.slice(i, i + splitSize) } });
    } else if (b.type === "tool_use") {
      ev.push({ type: "content_block_start", index, content_block: { type: "tool_use", id: b.id || `toolu_${index}${b.name}`, name: b.name, input: {} } });
      const j = JSON.stringify(b.input || {});
      ev.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: j.slice(0, 5) } });
      ev.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: j.slice(5) } });
    }
    ev.push({ type: "content_block_stop", index });
  });
  ev.push({ type: "message_delta", delta: { stop_reason: stopReason }, usage: { output_tokens: 20 } });
  ev.push({ type: "message_stop" });
  const body = ev.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  // deliver in two network chunks to exercise the parser's buffering
  const mid = Math.floor(body.length / 2);
  const stream = new ReadableStream({ start(c) { c.enqueue(enc.encode(body.slice(0, mid))); c.enqueue(enc.encode(body.slice(mid))); c.close(); } });
  return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
}

// Install a fetch mock. script: array of Response | (req)=>Response. Returns {calls, restore}.
export function mockFetch(script, { other } = {}) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const body = init.body && typeof init.body === "string" ? safe(init.body) : init.body;
    calls.push({ url: u, init, body });
    if (u.startsWith("https://api.anthropic.com/")) {
      const next = script.shift();
      if (!next) throw new Error("mockFetch: no scripted anthropic response left");
      return typeof next === "function" ? next({ url: u, init, body }) : next;
    }
    if (other) return other(u, init, body);
    throw new Error("mockFetch: unexpected fetch " + u);
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}
const safe = (s) => { try { return JSON.parse(s); } catch { return s; } };

export function llmRequest(role, messages, { secret = "s3cret", callId = "a".repeat(32), conversationId = "conv_a", tools, headers = {}, stream = true } = {}) {
  return new Request(`https://arithim.com/api/call/llm/${role}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-call-secret": secret, "x-call-id": callId, "x-conversation-id": conversationId, ...headers },
    body: JSON.stringify({ model: "x", stream, messages, ...(tools ? { tools } : {}) }),
  });
}

// Parse our SSE output into {text, toolCalls, finish, done}
export async function readSse(res) {
  const raw = await res.text();
  let text = ""; const toolCalls = []; let finish = null; let done = false;
  for (const block of raw.split("\n\n")) {
    const line = block.trim();
    if (!line.startsWith("data:")) continue;
    const d = line.slice(5).trim();
    if (d === "[DONE]") { done = true; continue; }
    const j = JSON.parse(d);
    const ch = j.choices[0];
    if (ch.delta?.content) text += ch.delta.content;
    for (const tc of ch.delta?.tool_calls || []) {
      if (tc.id) toolCalls[tc.index] = { id: tc.id, name: tc.function.name, arguments: tc.function.arguments || "" };
      else toolCalls[tc.index].arguments += tc.function.arguments || "";
    }
    if (ch.finish_reason) finish = ch.finish_reason;
  }
  return { text: text.trim(), toolCalls, finish, done };
}

export const EL_TOOLS = [
  { type: "function", function: { name: "transfer_to_agent", description: "transfer", parameters: { type: "object", properties: { agent_number: { type: "integer" }, reason: { type: "string" } }, required: ["agent_number"] } } },
  { type: "function", function: { name: "end_call", description: "end", parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] } } },
  { type: "function", function: { name: "transfer_to_number", description: "phone", parameters: { type: "object", properties: {} } } },
];
