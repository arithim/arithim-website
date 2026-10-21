// POST /api/call/webhook  - ElevenLabs post-call webhook.
//
// Env: CALL_WEBHOOK_SECRET, RESEND_API_KEY, TO_EMAIL, CALL_FROM_EMAIL, CALL_DENYLIST
// Binding: CALLS_DB

import { getDb, first, nowSec } from "../../_lib/d1.js";
import { verifyElevenLabsSignature } from "../../_lib/hmac.js";
import { json, clean } from "../../_lib/escape.js";
import { finalizeCall } from "../../_lib/budget.js";
import { BANNER, sendCallEmail, sendCallEmailOnce } from "../../_lib/call-email.js";
import { cleanupOld, runMaintenance } from "../../_lib/cleanup.js";

export { BANNER, sendCallEmail, cleanupOld };
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

  // Housekeeping and email retries run in the background; they never decide this response.
  const background = async (p) => { const q = p.catch((e) => console.error("background", e)); if (waitUntil) waitUntil(q); else await q; };
  const housekeeping = async () => { await cleanupOld(db); await runMaintenance(env, db); };

  if (ev.type === "call_initiation_failure") {
    await finalizeCall(db, call, { status: "failed", usedMinutes: 0, at: nowSec() });
    await background(housekeeping());
    return json(200, { ok: true });
  }

  // ---- idempotent claim: only the first delivery wins; the budget release is in the same transaction ----
  const secs = Math.max(0, Number(data.metadata?.call_duration_secs) || 0);
  const used = Math.min(call.reserved_minutes || 0, Math.ceil(secs / 6) / 10);
  const transcript = Array.isArray(data.transcript) ? data.transcript.slice(0, 600).map((t) => ({
    role: t.role === "agent" ? "agent" : "user",
    message: clean(t.message, 4000),
    t: Number(t.time_in_call_secs) || 0,
  })) : [];
  const claimed = await finalizeCall(db, call, { status: "ended", usedMinutes: used, transcript: JSON.stringify(transcript), at: nowSec() });
  if (!claimed) {
    // A late webhook for a call we already expired: keep the real transcript and usage for the record, release nothing again.
    await first(
      db,
      `UPDATE calls SET status = 'ended', used_minutes = ?1, final_transcript = ?2
        WHERE call_id = ?3 AND status = 'expired' AND final_transcript IS NULL RETURNING call_id`,
      used, JSON.stringify(transcript), call.call_id
    );
  }

  // The record is stored: acknowledge with 200 whatever happens to the email, so ElevenLabs never disables the endpoint
  // over a Resend problem. email_sent stays 0 on failure and the email is retried on the next webhook or /start.
  let emailOk = false;
  try { emailOk = await sendCallEmailOnce(env, db, call.call_id, { secs }); } catch (e) { console.error("call email", e); }
  await background(housekeeping());
  return json(200, { ok: true, email: emailOk ? "sent" : "pending" });
}

export function onRequest() {
  return new Response("method not allowed", { status: 405, headers: { allow: "POST" } });
}
