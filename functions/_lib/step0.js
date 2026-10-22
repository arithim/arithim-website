// Step-0 scripted brain (preview only). Enabled by env CALL_STEP0_SCRIPT === "1" on a host that is not arithim.com / www.arithim.com
// (and CALL_ENV is not "prod"). It skips Anthropic, replies deterministically and logs what ElevenLabs actually sends, to answer
// the step-0 questions in arithim-ops/call-agent/RUNBOOK.md without spending model tokens. Never logs the secret value.

import { run, nowSec } from "./d1.js";
import { ROLES } from "./call-knowledge.generated.js";

const PROD_HOSTS = new Set(["arithim.com", "www.arithim.com"]);

export function step0Enabled(env, request) {
  if (!env || env.CALL_STEP0_SCRIPT !== "1") return false;
  if (env.CALL_ENV === "prod") return false;
  let host = "";
  try { host = new URL(request.url).hostname.toLowerCase(); } catch { return false; }
  return !PROD_HOSTS.has(host);
}

// Transfer rule order per agent (index = agent_number), from agents/<role>.json.
export const TRANSFER_ORDER = {
  "front-desk": ["consulting", "tsg", "customer-desk"],
  consulting: ["front-desk", "tsg", "customer-desk"],
  tsg: ["front-desk", "consulting", "customer-desk"],
  "customer-desk": ["front-desk", "consulting", "tsg"],
};

const TARGETS = [
  [/transfer to consulting/i, "consulting"],
  [/transfer to tsg/i, "tsg"],
  [/transfer to (the )?(customer desk|front desk)/i, null], // resolved below
];

export function parseIntent(text) {
  const t = String(text || "");
  if (/end call/i.test(t)) return { kind: "end" };
  if (/transfer to (the )?customer desk/i.test(t)) return { kind: "transfer", target: "customer-desk" };
  if (/transfer to (the )?front desk/i.test(t)) return { kind: "transfer", target: "front-desk" };
  for (const [re, target] of TARGETS) if (target && re.test(t)) return { kind: "transfer", target };
  return { kind: "reply" };
}

const cut = (s, n) => (s == null ? null : String(s).slice(0, n));

export async function step0Log(db, request, { role, body, authOk, ref, action }) {
  try {
    const h = request.headers;
    const names = [...h.keys()].sort();
    const tools = Array.isArray(body?.tools) ? body.tools : [];
    const tn = tools.map((t) => t?.function?.name || t?.name || "?");
    const tt = tools.find((t) => (t?.function?.name || t?.name) === "transfer_to_agent");
    const lastUser = Array.isArray(body?.messages) ? [...body.messages].reverse().find((m) => m?.role === "user") : null;
    const lu = lastUser ? (typeof lastUser.content === "string" ? lastUser.content : JSON.stringify(lastUser.content)) : null;
    const secretHeader = h.get("x-call-secret") ? "x-call-secret" : (h.get("authorization") || "").toLowerCase().startsWith("bearer ") ? "authorization" : "none";
    let path = "";
    try { path = new URL(request.url).pathname; } catch {}
    await run(db,
      "INSERT INTO step0_log (ts, role, method, path, auth_ok, header_names, secret_header, call_id, conversation_id, tool_names, body_keys, msg_count, last_user, tool_info, action) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      nowSec(), role || null, request.method, path, authOk ? 1 : 0, JSON.stringify(names), secretHeader,
      cut(ref?.callId, 80), cut(ref?.conversationId, 80), JSON.stringify(tn), JSON.stringify(body && typeof body === "object" ? Object.keys(body) : []),
      Array.isArray(body?.messages) ? body.messages.length : null, cut(lu, 200), tt ? cut(JSON.stringify(tt), 1500) : null, action || null);
  } catch (e) { console.error("step0 log", e); }
}

// Deterministic brain. emit({type:'text'|'tool_call'}). transferGate(): Promise<boolean> true if the transfer limit allows it.
export async function step0Brain({ role, body, emit, transferGate }) {
  const tools = Array.isArray(body?.tools) ? body.tools : [];
  const has = (n) => tools.some((t) => (t?.function?.name || t?.name) === n);
  const last = [...(body?.messages || [])].reverse().find((m) => m?.role === "user");
  const text = last ? (typeof last.content === "string" ? last.content : (last.content || []).map((p) => p?.text || "").join("")) : "";
  const intent = parseIntent(text);
  const name = ROLES[role]?.displayName || role;
  if (intent.kind === "end" && has("end_call")) {
    emit({ type: "tool_call", id: "call_s0end", name: "end_call", arguments: JSON.stringify({ reason: "step0 end call" }) });
    return { finish: "tool_calls", spoken: "", action: "end_call" };
  }
  if (intent.kind === "transfer") {
    const idx = TRANSFER_ORDER[role]?.indexOf(intent.target) ?? -1;
    if (idx < 0) { const s = `Step zero test reply from ${name}.`; emit({ type: "text", text: s }); return { finish: "stop", spoken: s, action: "reply(no-self-transfer)" }; }
    if (!has("transfer_to_agent")) { const s = `Step zero: no transfer tool offered to ${name}.`; emit({ type: "text", text: s }); return { finish: "stop", spoken: s, action: "reply(no-tool)" }; }
    if (!(await transferGate())) { const s = `Step zero: transfer refused, limit reached. This is still ${name}.`; emit({ type: "text", text: s }); return { finish: "stop", spoken: s, action: "transfer-blocked" }; }
    emit({ type: "tool_call", id: "call_s0xfer", name: "transfer_to_agent", arguments: JSON.stringify({ agent_number: idx, reason: "step0 scripted" }) });
    return { finish: "tool_calls", spoken: "", action: `transfer(${intent.target}=${idx})` };
  }
  const s = `Step zero test reply from ${name}.`;
  emit({ type: "text", text: s });
  return { finish: "stop", spoken: s, action: "reply" };
}
