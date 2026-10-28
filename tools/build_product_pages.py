#!/usr/bin/env python3
"""Build the product pages (product-<slug>.html) from content/products.json.

The only thing that belongs to a page is its text. Structure, styling and links to the stylesheet are
the same for every product and live here and in site.css. Each entry in content/products.json holds:

  slug, name, label            file name product-<slug>.html, the product name, the word after /arithim
  title, description           the <title> (phrased as a buyer's search) and the meta description
  eyebrow, h1, sub             the label above the headline, the headline, and the line under it
  status, status_note          Early access or Planned, and one line of context under the buttons
  cta                          the button label
  benefits_h, benefits         heading and [title, text] cards: why teams choose it
  gets_h, gets                 heading and [title, text] cards: what you receive
  who_h, who                   heading and [title, text] cards: who it is for
  steps_h, steps               heading and [title, text] cards: how it works, in the buyer's terms
  know_h, know                 heading and short honest points
  faq                          [question, answer] pairs, also written as FAQPage data
  related                      slugs of related products
  service_type, audience_type  schema.org Service data
  audience, card_summary       the card on the products page and in the menu
  cta_h, cta_p                 the closing call to action
  nature                       {scene, title, desc}: the dotted nature scene drawn beside the hero text (assets/dotscene.js).
                               scene names one of the scenes in that file; title and desc are its text alternative
  globe                        optional {eyebrow, heading, text, alt}: adds the dotted-globe section under the hero (tools/globe.py)

Run `python3 tools/build_product_pages.py`, then `python3 tools/build_insights.py` to stamp the shared
head, header and footer. `--check` fails if a page is stale.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import globe

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "content" / "products.json"
SITE = "https://arithim.com"
e = html.escape
DOTSCENE_VERSION = "1"


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + "</script>"


def cards(items, numbered=False):
    n = len(items)
    cols = "tsg-g2" if n % 2 == 0 and n <= 4 else "tsg-g3"
    body = ""
    for i, (t, b) in enumerate(items, 1):
        num = f'<span class="ah-step-n">{i:02d}</span>' if numbered else ""
        body += f'<div class="tsg-card">{num}<h3>{e(t)}</h3><p>{e(b)}</p></div>'
    return f'<div class="tsg-grid {cols}">{body}</div>'


def section(sid: str, eyebrow: str, heading: str, inner: str) -> str:
    return f"""  <section class="tsg-sec" id="{sid}" aria-labelledby="{sid}-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">{e(eyebrow)}</div>
      <h2 class="tsg-h2" id="{sid}-h">{e(heading)}</h2>
      {inner}
    </div>
  </section>"""


BTN = '<a href="{href}" class="ah-btn-ring"><span class="ah-ring-spin"></span><span class="ah-btn-face">{label}</span></a>'


def render(p: dict, products: list[dict]) -> str:
    url = f"{SITE}/product-{p['slug']}.html"
    contact = f"contact.html?product={p['slug']}"
    cta = p["cta"]
    service = {"@context": "https://schema.org", "@type": "Service", "name": p["name"], "serviceType": p["service_type"], "url": url, "description": p["description"],
               "provider": {"@type": "Organization", "name": "Arithim Ltd", "url": f"{SITE}/"}, "areaServed": {"@type": "Country", "name": p.get("area", "United Kingdom")},
               "audience": {"@type": "Audience", "audienceType": p["audience_type"]}}
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]}
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Arithim", "item": f"{SITE}/"}, {"@type": "ListItem", "position": 2, "name": "Products", "item": f"{SITE}/products.html"},
        {"@type": "ListItem", "position": 3, "name": p["name"], "item": url}]}
    price = p.get("price")
    price_html = f'<p class="ah-price"><strong>{e(price["line"])}</strong> <span>{e(price["note"])}</span></p>' if price else ""
    if price:
        service["offers"] = {"@type": "Offer", "priceCurrency": "GBP", "price": price["amount"], "description": price["line"] + ". " + price["note"], "url": url}
    n = p.get("nature")
    nature_html = (f'</div><figure class="ah-nature"><canvas class="ah-nature-cv" data-dotscene="{e(n["scene"])}" role="img" aria-label="{e(n["title"] + ". " + n["desc"], quote=True)}">{e(n["desc"])}</canvas>'
                   f'<figcaption class="ah-nature-cap">{globe.CAPTION}</figcaption></figure>' if n else "")
    nature_js = (f'<script src="/assets/dotscene.js?v={DOTSCENE_VERSION}" defer></script>'
                 f'<script src="/assets/dotscene-{e(n["scene"])}.js?v={DOTSCENE_VERSION}" defer></script>') if n else ""
    know = "".join(f"<li>{e(x)}</li>" for x in p["know"])
    related = " · ".join(f'<a class="tsg-link" href="product-{r["slug"]}.html">{e(r["name"])}</a>' for r in products if r["slug"] in p.get("related", []) and r["slug"] != p["slug"])
    faq_html = "".join(f'<details><summary>{e(q)}</summary><div class="ans"><p>{e(a)}</p></div></details>' for q, a in p["faq"])
    sections = ([globe.render(p["globe"], "globe") + "\n"] if p.get("globe") else []) + [
        section("benefits", "WHY TEAMS CHOOSE IT", p["benefits_h"], cards(p["benefits"])),
        section("gets", "WHAT YOU GET", p["gets_h"], cards(p["gets"])),
        section("who", "WHO IT IS FOR", p["who_h"], cards(p["who"])),
        section("steps", "HOW IT WORKS", p["steps_h"], cards(p["steps"], numbered=True)),
        section("know", "GOOD TO KNOW", p["know_h"], f'<ul class="as-list">{know}</ul>'),
    ]
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
</head>
<body>
<x-dc>

<div class="tsg ah-page">
<a class="tsg-skip" href="#main">Skip to content</a>

<!-- partial:header {{"label": "/{p['label']}", "active": "products.html"}} -->
<!-- /partial:header -->

<main id="main">
  <section data-hero class="ah-clip" aria-labelledby="pp-h1">
    <canvas class="ah-rb" data-ribbons="soft" aria-hidden="true"></canvas><div class="ah-rb-scrim ah-rb-l"></div>
    <div class="tsg-wrap ah-hero-in{' ah-has-art' if n else ''}">
      {'<div class="ah-hero-copy">' if n else ''}<div class="ah-eyebrow-amber">{e(p['eyebrow'])}</div>
      <h1 id="pp-h1" class="tsg-hero-h ah-h1">{e(p['h1'])}</h1>
      <p class="as-def">{e(p['sub'])}</p>
      <div class="ah-actions">{BTN.format(href=contact, label=e(cta) + " →")}<span class="pp-st">{e(p['status'])}</span></div>
      {price_html}<p class="as-note">{e(p['status_note'])}</p>{nature_html}
    </div>
  </section>{nature_js}

{chr(10).join(sections)}

  <section class="tsg-sec" id="faq" aria-labelledby="faq-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">FREQUENTLY ASKED</div>
      <h2 class="tsg-h2" id="faq-h">Questions about {e(p['name'])}</h2>
      <div class="tsg-faq">{faq_html}</div>
      <p class="as-note">{('Related: ' + related) if related else ''}</p>
    </div>
  </section>

  <section class="as-cta" id="contact" data-hero aria-labelledby="contact-h">
    <canvas class="ah-rb" data-ribbons="soft" aria-hidden="true"></canvas><div class="ah-rb-scrim ah-rb-c"></div>
    <div class="tsg-wrap ah-rel">
      <h2 id="contact-h">{e(p['cta_h'])}</h2>
      <p>{e(p['cta_p'])}</p>
      {BTN.format(href=contact, label=e(cta) + " →")}
      <p class="tsg-note ah-note-c">Prefer email? Write to <a class="tsg-link" href="mailto:hello@arithim.com">hello@arithim.com</a>.</p>
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
    products = json.loads(DATA.read_text(encoding="utf-8"))
    sys.path.insert(0, str(ROOT / "tools"))
    import centralise_styles as cs
    registry = cs.load_registry()
    strip = lambda t: re.sub(r"<!-- partial:(\w+)[^>]*?-->.*?<!-- /partial:\1 -->", "", t, flags=re.S)
    stale = []
    for p in products:
        out = ROOT / f"product-{p['slug']}.html"
        page = cs.rewrite(render(p, products), registry)
        if out.exists() and strip(out.read_text(encoding="utf-8")) == strip(page):
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
