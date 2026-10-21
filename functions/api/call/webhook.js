// POST /api/call/webhook  - ElevenLabs post-call webhook.
//
// Env: CALL_WEBHOOK_SECRET, RESEND_API_KEY, TO_EMAIL, CALL_FROM_EMAIL, CALL_DENYLIST
// Binding: CALLS_DB

import { getDb, first, all, run, nowSec } from "../../_lib/d1.js";
import { verifyElevenLabsSignature } from "../../_lib/hmac.js";
import { json, esc, clean } from "../../_lib/escape.js";
import { parseDenylist, scanAgentLines } from "../../_lib/filter.js";
import { releaseCall } from "../../_lib/budget.js";
import { UNVERIFIED_TYPES } from "../../_lib/message-types.js";

export const BANNER = "Caller identity not verified. Do not act on payment or bank details from this message.";
const RETENTION_SEC = 90 * 86400;
const MAX_BODY = 8_000_000;

export async function onRequestPost({ request, env, waitUntil }) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { error: "too large" });
  const v = await verifyElevenLabsSignature(raw, request.headers.get("elevenlabs-signature"), env.CALL_WEBHOOK_SECRET);
  if (!v.ok) return json(401, { error: "invalid signature" });

  let ev;
  try { ev = JSON.parse(raw); } catch { return json(400, { error: "bad json" }); }
  const db = getDb(env);
  const data = ev.data || {};

  if (ev.type === "post_call_audio") return json(200, { ignored: true }); // audio is off; never store it
  if (ev.type !== "post_call_transcription" && ev.type !== "call_initiation_failure") return json(200, { ignored: true });

  const convId = data.conversation_id ? String(data.conversation_id) : null;
  const dvId = data.conversation_initiation_client_data?.dynamic_variables?.call_id;
  let call = convId ? await first(db, "SELECT * FROM calls WHERE el_conversation_id = ?", convId) : null;
  if (!call && dvId && /^[0-9a-f]{32}$/.test(String(dvId))) call = await first(db, "SELECT * FROM calls WHERE call_id = ?", String(dvId));
  if (!call) return json(200, { ignored: "unknown call" });

  if (ev.type === "call_initiation_failure") {
    const c = await first(db, "UPDATE calls SET status = 'failed', finalized_at = ?1 WHERE call_id = ?2 AND finalized_at IS NULL RETURNING call_id", nowSec(), call.call_id);
    if (c) await releaseCall(db, call, 0);
    return json(200, { ok: true });
  }

  // ---- idempotent claim: only the first delivery wins ----
  const secs = Math.max(0, Number(data.metadata?.call_duration_secs) || 0);
  const used = Math.min(call.reserved_minutes || 0, Math.ceil(secs / 6) / 10);
  const transcript = Array.isArray(data.transcript) ? data.transcript.slice(0, 600).map((t) => ({
    role: t.role === "agent" ? "agent" : "user",
    message: clean(t.message, 4000),
    t: Number(t.time_in_call_secs) || 0,
  })) : [];
  const claimed = await first(
    db,
    `UPDATE calls SET status = 'ended', used_minutes = ?1, final_transcript = ?2, finalized_at = ?3
      WHERE call_id = ?4 AND finalized_at IS NULL RETURNING call_id`,
    used, JSON.stringify(transcript), nowSec(), call.call_id
  );
  if (claimed) await releaseCall(db, call, used);

  const row = await first(db, "SELECT * FROM calls WHERE call_id = ?", call.call_id);
  let emailOk = !!row.email_sent;
  if (!emailOk) {
    try {
      emailOk = await sendCallEmail(env, db, row, transcript, secs);
    } catch (e) {
      console.error("call email failed", e);
    }
    if (emailOk) await run(db, "UPDATE calls SET email_sent = 1 WHERE call_id = ?", call.call_id);
  }

  const cleanup = cleanupOld(db).catch((e) => console.error("cleanup", e));
  if (waitUntil) waitUntil(cleanup);
  else await cleanup;

  // A 500 makes ElevenLabs retry; the retry skips straight to the email.
  if (!emailOk) return json(500, { error: "email not sent" });
  return json(200, { ok: true });
}

export async function cleanupOld(db, now = nowSec()) {
  const cutoff = now - RETENTION_SEC;
  await run(db, "DELETE FROM turns WHERE call_id IN (SELECT call_id FROM calls WHERE created_at < ?)", cutoff);
  await run(db, "DELETE FROM messages WHERE call_id IN (SELECT call_id FROM calls WHERE created_at < ?)", cutoff);
  await run(db, "DELETE FROM messages WHERE created_at < ?", cutoff);
  await run(db, "DELETE FROM calls WHERE created_at < ?", cutoff);
  await run(db, "DELETE FROM ip_budgets WHERE day < ?", new Date((now - 3 * 86400) * 1000).toISOString().slice(0, 10));
  // calls that never got a webhook: stop counting them as active
  await run(db, "UPDATE calls SET status = 'expired' WHERE status = 'active' AND created_at < ?", now - 40 * 60);
}

export async function sendCallEmail(env, db, call, transcript, secs) {
  if (!env.RESEND_API_KEY || !env.TO_EMAIL || !env.CALL_FROM_EMAIL) {
    console.error("call email not configured");
    return false;
  }
  const msgs = (await all(db, "SELECT * FROM messages WHERE call_id = ? ORDER BY created_at", call.call_id))
    .map((m) => ({ ...m, fields: safeParse(m.fields) }));
  const turns = await all(db, "SELECT speaker, role_agent, text FROM turns WHERE call_id = ? ORDER BY seq", call.call_id);
  const lines = transcript.length
    ? transcript.map((t) => ({ who: t.role === "agent" ? "Agent" : "Caller", text: t.message, agent: t.role === "agent" }))
    : turns.map((t) => ({ who: t.speaker === "caller" ? "Caller" : `Agent (${t.role_agent})`, text: t.text, agent: t.speaker === "agent" }));

  const denylist = parseDenylist(env.CALL_DENYLIST);
  const scanHits = scanAgentLines(lines.filter((l) => l.agent).map((l) => l.text), denylist);
  const flagSet = new Set([...(call.flags || "").split(",").filter(Boolean), ...scanHits]);
  // blocked transfers and brain errors are informational, not content flags
  const flagged = [...flagSet].some((f) => !["transfer-blocked"].includes(f));

  const first = msgs[0];
  const outcome = first ? first.type : "no-message"; // fixed vocabulary only
  const ref = first ? first.ref : "no-ref";
  const subject = `[Call] ${outcome} ${ref}${flagged ? " [FLAG]" : ""}`;
  const unverified = msgs.some((m) => UNVERIFIED_TYPES.has(m.type));

  const mins = (secs / 60).toFixed(1);
  const head = [
    unverified ? BANNER : null,
    `Call ${call.call_id.slice(0, 8)}  mode ${call.mode}  ${mins} min  transfers ${call.transfers}  last role ${call.current_role}`,
    flagSet.size ? `Flags: ${[...flagSet].join(", ")}` : null,
  ].filter(Boolean);

  const msgText = msgs.map((m) => `--- ${m.ref} (${m.type}) ---\n` + flatten(m.fields)).join("\n\n") || "(no message taken)";
  const tr = lines.map((l) => `${l.who}: ${l.text}`).join("\n").slice(0, 30000);
  const text = head.join("\n") + "\n\nMessages\n" + msgText + "\n\nTranscript\n" + tr + "\n";

  const html =
    (unverified ? `<p style="font:600 15px system-ui,sans-serif;background:#fff3cd;border:1px solid #e0b000;padding:10px;">${esc(BANNER)}</p>` : "") +
    `<p style="font:14px system-ui,sans-serif;">${esc(head.filter((h) => h !== BANNER).join(" | "))}</p>` +
    `<h3 style="font-family:system-ui,sans-serif;">Messages</h3>` +
    (msgs.length
      ? msgs.map((m) => `<p style="font:14px system-ui,sans-serif;"><strong>${esc(m.ref)}</strong> (${esc(m.type)})<br><span style="white-space:pre-wrap;">${esc(flatten(m.fields))}</span></p>`).join("")
      : `<p style="font:14px system-ui,sans-serif;">(no message taken)</p>`) +
    `<h3 style="font-family:system-ui,sans-serif;">Transcript</h3><pre style="font:13px ui-monospace,monospace;white-space:pre-wrap;">${esc(tr)}</pre>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: env.CALL_FROM_EMAIL, to: [env.TO_EMAIL], subject, text, html }),
  });
  if (!res.ok) {
    console.error("resend failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
function flatten(obj, indent = "") {
  return Object.entries(obj || {}).map(([k, v]) =>
    v && typeof v === "object" ? `${indent}${k}:\n${flatten(v, indent + "  ")}` : `${indent}${k}: ${v}`
  ).join("\n");
}

export function onRequest() {
  return new Response("method not allowed", { status: 405, headers: { allow: "POST" } });
}
