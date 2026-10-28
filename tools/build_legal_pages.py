#!/usr/bin/env python3
"""Build privacy.html and legal.html from content/legal.json.

A legal page is its text and nothing else. Each page in content/legal.json has a slug, a label (the word after
/arithim in the header), an eyebrow, title, h1, description, an "updated" date, an optional "note" (written
into the page as an HTML comment for the owner) and sections of {h, p: [paragraphs]}. Paragraphs are trusted
HTML so they can hold a link. Run `python3 tools/build_legal_pages.py`, then `python3 tools/build_insights.py`
to stamp the shared head, header and footer. `--check` fails if a page is stale.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://arithim.com"
e = html.escape


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + "</script>"


def render(p: dict) -> str:
    url = f"{SITE}/{p['slug']}.html"
    webpage = {"@context": "https://schema.org", "@type": "WebPage", "@id": url + "#page", "url": url, "name": p["h1"], "description": p["description"],
               "publisher": {"@id": f"{SITE}/#organization"}, "inLanguage": "en-GB"}
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Arithim", "item": f"{SITE}/"}, {"@type": "ListItem", "position": 2, "name": p["h1"], "item": url}]}
    secs = "".join(f'<div class="ah-doc-sec"><h2>{e(s["h"])}</h2>' + "".join(f"<p>{x}</p>" for x in s["p"]) + "</div>\n    " for s in p["sections"])
    note = f"\n    <!-- {p['note']} -->" if p.get("note") else ""
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(p['title'])}</title>
<meta name="description" content="{e(p['description'])}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Arithim">
<meta property="og:title" content="{e(p['title'])}">
<meta property="og:description" content="{e(p['description'])}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:image" content="{SITE}/assets/og-image.png">
{ld(webpage)}
{ld(crumbs)}
<!-- partial:head -->
<!-- /partial:head -->
</head>
<body>
<x-dc>

<div class="tsg ah-page">
<a class="tsg-skip" href="#main">Skip to content</a>

<!-- partial:header {{"label": "{e(p['label'])}", "active": ""}} -->
<!-- /partial:header -->

<main id="main">
  <div class="r-gut ah-doc-hero">
    <div class="ah-doc-eyebrow">{e(p['eyebrow'])}</div>
    <h1 class="r-f3 ah-doc-h1">{e(p['h1'])}</h1>
    <p class="ah-doc-date">LAST UPDATED · {e(p['updated'])}</p>
  </div>
  <div class="r-gut ah-doc-body">{note}
    {secs}</div>
</main>

<!-- partial:footer {{"back_href": "index.html", "back_text": "← BACK TO HOME"}} -->
<!-- /partial:footer -->

</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
class Component extends DCLogic {{
  componentDidMount() {{
    import('./arithim-fx.js?v=5').then((m) => {{ this._stop = m.initFx(document); }}).catch((e) => console.error('fx load failed', e));
  }}
  componentWillUnmount() {{ if (this._stop) this._stop(); }}
  renderVals() {{ return {{}}; }}
}}
</script>
<a class="callus-link" href="/contact.html"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>Call us</a>
<script src="/assets/callus.js?v=3" defer></script>
</body>
</html>
"""


def main():
    pages = json.loads((ROOT / "content" / "legal.json").read_text(encoding="utf-8"))["pages"]
    strip = lambda t: re.sub(r"<!-- partial:(\w+)[^>]*?-->.*?<!-- /partial:\1 -->", "", t, flags=re.S)
    stale = []
    for p in pages:
        out = ROOT / f"{p['slug']}.html"
        text = render(p)
        if out.exists() and strip(out.read_text(encoding="utf-8")) == strip(text):
            continue
        stale.append(out.name)
        if "--check" not in sys.argv:
            out.write_text(text, encoding="utf-8")
    if "--check" in sys.argv:
        print("ok: legal pages are up to date" if not stale else "stale: " + ", ".join(stale))
        sys.exit(1 if stale else 0)
    print("wrote: " + ", ".join(stale) if stale else "nothing to change")


if __name__ == "__main__":
    main()
