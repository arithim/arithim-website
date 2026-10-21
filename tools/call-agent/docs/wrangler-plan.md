# wrangler.toml plan (not created yet)

Do not add `wrangler.toml` until the dashboard variables are copied. A `wrangler.toml` in a Pages project makes the file the source of truth: any variable set only in the dashboard (the contact form's `TO_EMAIL`, `FROM_EMAIL`, and so on) is dropped on the next deploy.

## Steps

1. Read the current production and preview variables from the Pages project (Settings, Variables and Secrets). Plain-text variables go into `[vars]`; secrets are not readable and stay as Pages secrets (they are kept as long as they are not redefined in the file).
2. Create the D1 databases by hand (`wrangler d1 create arithim-calls` and `arithim-calls-preview`) and paste their ids below.
3. Add the file, deploy a preview, test `POST /api/contact` on the preview, then the call endpoints.
4. Apply the migration by hand: `wrangler d1 migrations apply CALLS_DB --remote` (and `--env preview` equivalent / `--local` for local). The migrations folder is `migrations/` (default).
5. Seed the config row (it is inserted disabled): `UPDATE config SET calls_enabled = 1, front_desk_agent_id_prod = '...', front_desk_agent_id_preview = '...', agent_roster = '{"agent_...":"consulting", ...}' WHERE id = 1;`

## The file

```toml
name = "arithim"
pages_build_output_dir = "."          # keep whatever deploy.sh/the workflow uses today; check tools/deploy.sh first
compatibility_date = "2026-10-01"

[vars]
# copy every current plain-text dashboard variable here first, e.g.:
# TO_EMAIL = "hello@arithim.com"
# FROM_EMAIL = "enquiries@arithim.com"
CALL_ENV = "prod"
CALL_FROM_EMAIL = "calls@<sending-subdomain>"      # separate subdomain for call mail; must be verified in Resend
CALL_TALKER_MODEL = "claude-sonnet-5-5"
CALL_THINKER_MODEL = "claude-opus-5-5"
# CALL_MOCK = "1"                                  # preview only, while there is no ElevenLabs key

[[d1_databases]]
binding = "CALLS_DB"
database_name = "arithim-calls"
database_id = "<PROD_DATABASE_ID>"
preview_database_id = "<PREVIEW_DATABASE_ID>"
migrations_dir = "migrations"

[env.preview.vars]
CALL_ENV = "preview"
```

Check against the Pages docs before use: for Pages projects, `[env.preview]` / `[env.production]` blocks and `pages_build_output_dir` have their own rules, and `functions/` is compiled from the working directory (see `tools/stage_site.sh`). `tools/deploy.sh` and `.github/workflows/deploy.yml` must keep working; run them against a preview first.

## Secrets (Pages secrets, never in the file)

`ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY` (the dedicated calls workspace key), `CALL_LLM_SECRET`, `CALL_WEBHOOK_SECRET`, `CALL_DENYLIST` (newline-separated names), `CALL_IP_SALT` (random string), plus the existing `RESEND_API_KEY`, `TURNSTILE_SECRET`, `TO_EMAIL`.

## Optional env vars

| Name | Default | Meaning |
|---|---|---|
| CALL_MOCK | unset | `1` forces mock mode in /start (also automatic with no ELEVENLABS_API_KEY) |
| CALL_ENV | from hostname | `preview` selects the preview agent id |
| CALL_ALLOWED_ORIGINS | none | comma separated extra origins (e.g. a preview URL) |
| CALL_TALKER_MODEL | claude-sonnet-5-5 | `claude-haiku-5-5` omits `thinking` |
| CALL_TALKER_THINKING | `between_tools` | `off` omits the thinking parameter |
| CALL_THINKER_MODEL | claude-opus-5-5 | used by `think` and the end-screen summary |
| CALL_ANTHROPIC_BETA | none | value for the `anthropic-beta` header if a parameter needs it |

## Agent-side configuration (ElevenLabs, from `agents/<role>.json` later)

Each of the four agents: custom LLM URL `https://arithim.com/api/call/llm/<role>`; `request_headers`: `X-Call-Secret` = workspace secret holding `CALL_LLM_SECRET`, `X-Call-Id` = dynamic variable `call_id`, `X-Conversation-Id` = dynamic variable `system__conversation_id`; Security tab: allow the text-only override; transfer rules on the front desk in this fixed order: 0 consulting, 1 tsg, 2 customer-desk; webhook `https://arithim.com/api/call/webhook` with its secret as `CALL_WEBHOOK_SECRET`; audio retention off.
