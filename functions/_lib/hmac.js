// HMAC helpers: ElevenLabs webhook signatures and constant-time secret comparison.

const enc = new TextEncoder();

export function toHex(buf) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

// Constant-time string equality (length leak only).
export function safeEqual(a, b) {
  a = String(a ?? ""); b = String(b ?? "");
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// Header: "t=<unix seconds>,v0=<hex hmac sha256 of `${t}.${rawBody}`>"
// Rejects timestamps older than toleranceSec (default 30 min, as in the ElevenLabs SDK) or more than 5 min in the future.
export async function verifyElevenLabsSignature(rawBody, header, secret, { nowMs = Date.now(), toleranceSec = 1800 } = {}) {
  if (!secret || !header || typeof rawBody !== "string") return { ok: false, reason: "missing" };
  const parts = String(header).split(",").map((s) => s.trim());
  const t = parts.find((p) => p.startsWith("t="))?.slice(2);
  const sigs = parts.filter((p) => p.startsWith("v0=")).map((p) => p.slice(3));
  if (!t || !/^\d{1,12}$/.test(t) || sigs.length === 0) return { ok: false, reason: "malformed" };
  const tMs = Number(t) * 1000;
  if (nowMs - tMs > toleranceSec * 1000) return { ok: false, reason: "stale" };
  if (tMs - nowMs > 300_000) return { ok: false, reason: "future" };
  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  const ok = sigs.some((s) => safeEqual(s, expected));
  return ok ? { ok: true } : { ok: false, reason: "mismatch" };
}

// For tests and the harness: build a valid header.
export async function signElevenLabs(rawBody, secret, tSec = Math.floor(Date.now() / 1000)) {
  return `t=${tSec},v0=${await hmacSha256Hex(secret, `${tSec}.${rawBody}`)}`;
}
