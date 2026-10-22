#!/usr/bin/env node
// Create or update the four ElevenLabs agents from agents/<role>.json.
//   node tools/call-agent/sync.mjs --env staging|prod [--dry-run] [--staging-host HOST] [--webhook-id ID]
// Keys: ELEVENLABS_API_KEY from the environment first (node --env-file=tools/call-agent/.env.local ...), else ~/.config/arithim/elevenlabs.env.
// CALL_LLM_SECRET from the environment, else ~/.config/arithim/call-agent-secrets.env.
// The post-call webhook is created through the API (POST /v1/workspace/webhooks, HMAC) unless --webhook-id / ELEVENLABS_WEBHOOK_ID is given or the
// lock file already holds one. Its signing secret is returned once; it is saved as CALL_WEBHOOK_SECRET_STAGING / _PROD in call-agent-secrets.env, never printed.
// Writes ids to agents.<env>.lock.json and PRINTS the SQL for the D1 config row. It never runs SQL.
// The knowledge base is not touched: our own endpoint holds the knowledge.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const API = "https://api.elevenlabs.io";
export const SPECIALISTS = ["consulting", "tsg", "customer-desk"];
export const ROLES = [...SPECIALISTS, "front-desk"];
const SECRET_NAME = "arithim_call_llm_secret";

export function parseEnvFile(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

export function parseArgs(argv) {
  const a = { env: null, dryRun: false, stagingHost: "call-us.arithim.pages.dev", webhookId: null };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--env") a.env = argv[++i];
    else if (v === "--dry-run") a.dryRun = true;
    else if (v === "--staging-host") a.stagingHost = argv[++i];
    else if (v === "--webhook-id") a.webhookId = argv[++i];
    else throw new Error("unknown argument " + v);
  }
  if (a.env !== "staging" && a.env !== "prod") throw new Error("--env staging|prod is required");
  return a;
}

// Remove "_comment"-style keys, swap the host for staging, resolve placeholders.
// ids: role -> agent_id (or a "<agent_id:role>" label in a dry run).
export function buildPayload(def, { env, stagingHost, ids, secretId, webhookId, dropTransfers = false }) {
  const walk = (x) => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") {
      if (Object.keys(x).length === 1 && "secret_name" in x) return { secret_id: secretId };
      const o = {};
      for (const [k, v] of Object.entries(x)) if (!k.startsWith("_")) o[k] = walk(v);
      return o;
    }
    if (typeof x === "string") {
      if (env === "staging") x = x.replace("https://arithim.com/", `https://${stagingHost}/`);
      if (x === "@webhook") return webhookId;
      if (x.startsWith("@")) return ids[x.slice(1)];
    }
    return x;
  };
  const body = walk(def.agent);
  const wh = body.platform_settings?.workspace_overrides?.webhooks;
  if (wh && !wh.post_call_webhook_id) delete body.platform_settings.workspace_overrides;
  if (dropTransfers) delete body.conversation_config.agent.prompt.built_in_tools;
  return body;
}

export function redact(value, secrets) {
  let s = JSON.stringify(value, null, 2);
  for (const sec of secrets.filter((x) => x && x.length > 3)) s = s.split(sec).join("[REDACTED]");
  return s;
}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
export function configSql(env, lock) {
  const front = lock.agents["front-desk"]?.agent_id;
  const roster = {};
  for (const [role, v] of Object.entries(lock.agents)) roster[v.agent_id] = role;
  const col = env === "prod" ? "front_desk_agent_id_prod" : "front_desk_agent_id_preview";
  return `UPDATE config SET ${col} = ${q(front)}, agent_roster = ${q(JSON.stringify(roster))}, updated_at = strftime('%s','now') WHERE id = 1;`;
}

export async function sync(opts) {
  const { env, dryRun, stagingHost, fetch: f = globalThis.fetch, keyFile, secretsFile, lockPath, log = console.log, defs } = opts;
  const readDef = (r) => defs?.[r] || JSON.parse(readFileSync(join(here, "agents", r + ".json"), "utf8"));
  const defsByRole = Object.fromEntries(ROLES.map((r) => [r, readDef(r)]));

  let apiKey = "", llmSecret = "";
  const read = (p) => (p && existsSync(p) ? parseEnvFile(readFileSync(p, "utf8")) : {});
  const penv = opts.processEnv ?? process.env;
  apiKey = opts.apiKey ?? (penv.ELEVENLABS_API_KEY || read(keyFile).ELEVENLABS_API_KEY) ?? "";
  llmSecret = opts.llmSecret ?? (penv.CALL_LLM_SECRET || read(secretsFile).CALL_LLM_SECRET) ?? "";
  const lock = lockPath && existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, "utf8")) : { env, agents: {} };
  lock.env = env;
  let webhookId = opts.webhookId || penv.ELEVENLABS_WEBHOOK_ID || read(keyFile).ELEVENLABS_WEBHOOK_ID || lock.webhook_id || (dryRun ? "<webhook_id>" : null);
  const webhookUrl = (env === "staging" ? `https://${stagingHost}` : "https://arithim.com") + "/api/call/webhook";

  if (!dryRun) {
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing (environment or " + keyFile + ")");
    if (!llmSecret) throw new Error("CALL_LLM_SECRET missing (" + secretsFile + ")");
    for (const r of ROLES) if (/^VOICE_ID_/.test(defsByRole[r].agent.conversation_config.tts.voice_id)) throw new Error(`agents/${r}.json still has a placeholder voice_id`);
  }
  const secrets = [apiKey, llmSecret];
  const ids = {};
  for (const r of ROLES) ids[r] = lock.agents[r]?.agent_id || `<agent_id:${r}>`;

  if (dryRun) {
    log(`# DRY RUN (${env}). No network calls, no files written. Secrets redacted.`);
    for (const r of ROLES) {
      const body = buildPayload(defsByRole[r], { env, stagingHost, ids, secretId: `<secret_id:${SECRET_NAME}>`, webhookId });
      log(`\n## ${r}: ${ids[r].startsWith("<") ? "CREATE" : "PATCH " + ids[r]}`);
      log(redact(body, secrets));
    }
    log("\n# Planned order: specialists (no transfers), front desk (transfers to specialists), then specialists patched with transfers.");
    return { dryRun: true };
  }

  const call = async (method, path, body) => {
    const res = await f(API + path, { method, headers: { "xi-api-key": apiKey, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300).split(apiKey).join("[REDACTED]")}`);
    return text ? JSON.parse(text) : {};
  };

  // post-call webhook (HMAC). Reused by name when it exists; the signing secret is only returned on creation.
  if (!webhookId) {
    const whName = `arithim-call-${env}`;
    const existing = ((await call("GET", "/v1/workspace/webhooks")).webhooks || []).find((w) => w.name === whName && !w.is_disabled);
    if (existing) {
      webhookId = existing.webhook_id;
      log(`workspace webhook ${whName} exists (${webhookId}); its secret cannot be read back, so CALL_WEBHOOK_SECRET must already be set from the creation run`);
    } else {
      const made = await call("POST", "/v1/workspace/webhooks", { settings: { auth_type: "hmac", name: whName, webhook_url: webhookUrl } });
      webhookId = made.webhook_id;
      secrets.push(made.webhook_secret);
      if (made.webhook_secret && secretsFile) {
        const key = `CALL_WEBHOOK_SECRET_${env === "prod" ? "PROD" : "STAGING"}`;
        const old = existsSync(secretsFile) ? readFileSync(secretsFile, "utf8") : "";
        const lines = old.split(/\r?\n/).filter((l) => l && !l.startsWith(key + "="));
        writeFileSync(secretsFile, lines.concat(`${key}=${made.webhook_secret}`).join("\n") + "\n", { mode: 0o600 });
      }
      log(`created workspace webhook ${whName} ${webhookId} -> ${webhookUrl} (signing secret saved to call-agent-secrets.env, not shown)`);
    }
  }
  lock.webhook_id = webhookId;

  // workspace secret that holds CALL_LLM_SECRET
  let secretId;
  const list = await call("GET", "/v1/convai/secrets");
  secretId = (list.secrets || []).find((s) => s.name === SECRET_NAME)?.secret_id;
  if (!secretId) {
    const made = await call("POST", "/v1/convai/secrets", { type: "new", name: SECRET_NAME, value: llmSecret });
    secretId = made.secret_id;
    log("created workspace secret " + SECRET_NAME);
  } else log("workspace secret " + SECRET_NAME + " exists (value not changed; rotate it by hand in ElevenLabs if CALL_LLM_SECRET changed)");

  const upsert = async (role, dropTransfers) => {
    const body = buildPayload(defsByRole[role], { env, stagingHost, ids, secretId, webhookId, dropTransfers });
    if (lock.agents[role]?.agent_id) {
      await call("PATCH", "/v1/convai/agents/" + lock.agents[role].agent_id, body);
      log("updated " + role);
    } else {
      const r = await call("POST", "/v1/convai/agents/create", body);
      if (!r.agent_id) throw new Error("no agent_id returned for " + role);
      lock.agents[role] = { agent_id: r.agent_id, name: defsByRole[role].agent.name };
      ids[role] = r.agent_id;
      log("created " + role + " " + r.agent_id);
    }
    lock.updated_at = new Date().toISOString();
    if (lockPath) writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  };

  for (const r of SPECIALISTS) await upsert(r, true);
  await upsert("front-desk", false);
  for (const r of SPECIALISTS) await upsert(r, false); // now every id is known, fill transfers
  const sql = configSql(env, lock);
  log("\n-- Run by hand (calls_enabled is NOT changed here):\n" + sql);
  log(`-- wrangler d1 execute CALLS_DB ${env === "prod" ? "--remote" : "--remote --env preview"} --command "..."`);
  return { lock, sql };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const a = parseArgs(process.argv.slice(2));
    await sync({
      env: a.env, dryRun: a.dryRun, stagingHost: a.stagingHost, webhookId: a.webhookId,
      keyFile: join(homedir(), ".config/arithim/elevenlabs.env"),
      secretsFile: join(homedir(), ".config/arithim/call-agent-secrets.env"),
      lockPath: join(here, `agents.${a.env}.lock.json`),
    });
  } catch (e) { console.error("sync failed: " + e.message); process.exit(1); }
}
