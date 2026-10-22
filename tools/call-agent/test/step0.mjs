#!/usr/bin/env node
// Step-0 checks that need no Claude and no microphone: a TEXT conversation to the staging front desk over the ElevenLabs
// WebSocket (signed URL; WebRTC conversation tokens need LiveKit, which Node cannot run), against the preview scripted brain
// (CALL_STEP0_SCRIPT=1). Run from the repo root:
//   node --env-file=tools/call-agent/.env.local tools/call-agent/test/step0.mjs [out.json]
// Needs `wrangler login`. The API key is only used in headers and never printed.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const key = process.env.ELEVENLABS_API_KEY;
const lock = JSON.parse(readFileSync(join(here, "..", "agents.staging.lock.json"), "utf8"));
const FD = lock.agents["front-desk"].agent_id;
const out = { started: new Date().toISOString(), events: [] };
const api = async (p) => { const r = await fetch("https://api.elevenlabs.io" + p, { headers: { "xi-api-key": key } }); return { status: r.status, body: JSON.parse((await r.text()).split(key).join("[KEY]") || "{}") }; };
const d1 = (sql) => {
  const o = execFileSync("npx", ["wrangler", "d1", "execute", "CALLS_DB", "--remote", "--env", "preview", "--json", "--command", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(o)[0].results;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// subscription before
out.subscription_before = (await api("/v1/user/subscription")).body.character_count;

// 1. conversation token: shape and lifetime
const tok = await api(`/v1/convai/conversation/token?agent_id=${FD}`);
out.token = { status: tok.status, keys: Object.keys(tok.body), conversation_id_present: !!tok.body.conversation_id };
try {
  const [, p] = String(tok.body.token).split(".");
  const c = JSON.parse(Buffer.from(p, "base64url").toString());
  out.token.jwt_claims = Object.fromEntries(Object.entries(c).filter(([k]) => ["exp", "nbf", "iat"].includes(k)));
  if (c.exp && c.iat) out.token.ttl_seconds = c.exp - c.iat;
} catch { out.token.jwt = "not a decodable JWT"; }
const tok2 = await api(`/v1/convai/conversation/token?agent_id=${FD}`);
out.token.second_token_differs = tok2.body.token !== tok.body.token;
out.token.second_conversation_id_differs = tok2.body.conversation_id !== tok.body.conversation_id;
out.token.start_without_token_note = "auth enabled: connecting to the agent without a signed URL/token is tested below";

// 2. auth: connecting with just agent_id must be refused
async function connect(url, init) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    const ev = [];
    const t = setTimeout(() => { try { ws.close(); } catch {} resolve({ ws, ev, opened: false, timeout: true }); }, 10000);
    ws.onopen = () => { clearTimeout(t); resolve({ ws, ev, opened: true }); };
    ws.onerror = () => { clearTimeout(t); resolve({ ws, ev, opened: false }); };
    ws.onmessage = (m) => { const j = JSON.parse(m.data); ev.push({ t: Date.now(), j }); if (j.type === "ping") ws.send(JSON.stringify({ type: "pong", event_id: j.ping_event?.event_id })); };
  });
}
{
  const bare = await connect(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${FD}`);
  await sleep(2500);
  out.auth_without_token = { opened: bare.opened, first_events: bare.ev.slice(0, 3).map((e) => e.j.type + (e.j.message ? ": " + String(e.j.message).slice(0, 100) : "")) , closed: bare.ws.readyState };
  try { bare.ws.close(); } catch {}
}

// 3. the real call row (what /start would insert), then the conversation
const callId = randomBytes(16).toString("hex");
// A voice-mode row with 5 reserved minutes, so the webhook's budget release can be observed (the session itself is text only).
d1(`INSERT OR IGNORE INTO budgets (day) VALUES (date('now'))`);
d1(`UPDATE budgets SET reserved_minutes = reserved_minutes + 5 WHERE day = date('now')`);
out.budget_reserved_before_webhook = d1(`SELECT reserved_minutes, used_minutes FROM budgets WHERE day = date('now')`)[0];
d1(`INSERT INTO calls (call_id, created_at, day, ip_key, mode, status, reserved_minutes) VALUES ('${callId}', strftime('%s','now'), date('now'), 'step0', 'voice', 'active', 5)`);
out.call_id = callId;
const su = await api(`/v1/convai/conversation/get-signed-url?agent_id=${FD}&include_conversation_id=true`);
out.signed_url = { status: su.status, keys: Object.keys(su.body) };
const url = su.body.signed_url;
const c = await connect(url);
out.ws_opened = c.opened;
const t0 = Date.now();
const log = (label) => c.ev.filter((e) => e.t >= t0).map((e) => e.j).filter((j) => j.type !== "ping").slice(-0);
const send = (o) => c.ws.send(JSON.stringify(o));
send({ type: "conversation_initiation_client_data", conversation_config_override: { conversation: { text_only: true } }, dynamic_variables: { call_id: callId } });
await sleep(3000);
const meta = c.ev.map((e) => e.j).find((j) => j.type === "conversation_initiation_metadata");
out.conversation_id = meta?.conversation_initiation_metadata_event?.conversation_id;
out.init_event_keys = meta ? Object.keys(meta.conversation_initiation_metadata_event) : null;
out.text_only_accepted = meta ? meta.conversation_initiation_metadata_event.user_input_audio_format ? "metadata returned (check audio formats)" : "metadata returned" : "no metadata";

const steps = ["hello", "transfer to consulting", "transfer to tsg", "transfer to customer desk", "end call"];
out.turns = [];
for (const text of steps) {
  const from = c.ev.length;
  const ts = Date.now();
  if (c.ws.readyState !== 1) { out.turns.push({ text, skipped: "socket closed" }); continue; }
  send({ type: "user_message", text });
  await sleep(9000);
  const evs = c.ev.slice(from).map((e) => e.j).filter((j) => j.type !== "ping" && j.type !== "internal_tentative_agent_response");
  out.turns.push({ text, ms_waited: Date.now() - ts, events: evs.map((j) => ({ type: j.type, ...(j.agent_response_event ? { agent_response: j.agent_response_event.agent_response } : {}), ...(j.agent_chat_response_part_event ? {} : {}), ...(j.agent_tool_request ? { tool: j.agent_tool_request } : {}), ...(j.agent_tool_response ? { tool_resp: { name: j.agent_tool_response.tool_name, error: j.agent_tool_response.is_error } } : {}), ...(j.type === "error" || /transfer|agent_/.test(j.type) ? { raw: JSON.stringify(j).slice(0, 300) } : {}) })).filter((e) => e.type !== "agent_chat_response_part") });
}
await sleep(2000);
out.ws_final_state = c.ws.readyState;
try { c.ws.close(); } catch {}

// 4. signed URL reuse: a second session with the same signed URL, after the first has closed
{
  const again = await connect(url);
  again.ws.send(JSON.stringify({ type: "conversation_initiation_client_data", conversation_config_override: { conversation: { text_only: true } }, dynamic_variables: { call_id: callId } }));
  await sleep(4000);
  out.signed_url_reuse = { opened: again.opened, events: again.ev.slice(0, 4).map((e) => e.j.type + (e.j.message ? ": " + String(e.j.message).slice(0, 100) : "")) };
  try { again.ws.close(); } catch {}
}

// 4b. post-call webhook: ElevenLabs could not be given a webhook (API key lacks webhooks_write), so this posts a SYNTHETIC delivery signed
// with our own CALL_WEBHOOK_SECRET exactly as the SDK does ("t=<ts>,v0=hex(HMAC_SHA256(secret, t.body))"). It tests our endpoint, not ElevenLabs' signing.
{
  const { createHmac } = await import("node:crypto");
  const secret = readFileSync(process.env.HOME + "/.config/arithim/call-agent-secrets.env", "utf8").match(/^CALL_WEBHOOK_SECRET=(.*)$/m)[1].trim();
  const body = JSON.stringify({ type: "post_call_transcription", event_timestamp: Math.floor(Date.now() / 1000), data: { conversation_id: out.conversation_id, transcript: [{ role: "user", message: "hello", time_in_call_secs: 1 }, { role: "agent", message: "Step zero test reply from Hannah.", time_in_call_secs: 2 }], metadata: { call_duration_secs: 60 }, conversation_initiation_client_data: { dynamic_variables: { call_id: callId } } } });
  const post = async (sig) => { const r = await fetch("https://call-us.arithim.pages.dev/api/call/webhook", { method: "POST", headers: { "content-type": "application/json", "elevenlabs-signature": sig }, body }); return { status: r.status, body: (await r.text()).slice(0, 120) }; };
  const t = Math.floor(Date.now() / 1000);
  const good = `t=${t},v0=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
  out.webhook = { bad_signature: await post(`t=${t},v0=${"0".repeat(64)}`), good_signature: await post(good), replay: await post(good) };
  const stale = t - 3600;
  out.webhook.stale_timestamp = await post(`t=${stale},v0=${createHmac("sha256", secret).update(`${stale}.${body}`).digest("hex")}`);
  out.budget_after_webhook = d1(`SELECT reserved_minutes, used_minutes FROM budgets WHERE day = date('now')`)[0];
}

// 5. what our side saw
await sleep(4000);
out.step0_log = d1(`SELECT id, role, path, auth_ok, secret_header, call_id, conversation_id, tool_names, body_keys, msg_count, last_user, action, header_names FROM step0_log WHERE call_id = '${callId}' OR ts > strftime('%s','now') - 300 ORDER BY id`);
out.call_row = d1(`SELECT status, mode, transfers, final_transcript IS NOT NULL AS has_transcript, current_role, el_conversation_id, reserved_minutes, used_minutes, finalized_at FROM calls WHERE call_id = '${callId}'`)[0];
out.turns_logged = d1(`SELECT seq, role_agent, speaker, substr(text,1,80) AS text FROM turns WHERE call_id = '${callId}' ORDER BY seq`);
out.subscription_after = (await api("/v1/user/subscription")).body.character_count;
writeFileSync(process.argv[2] || join(here, "step0-output.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ...out, step0_log: out.step0_log.map((r) => ({ id: r.id, role: r.role, path: r.path, auth: r.auth_ok, hdr: r.secret_header, call: r.call_id?.slice(0, 6), conv: r.conversation_id?.slice(0, 10), tools: r.tool_names, last_user: r.last_user, action: r.action })) }, null, 1));
