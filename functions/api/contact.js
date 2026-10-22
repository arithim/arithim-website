// Cloudflare Pages Function: POST /api/contact
// Receives the contact form, verifies Turnstile, emails Arithim via Resend.
//
// Required env vars (set via `wrangler pages secret put` or Pages dashboard):
//   RESEND_API_KEY     - API key from resend.com
//   TO_EMAIL           - destination inbox, e.g. hello@arithim.com
//   FROM_EMAIL         - verified sender on arithim.com, e.g. enquiries@arithim.com
//   TURNSTILE_SECRET   - Cloudflare Turnstile widget secret key

const TURNSTILE_ACTION = "contact-form";
const TURNSTILE_HOSTNAMES = new Set([
  "arithim.com",
  "www.arithim.com",
]);

export async function onRequestPost({ request, env }) {
  const json = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  let form;
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      form = await request.json();
    } else {
      const fd = await request.formData();
      form = Object.fromEntries(fd.entries());
    }
  } catch {
    return json(400, { error: "invalid request body" });
  }

  // Honeypot: bots fill hidden fields; silently accept so they don't retry.
  if (form.website || form.company_url) return json(200, { ok: true });

  // Turnstile verification.
  const token = (form["cf-turnstile-response"] || "").toString();
  if (!token || token.length > 2048) {
    return json(403, { error: "please complete the challenge" });
  }
  const clientIp = request.headers.get("cf-connecting-ip") || "";
  let ts;
  try {
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: token,
          remoteip: clientIp,
        }),
      }
    );
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    ts = await r.json();
  } catch (e) {
    console.error("turnstile siteverify failed", e);
    return json(403, { error: "challenge verification failed" });
  }
  if (
    !ts.success ||
    ts.action !== TURNSTILE_ACTION ||
    !TURNSTILE_HOSTNAMES.has(ts.hostname)
  ) {
    console.error("turnstile rejected", {
      success: ts.success,
      action: ts.action,
      hostname: ts.hostname,
      errors: ts["error-codes"],
    });
    return json(403, { error: "challenge verification failed" });
  }

  // "demo" requests come from the Technical Sales Guide page. Same Turnstile and
  // honeypot checks as above; the required fields differ (email and company, no challenge text).
  const isDemo = (form.type || "").toString() === "demo";
  const name = (form.name || "").toString().trim();
  const demoNote = (form.note || "").toString().trim();
  const challenge = isDemo ? demoNote : (form.challenge || "").toString().trim();
  if (isDemo) {
    const em = (form.email || "").toString().trim();
    const co = (form.company || "").toString().trim();
    if (!name || !co || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      return json(400, { error: "name, work email and company are required" });
    }
  } else if (!name || !challenge) {
    return json(400, { error: "name and challenge are required" });
  }
  if (name.length > 200 || challenge.length > 5000) {
    return json(400, { error: "field too long" });
  }

  const company = (form.company || "").toString().trim().slice(0, 200);
  const industry = (form.industry || "").toString().trim().slice(0, 200);
  const timeline = (form.timeline || "").toString().trim().slice(0, 100);
  const success = (form.success || "").toString().trim().slice(0, 5000);
  const email = (form.email || "").toString().trim().slice(0, 200);
  const country = isDemo ? (form.country || "").toString().trim().slice(0, 100) : "";
  const role = isDemo ? (form.role || "").toString().trim().slice(0, 100) : "";

  const esc = (s) =>
    s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const subject = `${isDemo ? "Demo request (Technical Sales Guide)" : "New enquiry"} — ${name}${company ? " (" + company + ")" : ""}`;

  const text =
    `${isDemo ? "Demo request for the Technical Sales Guide" : "New enquiry from arithim.com"}\n\n` +
    `Name:      ${name}\n` +
    (email ? `Email:     ${email}\n` : "") +
    (company ? `Company:   ${company}\n` : "") +
    (country ? `Country:   ${country}\n` : "") +
    (role ? `Role:      ${role}\n` : "") +
    (industry ? `Industry:  ${industry}\n` : "") +
    (timeline ? `Timeline:  ${timeline}\n` : "") +
    (challenge ? `\n${isDemo ? "Note" : "Challenge"}:\n${challenge}\n` : "") +
    (success ? `\nSuccess looks like:\n${success}\n` : "");

  const html =
    `<h2 style="font-family:system-ui,sans-serif;">${isDemo ? "Demo request for the Technical Sales Guide" : "New enquiry from arithim.com"}</h2>` +
    `<table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse;">` +
    `<tr><td style="padding:4px 12px 4px 0;color:#555;">Name</td><td>${esc(name)}</td></tr>` +
    (email ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>` : "") +
    (company ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Company</td><td>${esc(company)}</td></tr>` : "") +
    (country ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Country</td><td>${esc(country)}</td></tr>` : "") +
    (role ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Role</td><td>${esc(role)}</td></tr>` : "") +
    (industry ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Industry</td><td>${esc(industry)}</td></tr>` : "") +
    (timeline ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Timeline</td><td>${esc(timeline)}</td></tr>` : "") +
    `</table>` +
    (challenge
      ? `<p style="font-family:system-ui,sans-serif;font-size:14px;margin-top:20px;"><strong>${isDemo ? "Note" : "Challenge"}</strong></p>` +
        `<p style="font-family:system-ui,sans-serif;font-size:14px;white-space:pre-wrap;">${esc(challenge)}</p>`
      : "") +
    (success
      ? `<p style="font-family:system-ui,sans-serif;font-size:14px;margin-top:20px;"><strong>Success looks like</strong></p>` +
        `<p style="font-family:system-ui,sans-serif;font-size:14px;white-space:pre-wrap;">${esc(success)}</p>`
      : "");

  const body = {
    from: env.FROM_EMAIL,
    to: [env.TO_EMAIL],
    subject,
    text,
    html,
    ...(email ? { reply_to: email } : {}),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("resend failed", res.status, detail);
    return json(502, { error: "could not send" });
  }

  return json(200, { ok: true });
}

export function onRequest() {
  return new Response("method not allowed", {
    status: 405,
    headers: { allow: "POST" },
  });
}
