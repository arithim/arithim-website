// Budget reservation and release. Every reservation is ONE statement of the form
//   UPDATE ... SET x = x + ? WHERE x + ? <= cap RETURNING ...
// so two concurrent requests cannot both pass the check. Zero rows returned means refused.

import { first, run, batch, changes, dayKey, monthKey } from "./d1.js";

export const FULL_RESERVATION_MINUTES = 15;

async function ensureRows(db, ipKeyV, day) {
  await run(db, "INSERT OR IGNORE INTO budgets (day) VALUES (?)", day);
  await run(db, "INSERT OR IGNORE INTO ip_budgets (ip_key, day) VALUES (?, ?)", ipKeyV, day);
}

// Per IP per day: calls and minutes. Returns true if reserved.
export async function reserveIp(db, ipKeyV, day, minutes, cfg) {
  await ensureRows(db, ipKeyV, day);
  const row = await first(
    db,
    `UPDATE ip_budgets SET calls = calls + 1, minutes = minutes + ?1
      WHERE ip_key = ?2 AND day = ?3 AND calls + 1 <= ?4 AND minutes + ?1 <= ?5
      RETURNING calls, minutes`,
    minutes, ipKeyV, day, cfg.ip_day_calls_cap, cfg.ip_day_minutes_cap
  );
  return !!row;
}

export async function releaseIp(db, ipKeyV, day, minutes, { callToo = true } = {}) {
  await run(
    db,
    `UPDATE ip_budgets SET calls = MAX(0, calls - ?1), minutes = MAX(0, minutes - ?2)
      WHERE ip_key = ?3 AND day = ?4`,
    callToo ? 1 : 0, minutes, ipKeyV, day
  );
}

// Global per day and per calendar month. Month total = sum of the day rows in that month.
export async function reserveGlobal(db, day, minutes, cfg) {
  await run(db, "INSERT OR IGNORE INTO budgets (day) VALUES (?)", day);
  const row = await first(
    db,
    `UPDATE budgets SET reserved_minutes = reserved_minutes + ?1
      WHERE day = ?2 AND reserved_minutes + ?1 <= ?3
        AND (SELECT COALESCE(SUM(reserved_minutes), 0) FROM budgets WHERE substr(day, 1, 7) = ?4) + ?1 <= ?5
      RETURNING reserved_minutes`,
    minutes, day, cfg.day_minutes_cap, day.slice(0, 7), cfg.month_minutes_cap
  );
  return !!row;
}

export async function releaseGlobal(db, day, reservedMinutes, usedMinutes) {
  const unused = Math.max(0, reservedMinutes - usedMinutes);
  await run(
    db,
    `UPDATE budgets SET reserved_minutes = MAX(0, reserved_minutes - ?1), used_minutes = used_minutes + ?2 WHERE day = ?3`,
    unused, usedMinutes, day
  );
}

// Text conversations: per day globally and per IP.
export async function reserveText(db, ipKeyV, day, cfg) {
  await ensureRows(db, ipKeyV, day);
  const ip = await first(
    db,
    `UPDATE ip_budgets SET text_conversations = text_conversations + 1
      WHERE ip_key = ?1 AND day = ?2 AND text_conversations + 1 <= ?3 RETURNING text_conversations`,
    ipKeyV, day, cfg.ip_day_text_cap
  );
  if (!ip) return false;
  const g = await first(
    db,
    `UPDATE budgets SET text_conversations = text_conversations + 1
      WHERE day = ?1 AND text_conversations + 1 <= ?2 RETURNING text_conversations`,
    day, cfg.text_day_cap
  );
  if (!g) {
    await run(db, "UPDATE ip_budgets SET text_conversations = MAX(0, text_conversations - 1) WHERE ip_key = ?1 AND day = ?2", ipKeyV, day);
    return false;
  }
  return true;
}

export async function releaseText(db, ipKeyV, day) {
  await run(db, "UPDATE ip_budgets SET text_conversations = MAX(0, text_conversations - 1) WHERE ip_key = ?1 AND day = ?2", ipKeyV, day);
  await run(db, "UPDATE budgets SET text_conversations = MAX(0, text_conversations - 1) WHERE day = ?1", day);
}

// Insert the call row only while fewer than `cap` calls are active (started in the last `windowSec`).
// Returns true if inserted. One statement, so the concurrency check is atomic with the insert.
export async function insertCallIfRoom(db, c, cap, windowSec, nowS) {
  const r = await run(
    db,
    `INSERT INTO calls (call_id, created_at, day, ip_key, mode, status, reserved_minutes, current_role)
     SELECT ?1, ?2, ?3, ?4, ?5, 'active', ?6, 'front-desk'
      WHERE (SELECT COUNT(*) FROM calls WHERE status = 'active' AND mode = 'voice' AND created_at > ?7) < ?8
         OR ?5 = 'text'`,
    c.call_id, c.created_at, c.day, c.ip_key, c.mode, c.reserved_minutes, nowS - windowSec, cap
  );
  return changes(r) > 0;
}

// Webhook / failure path: give back whatever was not used. Idempotency is the caller's job
// (it only calls this after winning the "finalize" UPDATE).
export async function releaseCall(db, call, usedMinutes) {
  if (call.mode === "text") {
    return; // text conversations are counted, not released
  }
  const unused = Math.max(0, call.reserved_minutes - usedMinutes);
  await releaseGlobal(db, call.day, call.reserved_minutes, usedMinutes);
  await releaseIp(db, call.ip_key, call.day, unused, { callToo: false });
}

// Claim the call (finalized_at IS NULL -> set) and release its unused budget in ONE batch (one transaction).
// The release statements are gated on the call still being unfinalized and run BEFORE the claim in the same
// transaction, so a concurrent or repeated finalisation finds finalized_at set and releases nothing, and a crash
// cannot leave a claimed call with its reservation still held. Returns true if this call won the claim.
// `set` = {status, usedMinutes, transcript (optional JSON string), at}
export async function finalizeCall(db, call, set) {
  const used = set.usedMinutes || 0;
  const stmts = [];
  if (call.mode !== "text") {
    const unused = Math.max(0, call.reserved_minutes - used);
    stmts.push(
      [`UPDATE budgets SET reserved_minutes = MAX(0, reserved_minutes - ?1), used_minutes = used_minutes + ?2
         WHERE day = ?3 AND EXISTS (SELECT 1 FROM calls WHERE call_id = ?4 AND finalized_at IS NULL)`, unused, used, call.day, call.call_id],
      [`UPDATE ip_budgets SET minutes = MAX(0, minutes - ?1)
         WHERE ip_key = ?2 AND day = ?3 AND EXISTS (SELECT 1 FROM calls WHERE call_id = ?4 AND finalized_at IS NULL)`, unused, call.ip_key, call.day, call.call_id]
    );
  }
  stmts.push([
    `UPDATE calls SET status = ?1, used_minutes = ?2, final_transcript = COALESCE(?3, final_transcript), finalized_at = ?4
      WHERE call_id = ?5 AND finalized_at IS NULL`,
    set.status, used, set.transcript ?? null, set.at, call.call_id,
  ]);
  const res = await batch(db, stmts);
  return changes(res[res.length - 1]) > 0;
}

export { dayKey, monthKey };
