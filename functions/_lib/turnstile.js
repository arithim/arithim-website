// Cloudflare Turnstile verification, same approach as functions/api/contact.js.

export const TURNSTILE_ACTION = "call-start";
export const TURNSTILE_HOSTNAMES = new Set(["arithim.com", "www.arithim.com"]);

export async function verifyTurnstile({ token, ip, secret, action = TURNSTILE_ACTION, hostnames = TURNSTILE_HOSTNAMES, fetchImpl }) {
  token = (token || "").toString();
  if (!token || token.length > 2048) return { ok: false, reason: "missing" };
  const f = fetchImpl || fetch;
  let ts;
  try {
    const r = await f("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret: secret || "", response: token, remoteip: ip || "" }),
    });
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    ts = await r.json();
  } catch (e) {
    console.error("turnstile siteverify failed", e);
    return { ok: false, reason: "unreachable" };
  }
  if (!ts.success || ts.action !== action || !hostnames.has(ts.hostname)) {
    console.error("turnstile rejected", { success: ts.success, action: ts.action, hostname: ts.hostname, errors: ts["error-codes"] });
    return { ok: false, reason: "rejected" };
  }
  return { ok: true };
}
