-- D1 schema for the "Call us" voice agent. Apply by hand:
--   wrangler d1 migrations apply CALLS_DB --remote
-- All times are unix seconds (UTC). All days are 'YYYY-MM-DD' (UTC).

CREATE TABLE IF NOT EXISTS config (
  id                          INTEGER PRIMARY KEY CHECK (id = 1),
  calls_enabled               INTEGER NOT NULL DEFAULT 0,
  front_desk_agent_id_prod    TEXT,
  front_desk_agent_id_preview TEXT,
  max_call_minutes            INTEGER NOT NULL DEFAULT 15,
  ip_day_calls_cap            INTEGER NOT NULL DEFAULT 2,
  ip_day_minutes_cap          INTEGER NOT NULL DEFAULT 30,
  day_minutes_cap             INTEGER NOT NULL DEFAULT 60,
  month_minutes_cap           INTEGER NOT NULL DEFAULT 300,
  concurrent_cap              INTEGER NOT NULL DEFAULT 2,
  text_day_cap                INTEGER NOT NULL DEFAULT 20,
  ip_day_text_cap             INTEGER NOT NULL DEFAULT 3,
  text_turns_cap              INTEGER NOT NULL DEFAULT 40,
  agent_roster                TEXT,  -- JSON {"<elevenlabs agent id>": "front-desk|consulting|tsg|customer-desk"} for display names
  updated_at                  INTEGER
);
INSERT OR IGNORE INTO config (id) VALUES (1);

CREATE TABLE IF NOT EXISTS calls (
  call_id            TEXT PRIMARY KEY,          -- 128-bit random, 32 hex chars
  created_at         INTEGER NOT NULL,
  day                TEXT NOT NULL,
  ip_key             TEXT NOT NULL,             -- salted hash of the IPv4 / IPv6 /64
  mode               TEXT NOT NULL CHECK (mode IN ('voice','text')),
  status             TEXT NOT NULL DEFAULT 'active', -- active | ended | failed | expired
  reserved_minutes   REAL NOT NULL DEFAULT 0,
  used_minutes       REAL NOT NULL DEFAULT 0,
  el_conversation_id TEXT,
  transfers          INTEGER NOT NULL DEFAULT 0,
  think_count        INTEGER NOT NULL DEFAULT 0,
  current_role       TEXT NOT NULL DEFAULT 'front-desk',
  flags              TEXT NOT NULL DEFAULT '',  -- comma separated filter / scanner categories
  summary            TEXT,
  summary_started    INTEGER,
  outcome            TEXT,                      -- the first message type, or null
  helpful            INTEGER,                   -- 1 helpful, 0 not helpful
  final_transcript   TEXT,                      -- JSON from the post-call webhook
  finalized_at       INTEGER,
  email_sent         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_calls_created ON calls (created_at);
CREATE INDEX IF NOT EXISTS idx_calls_status_created ON calls (status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_conv ON calls (el_conversation_id) WHERE el_conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_ip_day ON calls (ip_key, day);

CREATE TABLE IF NOT EXISTS turns (
  call_id     TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  role_agent  TEXT NOT NULL,                    -- front-desk | consulting | tsg | customer-desk
  speaker     TEXT NOT NULL CHECK (speaker IN ('caller','agent','tool')),
  text        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (call_id, seq)
);

CREATE TABLE IF NOT EXISTS messages (
  ref         TEXT PRIMARY KEY,                 -- ARC-YYMMDD-XXXX
  call_id     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('enquiry','meeting_request','partnership','press','job_seeker','vendor_pitch','research','speaking','support_issue','billing_query','supplier_query','do_not_contact','privacy_request','abuse_report','distress','other')),
  fields      TEXT NOT NULL,                    -- JSON: name, organisation, contact, summary, urgency, details{}
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_call ON messages (call_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at);

-- reserved_minutes counts against the cap: reservations at start, trimmed to actual use on release.
CREATE TABLE IF NOT EXISTS budgets (
  day                 TEXT PRIMARY KEY,
  reserved_minutes    REAL NOT NULL DEFAULT 0,
  used_minutes        REAL NOT NULL DEFAULT 0,
  text_conversations  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ip_budgets (
  ip_key              TEXT NOT NULL,
  day                 TEXT NOT NULL,
  calls               INTEGER NOT NULL DEFAULT 0,
  minutes             REAL NOT NULL DEFAULT 0,
  text_conversations  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_key, day)
);
CREATE INDEX IF NOT EXISTS idx_ip_budgets_day ON ip_budgets (day);
