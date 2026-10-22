// Housekeeping that must not depend on the ElevenLabs webhook. Run from /start (before reserving) and from the webhook.
// Every step is bounded (LIMIT) so one request never does unbounded work.

import { run, all, batch, nowSec } from "./d1.js";
import { finalizeCall } from "./budget.js";
import { retryUnsentEmails } from "./call-email.js";

export const RETENTION_SEC = 90 * 86400;
const NEVER_CONNECTED_SEC = 20 * 60; // a call with no logged turn after this long never connected (the cap is 15 minutes)
const NO_WEBHOOK_SEC = 40 * 60;      // a connected call with no webhook after this long
const SWEEP_LIMIT = 25;
const DELETE_LIMIT = 50;

// Expire active calls that will never get a webhook and give their reservation back. The claim and the release are one
// batch (finalizeCall), so a late webhook or a second sweep releases nothing twice.
export async function expireStaleCalls(db, now = nowSec(), limit = SWEEP_LIMIT) {
  const rows = await all(
    db,
    `SELECT * FROM calls
      WHERE status = 'active' AND finalized_at IS NULL AND mode = 'voice'
        AND (created_at < ?1 - ?3 OR (created_at < ?1 - ?4 AND NOT EXISTS (SELECT 1 FROM turns t WHERE t.call_id = calls.call_id)))
      ORDER BY created_at LIMIT ?2`,
    now, limit, NO_WEBHOOK_SEC, NEVER_CONNECTED_SEC
  );
  let n = 0;
  for (const call of rows) if (await finalizeCall(db, call, { status: "expired", usedMinutes: 0, at: now })) n++;
  // text conversations hold no minutes; just stop counting them as active
  await run(db, "UPDATE calls SET status = 'expired' WHERE status = 'active' AND mode = 'text' AND created_at < ?", now - NO_WEBHOOK_SEC);
  return n;
}

// 90-day retention, a bounded slice per run (oldest first). The same sub-select picks the calls for all three deletes.
export async function deleteOld(db, now = nowSec(), limit = DELETE_LIMIT) {
  const cutoff = now - RETENTION_SEC;
  const pick = "SELECT call_id FROM calls WHERE created_at < ?1 ORDER BY created_at LIMIT ?2";
  await batch(db, [
    [`DELETE FROM turns WHERE call_id IN (${pick})`, cutoff, limit],
    [`DELETE FROM messages WHERE call_id IN (${pick})`, cutoff, limit],
    [`DELETE FROM calls WHERE call_id IN (${pick})`, cutoff, limit],
    ["DELETE FROM messages WHERE ref IN (SELECT ref FROM messages WHERE created_at < ?1 LIMIT ?2)", cutoff, limit],
    ["DELETE FROM ip_budgets WHERE rowid IN (SELECT rowid FROM ip_budgets WHERE day < ?1 LIMIT 200)", new Date((now - 3 * 86400) * 1000).toISOString().slice(0, 10)],
  ]);
}

// Client diagnostics (migration 0003) live 30 days. Separate and tolerant so a missing table never blocks the 90-day deletes.
export async function deleteOldDiag(db, now = nowSec()) {
  try { await run(db, "DELETE FROM call_diag WHERE rowid IN (SELECT rowid FROM call_diag WHERE created_at < ? LIMIT 200)", now - 30 * 86400); } catch {}
}

// Release stale reservations and delete expired rows. No email, so it is safe to await.
export async function cleanupOld(db, now = nowSec()) {
  await expireStaleCalls(db, now);
  await deleteOld(db, now);
  await deleteOldDiag(db, now);
}

// Everything, including bounded email retries (network). Never throws.
export async function runMaintenance(env, db, now = nowSec()) {
  try { await deleteOld(db, now); } catch (e) { console.error("deleteOld", e); }
  await deleteOldDiag(db, now);
  try { await retryUnsentEmails(env, db, { now }); } catch (e) { console.error("email retry", e); }
}
