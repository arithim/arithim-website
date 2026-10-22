-- Client-side connection diagnostics for voice calls (assets/callus.js -> POST /api/call/diag).
-- The trail holds stage timestamps and error names only: no transcript text. At most 5 rows per call (enforced in the endpoint).
CREATE TABLE IF NOT EXISTS call_diag (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  trail      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS call_diag_call ON call_diag (call_id);
CREATE INDEX IF NOT EXISTS call_diag_created ON call_diag (created_at);
