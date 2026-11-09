#!/usr/bin/env node
// Latency probe for the Call us brain: runs scripted 10-turn conversations per role through runBrain in-process,
// against the real Anthropic API, and reports how long a caller waits.
//
//   node --env-file=$HOME/.config/arithim/anthropic-calls.env tools/call-agent/test/latency.mjs [--roles front-desk,tsg] [--turns 10] [--label before] [--out file.json]
//   ... latency.mjs --tokens     prompt size per role (system prompt + tools) from the count_tokens endpoint, no generation
//
// Per turn it records, from the moment the request starts:
//   first_delta   first text delta from the model (time to first token as the API reports it)
//   first_clause  first point where the raw text has a clause boundary (what an ideal clause flush could say)
//   first_speech  first text actually emitted to the caller, after the pre-speech filter (what the caller waits for)
// plus the cache counters the API returned. The API key is read from the environment and never printed.
// Uses an in-memory D1 shim, so take_message works; nothing leaves the machine except the Anthropic calls.

import { writeFileSync } from "node:fs";
import { makeDb, seedCall } from "./helpers.mjs";
import { runBrain, TAKE_MESSAGE_TOOL, THINK_TOOL } from "../../../functions/_lib/brain.js";
import { ROLES } from "../../../functions/_lib/call-knowledge.generated.js";

const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const ROLE_LIST = (opt("--roles") || "front-desk,consulting,tsg,customer-desk").split(",");
const TURNS = Number(opt("--turns", 10));
const LABEL = opt("--label", "run");
const OUT = opt("--out");

if (!process.env.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY missing: pass --env-file=$HOME/.config/arithim/anthropic-calls.env"); process.exit(2); }

if (args.includes("--tokens")) {
  const out = {};
  for (const role of ROLE_LIST) {
    const r = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.CALL_TALKER_MODEL || "claude-sonnet-5-5", system: ROLES[role].system, tools: [TAKE_MESSAGE_TOOL, THINK_TOOL].map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })), messages: [{ role: "user", content: "hi" }] }),
    });
    const j = await r.json();
    out[role] = j.input_tokens ?? j;
    console.log(role.padEnd(14), String(out[role]).padStart(6), "tokens", `(${ROLES[role].system.length} chars)`);
  }
  if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 2));
  process.exit(0);
}

const SCRIPTS = {
  // the front desk's own calls (partners, job seekers, press) end with a message; routing to a colleague is covered by the other three scripts
  "front-desk": [
    "Hi, I'm calling about a possible partnership.",
    "I'm Dan Whitfield from Brightpath, we resell business software.",
    "We'd like to talk about whether Arithim would recommend our product to its clients.",
    "Is Arithim hiring at the moment, actually? A colleague of mine is looking.",
    "How big is the team there?",
    "Can you tell me who your clients are?",
    "Fair enough. My email is dan dot whitfield at brightpath dot co dot uk.",
    "Or you can ring me on 07700 900456.",
    "Afternoons are best for me.",
    "That's everything, thanks. Bye.",
  ],
  consulting: [
    "Hi, I run operations at a firm with about sixty people and our month-end reporting is a nightmare.",
    "Three of us spend about a week pulling numbers out of different spreadsheets and the finance system.",
    "We've tried macros but they break whenever somebody changes a column.",
    "Mostly I'd like to know if AI is even the right thing for this.",
    "Do you work with regulated businesses? We're in financial services.",
    "What would a first piece of work look like?",
    "I'm Priya Shah, by the way, I'm the operations director at Calder Wealth.",
    "My email is priya dot shah at calder wealth dot co dot uk.",
    "Could Tarun call me on Thursday afternoon?",
    "No, that's all for now, thank you.",
  ],
  tsg: [
    "Hello, I'm after some information on the Technical Sales Guide.",
    "I'm a sales director at a speciality chemicals distributor.",
    "Our reps struggle to find the right product spec when a customer rings in.",
    "How does it actually know about our products?",
    "Where does our data go, is it kept in the UK?",
    "Can we try it with a small team first?",
    "I'm Marcus Webb, Hallam Chemicals.",
    "marcus dot webb at hallam chemicals dot com is the best email.",
    "Can you set up a demo for next week?",
    "That's great, thanks very much, bye.",
  ],
  "customer-desk": [
    "Hi, I've got a problem with one of your products, it's not letting me log in.",
    "It's Find Me A Job. I get an error saying my session expired every time.",
    "Since this morning. I've tried two browsers.",
    "My name's Jo Park, email jo dot park at example dot com.",
    "Also I got an invoice from you that I don't recognise.",
    "It's invoice number I N V dash four four two one.",
    "Can you tell me if it's been paid?",
    "I'd like to change the bank details on your side as well, we've moved bank.",
    "Right, okay. Can you log it then?",
    "That's all, thanks.",
  ],
};
// The tools ElevenLabs passes through, as the platform sends them (OpenAI shape).
const PLATFORM_TOOLS = [
  { type: "function", function: { name: "transfer_to_agent", description: "Hand the call to a colleague when the caller's need clearly belongs to them.", parameters: { type: "object", properties: { agent_number: { type: "integer" }, reason: { type: "string" } }, required: ["agent_number"] } } },
  { type: "function", function: { name: "end_call", description: "End the call.", parameters: { type: "object", properties: { reason: { type: "string" } } } } },
];
const GREETING = "Hi, you're through to Arithim, this is Hannah. What can I do for you?";

const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };

// usage lines come from anthropicStream's console.log; capture them per role run (roles run in parallel, so tag by order of calls instead)
const realLog = console.log;
let usageSink = null;
console.log = (...a) => {
  if (usageSink && typeof a[0] === "string" && a[0].startsWith('{"at":"anthropic"')) { try { usageSink.push(JSON.parse(a[0])); } catch {} return; }
  realLog(...a);
};

async function runRole(role) {
  const db = makeDb();
  const call = await seedCall(db, { call_id: role.replace(/\W/g, "").padEnd(32, "a").slice(0, 32), el_conversation_id: "conv_" + role });
  const messages = role === "front-desk" ? [{ role: "assistant", content: GREETING }] : [];
  const rows = [];
  const script = SCRIPTS[role].slice(0, TURNS);
  for (let i = 0; i < script.length; i++) {
    messages.push({ role: "user", content: script[i] });
    const t0 = performance.now();
    let firstDelta = null, firstClause = null, firstSpeech = null, raw = "";
    const texts = [];
    const usages = [];
    let toolName = null;
    // one role at a time owns usageSink: roles are run one after another per turn via a mutex below
    const r = await withUsage(usages, () => runBrain({
      env: process.env, db, call, role, body: { messages, tools: PLATFORM_TOOLS }, denylist: [],
      emit: (e) => { if (e.type === "text") { if (firstSpeech === null) firstSpeech = performance.now() - t0; texts.push(e.text); } else if (e.type === "tool_call") toolName = e.name; },
      onRawText: (d) => {
        const t = performance.now() - t0;
        if (firstDelta === null) firstDelta = t;
        raw += d;
        if (firstClause === null && /[,;:—–.!?]\s|\s(?:and|but)\s/.test(raw)) firstClause = t;
      },
    }));
    const said = texts.join("").trim();
    messages.push({ role: "assistant", content: said || "." });
    const u1 = usages[0] || {};
    rows.push({ role, turn: i + 1, firstDelta, firstClause: firstClause ?? firstSpeech, firstSpeech, steps: usages.length,
      in: u1.in, cache_read: u1.cache_read, cache_write: u1.cache_write, flags: r.hits, tool: toolName, said });
    // a pass-through tool (end_call, transfer_to_agent) hands control back to the platform; the scripted caller carries on regardless
    if (toolName === "end_call" && i < script.length - 1) { /* keep going: the script is a fixed set of typical turns */ }
  }
  return rows;
}
// anthropicStream logs usage to console.log; serialise API calls across roles so each turn can claim its own usage line
let chain = Promise.resolve();
function withUsage(sink, fn) {
  // roles run concurrently; usage attribution is by closure through a per-call sink swap guarded by a lock only around the sink assignment
  // Simpler and exact: run turn-by-turn with all roles in lock-step (see main), so only one runBrain is live at a time per round when --serial.
  const prev = usageSink; usageSink = sink;
  return fn().finally(() => { usageSink = prev; });
}

// Lock-step is not needed for latency fairness, but usage attribution is: run roles one after another.
const all = [];
for (const role of ROLE_LIST) {
  if (!ROLES[role]) { console.error("unknown role", role); continue; }
  realLog(`role ${role} ...`);
  all.push(...(await runRole(role)));
}
console.log = realLog;

const summarise = (rows) => {
  const f = (k) => rows.map((r) => r[k]).filter((x) => typeof x === "number");
  const o = {};
  for (const k of ["firstDelta", "firstClause", "firstSpeech"]) o[k] = { p50: Math.round(pct(f(k), 50)), p95: Math.round(pct(f(k), 95)), n: f(k).length };
  return o;
};
const report = { label: LABEL, at: new Date().toISOString(), model: process.env.CALL_TALKER_MODEL || "claude-sonnet-5-5", turns: TURNS, overall: summarise(all), byRole: {}, cache: {} };
for (const role of ROLE_LIST) {
  const rows = all.filter((r) => r.role === role);
  if (!rows.length) continue;
  report.byRole[role] = summarise(rows);
  const later = rows.filter((r) => r.turn > 1);
  report.cache[role] = {
    systemTokensTurn1: rows[0].in + (rows[0].cache_read || 0) + (rows[0].cache_write || 0),
    turn1: { cache_read: rows[0].cache_read, cache_write: rows[0].cache_write, in: rows[0].in },
    laterTurnsWithCacheRead: later.filter((r) => r.cache_read > 0).length + "/" + later.length,
    laterMeanCacheRead: Math.round(later.reduce((a, r) => a + (r.cache_read || 0), 0) / Math.max(1, later.length)),
    laterMeanUncached: Math.round(later.reduce((a, r) => a + (r.in || 0) + (r.cache_write || 0), 0) / Math.max(1, later.length)),
  };
}
const words = all.map((r) => (r.said || "").split(/\s+/).filter(Boolean).length);
const sentences = all.map((r) => (r.said || "").split(/(?<=[.!?])\s+/).filter(Boolean).length);
report.reply = { meanWords: +(words.reduce((a, b) => a + b, 0) / words.length).toFixed(1), meanSentences: +(sentences.reduce((a, b) => a + b, 0) / sentences.length).toFixed(2), threePlusSentenceTurns: sentences.filter((n) => n >= 3).length, turns: all.length };
report.rows = all;
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));
const line = (k, s) => `${k.padEnd(14)} p50 ${String(s.p50).padStart(5)} ms   p95 ${String(s.p95).padStart(5)} ms`;
realLog(`\n== ${LABEL} (${report.model}) overall, ${all.length} turns`);
for (const k of ["firstDelta", "firstClause", "firstSpeech"]) realLog(line(k, report.overall[k]));
for (const [role, s] of Object.entries(report.byRole)) realLog(`${role.padEnd(14)} first speech p50 ${s.firstSpeech.p50} p95 ${s.firstSpeech.p95} | first delta p50 ${s.firstDelta.p50}`);
realLog("cache:", JSON.stringify(report.cache));
realLog("reply shape:", JSON.stringify(report.reply));
