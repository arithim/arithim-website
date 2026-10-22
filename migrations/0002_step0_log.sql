-- Step-0 diagnostics for the ElevenLabs integration (preview only; written only when CALL_STEP0_SCRIPT=1 on a non-production host).
-- Header NAMES only, never header values except the call and conversation ids. Safe to drop after step 0.
CREATE TABLE IF NOT EXISTS step0_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ts              INTEGER NOT NULL,
  role            TEXT,
  method          TEXT,
  path            TEXT,       -- URL path as received (shows whether /chat/completions was appended)
  auth_ok         INTEGER NOT NULL DEFAULT 0,
  header_names    TEXT,       -- JSON array of request header names
  secret_header   TEXT,       -- 'x-call-secret' | 'authorization' | 'none' (which header carried the secret)
  call_id         TEXT,       -- value of X-Call-Id (or the fallback sources) as received
  conversation_id TEXT,       -- value of X-Conversation-Id as received
  tool_names      TEXT,       -- JSON array of tool names in the request
  body_keys       TEXT,       -- JSON array of top-level body keys
  msg_count       INTEGER,
  last_user       TEXT,       -- first 200 chars of the last user message
  tool_info       TEXT,       -- JSON: transfer_to_agent tool definition as sent (truncated)
  action          TEXT        -- what the scripted brain did
);
CREATE INDEX IF NOT EXISTS idx_step0_ts ON step0_log (ts);
