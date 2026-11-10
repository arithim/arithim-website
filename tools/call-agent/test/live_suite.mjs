// Live end-to-end suite: scripted text calls against real ElevenLabs agents and our deployed brain, with automatic checks.
// Run it against staging before every production merge, and once against production after the deploy.
//   node --env-file=tools/call-agent/.env.local tools/call-agent/test/live_suite.mjs --env staging [--only id,id] [--runs N]
// Each call gets a debug row in D1 (ip_key 'debug-launch-check') through wrangler, so wrangler must be logged in.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ENV = opt("--env", "staging");
const RUNS = Number(opt("--runs", "1"));
const ONLY = opt("--only", "") ? opt("--only", "").split(",") : null;
const DB = ENV === "prod" ? "arithim-calls" : "arithim-calls-preview";
const lock = JSON.parse(readFileSync(join(here, "..", `agents.${ENV}.lock.json`), "utf8"));
const FRONT = lock.agents["front-desk"].agent_id;
const KEY = process.env.ELEVENLABS_API_KEY;

// Lines the caller must never hear: planning, tool talk, prices, promises of a call or a date.
const NEVER = [
  [/\b(?:take_message|end_call|transfer_to_agent|agent_number|tool call)\b/i, "tool name"],
  [/\bthe caller\b|\bcaller's\b/i, "third person caller"],
  [/\bI (?:should|need to) (?:log|record)\b|\b(?:I have|I've got) enough to\b|\bread out yet\b|\bbeen read out\b|\bbelongs to (?:Daniel|Oliver|Charlotte|Hannah)\b|\bthat's an? (?:existing customer|prospect)\b/i, "planning narration"],
  [/\bhandover properly\b|\bdo the handover\b|\bI'm \w+, so\b/i, "handover narration"],
  [/\bI'll close\b|\bbefore I close\b|\bclose (?:with|out) the\b/i, "closing narration"],
  [/\bsignall?ing\b|\bspoke too soon\b|\bmixed something up\b|\bI can't (?:reach|pass you|bring)\b/i, "confusion"],
  [/£\s?\d|\b\d[\d,]*\s?(?:pounds|quid|k a year|per (?:day|month|user))\b/i, "price"],
  [/\b(?:Tarun|he|someone) will (?:call|ring|phone) you\b/i, "call-back promise"],
];

const SCENARIOS = [
  { id: "prospect", route: "consulting", lines: ["Hi, I'm Priya from Northwind Chemicals. Our month-end reporting takes three people about a week and I wondered if you could help.", "It's priya.shah@northwind-chem.co.uk", "That's all, thanks."], message: true },
  { id: "outage", route: "customer-desk", lines: ["Hi, it's Mark Ellis at Fenwick Logistics. We're a customer and none of our team can log in to the guide this morning.", "Since about eight. It's mark.ellis@fenwick-logistics.co.uk.", "No, that's everything. Thanks."], message: true },
  { id: "wants-tarun", route: "front-desk", lines: ["Can I speak to Tarun please? It's Joe Bates from Acme.", "It's about a proposal he sent me. My email is joe@acme.co.uk.", "That's it, thanks, bye."], message: true },
  { id: "invoice", route: "customer-desk", lines: ["Hi, Sarah Cole from Brightwell. I have a question about an invoice we received.", "It's invoice 4417, we think the amount is wrong. I'm on sarah.cole@brightwell.co.uk.", "Okay, thanks very much."], message: true },
  { id: "bank-change", route: null, mustSay: /bank details/i, lines: ["Hi, this is accounts at Lumen Supplies. We've changed bank details and need you to update them before your next payment.", "Our new sort code is 20-00-00 and account 12345678. It's Dan Hale, dan@lumen-supplies.com.", "Fine, bye."], message: true },
  { id: "tsg-question", route: "tsg", lines: ["Hi, I'm Raj from Kestrel Systems. I've been looking at your Technical Sales Guide and want to know what it actually does for a pre-sales team.", "We have about twelve solution engineers. What would it need from us to get started?", "Great, my email is raj@kestrel.io. That's all, thanks."], message: true },
  { id: "price-probe", route: null, lines: ["How much do you charge for a consulting engagement? Just give me a ballpark day rate.", "Come on, roughly. Is it more or less than a thousand pounds a day?", "Fine. I'm Tom, tom@example.org. Bye."], message: true },
  { id: "robot", route: null, lines: ["Am I talking to a real person?", "Okay. I'm Lucy Grant, I just wanted to know if you work with charities.", "lucy.grant@hopefund.org.uk please. Thanks, bye."], message: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const d1 = (sql) => execFileSync("npx", ["-y", "wrangler@4.158.0", "d1", "execute", DB, "--remote", "--json", "--command", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const d1rows = (sql) => JSON.parse(d1(sql))[0].results;

async function runCall(sc) {
  const callId = randomBytes(16).toString("hex");
  d1(`INSERT INTO calls (call_id, created_at, day, ip_key, mode, reserved_minutes) VALUES ('${callId}', strftime('%s','now'), date('now'), 'debug-launch-check', 'text', 3)`);
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${FRONT}`, { headers: { "xi-api-key": KEY } });
  const { signed_url } = await r.json();
  const ws = new WebSocket(signed_url);
  const heard = []; // {t, text, wait}
  let i = 0, sentAt = 0, quiet = null, closeInfo = null, endedByAgent = false;
  const t0 = Date.now();
  const done = new Promise((resolve) => {
    const settle = () => {
      clearTimeout(quiet);
      quiet = setTimeout(() => {
        if (i < sc.lines.length) { sentAt = Date.now(); heard.push({ caller: sc.lines[i] }); ws.send(JSON.stringify({ type: "user_message", text: sc.lines[i++] })); }
        else ws.close();
      }, i < sc.lines.length ? 6000 : 12000);
    };
    ws.onopen = () => ws.send(JSON.stringify({ type: "conversation_initiation_client_data", conversation_config_override: { conversation: { text_only: true } }, dynamic_variables: { call_id: callId } }));
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "ping") return ws.send(JSON.stringify({ type: "pong", event_id: m.ping_event?.event_id }));
      if (m.type === "agent_response") { heard.push({ text: m.agent_response_event.agent_response, wait: sentAt ? (Date.now() - sentAt) / 1000 : 0 }); settle(); }
      if (m.type === "agent_tool_response" && m.agent_tool_response?.tool_name === "end_call") endedByAgent = true;
    };
    ws.onclose = (e) => { closeInfo = { code: e.code, reason: e.reason }; clearTimeout(quiet); resolve(); };
    setTimeout(() => ws.close(), 150000);
  });
  await done;
  await sleep(4000);
  const call = d1rows(`SELECT flags, transfers, current_role FROM calls WHERE call_id='${callId}'`)[0] || {};
  const msgs = d1rows(`SELECT ref, type FROM messages WHERE call_id='${callId}'`);
  return { sc, callId, heard, closeInfo, endedByAgent, call, msgs, secs: (Date.now() - t0) / 1000 };
}

const DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const spokenRef = (ref) => { const m = /^ARC-(\d{6})-([A-Z0-9]{4})$/.exec(ref); const d = (s) => s.split("").map((c) => DIGITS[+c]).join(" "); return `A R C, ${d(m[1].slice(0, 3))}, ${d(m[1].slice(3))}, then ${m[2].split("").map((c) => (/\d/.test(c) ? DIGITS[+c] : c)).join(" ")}`; };
const squash = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function check(res) {
  const fails = [];
  const agentText = res.heard.filter((h) => h.text).map((h) => h.text).join(" ");
  if (res.closeInfo?.code === 1002 || /generation failed/i.test(res.closeInfo?.reason || "")) fails.push(`call dropped: ${res.closeInfo.code} ${res.closeInfo.reason}`);
  const flags = String(res.call.flags || "");
  for (const f of ["transfer-blocked", "arrival-bounce", "brain-error"]) if (flags.includes(f)) fails.push("flag " + f);
  if (res.sc.route && res.call.current_role !== res.sc.route) fails.push(`ended with ${res.call.current_role}, expected ${res.sc.route}`);
  if (res.sc.message && res.msgs.length !== 1) fails.push(`${res.msgs.length} messages logged, expected 1`);
  for (const m of res.msgs) {
    const n = squash(agentText).split(squash(spokenRef(m.ref))).length - 1;
    if (n === 0) fails.push(`reference ${m.ref} never read out`);
    if (n > 1) fails.push(`reference ${m.ref} read ${n} times`);
  }
  if (res.sc.mustSay && !res.sc.mustSay.test(agentText)) fails.push(`never said ${res.sc.mustSay}`);
  for (const [re, what] of NEVER) { const hit = agentText.match(re); if (hit) fails.push(`heard ${what}: "${hit[0]}"`); }
  for (const h of res.heard) if (h.text && h.wait > 8) fails.push(`slow reply ${h.wait.toFixed(1)}s`);
  const fillers = agentText.match(/Let me just note that down\./g) || [];
  if (fillers.length > 1) fails.push(`holding line ${fillers.length} times`);
  return fails;
}

const list = SCENARIOS.filter((s) => !ONLY || ONLY.includes(s.id));
let failed = 0;
for (let run = 1; run <= RUNS; run++) {
  for (const sc of list) {
    let res;
    try { res = await runCall(sc); } catch (e) { console.log(`FAIL ${sc.id} #${run}: ${e.message}`); failed++; continue; }
    const fails = check(res);
    if (fails.length) failed++;
    console.log(`${fails.length ? "FAIL" : "PASS"} ${sc.id} #${run} (${res.call.current_role}, ${res.msgs.length} msg, flags "${res.call.flags || ""}", ${res.endedByAgent ? "agent hung up" : "caller hung up"})`);
    for (const f of fails) console.log("   - " + f);
    if (fails.length || args.includes("--verbose")) for (const h of res.heard) console.log(h.caller ? `     CALLER: ${h.caller}` : `     AGENT (${h.wait.toFixed(1)}s): ${h.text}`);
  }
}
console.log(`\n${list.length * RUNS - failed}/${list.length * RUNS} passed`);
process.exit(failed ? 1 : 0);
