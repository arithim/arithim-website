#!/usr/bin/env node
// GET each synced agent and compare the settings we send with what ElevenLabs kept.
//   node --env-file=tools/call-agent/.env.local tools/call-agent/test/readback.mjs [staging|prod] [outfile.json]
// Prints a table of path / sent / kept. Never prints the API key.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPayload, ROLES } from "../sync.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const env = process.argv[2] || "staging";
const out = process.argv[3];
const key = process.env.ELEVENLABS_API_KEY;
const lock = JSON.parse(readFileSync(join(here, "..", `agents.${env}.lock.json`), "utf8"));
const ids = Object.fromEntries(Object.entries(lock.agents).map(([r, v]) => [r, v.agent_id]));

const flat = (x, p = "", o = {}) => {
  if (Array.isArray(x)) x.forEach((v, i) => flat(v, `${p}[${i}]`, o));
  else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) flat(v, p ? `${p}.${k}` : k, o);
  else o[p] = x;
  return o;
};
const report = {};
for (const role of ROLES) {
  const def = JSON.parse(readFileSync(join(here, "..", "agents", role + ".json"), "utf8"));
  const sent = buildPayload(def, { env, stagingHost: "call-us.arithim.pages.dev", ids, secretId: "<secret>", webhookId: lock.webhook_id });
  const r = await fetch("https://api.elevenlabs.io/v1/convai/agents/" + ids[role], { headers: { "xi-api-key": key } });
  const got = JSON.parse((await r.text()).split(key).join("[KEY]"));
  const fs = flat(sent), fg = flat(got);
  const diffs = [];
  for (const [p, v] of Object.entries(fs)) {
    if (p.endsWith("secret_id")) { if (!Object.keys(fg).some((k) => k.endsWith("request_headers.X-Call-Secret.secret_id"))) diffs.push({ path: p, sent: "<secret>", kept: "MISSING" }); continue; }
    if (!(p in fg)) diffs.push({ path: p, sent: v, kept: "MISSING" });
    else if (fg[p] !== v) diffs.push({ path: p, sent: v, kept: fg[p] });
  }
  report[role] = { agent_id: ids[role], status: r.status, dropped_or_changed: diffs, kept: {
    llm: got.conversation_config?.agent?.prompt?.llm, custom_llm_url: got.conversation_config?.agent?.prompt?.custom_llm?.url,
    request_headers: got.conversation_config?.agent?.prompt?.custom_llm?.request_headers,
    transfers: got.conversation_config?.agent?.prompt?.built_in_tools?.transfer_to_agent?.params?.transfers?.map((t) => t.agent_id),
    turn: { turn_timeout: got.conversation_config?.turn?.turn_timeout, silence_end_call_timeout: got.conversation_config?.turn?.silence_end_call_timeout },
    max_duration_seconds: got.conversation_config?.conversation?.max_duration_seconds,
    text_only_override: got.platform_settings?.overrides?.conversation_config_override?.conversation,
    privacy: got.platform_settings?.privacy, auth: got.platform_settings?.auth,
    webhooks: got.platform_settings?.workspace_overrides?.webhooks, tts: { voice_id: got.conversation_config?.tts?.voice_id, model_id: got.conversation_config?.tts?.model_id },
    dynamic_variables: got.conversation_config?.agent?.dynamic_variables,
  } };
}
if (out) writeFileSync(out, JSON.stringify(report, null, 2));
for (const [role, r] of Object.entries(report)) { console.log(`\n## ${role} ${r.agent_id} (GET ${r.status})`); console.log("not kept as sent:", JSON.stringify(r.dropped_or_changed, null, 1)); }
console.log("\nKept (front-desk):", JSON.stringify(report["front-desk"].kept, null, 1));
