// POST /api/call/diag   body (text/plain or JSON, <= 8 KB): {callId, trail}  ->  204
// Client-side connection diagnostics sent with navigator.sendBeacon. Stage names, timestamps and error names only.
// Binding: CALLS_DB. Rows are deleted after 30 days (functions/_lib/cleanup.js).

import { getDb, nowSec, first, run } from "../../_lib/d1.js";
import { originAllowed } from "./start.js";

const MAX_BODY = 8 * 1024;
const MAX_TRAIL = 6 * 1024;
const MAX_ROWS_PER_CALL = 5;
const noContent = () => new Response(null, { status: 204 });
const err = (status) => new Response(null, { status });

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) return err(403);
  if (!env.CALLS_DB) return err(503);
  const len = Number(request.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_BODY) return err(413);

  let text;
  try { text = await request.text(); } catch { return err(400); }
  if (new TextEncoder().encode(text).length > MAX_BODY) return err(413);
  let body;
  try { body = JSON.parse(text); } catch { return err(400); }
  const callId = body && body.callId;
  if (typeof callId !== "string" || !/^[0-9a-f]{32}$/.test(callId)) return err(400);
  if (!body.trail || typeof body.trail !== "object" || Array.isArray(body.trail)) return err(400);
  const trail = JSON.stringify(body.trail);
  if (trail.length > MAX_TRAIL) return err(413);

  let db;
  try { db = getDb(env); } catch { return err(503); }
  try {
    if (!(await first(db, "SELECT 1 AS x FROM calls WHERE call_id = ?", callId))) return err(404);
    const n = await first(db, "SELECT COUNT(*) AS n FROM call_diag WHERE call_id = ?", callId);
    if (n && n.n >= MAX_ROWS_PER_CALL) return noContent();
    await run(db, "INSERT INTO call_diag (call_id, created_at, trail) VALUES (?, ?, ?)", callId, nowSec(), trail);
  } catch (e) { console.error("call diag", e); return err(500); }
  return noContent();
}

export function onRequest() {
  return new Response("method not allowed", { status: 405, headers: { allow: "POST" } });
}
