import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sync, parseArgs, parseEnvFile, configSql } from "../sync.mjs";

function mockApi() {
  const calls = []; let n = 0;
  const f = async (url, init) => {
    const path = url.replace("https://api.elevenlabs.io", "");
    calls.push({ method: init.method, path, body: init.body ? JSON.parse(init.body) : null, key: init.headers["xi-api-key"] });
    const r = (o) => ({ ok: true, status: 200, text: async () => JSON.stringify(o) });
    if (path === "/v1/convai/secrets" && init.method === "GET") return r({ secrets: [] });
    if (path === "/v1/convai/secrets") return r({ secret_id: "sec_1" });
    if (path.endsWith("/create")) return r({ agent_id: "agent_" + ++n });
    return r({});
  };
  return { f, calls };
}
const base = (dir, over = {}) => ({ env: "staging", stagingHost: "prev.example.pages.dev", apiKey: "xi-KEY-123", llmSecret: "LLM-SECRET-456", webhookId: "wh_1", lockPath: join(dir, "lock.json"), log: () => {}, ...over });

test("parseArgs and env files", () => {
  assert.throws(() => parseArgs([]));
  assert.deepEqual(parseArgs(["--env", "prod", "--dry-run"]).dryRun, true);
  assert.equal(parseEnvFile("# c\nA_B='x y'\nexport C=1").A_B, "x y");
});

test("dry run: no network, secrets redacted", async () => {
  const out = []; const { f, calls } = mockApi();
  await sync({ ...base(mkdtempSync(join(tmpdir(), "s-"))), dryRun: true, fetch: f, log: (s) => out.push(s) });
  assert.equal(calls.length, 0);
  const text = out.join("\n");
  assert.ok(!text.includes("LLM-SECRET-456") && !text.includes("xi-KEY-123"));
  assert.match(text, /prev\.example\.pages\.dev\/api\/call\/llm\/tsg/);
});

test("create order, transfers filled, lock and SQL", async () => {
  const dir = mkdtempSync(join(tmpdir(), "s-")); const { f, calls } = mockApi(); const out = [];
  const defsOk = {};
  const r = await sync({ ...base(dir), fetch: f, log: (s) => out.push(s), defs: await loadDefs() });
  const creates = calls.filter((c) => c.path.endsWith("/create")).map((c) => c.body.name);
  assert.deepEqual(creates.map((n) => /front/.test(n)), [false, false, false, true]);
  assert.ok(calls.every((c) => c.key === "xi-KEY-123"));
  const fd = calls.find((c) => /front/.test(c.body?.name || ""));
  const tr = fd.body.conversation_config.agent.prompt.built_in_tools.transfer_to_agent.params.transfers;
  assert.deepEqual(tr.map((t) => t.agent_id), ["agent_1", "agent_2", "agent_3"]); // consulting, tsg, customer-desk
  const firstSpec = calls.find((c) => c.path.endsWith("/create"));
  assert.equal(firstSpec.body.conversation_config.agent.prompt.built_in_tools, undefined);
  const patches = calls.filter((c) => c.method === "PATCH");
  assert.equal(patches.length, 3);
  assert.equal(patches[0].body.conversation_config.agent.prompt.built_in_tools.transfer_to_agent.params.transfers[0].agent_id, "agent_4");
  assert.equal(fd.body.conversation_config.agent.prompt.custom_llm.request_headers["X-Call-Secret"].secret_id, "sec_1");
  const lock = JSON.parse(readFileSync(join(dir, "lock.json"), "utf8"));
  assert.equal(lock.agents["front-desk"].agent_id, "agent_4");
  assert.match(r.sql, /front_desk_agent_id_preview = 'agent_4'/);
  assert.match(r.sql, /agent_roster = '/);
});

test("second run PATCHes existing agents; placeholder voice refused", async () => {
  const dir = mkdtempSync(join(tmpdir(), "s-")); const { f, calls } = mockApi();
  const defs = await loadDefs();
  await sync({ ...base(dir), fetch: f, defs });
  calls.length = 0;
  await sync({ ...base(dir), fetch: f, defs });
  assert.equal(calls.filter((c) => c.path.endsWith("/create")).length, 0);
  assert.ok(calls.some((c) => c.method === "PATCH"));
  const bad = await loadDefs(false);
  await assert.rejects(sync({ ...base(mkdtempSync(join(tmpdir(), "s-"))), fetch: f, defs: bad }), /placeholder voice_id/);
});

test("configSql escapes quotes and prod column", () => {
  const sql = configSql("prod", { agents: { "front-desk": { agent_id: "a'b" } } });
  assert.match(sql, /front_desk_agent_id_prod = 'a''b'/);
});

async function loadDefs(setVoices = true) {
  const d = {};
  for (const r of ["consulting", "tsg", "customer-desk", "front-desk"]) {
    const j = JSON.parse(readFileSync(new URL(`../agents/${r}.json`, import.meta.url), "utf8"));
    j.agent.conversation_config.tts.voice_id = setVoices ? "voice_" + r : "VOICE_ID_TODO_" + r;
    d[r] = j;
  }
  return d;
}
