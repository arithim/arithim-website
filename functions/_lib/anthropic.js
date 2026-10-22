// Anthropic Messages API over fetch (no SDK, no bundling).
import { sseEvents } from "./convert.js";

const URL = "https://api.anthropic.com/v1/messages";
const RETRYABLE = new Set([429, 500, 502, 503, 529]);

function headers(env) {
  const h = {
    "content-type": "application/json",
    "x-api-key": env.ANTHROPIC_API_KEY || "",
    "anthropic-version": "2023-06-01",
  };
  if (env.CALL_ANTHROPIC_BETA) h["anthropic-beta"] = env.CALL_ANTHROPIC_BETA;
  return h;
}

async function post(env, params, signal) {
  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(URL, { method: "POST", headers: headers(env), body: JSON.stringify(params), signal });
    if (res.ok || !RETRYABLE.has(res.status)) break;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 250));
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`anthropic ${res.status}`);
    err.status = res.status;
    err.detail = detail.slice(0, 500);
    throw err;
  }
  return res;
}

// Streams one assistant turn. onText(delta) is called for every text delta (thinking is never surfaced).
// Returns {content: assembled blocks, stopReason, usage}.
export async function anthropicStream({ env, params, signal, onText }) {
  const res = await post(env, { ...params, stream: true }, signal);
  const blocks = [];
  const partial = {};
  let stopReason = null;
  let usage = {};
  for await (const ev of sseEvents(res.body)) {
    switch (ev.type) {
      case "message_start":
        usage = { ...(ev.message?.usage || {}) };
        break;
      case "content_block_start": {
        const b = { ...ev.content_block };
        if (b.type === "text") b.text = b.text || "";
        if (b.type === "thinking") { b.thinking = b.thinking || ""; b.signature = b.signature || ""; }
        if (b.type === "tool_use") { b.input = {}; partial[ev.index] = ""; }
        blocks[ev.index] = b;
        break;
      }
      case "content_block_delta": {
        const b = blocks[ev.index];
        const d = ev.delta || {};
        if (!b) break;
        if (d.type === "text_delta") { b.text += d.text; onText?.(d.text); }
        else if (d.type === "input_json_delta") partial[ev.index] += d.partial_json || "";
        else if (d.type === "thinking_delta") b.thinking += d.thinking || "";
        else if (d.type === "signature_delta") b.signature = (b.signature || "") + (d.signature || "");
        break;
      }
      case "content_block_stop": {
        const b = blocks[ev.index];
        if (b && b.type === "tool_use") {
          try { b.input = partial[ev.index] ? JSON.parse(partial[ev.index]) : {}; } catch { b.input = {}; b.badJson = true; }
        }
        break;
      }
      case "message_delta":
        if (ev.delta?.stop_reason) stopReason = ev.delta.stop_reason;
        if (ev.usage) usage = { ...usage, ...ev.usage };
        break;
      case "error": {
        const err = new Error(`anthropic stream error: ${ev.error?.type || "unknown"}`);
        err.status = 0;
        throw err;
      }
    }
  }
  console.log(JSON.stringify({ at: "anthropic", model: params.model, in: usage.input_tokens, out: usage.output_tokens, cache_read: usage.cache_read_input_tokens, cache_write: usage.cache_creation_input_tokens }));
  return { content: blocks.filter(Boolean), stopReason, usage };
}

// Non-streaming single call; returns the concatenated text.
export async function anthropicText({ env, params, signal }) {
  const res = await post(env, { ...params, stream: false }, signal);
  const j = await res.json();
  return (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}
