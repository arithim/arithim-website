#!/usr/bin/env python3
"""Build the early-access and planned product pages (product-<slug>.html) from content/products.json.

Each entry holds only claims that are safe to publish: what the product returns, what it needs, its
limits and its status. Prices, competitor names and unlicensed data sources stay out of the file.
Run `python3 tools/build_product_pages.py`, then `python3 tools/build_insights.py` to stamp the shared
head, header and footer partials and refresh sitemap.xml. `--check` fails if a page is stale.
"""
from __future__ import annotations

import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "content" / "products.json"
SITE = "https://arithim.com"
e = html.escape


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + "</script>"


def cards(items, grid):
    return f'<div class="tsg-grid {grid}">' + "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in items) + "</div>"


def grid_for(n):
    return "tsg-g2" if n % 2 == 0 and n != 6 else "tsg-g3"


BTN = ('<a href="{href}" data-magnetic style="position:relative;display:inline-block;padding:1.5px;border-radius:999px;overflow:hidden;">'
       '<span style="position:absolute;inset:-150%;background:conic-gradient(from 0deg,transparent 50%,#E8A13C,#F6CE8C,transparent 78%);animation:ah-spin 3s linear infinite;"></span>'
       '<span style="position:relative;display:inline-flex;align-items:center;gap:8px;background:#0C1424;color:#F5F1E8;font-size:16px;font-weight:600;padding:16px 30px;border-radius:999px;">{label}</span></a>')


def render(p: dict, products: list[dict]) -> str:
    url = f"{SITE}/product-{p['slug']}.html"
    contact = f"contact.html?product={p['slug']}"
    cta = p["cta"]
    faq = p["faq"]
    service = {"@context": "https://schema.org", "@type": "Service", "name": p["name"], "serviceType": p["service_type"], "url": url, "description": p["description"],
               "provider": {"@type": "Organization", "name": "Arithim Ltd", "url": f"{SITE}/"}, "areaServed": {"@type": "Country", "name": p.get("area", "United Kingdom")},
               "audience": {"@type": "Audience", "audienceType": p["audience_type"]}}
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Arithim", "item": f"{SITE}/"}, {"@type": "ListItem", "position": 2, "name": "Products", "item": f"{SITE}/products.html"},
        {"@type": "ListItem", "position": 3, "name": p["name"], "item": url}]}
    steps = "".join(f"<li>{e(s)}</li>" for s in p["steps"])
    limits = "".join(f"<li>{e(x)}</li>" for x in p["limits"])
    inputs = "".join(f"<li>{e(x)}</li>" for x in p["inputs"])
    related = " · ".join(f'<a class="tsg-link" href="product-{r["slug"]}.html">{e(r["name"])}</a>' for r in products if r["slug"] != p["slug"] and r["slug"] in p.get("related", []))
    faq_html = "".join(f"<details><summary>{e(q)}</summary><div class=\"ans\"><p>{e(a)}</p></div></details>" for q, a in faq)
    sections = []
    sections.append(f"""  <section class="tsg-sec" id="gets" aria-labelledby="gets-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">WHAT YOU GET</div>
      <h2 class="tsg-h2" id="gets-h">{e(p['gets_h'])}</h2>
      <p class="tsg-lead">{e(p['gets_lead'])}</p>
      {cards(p['gets'], grid_for(len(p['gets'])))}
    </div>
  </section>""")
    sections.append(f"""  <section class="tsg-sec" id="needs" aria-labelledby="needs-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">WHAT YOU SEND</div>
      <h2 class="tsg-h2" id="needs-h">{e(p['needs_h'])}</h2>
      <ul class="as-list">{inputs}</ul>
      <p class="as-prose">{e(p['data_note'])}</p>
    </div>
  </section>""")
    sections.append(f"""  <section class="tsg-sec" id="who" aria-labelledby="who-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">WHO IT IS FOR</div>
      <h2 class="tsg-h2" id="who-h">{e(p['who_h'])}</h2>
      <p class="tsg-lead">{e(p['who'])}</p>
    </div>
  </section>""")
    sections.append(f"""  <section class="tsg-sec" id="limits" aria-labelledby="limits-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">LIMITS</div>
      <h2 class="tsg-h2" id="limits-h">{e(p['limits_h'])}</h2>
      <p class="tsg-lead">We state these on the page because they change what you can rely on.</p>
      <ul class="as-list">{limits}</ul>
    </div>
  </section>""")
    status_line = f'<span class="pp-st">{e(p["status"])}</span>'
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
{ld(service)}
{ld(faq_ld)}
{ld(crumbs)}
<!-- partial:head -->
<!-- /partial:head -->
<link rel="stylesheet" href="/assets/products/product-pages.css?v=2">
<link rel="stylesheet" href="/assets/callus.css?v=4">
</head>
<body>
<x-dc>

<div class="tsg" style="background:#070C16;color:#F5F1E8;min-height:100vh;">
<a class="tsg-skip" href="#main">Skip to content</a>

<!-- partial:header {{"label": "/{p['label']}", "active": "products.html", "cta": "contact"}} -->
<!-- /partial:header -->

<main id="main">
  <section data-hero style="position:relative;overflow:hidden;" aria-labelledby="pp-h1">
    <canvas class="ah-rb" data-ribbons="soft" aria-hidden="true"></canvas><div class="ah-rb-scrim ah-rb-l"></div>
    <div data-hero-glow style="position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 0.4s;"></div>
    <div class="tsg-wrap" style="position:relative;padding-top:64px;padding-bottom:20px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.12em;color:#E8A13C;margin-bottom:18px;">{e(p['eyebrow'])}</div>
      <h1 id="pp-h1" class="tsg-hero-h" style="font-weight:700;font-size:52px;line-height:1;letter-spacing:-0.04em;color:#F5F1E8;max-width:860px;">{e(p['h1'])}</h1>
      <p class="as-def">{e(p['definition'])}</p>
      <div style="margin-top:28px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;">{BTN.format(href=contact, label=e(cta) + " →")}{status_line}</div>
      <ol class="tsg-steps" aria-label="How it works">{steps}</ol>
      <p class="as-note">{e(p['status_note'])}</p>
    </div>
  </section>

{chr(10).join(sections)}

  <section class="tsg-sec" id="faq" aria-labelledby="faq-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">FREQUENTLY ASKED</div>
      <h2 class="tsg-h2" id="faq-h">Questions about {e(p['name'])}</h2>
      <div class="tsg-faq">{faq_html}</div>
      <p class="as-note">{related and 'Related: ' or ''}{related}</p>
    </div>
  </section>

  <section class="as-cta" id="contact" data-hero aria-labelledby="contact-h">
    <canvas class="ah-rb" data-ribbons="soft" aria-hidden="true"></canvas><div class="ah-rb-scrim ah-rb-c"></div>
    <div class="tsg-wrap" style="position:relative;">
      <h2 id="contact-h">{e(p['cta_h'])}</h2>
      <p>{e(p['cta_p'])}</p>
      {BTN.format(href=contact, label=e(cta) + " →")}
      <p class="tsg-note" style="margin:22px auto 0;">Prefer email? Write to <a class="tsg-link" href="mailto:hello@arithim.com">hello@arithim.com</a>.</p>
    </div>
  </section>
</main>

<!-- partial:footer {{"back_href": "products.html", "back_text": "← ALL PRODUCTS"}} -->
<!-- /partial:footer -->

</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
class Component extends DCLogic {{
  componentDidMount() {{
    import('./arithim-fx.js?v=2').then((m) => {{ this._stop = m.initFx(document); }}).catch((e) => console.error('fx load failed', e));
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
    products = json.loads(DATA.read_text(encoding="utf-8"))
    sys.path.insert(0, str(ROOT / "tools"))
    import centralise_styles as cs
    registry = cs.load_registry()  # inline styles that repeat site-wide become classes
    stale = []
    for p in products:
        out = ROOT / f"product-{p['slug']}.html"
        page = cs.rewrite(render(p, products), registry)
        if out.exists():
            old = out.read_text(encoding="utf-8")
            # partials are stamped by build_insights.py, so compare outside those blocks
            import re
            strip = lambda t: re.sub(r"<!-- partial:(\w+)[^>]*?-->.*?<!-- /partial:\1 -->", "", t, flags=re.S)
            if strip(old) == strip(page):
                continue
        stale.append(out.name)
        if "--check" not in sys.argv:
            out.write_text(page, encoding="utf-8")
    if "--check" in sys.argv:
        print("ok: product pages are up to date" if not stale else "stale: " + ", ".join(stale))
        sys.exit(1 if stale else 0)
    print("wrote: " + ", ".join(stale) if stale else "nothing to change")


if __name__ == "__main__":
    main()
