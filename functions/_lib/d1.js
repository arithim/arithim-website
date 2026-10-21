// D1 helpers. The binding is env.CALLS_DB. Everything here is a thin wrapper so tests can pass a shim.

export function getDb(env) {
  if (!env || !env.CALLS_DB) throw new Error("CALLS_DB binding missing");
  return env.CALLS_DB;
}

export const nowSec = () => Math.floor(Date.now() / 1000);

export function dayKey(sec = nowSec()) {
  return new Date(sec * 1000).toISOString().slice(0, 10);
}

export function monthKey(sec = nowSec()) {
  return new Date(sec * 1000).toISOString().slice(0, 7);
}

export async function run(db, sql, ...args) {
  return db.prepare(sql).bind(...args).run();
}
export async function first(db, sql, ...args) {
  return db.prepare(sql).bind(...args).first();
}
export async function all(db, sql, ...args) {
  const r = await db.prepare(sql).bind(...args).all();
  return r.results || [];
}
// Several statements in one transaction. D1 runs a batch serially and atomically, so no other request interleaves.
// Each item is [sql, ...args]. Returns the per-statement results.
export async function batch(db, items) {
  return db.batch(items.map(([sql, ...args]) => db.prepare(sql).bind(...args)));
}
export const changes = (r) => (r && r.meta && r.meta.changes) || 0;

export async function getConfig(db) {
  const row = await first(db, "SELECT * FROM config WHERE id = 1");
  return row || null;
}

export async function getCall(db, callId) {
  return first(db, "SELECT * FROM calls WHERE call_id = ?", callId);
}

// "preview" selects the preview agent id; everything else is production.
export function envName(env, request) {
  if (env.CALL_ENV) return env.CALL_ENV === "preview" ? "preview" : "prod";
  try {
    const h = new URL(request.url).hostname;
    if (h.endsWith(".pages.dev") && h !== "arithim.pages.dev") return "preview";
  } catch {}
  return "prod";
}

export function agentIdFor(config, name) {
  return (name === "preview" ? config.front_desk_agent_id_preview : config.front_desk_agent_id_prod) || null;
}

// IPv4 as is; IPv6 reduced to its /64. Hashed with an optional salt so D1 never holds a raw address.
export function ipPrefix(ip) {
  ip = String(ip || "").trim().toLowerCase();
  if (!ip) return "unknown";
  if (!ip.includes(":")) return ip;
  // IPv4-mapped IPv6 (::ffff:1.2.3.4 or ::ffff:0102:0304) is the IPv4 address, not an IPv6 /64
  const dotted = /^(?:0{1,4}:){0,5}(?::)?ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip) || /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  if (dotted) return dotted[1];
  let [head, tail] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail ? tail.split(":") : [];
  const fill = tail === undefined ? [] : new Array(Math.max(0, 8 - h.length - t.length)).fill("0");
  const groups = [...h, ...fill, ...t].map((g) => g.replace(/^0+(?=.)/, ""));
  if (groups.length === 8 && groups.slice(0, 5).every((g) => g === "0") && groups[5] === "ffff") {
    const hi = parseInt(groups[6], 16), lo = parseInt(groups[7], 16);
    if (Number.isFinite(hi) && Number.isFinite(lo)) return [hi >> 8, hi & 255, lo >> 8, lo & 255].join(".");
  }
  return groups.slice(0, 4).join(":");
}

export async function ipKey(ip, salt = "") {
  const data = new TextEncoder().encode(`${salt}|${ipPrefix(ip)}`);
  const d = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(d).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}
