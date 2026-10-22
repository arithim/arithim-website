// POST /api/call/start   {turnstileToken, mode: "voice"|"text"}  ->  {callId, token, agentId, mode, ...}
//
// Env: ELEVENLABS_API_KEY, TURNSTILE_SECRET, CALL_MOCK ("1" = mock, NON-production hosts only), CALL_ENV, CALL_IP_SALT (required),
//      CALL_ALLOWED_ORIGINS. On arithim.com / www.arithim.com a missing secret is a 503, never a mock and never a skipped challenge.
// Binding: CALLS_DB

import { getDb, getConfig, ipKey, dayKey, envName, agentIdFor, nowSec, run } from "../../_lib/d1.js";
import { expireStaleCalls, runMaintenance } from "../../_lib/cleanup.js";
import { ROLES } from "../../_lib/call-knowledge.generated.js";
import { newCallId } from "../../_lib/ids.js";
import { json } from "../../_lib/escape.js";
import { verifyTurnstile, turnstileHostnames } from "../../_lib/turnstile.js";
import { reserveIp, releaseIp, reserveGlobal, releaseGlobal, reserveText, releaseText, insertCallIfRoom } from "../../_lib/budget.js";

const ORIGINS = new Set(["https://arithim.com", "https://www.arithim.com"]);

const PROD_HOSTS = new Set(["arithim.com", "www.arithim.com"]);
export function isProductionHost(request) {
  try { return PROD_HOSTS.has(new URL(request.url).hostname); } catch { return true; }
}

// Mock only when explicitly asked for AND not on a production host. A missing ELEVENLABS_API_KEY is never a mock.
export function isMock(env, request) {
  return env.CALL_MOCK === "1" && !isProductionHost(request);
}

export function originAllowed(request, env) {
  const o = request.headers.get("origin") || "";
  // Preview deploys without D1: the page's own origin is allowed so the mock flow works.
  if (!env.CALLS_DB && !isProductionHost(request)) { try { if (o === new URL(request.url).origin) return true; } catch {} }
  if (ORIGINS.has(o)) return true;
  const extra = (env.CALL_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (extra.includes(o)) return true;
  if (isMock(env, request) && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return true;
  return false;
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!originAllowed(request, env)) return json(403, { error: "forbidden", fallback: "form" });

  let body;
  try { body = await request.json(); } catch { return json(400, { error: "invalid request body" }); }
  const mode = body?.mode === "text" ? "text" : body?.mode === "voice" ? "voice" : null;
  if (!mode) return json(400, { error: "mode must be voice or text" });

  if (!env.CALLS_DB) {
    // No D1 binding yet. Production must fail closed; previews show the mock flow (nothing is recorded).
    if (isProductionHost(request)) return json(503, { error: "unavailable", fallback: "form" });
    return json(200, {
      mock: true, callId: "mock-" + newCallId().slice(0, 12), conversationToken: "mock-token", mode,
      agent: { id: "mock-agent", name: ROLES["front-desk"]?.displayName || "Front desk" },
      agents: { "mock-agent": ROLES["front-desk"]?.displayName || "Front desk" },
      dynamicVariables: {}, maxSeconds: 900, wrapUpSeconds: 720,
    });
  }
  let db;
  try { db = getDb(env); } catch { return json(503, { error: "unavailable", fallback: "form" }); }
  const cfg = await getConfig(db);
  if (!cfg || !cfg.calls_enabled) return json(503, { error: "calls_off", fallback: "form" });

  const mock = isMock(env, request);
  const prod = isProductionHost(request);
  // Fail closed on missing configuration. Nothing here can turn a live site into a demo or skip the challenge.
  if (!mock && (!env.ELEVENLABS_API_KEY || !env.TURNSTILE_SECRET)) { console.error("call start: ELEVENLABS_API_KEY / TURNSTILE_SECRET missing"); return json(503, { error: "unavailable", fallback: "form" }); }
  if ((prod || !mock) && String(env.CALL_IP_SALT || "").length < 16) { console.error("call start: CALL_IP_SALT missing or shorter than 16 characters"); return json(503, { error: "unavailable", fallback: "form" }); }
  if (prod && !env.TURNSTILE_SECRET) return json(503, { error: "unavailable", fallback: "form" });
  const nameOf = (r) => ROLES[r]?.displayName || r;
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (prod && !ip) return json(400, { error: "bad request" });
  if (!(mock && !env.TURNSTILE_SECRET)) {
    const ts = await verifyTurnstile({ token: body.turnstileToken, ip, secret: env.TURNSTILE_SECRET, hostnames: turnstileHostnames(env.CALL_TURNSTILE_HOSTNAMES) });
    if (!ts.ok) return json(403, { error: "challenge verification failed" });
  }

  const agentId = mock ? "mock-agent" : agentIdFor(cfg, envName(env, request));
  if (!agentId) return json(503, { error: "unavailable", fallback: "text" });

  const now = nowSec();
  const day = dayKey(now);
  const ipK = await ipKey(ip, env.CALL_IP_SALT || "");
  const minutes = mode === "voice" ? cfg.max_call_minutes : 0;

  // Housekeeping that must not wait for a webhook: free reservations of calls that never connected (bounded), then the
  // 90-day deletes and email retries in the background.
  try { await expireStaleCalls(db, now); } catch (e) { console.error("expire", e); }
  const maint = runMaintenance(env, db, now);
  if (waitUntil) waitUntil(maint); else await maint;

  // ---- reservations (each is one atomic statement). Any throw undoes what was reserved. ----
  const undo = [];
  const rollback = async () => { for (const f of undo.reverse()) { try { await f(); } catch (e) { console.error("rollback", e); } } };
  const callId = newCallId();
  let callInserted = false;
  try {
    if (mode === "voice") {
      if (!(await reserveIp(db, ipK, day, minutes, cfg))) return json(429, { error: "ip_limit", fallback: "text" });
      undo.push(() => releaseIp(db, ipK, day, minutes));
      if (!(await reserveGlobal(db, day, minutes, cfg))) { await rollback(); return json(429, { error: "budget_spent", fallback: "text" }); }
      undo.push(() => releaseGlobal(db, day, minutes, 0));
    } else {
      if (!(await reserveText(db, ipK, day, cfg))) return json(429, { error: "text_limit", fallback: "form" });
      undo.push(() => releaseText(db, ipK, day));
    }

    const inserted = await insertCallIfRoom(
      db,
      { call_id: callId, created_at: now, day, ip_key: ipK, mode, reserved_minutes: minutes },
      cfg.concurrent_cap, (cfg.max_call_minutes + 5) * 60, now
    );
    if (!inserted) { await rollback(); return json(429, { error: "busy", fallback: "text" }); }
    callInserted = true;
  } catch (e) {
    console.error("call start reservation", e);
    await rollback();
    if (callInserted) { try { await run(db, "UPDATE calls SET status = 'failed' WHERE call_id = ?", callId); } catch {} }
    return json(500, { error: "unavailable", fallback: "text" });
  }

  // ---- token ----
  let token, conversationId = null;
  if (mock) {
    token = "mock-" + callId.slice(0, 16);
  } else {
    try {
      const r = await fetch(
        "https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=" + encodeURIComponent(agentId) + "&environment=" + (envName(env, request) === "preview" ? "staging" : "production"),
        { headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) throw new Error("token " + r.status);
      const j = await r.json();
      token = j.token;
      conversationId = j.conversation_id || null;
      if (!token) throw new Error("no token");
    } catch (e) {
      console.error("elevenlabs token failed", e);
      await run(db, "UPDATE calls SET status = 'failed' WHERE call_id = ?", callId);
      await rollback();
      return json(502, { error: "unavailable", fallback: "text" });
    }
    if (conversationId) {
      try { await run(db, "UPDATE calls SET el_conversation_id = ? WHERE call_id = ?", conversationId, callId); }
      catch (e) {
        console.error("bind conversation", e);
        try { await run(db, "UPDATE calls SET status = 'failed' WHERE call_id = ?", callId); } catch {}
        await rollback();
        return json(500, { error: "unavailable", fallback: "text" });
      }
    }
  }

  // Contract: tools/call-agent/docs/frontend.md
  let roster = {};
  try { roster = JSON.parse(cfg.agent_roster || "{}"); } catch {}
  const agents = {};
  for (const [id, role] of Object.entries(roster)) agents[id] = nameOf(role);
  agents[agentId] = nameOf("front-desk");
  return json(200, {
    callId,
    conversationToken: token,
    agent: { id: agentId, name: nameOf("front-desk") },
    agents,
    mode,
    ...(mock ? { mock: true } : {}),
    conversationId,
    dynamicVariables: { call_id: callId },
    maxSeconds: cfg.max_call_minutes * 60,
    wrapUpSeconds: 12 * 60,
  });
}

export function onRequest() {
  return new Response("method not allowed", { status: 405, headers: { allow: "POST" } });
}
