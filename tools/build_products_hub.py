#!/usr/bin/env python3
"""Build products.html from content/catalogue.json.

Every product is its own card, grouped as enterprise software, data products (with subgroups) and SaaS.
The header menu reads the same catalogue (tools/build_insights.py). Add a product by editing the catalogue
(and content/products.json for a generated page), then run this script and tools/build_insights.py.
`--check` fails if the page is stale.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import catalogue  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://arithim.com"
e = html.escape

TITLE = "Arithim products: enterprise software, data products and SaaS"
DESC = "Arithim products for distributors, energy developers, risk teams and job seekers: the Technical Sales Guide, the AI model inventory, Site Finder, site and grid reports, company checks and SaaS."
H1 = "Software and data products from Arithim"
LEAD = "Enterprise software for distributors and regulated firms, data products for energy developers and risk teams, and SaaS for people looking for work."

FAQ = [
    ("Which Arithim products can I try or buy now?",
     "Site Finder is available now, with reports and subscriptions ordered by email. The Technical Sales Guide runs as demos and pilots. Find Me A Job and Unrejectable are live. The AI model inventory and three of the data products are in early access, and two more are planned."),
    ("What is the difference between enterprise software, data products and SaaS?",
     "Enterprise software is set up for each customer on their own data, starting with a demo or a pilot. Data products give you sourced answers on a site, a grid connection, a planning risk or a company, as a report or through an API. SaaS products are the same for everyone, and you sign up on their website."),
    ("Does Arithim build software for clients too?",
     "Yes. We also take on AI readiness work, automation, SAP ERP reporting, websites, training and regulatory systems for clients. The services page has the details."),
]


def chip(i: dict) -> str:
    return f'<span class="ah-icon-chip" aria-hidden="true"><svg class="ah-icon"><use href="assets/icons.svg#{i["icon"]}"></use></svg></span>' if i.get("icon") else ""


def card(i: dict) -> str:
    price = f'<span class="ah-pcard-price">{e(i["price"])}</span>' if i.get("price") else ""
    more = "Visit the site" if i["url"].startswith("http") else "Learn more"
    return (f'<a class="tsg-card ah-pcard" href="{e(i["url"])}">{chip(i)}<span class="ah-pcard-aud">{e(i["audience"])}</span>'
            f'<h3>{e(i["name"])}</h3><span class="pp-st">{e(i["status"])}</span><p>{e(i["summary"])}</p>{price}'
            f'<span class="ah-pcard-more">{more} →</span></a>')


def grid(items: list[dict]) -> str:
    cols = "tsg-g2" if len(items) % 2 == 0 and len(items) <= 4 else "tsg-g3"
    return f'<div class="tsg-grid {cols}">' + "".join(card(i) for i in items) + "</div>"


def render(groups: list[dict]) -> str:
    items = catalogue.flat(groups)
    itemlist = {"@context": "https://schema.org", "@type": "ItemList", "name": "Arithim products", "itemListElement": [
        {"@type": "ListItem", "position": n, "name": i["name"], "url": i["url"] if i["url"].startswith("http") else f"{SITE}/{i['url']}"} for n, i in enumerate(items, 1)]}
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Arithim", "item": f"{SITE}/"}, {"@type": "ListItem", "position": 2, "name": "Products", "item": f"{SITE}/products.html"}]}
    ld = lambda o: '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + "</script>"
    jump = "".join(f'<a href="#{g["id"]}">{e(g["name"])}</a>' for g in groups)
    sections = []
    for g in groups:
        body = ""
        if "subgroups" in g:
            for s in g["subgroups"]:
                body += f'<h3 class="ah-sub">{e(s["name"])}</h3>{grid(s["items"])}'
        else:
            body = grid(g["items"])
        sections.append(f'''  <section class="tsg-sec" id="{g["id"]}" aria-labelledby="{g["id"]}-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">{e(g["name"].upper())}</div>
      <h2 class="tsg-h2" id="{g["id"]}-h">{e(g["name"])}</h2>
      <p class="tsg-lead">{e(g["lead"])}</p>
      {body}
    </div>
  </section>''')
    faq_html = "".join(f'<details><summary>{e(q)}</summary><div class="ans"><p>{e(a)}</p></div></details>' for q, a in FAQ)
    return f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(TITLE)}</title>
<meta name="description" content="{e(DESC)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Arithim">
<meta property="og:title" content="{e(TITLE)}">
<meta property="og:description" content="{e(DESC)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{SITE}/products.html">
<meta property="og:url" content="{SITE}/products.html">
<meta property="og:image" content="{SITE}/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:image" content="{SITE}/assets/og-image.png">
{ld(itemlist)}
{ld(faq)}
{ld(crumbs)}
<!-- partial:head -->
<!-- /partial:head -->
</head>
<body>
<x-dc>

<div class="tsg ah-page">
<a class="tsg-skip" href="#main">Skip to content</a>

<!-- partial:header {{"label": "/products", "active": "products.html"}} -->
<!-- /partial:header -->

<main id="main">
  <section data-hero class="ah-clip" aria-labelledby="pp-h1">
    <canvas class="ah-rb" data-ribbons="soft" aria-hidden="true"></canvas><div class="ah-rb-scrim ah-rb-l"></div>
    <div class="tsg-wrap ah-hero-in">
      <div class="ah-eyebrow-amber">PRODUCTS</div>
      <h1 id="pp-h1" class="tsg-hero-h ah-h1">{e(H1)}</h1>
      <p class="tsg-lead">{e(LEAD)}</p>
      <nav class="pp-jump" aria-label="Product groups">{jump}</nav>
    </div>
  </section>

{chr(10).join(sections)}

  <section class="tsg-sec" id="faq" aria-labelledby="faq-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">FREQUENTLY ASKED</div>
      <h2 class="tsg-h2" id="faq-h">Questions about our products</h2>
      <div class="tsg-faq">{faq_html}</div>
    </div>
  </section>
</main>

<!-- partial:footer {{"back_href": "index.html", "back_text": "← HOME"}} -->
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
'''


HOME_CARD = ('<a href="{url}" class="ah-a8498e ah-h-0826d6">{chip}<div class="ah-b79a62">{eyebrow}</div>'
             '<div class="ah-cc198a">{name}</div><p class="ah-515d06">{summary}</p></a>')


def home_cards(groups) -> str:
    out = []
    for g in groups:
        items = g.get("items") or [i for s in g["subgroups"] for i in s["items"]]
        for i in items:
            out.append(HOME_CARD.format(chip=chip(i), url=e(i["url"]), eyebrow=e((g["name"] + " · " + i["status"]).upper()), name=e(i["name"]), summary=e(i["summary"])))
    return "".join(out)


def patch_home(groups) -> bool:
    """Write every product from the catalogue between the markers on the home page and the case studies page."""
    stale = False
    cards = home_cards(groups)
    for name in ("index.html", "case-studies.html"):
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        new = re.sub(r"(<!-- catalogue:start -->).*?(<!-- catalogue:end -->)", lambda m: m.group(1) + cards + m.group(2), text, flags=re.S)
        if new != text:
            stale = True
            if "--check" not in sys.argv:
                path.write_text(new, encoding="utf-8")
    return stale


def main():
    groups = catalogue.load()
    page = render(groups)
    sys.path.insert(0, str(ROOT / "tools"))
    import centralise_styles as cs
    page = cs.rewrite(page, cs.load_registry())
    out = ROOT / "products.html"
    strip = lambda t: re.sub(r"<!-- partial:(\w+)[^>]*?-->.*?<!-- /partial:\1 -->", "", t, flags=re.S)
    same = out.exists() and strip(out.read_text(encoding="utf-8")) == strip(page)
    home_stale = patch_home(groups)
    if "--check" in sys.argv:
        print("ok: products page is up to date" if same and not home_stale else "stale: products.html or the products list on index.html")
        sys.exit(0 if same and not home_stale else 1)
    if not same:
        out.write_text(page, encoding="utf-8")
        print("wrote products.html")
    else:
        print("nothing to change")


if __name__ == "__main__":
    main()
