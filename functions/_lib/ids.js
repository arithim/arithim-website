// Random ids and message references.

export function randomHex(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newCallId() {
  return randomHex(16); // 128 bits
}

export const CALL_ID_RE = /^[0-9a-f]{32}$/;

// No 0/O/1/I/L so a reference read aloud or typed is unambiguous.
const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newRef(nowSec = Math.floor(Date.now() / 1000)) {
  const d = new Date(nowSec * 1000);
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const r = new Uint8Array(4);
  crypto.getRandomValues(r);
  const x = Array.from(r, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
  return `ARC-${yy}${mm}${dd}-${x}`;
}
