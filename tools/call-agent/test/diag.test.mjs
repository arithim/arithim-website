import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeDb, seedCall } from "./helpers.mjs";
import { onRequestPost as diag } from "../../../functions/api/call/diag.js";
import { deleteOldDiag } from "../../../functions/_lib/cleanup.js";

const ID = "a".repeat(32);
function dbWithDiag() {
  const db = makeDb();
  db.raw.exec(readFileSync(new URL("../../../migrations/0003_call_diag.sql", import.meta.url), "utf8"));
  return db;
}
const req = (body, headers = {}, raw) => new Request("https://arithim.com/api/call/diag", {
  method: "POST", headers: { origin: "https://arithim.com", "content-type": "text/plain", ...headers },
  body: raw ?? JSON.stringify(body),
});
const trail = { v: 1, reason: "quick_disconnect", env: { ua: "x", rtc: true }, ev: [[0, "open"], [120, "start_post", 200]] };

test("diag: stores a trail for a known call and returns 204", async () => {
  const db = dbWithDiag(); await seedCall(db); const env = { CALLS_DB: db };
  const res = await diag({ request: req({ callId: ID, trail }), env });
  assert.equal(res.status, 204);
  const row = await db.prepare("SELECT * FROM call_diag").first();
  assert.equal(row.call_id, ID); assert.deepEqual(JSON.parse(row.trail), trail); assert.ok(row.created_at > 0);
});

test("diag: wrong origin 403, bad callId 400, unknown call 404, bad JSON 400, missing trail 400", async () => {
  const db = dbWithDiag(); await seedCall(db); const env = { CALLS_DB: db };
  assert.equal((await diag({ request: req({ callId: ID, trail }, { origin: "https://evil.example" }), env })).status, 403);
  assert.equal((await diag({ request: req({ callId: "nope", trail }), env })).status, 400);
  assert.equal((await diag({ request: req({ callId: "B".repeat(32), trail }), env })).status, 400);
  assert.equal((await diag({ request: req({ callId: "b".repeat(32), trail }), env })).status, 404);
  assert.equal((await diag({ request: req(null, {}, "{not json"), env })).status, 400);
  assert.equal((await diag({ request: req({ callId: ID }), env })).status, 400);
  assert.equal((await diag({ request: req({ callId: ID, trail: [1] }), env })).status, 400);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM call_diag").first()).n, 0);
});

test("diag: bodies over 8 KB are refused", async () => {
  const db = dbWithDiag(); await seedCall(db); const env = { CALLS_DB: db };
  const big = { callId: ID, trail: { pad: "x".repeat(9000) } };
  assert.equal((await diag({ request: req(big), env })).status, 413);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM call_diag").first()).n, 0);
});

test("diag: at most 5 rows per call, extras are dropped quietly", async () => {
  const db = dbWithDiag(); await seedCall(db); const env = { CALLS_DB: db };
  for (let i = 0; i < 8; i++) assert.equal((await diag({ request: req({ callId: ID, trail }), env })).status, 204);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM call_diag").first()).n, 5);
});

test("diag: no database binding is 503", async () => {
  assert.equal((await diag({ request: req({ callId: ID, trail }), env: {} })).status, 503);
});

test("diag: cleanup removes rows older than 30 days and tolerates a missing table", async () => {
  const db = dbWithDiag(); await seedCall(db); const now = 2_000_000_000;
  await db.prepare("INSERT INTO call_diag (call_id, created_at, trail) VALUES (?,?,?)").bind(ID, now - 31 * 86400, "{}").run();
  await db.prepare("INSERT INTO call_diag (call_id, created_at, trail) VALUES (?,?,?)").bind(ID, now - 86400, "{}").run();
  await deleteOldDiag(db, now);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM call_diag").first()).n, 1);
  await deleteOldDiag(makeDb(), now); // no call_diag table: must not throw
});
