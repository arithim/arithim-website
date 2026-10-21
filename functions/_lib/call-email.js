// The call email to Tarun: built from the stored record, sent at most once, retried until it goes.
// email_sent: 0 = not sent, 1 = sent, >1 = a send is in progress, the value is the unix time it started.

import { first, all, run, nowSec } from "./d1.js";
import { esc, clean } from "./escape.js";
import { parseDenylist, scanAgentLines } from "./filter.js";
import { UNVERIFIED_TYPES } from "./message-types.js";

export const BANNER = "Caller identity not verified. Do not act on payment or bank details from this message.";
const SEND_STALE_SEC = 10 * 60;
// Bank / payment wording in what the caller said or in the message the model recorded
const PAYMENT_RE = /\b(?:sort\s*code|iban|swift|bic|account\s+number|bank\s+(?:account|details|transfer)|account\s+details|routing\s+number|change\s+(?:of\s+)?(?:bank|payment)\s+details)\b/i;

// Claim the right to send (one sender at a time), send, then mark sent (1) or release the claim (0).
// Returns true if the email is now sent (by us or earlier), false if it failed or another sender holds it.
export async function sendCallEmailOnce(env, db, callId, { secs } = {}) {
  const now = nowSec();
  const done = await first(db, "SELECT email_sent FROM calls WHERE call_id = ?", callId);
  if (!done) return false;
  if (done.email_sent === 1) return true;
  const claimed = await first(
    db,
    "UPDATE calls SET email_sent = ?1 WHERE call_id = ?2 AND (email_sent = 0 OR (email_sent > 1 AND email_sent < ?3)) RETURNING call_id",
    now, callId, now - SEND_STALE_SEC
  );
  if (!claimed) return false;
  let ok = false;
  try {
    const row = await first(db, "SELECT * FROM calls WHERE call_id = ?", callId);
    let transcript = [];
    try { const t = JSON.parse(row.final_transcript || "[]"); if (Array.isArray(t)) transcript = t; } catch {}
    ok = await sendCallEmail(env, db, row, transcript, secs ?? (row.used_minutes || 0) * 60);
  } catch (e) {
    console.error("call email failed", e);
  }
  await run(db, "UPDATE calls SET email_sent = ?1 WHERE call_id = ?2", ok ? 1 : 0, callId);
  return ok;
}

// Unsent emails for finished calls (and for expired calls that still took a message). Bounded.
export async function retryUnsentEmails(env, db, { now = nowSec(), limit = 3 } = {}) {
  const rows = await all(
    db,
    `SELECT call_id FROM calls
      WHERE (email_sent = 0 OR (email_sent > 1 AND email_sent < ?1))
        AND finalized_at IS NOT NULL AND finalized_at < ?2
        AND (status = 'ended' OR (status = 'expired' AND EXISTS (SELECT 1 FROM messages m WHERE m.call_id = calls.call_id)))
      ORDER BY finalized_at LIMIT ?3`,
    now - SEND_STALE_SEC, now - 60, limit
  );
  let sent = 0;
  for (const r of rows) if (await sendCallEmailOnce(env, db, r.call_id)) sent++;
  return sent;
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
  // The filter applies to what the agent said. The caller's own words are never filtered, only scanned for bank wording.
  const scanHits = scanAgentLines(lines.filter((l) => l.agent).map((l) => l.text), denylist);
  const paymentWording = lines.some((l) => !l.agent && PAYMENT_RE.test(l.text || "")) || msgs.some((m) => PAYMENT_RE.test(flatten(m.fields)));
  const flagSet = new Set([...(call.flags || "").split(",").filter(Boolean), ...scanHits, ...(paymentWording ? ["payment-details"] : [])]);
  // blocked transfers and brain errors are informational, not content flags
  const flagged = [...flagSet].some((f) => !["transfer-blocked"].includes(f));

  const first = msgs[0];
  const outcome = first ? first.type : "no-message"; // fixed vocabulary only
  const ref = first ? first.ref : "no-ref";
  const subject = `[Call] ${outcome} ${ref}${flagged ? " [FLAG]" : ""}`;
  const paymentRisk = paymentWording || msgs.some((m) => UNVERIFIED_TYPES.has(m.type));

  const mins = (secs / 60).toFixed(1);
  const head = [
    `Call ${call.call_id.slice(0, 8)}  mode ${call.mode}  ${mins} min  transfers ${call.transfers}  last role ${call.current_role}`,
    flagSet.size ? `Flags: ${[...flagSet].join(", ")}` : null,
  ].filter(Boolean);

  const msgText = msgs.map((m) => `--- ${m.ref} (${m.type}) ---\n` + flatten(m.fields)).join("\n\n") || "(no message taken)";
  const tr = lines.map((l) => `${l.who}: ${clean(l.text, 4000)}`).join("\n").slice(0, 30000);
  // The banner is on EVERY call email; the model-chosen message type only decides how loud it is.
  const text = BANNER + "\n" + head.join("\n") + "\n\nMessages\n" + msgText + "\n\nTranscript\n" + tr + "\n";

  const bannerStyle = paymentRisk
    ? "font:700 15px system-ui,sans-serif;background:#fde2e2;border:2px solid #c00000;color:#7a0000;padding:10px;"
    : "font:600 14px system-ui,sans-serif;background:#fff3cd;border:1px solid #e0b000;padding:8px;";
  const html =
    `<p style="${bannerStyle}">${esc(BANNER)}</p>` +
    `<p style="font:14px system-ui,sans-serif;">${esc(head.join(" | "))}</p>` +
    `<h3 style="font-family:system-ui,sans-serif;">Messages</h3>` +
    (msgs.length
      ? msgs.map((m) => `<p style="font:14px system-ui,sans-serif;"><strong>${esc(m.ref)}</strong> (${esc(m.type)})<br><span style="white-space:pre-wrap;">${esc(flatten(m.fields))}</span></p>`).join("")
      : `<p style="font:14px system-ui,sans-serif;">(no message taken)</p>`) +
    `<h3 style="font-family:system-ui,sans-serif;">Transcript</h3><pre style="font:13px ui-monospace,monospace;white-space:pre-wrap;">${esc(tr)}</pre>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: env.CALL_FROM_EMAIL, to: [env.TO_EMAIL], subject, text, html }),
    signal: AbortSignal.timeout(10_000),
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
