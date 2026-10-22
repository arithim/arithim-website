#!/usr/bin/env python3
"""Weekly digest of the "Call us" agents, from D1. Standard library only, no LLM.

    python3 tools/call-agent/digest.py [--days 7] [--email] [--wrangler-dir DIR]

Reads D1 with `npx wrangler d1 execute CALLS_DB --remote --json --command ...`.
--email sends through Resend using RESEND_API_KEY from ~/.config/arithim/resend.env.
Caller text is data: every cell is escaped for Markdown/HTML and a leading = + - @ gets a ' prefix.
"""
import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request

VOICE_USD_PER_MIN = 0.08
# Estimate when token usage is not stored (it is only logged by the endpoint):
# talker ~ $0.035 per call-minute with caching, plus one think call (~$0.05) per 4 minutes.
EST_LLM_USD_PER_MIN = 0.035 + 0.05 / 4
FORMULA_CHARS = ("=", "+", "-", "@")


def cell(value, limit=160):
    """Make untrusted text safe for a Markdown table cell and for spreadsheets."""
    s = "" if value is None else str(value)
    s = "".join(ch if ch >= " " else " " for ch in s).replace(" ", " ").replace(" ", " ")
    s = s.strip()[:limit]
    for a, b in (("&", "&amp;"), ("<", "&lt;"), (">", "&gt;"), ("\\", "\\\\"), ("|", "\\|"), ("`", "\\`"), ("*", "\\*"), ("[", "\\["), ("]", "\\]")):
        s = s.replace(a, b)
    if s.startswith(FORMULA_CHARS):
        s = "'" + s
    return s


def query_d1(sql, cwd=None):
    cmd = ["npx", "wrangler", "d1", "execute", "CALLS_DB", "--remote", "--json", "--command", sql]
    out = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd, timeout=120)
    if out.returncode != 0:
        raise RuntimeError("wrangler failed: " + out.stderr.strip()[:500])
    data = json.loads(out.stdout)
    if isinstance(data, list):
        data = data[0]
    return data.get("results", [])


def gather(q, now, days):
    since = now - days * 86400
    return {
        "since": since,
        "totals": q(f"SELECT COUNT(*) AS calls, SUM(CASE WHEN mode='voice' THEN 1 ELSE 0 END) AS voice, SUM(CASE WHEN mode='text' THEN 1 ELSE 0 END) AS text, COALESCE(SUM(used_minutes),0) AS minutes FROM calls WHERE created_at >= {since}"),
        "outcomes": q(f"SELECT COALESCE(outcome,'(none)') AS outcome, COUNT(*) AS n FROM calls WHERE created_at >= {since} GROUP BY 1 ORDER BY n DESC"),
        "flags": q(f"SELECT call_id, flags, current_role, created_at FROM calls WHERE created_at >= {since} AND flags <> '' ORDER BY created_at DESC LIMIT 50"),
        "messages": q(f"SELECT type, COUNT(*) AS n FROM messages WHERE created_at >= {since} GROUP BY 1 ORDER BY n DESC"),
        "unanswered": q(f"SELECT ref, type, json_extract(fields,'$.summary') AS summary, created_at FROM messages WHERE created_at >= {since} AND json_extract(fields,'$.summary') IS NOT NULL AND (lower(json_extract(fields,'$.summary')) LIKE '%don''t know%' OR lower(json_extract(fields,'$.summary')) LIKE '%do not know%' OR lower(json_extract(fields,'$.summary')) LIKE '%not sure%' OR lower(json_extract(fields,'$.summary')) LIKE '%unable to answer%' OR lower(json_extract(fields,'$.summary')) LIKE '%could not answer%') ORDER BY created_at DESC LIMIT 50"),
        "helpful": q(f"SELECT SUM(CASE WHEN helpful=1 THEN 1 ELSE 0 END) AS yes, SUM(CASE WHEN helpful=0 THEN 1 ELSE 0 END) AS no FROM calls WHERE created_at >= {since}"),
        "unsent": q(f"SELECT call_id, status, created_at FROM calls WHERE email_sent <> 1 AND (status = 'ended' OR (status = 'expired' AND EXISTS (SELECT 1 FROM messages m WHERE m.call_id = calls.call_id))) AND created_at >= {since} ORDER BY created_at LIMIT 100"),
        "unfinalised": q(f"SELECT call_id, mode, status, created_at FROM calls WHERE finalized_at IS NULL AND created_at < {now - 3600} AND created_at >= {since - 30 * 86400} ORDER BY created_at LIMIT 100"),
    }


def table(headers, rows):
    if not rows:
        return "_None._\n"
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    for r in rows:
        lines.append("| " + " | ".join(cell(c) for c in r) + " |")
    return "\n".join(lines) + "\n"


def ts(sec):
    return time.strftime("%Y-%m-%d %H:%M", time.gmtime(int(sec or 0)))


def render(d, days, now):
    t = (d["totals"] or [{}])[0]
    calls = int(t.get("calls") or 0)
    minutes = float(t.get("minutes") or 0)
    voice_cost = minutes * VOICE_USD_PER_MIN
    llm_cost = minutes * EST_LLM_USD_PER_MIN
    h = (d["helpful"] or [{}])[0]
    yes, no = int(h.get("yes") or 0), int(h.get("no") or 0)
    ratio = f"{yes} of {yes + no} ({100 * yes // (yes + no)}%)" if yes + no else "no ratings yet"
    out = [f"# Call us digest: {ts(now - days * 86400)[:10]} to {ts(now)[:10]} (UTC)\n"]
    out.append("## Calls and minutes\n")
    out.append(f"- Conversations: {calls} ({int(t.get('voice') or 0)} voice, {int(t.get('text') or 0)} text)")
    out.append(f"- Voice minutes used: {minutes:.1f}")
    out.append(f"- Estimated cost: ${voice_cost + llm_cost:.2f} (voice ${voice_cost:.2f} at ${VOICE_USD_PER_MIN}/min, AI model ${llm_cost:.2f} ESTIMATED from minutes because token usage is not stored; check the Anthropic Console for the real figure)\n")
    out.append("## Outcomes\n")
    out.append(table(["Outcome", "Count"], [[r["outcome"], r["n"]] for r in d["outcomes"]]))
    out.append("## Flags\n")
    out.append(table(["Call", "Flags", "Role", "When (UTC)"], [[r["call_id"][:8], r["flags"], r["current_role"], ts(r["created_at"])] for r in d["flags"]]))
    out.append("## Messages taken, by type\n")
    out.append(table(["Type", "Count"], [[r["type"], r["n"]] for r in d["messages"]]))
    out.append("## Questions the assistants could not answer\n")
    out.append("Messages whose summary says the assistant did not know. Caller words, shown as data.\n")
    out.append(table(["Ref", "Type", "Summary", "When (UTC)"], [[r["ref"], r["type"], r["summary"], ts(r["created_at"])] for r in d["unanswered"]]))
    out.append("## Helpful ratio\n")
    out.append(f"- Marked helpful: {ratio}\n")
    out.append("## Reconciliation\n")
    un = d["unfinalised"]
    if un:
        out.append(f"{len(un)} call(s) older than 1 hour have no finalised webhook record. Check the ElevenLabs webhook status and replay them, then re-run.\n")
        out.append(table(["Call", "Mode", "Status", "Started (UTC)"], [[r["call_id"][:8], r["mode"], r["status"], ts(r["created_at"])] for r in un]))
    else:
        out.append("All calls older than 1 hour have a finalised record.\n")
    out.append("## Emails not sent\n")
    unsent = d.get("unsent") or []
    if unsent:
        out.append(f"{len(unsent)} call(s) have no sent email to Tarun (Resend failure or missing configuration). The next webhook or call start retries them; check RESEND_API_KEY, TO_EMAIL and CALL_FROM_EMAIL if this persists.\n")
        out.append(table(["Call", "Status", "Started (UTC)"], [[r["call_id"][:8], r["status"], ts(r["created_at"])] for r in unsent]))
    else:
        out.append("Every finished call has its email sent.\n")
    return "\n".join(out)


def html_of(md):
    import html
    return "<pre style=\"font-family:ui-monospace,Menlo,monospace;font-size:13px;white-space:pre-wrap\">" + html.escape(md) + "</pre>"


def send_email(md, subject, to, sender, env_path):
    key = None
    if os.path.exists(env_path):
        for line in open(env_path):
            if line.strip().startswith("RESEND_API_KEY="):
                key = line.split("=", 1)[1].strip().strip("'\"")
    if not key:
        raise RuntimeError("RESEND_API_KEY not found in " + env_path)
    body = json.dumps({"from": sender, "to": [to], "subject": subject, "text": md, "html": html_of(md)}).encode()
    req = urllib.request.Request("https://api.resend.com/emails", data=body, headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=30).read()


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--email", action="store_true")
    ap.add_argument("--to", default="hello@arithim.com")
    ap.add_argument("--from", dest="sender", default=os.environ.get("CALL_FROM_EMAIL", "calls@arithim.com"))
    ap.add_argument("--wrangler-dir", default=os.getcwd())
    a = ap.parse_args(argv)
    now = int(time.time())
    try:
        md = render(gather(lambda sql: query_d1(sql, a.wrangler_dir), now, a.days), a.days, now)
    except Exception as e:
        print("digest failed: " + str(e), file=sys.stderr)
        return 1
    print(md)
    if a.email:
        try:
            send_email(md, f"Call us weekly digest ({time.strftime('%d %b %Y', time.gmtime(now))})", a.to, a.sender, os.path.expanduser("~/.config/arithim/resend.env"))
        except Exception as e:
            print("email failed: " + str(e), file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
