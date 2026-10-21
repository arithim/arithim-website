// POST /api/call/llm/<role>
// OpenAI-compatible streaming "custom LLM" endpoint for ElevenLabs Agents. See tools/call-agent/docs/elevenlabs-integration.md.
//
// Env: CALL_LLM_SECRET, ANTHROPIC_API_KEY, CALL_TALKER_MODEL, CALL_THINKER_MODEL, CALL_DENYLIST, CALL_MOCK
// Binding: CALLS_DB

import { ROLES } from "../../../_lib/call-knowledge.generated.js";
import { safeEqual } from "../../../_lib/hmac.js";
import { getDb, first, run, all, nowSec } from "../../../_lib/d1.js";
import { CALL_ID_RE } from "../../../_lib/ids.js";
import { parseDenylist } from "../../../_lib/filter.js";
import { chunk } from "../../../_lib/convert.js";
import { json } from "../../../_lib/escape.js";
import { runBrain, bearerOrSecret, extractCallRef, logTurn, addFlags, TEXT_CAP_LINE } from "../../../_lib/brain.js";

const MAX_BODY = 400_000;
const GRACE_SEC = 10 * 60; // beyond the 15 minute cap

export async function handle({ request, env, params, waitUntil }) {
  if (request.method !== "POST") return new Response("method not allowed", { status: 405, headers: { allow: "POST" } });

  if (!env.CALL_LLM_SECRET || !safeEqual(bearerOrSecret(request), env.CALL_LLM_SECRET)) {
    return json(401, { error: { message: "unauthorized", type: "auth" } });
  }
  const role = String(params?.role || "");
  if (!Object.prototype.hasOwnProperty.call(ROLES, role)) return json(404, { error: { message: "unknown role" } });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { error: { message: "too large" } });
  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: { message: "invalid json" } }); }
  if (!body || !Array.isArray(body.messages)) return json(400, { error: { message: "messages required" } });

  const db = getDb(env);
  const ref = extractCallRef(request, body);
  // The ElevenLabs conversation id is mandatory (X-Conversation-Id): it is what ties this call to ONE voice session.
  if (!ref.conversationId) return json(400, { error: { message: "conversation id required" } });
  let call = null;
  if (ref.callId && CALL_ID_RE.test(ref.callId)) call = await first(db, "SELECT * FROM calls WHERE call_id = ?", ref.callId);
  else call = await first(db, "SELECT * FROM calls WHERE el_conversation_id = ?", ref.conversationId);
  if (!call) return json(404, { error: { message: "unknown call" } });
  if (call.el_conversation_id) {
    if (call.el_conversation_id !== ref.conversationId) return json(404, { error: { message: "unknown call" } });
  } else {
    // First request for this call: bind the conversation id. Later requests with a different id are rejected.
    let bound = null;
    try {
      bound = await first(db, "UPDATE calls SET el_conversation_id = ?1 WHERE call_id = ?2 AND el_conversation_id IS NULL RETURNING call_id", ref.conversationId, call.call_id);
    } catch (e) { console.error("bind conversation", e); } // unique index: that conversation id already belongs to another call
    if (!bound) {
      const again = await first(db, "SELECT el_conversation_id FROM calls WHERE call_id = ?", call.call_id);
      if (!again || again.el_conversation_id !== ref.conversationId) return json(404, { error: { message: "unknown call" } });
    }
    call.el_conversation_id = ref.conversationId;
  }
  if (call.status !== "active" || nowSec() - call.created_at > 15 * 60 + GRACE_SEC) return json(410, { error: { message: "call not active" } });

  const lastMsg = body.messages[body.messages.length - 1];
  const callerText = lastMsg && lastMsg.role === "user" ? (typeof lastMsg.content === "string" ? lastMsg.content : (lastMsg.content || []).map((p) => p?.text || "").join("")) : "";
  const roleChanged = call.current_role !== role;
  const bg = (p) => (waitUntil ? waitUntil(p) : p);
  // Serialise the logging writes so seq order is caller then agent.
  let logChain = Promise.resolve();
  const enqueue = (fn) => { logChain = logChain.then(fn).catch((e) => console.error("log", e)); return logChain; };
  if (roleChanged) enqueue(() => run(db, "UPDATE calls SET current_role = ? WHERE call_id = ?", role, call.call_id));
  if (callerText.trim()) enqueue(() => logTurn(db, call.call_id, role, "caller", callerText, { dedupeWindow: roleChanged ? 3 : 1 }));

  const model = body.model || "arithim-call";
  const id = "chatcmpl-" + call.call_id.slice(0, 12) + "-" + Math.random().toString(36).slice(2, 8);
  const denylist = parseDenylist(env.CALL_DENYLIST);
  const wantStream = body.stream !== false;

  // Text-mode turn cap
  let capped = false;
  if (call.mode === "text") {
    const cfg = await first(db, "SELECT text_turns_cap FROM config WHERE id = 1");
    const n = await first(db, "SELECT COUNT(*) AS n FROM turns WHERE call_id = ? AND speaker = 'caller'", call.call_id);
    capped = (n?.n || 0) > (cfg?.text_turns_cap || 40);
  }

  // Stop work when ElevenLabs drops the request (barge-in) or after 30 s.
  const timeout = AbortSignal.timeout(30_000);
  const signal = typeof AbortSignal.any === "function" && request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
  let heard = null; // streaming only: the text that was written before any abort
  const events = [];
  let sink = (e) => events.push(e);
  const work = async () => {
    let result;
    if (capped) {
      sink({ type: "text", text: TEXT_CAP_LINE + " " });
      if ((body.tools || []).some((t) => t?.function?.name === "end_call")) sink({ type: "tool_call", id: "call_cap", name: "end_call", arguments: JSON.stringify({ reason: "text turn cap reached" }) });
      result = { finish: (body.tools || []).some((t) => t?.function?.name === "end_call") ? "tool_calls" : "stop", spoken: TEXT_CAP_LINE, hits: [] };
    } else {
      result = await runBrain({ env, db, call, role, body, emit: (e) => sink(e), denylist, signal });
    }
    // Log what was actually written to the stream (streaming) rather than everything the model generated.
    const logged = heard !== null ? heard.trim() : result.spoken;
    if (logged) enqueue(() => logTurn(db, call.call_id, role, "agent", logged));
    if (result.hits.length) enqueue(() => addFlags(db, call.call_id, result.hits));
    bg(logChain);
    return result;
  };

  if (!wantStream) {
    const result = await work();
    const text = events.filter((e) => e.type === "text").map((e) => e.text).join("").trim();
    const tc = events.find((e) => e.type === "tool_call");
    return json(200, {
      id, object: "chat.completion", created: nowSec(), model,
      choices: [{ index: 0, finish_reason: result.finish, message: { role: "assistant", content: text || null, ...(tc ? { tool_calls: [{ id: tc.id, type: "function", function: { name: tc.name, arguments: tc.arguments } }] } : {}) } }],
    });
  }

  const { readable, writable } = new TransformStream();
  const w = writable.getWriter();
  const enc = new TextEncoder();
  const send = (obj) => w.write(enc.encode(`data: ${typeof obj === "string" ? obj : JSON.stringify(obj)}\n\n`)).catch(() => {}); // the client may have gone
  let started = false;
  heard = "";
  sink = (e) => {
    if (request.signal?.aborted) return; // client gone: write and log nothing
    if (e.type === "text") heard += e.text;
    if (!started) { started = true; send(chunk(id, model, { role: "assistant", content: "" })); }
    if (e.type === "text") send(chunk(id, model, { content: e.text }));
    else if (e.type === "tool_call") {
      send(chunk(id, model, { tool_calls: [{ index: 0, id: e.id, type: "function", function: { name: e.name, arguments: "" } }] }));
      send(chunk(id, model, { tool_calls: [{ index: 0, function: { arguments: e.arguments } }] }));
    }
  };
  const done = (async () => {
    try {
      const result = await work();
      if (!started) sink({ type: "text", text: "" });
      await send(chunk(id, model, {}, result.finish));
    } catch (e) {
      console.error("llm handler", e);
      await send(chunk(id, model, { content: "I'm sorry, I'm having trouble on my side. Please email hello@arithim.com. " }, "stop"));
    } finally {
      await send("[DONE]");
      try { await w.close(); } catch {}
    }
  })();
  bg(done);
  return new Response(readable, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}

export const onRequestPost = handle;
export function onRequest(ctx) {
  return handle(ctx);
}
