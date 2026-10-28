#!/usr/bin/env python3
"""Build product-site-finder.html (the Site Finder product page).

Run `python3 tools/build_site_finder.py`, then `python3 tools/build_insights.py` to stamp the
shared head, header and footer partials.
"""
from __future__ import annotations

import html
import json
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "product-site-finder.html"
URL = "https://arithim.com/product-site-finder.html"
A = "/assets/site-finder/"
ORDER_EMAIL = "tarun@arithim.com"

TITLE = "Where to build solar, battery or wind in Great Britain | Arithim"
DESC = ("Screen land in Great Britain for solar, battery and onshore wind, and see the grid, planning and "
        "economics for each site before you spend on surveys. The enterprise platform licence is from £30,000 a year ex VAT.")
NATURE_ALT = ("A dotted rolling landscape of map cells with a sun, a wind turbine and a battery shed. A breeze sweeps across the cells and three sites settle as ranked plots marked 1, 2 and 3, with dotted lines running to them. One cell is fenced off with an amber dot, ruled out. A sample, not a real map.")
H1 = "Screen sites for grid and planning risk before you pay for surveys."

e = html.escape

SCENES = {
    "j1": ("Ask the question and read the answer",
           "Load the app, read the verdict and scan the ranked list, then look across the map of scored sites.",
           "A question is typed: where should we build next? Chips show the project as 50 MWp, auto connection, CfD and a 6.5% hurdle. A verdict box says 8 of the top 20 sites are deliverable. A hex map fills in and a ranked list follows. Ellerstoke in Wendmoor needs £56.4 against a CfD price of £65.23, Kinlarrow in Glenmorvie needs £60.1, and Llanbedwyn in Dyffryn Cerwen needs £59.2. Numbered markers place the sites on the map."),
    "j2": ("Open the evidence for a site",
           "Open the top site: its score breakdown, substations, planning record and economics, then the one-page print pack.",
           "The top row, Ellerstoke in Wendmoor, is selected and an evidence drawer slides up. Six bars grow for grid, planning, solar and terrain, economics, deliverability and environment. Cards then show the nearest substation, Carrowby East Grid 33kV at 0.7 km with capacity ok, the planning record, and the economics: the site needs £56.4 against a CfD price of £65.23."),
    "j3": ("Push back and see what changed",
           "Mark a substation as full and rescore, read the What changed card, then assume a Gate 2 offer and watch the answer move.",
           "Four ranked sites sit above a card for the substation Carrowby East Grid 33kV. Challenge is pressed, the substation is marked full, and a note says the operator has no spare capacity. After Rescore the rows move. Ellerstoke falls from first to fourth and the other three each rise one place. A What changed card lists each move and names the override as the cause."),
    "f1": ("Gate 2 and grid headroom",
           "See which sites can connect in the current window, then assume a Gate 2 offer and watch the ranking move.",
           "A bar shows 127.3 MW of Gate 2 solar capacity left in a zone. Three ranked sites of 38 MWac each take their share in rank order, and the figure falls to 89.3, 51.3 and then 13.3 MW. The fourth site, Daverby Magna, needs 36 MWac. It does not fit, so it moves to a box marked needs next window, with a later energisation year."),
    "f2": ("Planning record by local authority",
           "Search the planning record by local authority for decisions, approval rates and recent schemes.",
           "A table lists local authorities, with a bar for the share of solar schemes approved. Saltmere is selected. Its panel says it approved 10 of 11 solar schemes since 2019, with a median decision time of 8 months, and a small chart shows decisions per year. A note says the rate is the authority's record and does not predict the outcome for a specific scheme."),
    "f3": ("Refused schemes nearby",
           "A refused solar scheme near a site lowers its score, and the site's evidence names the scheme.",
           "A score waterfall for a site at Fennick Green in Callowfield starts at 0.84 before flags. Three multipliers follow: 0.91 for a refused scheme 1.7 km away, 0.94 for a National Park or AONB setting, and 0.92 for a listed building. The score ends at 0.66. A small map then shows the site, a dashed 1.7 km line and the refused scheme, Fallowmere Solar Farm, 34.5 MW."),
    "f4": ("Economics and project size",
           "Take the project size past 100 MWac and watch the consent route, transmission charges and NPV change.",
           "A slider for project size moves from 90 to 110 MWac. As it passes 100 MWac the consent route changes from the local planning authority to the NSIP Development Consent Order route, and the NPV falls from +£7.6m to −£0.4m. A note names the size threshold and both values."),
}

SHOWS = [
    ("Can it connect?", "The nearest substations, the headroom the network operator publishes, whether the site is likely to fit the current Gate 2 window, and who else already holds capacity there."),
    ("Will it get consent?", "Schemes built, consented and refused nearby, how the local authority has decided similar applications, and the likely consent route for the size of your project."),
    ("Does it make money?", "An indicative connection cost, the price per MWh the site needs to reach your hurdle rate, and how that moves when your assumptions change. For batteries, the break-even capex with and without the export credit."),
    ("Can we defend it?", "A constraint checklist and the source behind every number. Any site can go into a feasibility report, a grid pack, an investment committee pack or an Excel model."),
]

MORE = [
    ("Screen your own sites", "Upload a boundary, a KML or a shapefile, or draw one on the map, and see how it compares with the ranked list."),
    ("Track every site to energisation", "A pipeline board shows how firm each site's connection evidence is, from map only to energised, with reminders for Gate 2 milestones and land-rights deadlines."),
    ("See who holds the grid", "A company group's projects and connections by technology, stage, substation and planning authority, plus Gate 2 positions with no planning application and connections that sit idle."),
    ("Hear about competitor moves", "New connection applications, Gate changes, status moves and holder changes for the companies, substations and areas you watch, in the app and in a weekly email."),
    ("Check a seller's pipeline", "Import a seller's site list and see each claim marked confirmed, contradicted, not verifiable or seller-supplied, with a data-room PDF and Excel workbook."),
    ("\"Can I build here?\"", "Three guided checks: for a landowner approached by a developer, for a developer weighing one site, and for an investor testing a pipeline. Each ends with a one-page summary and questions for an adviser."),
    ("Know the rules", "Dated cards on the consent route by nation and size, Gate 2 milestones and battery fire-safety guidance."),
    ("Feed your own tools and AI assistants", "Through the data API and MCP server, your tools and assistants can read projects, substations, map cells, company holdings and changes."),
]

PUSHBACK = [
    ("Test your own assumptions", "Change the technology, project size, revenue route, capex and hurdle rate. Draw areas on the map to include or exclude, or mark a single substation as full and note why."),
    ("See what moved and why", "After each change, a card lists the sites that entered or left the top of the list, how far each moved and which assumption caused it."),
    ("Share the scenario", "Save a set of assumptions under a name, compare two side by side and send one to a colleague as a link."),
]

YOUR_DETAILS = ["Name:", "Company:", "Invoice address:", "Purchase order number (if any):"]
SUB_NEEDS_END = ["Preferred start date:", "Demo first (yes or no):"]

# (name, price, what you get, what we need from you, delivery or None)
SUBS = [
    ("Site Finder platform", "From £30,000 a year for 5 seats",
     "The origination desk: the ranked map for solar, battery, hybrid and onshore wind, pushback with what changed, evidence for every number, site upload, the pipeline board, documents, GB rules cards and alerts. Your own team can make unlimited landowner checks and feasibility reports.",
     ["Number of seats (the price includes 5):"] + SUB_NEEDS_END),
]

ENTERPRISE = ("Enterprise terms", "On quote",
              "More seats, internal redistribution and named support.",
              ["Seats, internal redistribution or named support:"])

# (who, what they get, product to order, price as shown on its card)
AUDIENCE = [
    ("Developer land and origination teams",
     "Find the sites most likely to connect and get consent, and take the shortlist to your investment committee with the evidence attached. Your team makes unlimited landowner checks and feasibility reports.",
     "Site Finder platform", "from £30,000 a year"),
    ("Funds and acquisition teams with their own analysts",
     "Screen a seller's pipeline, track who holds the grid and follow changes, with the evidence behind every number and a seat for each analyst.",
     "Site Finder platform", "from £30,000 a year"),
]

# Products that sell on their own, one page each: (name, page, what for, price)
ALSO = [
    ("Landowner check", "product-landowner-check.html", "Had a letter from a developer? One page on your land, the grid and the developer.", "£195 a report"),
    ("Site feasibility report", "product-site-feasibility-report.html", "A verdict on one solar, battery or wind site, with the reasons and sources.", "£1,950 a site"),
    ("Portfolio screen", "product-portfolio-screen.html", "Check every claim in a seller's site list against the public record.", "From £7,500"),
    ("Market Watch", "product-market-watch.html", "Who holds the grid and what changed, with a weekly digest.", "From £15,000 a year"),
    ("Data API and MCP", "product-data-api.html", "A read-only API and MCP server for your tools and AI assistants.", "From £18,000 a year"),
]

WHY_PRICE = [
    "One answer for each site that joins grid, planning, capacity holders and economics.",
    "Evidence that a committee or lender can check.",
    "A view of who holds capacity at each substation and how firm their position is.",
    "Alerts when new queue entries, Gate moves and sales of project companies appear.",
    "Assumptions you can change, with a note of which sites moved and why.",
]

LIMITS_HTML = (
    'Site Finder screens sites. It does not replace a network operator\'s connection offer, planning advice or a site visit, and its connection costs are estimates for comparing sites. '
    'Where a network operator publishes no headroom, the site is marked unknown. '
    'Aerodrome and Ministry of Defence safeguarding is not assessed, so check it with the aerodrome operator, the '
    '<a class="tsg-link" href="https://www.gov.uk/guidance/mod-safeguarding" rel="noopener">MoD safeguarding team</a> and, for wind, the '
    '<a class="tsg-link" href="https://www.nats.aero/our-solutions/wind-farms/self-assessment-maps/" rel="noopener">NATS self-assessment maps</a> before you commit. '
    'Coverage is Great Britain, and Site Finder does not show who owns a particular field.'
)

FAQ = [
    ("How does Site Finder help me find sites?",
     "Tell it what you want to build and it ranks land across England, Scotland and Wales, with the grid, planning and economics behind each rank. Your team can spend survey money on sites that already look viable."),
    ("Which technologies and areas does it cover?",
     "Solar, battery storage, solar with battery on a shared connection, and onshore wind, across Great Britain. Northern Ireland is not covered."),
    ("Does it replace a grid connection offer or planning advice?",
     "No. It narrows where to look. Connection costs are indicative, so a network operator quote will differ, and planning advice, a site visit and aerodrome or Ministry of Defence checks still come before you commit."),
    ("Can it tell me whether a site can connect soon?",
     "Where the network operator publishes a headroom figure, Site Finder shows it with its date, and where it does not, the site is marked unknown. It also shows who already holds capacity at the substation, and you can assume a Gate 2 offer and see how the ranking changes."),
    ("Can I test my own assumptions?",
     "Yes. Change the technology, project size, revenue route, capex or hurdle rate, or mark a substation as full. The ranking updates and a card lists which sites moved and why."),
    ("How much does Site Finder cost?",
     "The Site Finder platform is from £30,000 a year for 5 seats, excluding VAT, and your team makes unlimited landowner checks and feasibility reports. Enterprise terms for more seats, internal redistribution and named support are on quote. If you only need a single report, the landowner check (£195), the site feasibility report (£1,950 a site) and the portfolio screen (£7,500 for up to 50 sites) are sold on their own pages."),
    ("How do I order?",
     "Press Order on the platform in the pricing section. Your email app opens a message to tarun@arithim.com with the details we need. We confirm the order by email and invoice after confirmation. Orders are subject to our terms, sent with the invoice."),
    ("Who is Site Finder for, and can I see a demo first?",
     "Enterprise teams: developers and their land and origination teams, and funds and acquisition teams with their own analysts. Book a demo and we run Site Finder on a brief you choose: the technology, the project size, how you want to connect and the regions you care about. Landowners, first-time developers and consultants usually want one of the single reports instead."),
]


def mailto(product: str, needs: list[str]) -> str:
    quote_only = product == ENTERPRISE[0]
    first = f"I would like a quote for Site Finder {product.lower()}" if quote_only else f"I would like to order: {product}"
    details = YOUR_DETAILS[:2] if quote_only else YOUR_DETAILS
    subject = f"Site Finder quote: {product.lower()}" if quote_only else f"Site Finder order: {product}"
    lines = [first, "", "Order details:" if not quote_only else "What we need:"]
    lines += [f"- {n}" for n in needs]
    lines += ["", "My details:"] + [f"- {d}" for d in details]
    body = "\r\n".join(lines) + "\r\n"
    return f"mailto:{ORDER_EMAIL}?subject={quote(subject, safe='')}&body={quote(body, safe='')}"


def slug(name: str) -> str:
    return "order-" + "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-").replace("--", "-")


def order_btn(product: str, needs: list[str]) -> str:
    label = "Ask for a quote" if product == ENTERPRISE[0] else "Order"
    return (f'<a class="sf-order" href="{e(mailto(product, needs))}" '
            f'aria-label="{label}: {e(product)}">{label}</a>')


def price_card(name: str, price: str, what: str, needs: list[str], delivery: str | None) -> str:
    dl = f'<p class="sf-pr-dl">Delivered in {e(delivery.lower())}</p>' if delivery and delivery[0].isdigit() else (
        f'<p class="sf-pr-dl">Delivered {e(delivery.lower())}</p>' if delivery else "")
    return (f'<li class="tsg-card sf-pr" id="{slug(name)}"><h4>{e(name)}</h4><p class="sf-pr-p">{e(price)}</p>'
            f'{dl}<p>{e(what)}</p>{order_btn(name, needs)}</li>')


def scene(key: str, *, hero: bool = False) -> str:
    title, cap, desc = SCENES[key]
    desc_html = f'<details class="tsg-desc"><summary>Describe this animation</summary><p>{e(desc)} Names and figures are made up to show the interface.</p></details>'
    mount = f'<div data-sf-scene="{key}" data-title="{e(title)}"></div>'
    if hero:
        return f'<figure class="sf-fig">{mount}{desc_html}</figure>'
    return (f'<figure class="sf-fig"><div class="sf-sc-v">{mount}</div>'
            f'<div class="sf-sc-t"><h4>{e(title)}</h4><p class="sf-cap">{e(cap)}</p>{desc_html}</div></figure>')


def ld() -> str:
    app = {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Site Finder",
           "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "url": URL,
           "description": DESC,
           "audience": {"@type": "Audience", "audienceType": "Renewable developers, investors, landowners and land agents in Great Britain"},
           "offers": [{"@type": "Offer", "name": n, "price": v, "priceCurrency": "GBP",
                       "priceSpecification": {"@type": "PriceSpecification", "price": v, "priceCurrency": "GBP", "valueAddedTaxIncluded": False},
                       "url": URL + "#" + slug(k)}
                      for k, n, v in (("Site Finder platform", "Site Finder platform, 5 seats", "30000"),)],
           "publisher": {"@type": "Organization", "name": "Arithim Ltd", "url": "https://arithim.com/"}}
    faq = {"@context": "https://schema.org", "@type": "FAQPage",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Arithim", "item": "https://arithim.com/"},
        {"@type": "ListItem", "position": 2, "name": "Products", "item": "https://arithim.com/products.html"},
        {"@type": "ListItem", "position": 3, "name": "Site Finder", "item": URL}]}
    return "\n".join(f'<script type="application/ld+json">{json.dumps(o, ensure_ascii=False)}</script>' for o in (app, faq, bc))


def build() -> str:
    cards_audience = '<div class="tsg-grid tsg-g2">' + "".join(
        f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p>'
        f'<p class="sf-aud-pr"><a class="tsg-link" href="#{slug(prod)}">{e(prod)}, {e(price)} →</a></p></div>'
        for t, b, prod, price in AUDIENCE) + '</div>'
    hero_prices = " · ".join(f'<a href="#{slug(n)}">{e(label)}</a>' for n, label in (("Site Finder platform", "Platform from £30,000 a year"),))
    shows = "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in SHOWS)
    more = "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in MORE)
    push = "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in PUSHBACK)
    faq = "".join(f'<details><summary>{e(q)}</summary><div class="ans"><p>{e(a)}</p></div></details>' for q, a in FAQ)
    limits = LIMITS_HTML
    why = "".join(f"<li>{e(x)}</li>" for x in WHY_PRICE)
    also = '<div class="tsg-grid tsg-g3">' + "".join(f'<a class="tsg-card ah-pcard" href="{e(u)}"><h3>{e(n)}</h3><p>{e(w)}</p><span class="ah-pcard-price">{e(pr)}</span><span class="ah-pcard-more">Learn more →</span></a>' for n, u, w, pr in ALSO) + '</div>'
    subs = "".join(price_card(n, p, w, nd, None) for n, p, w, nd in SUBS)
    ent = price_card(*ENTERPRISE, None)
    btn = '<a href="contact.html?product=site-finder" class="ah-btn-ring"><span class="ah-ring-spin"></span><span class="ah-btn-face">Book a demo →</span></a>'
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
<link rel="canonical" href="{URL}">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="https://arithim.com/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:image" content="https://arithim.com/assets/og-image.png">
{ld()}
<!-- partial:head -->
<!-- /partial:head -->
</head>
<body>
<x-dc>

<div class="tsg sf" style="background:#070C16;color:#F5F1E8;min-height:100vh;">
<a class="tsg-skip" href="#main">Skip to content</a>

<!-- partial:header {{"label": "/site-finder", "active": "products.html", "cta": "contact"}} -->
<!-- /partial:header -->

<main id="main">
  <section data-hero style="position:relative;overflow:hidden;" aria-labelledby="sf-h1">
    <canvas class="ah-rb" data-ribbons="soft" aria-hidden="true"></canvas><div class="ah-rb-scrim ah-rb-l"></div>
    <div style="position:absolute;top:-30%;right:-5%;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(59,111,212,0.2),transparent 60%);filter:blur(80px);animation:ah-aurora-a 18s ease-in-out infinite;pointer-events:none;"></div>
    <div class="tsg-wrap" style="position:relative;padding-top:56px;padding-bottom:10px;">
      <div class="tsg-hero-grid">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.12em;color:#E8A13C;margin-bottom:18px;">SITE FINDER · SOLAR, BATTERY AND WIND IN GREAT BRITAIN</div>
          <h1 id="sf-h1" class="tsg-hero-h" style="font-weight:700;font-size:52px;line-height:1;letter-spacing:-0.04em;color:#F5F1E8;">{e(H1)}</h1>
          <p style="font-size:19px;line-height:1.55;color:#AEB8C6;max-width:560px;margin-top:20px;">Say what you want to build: solar, battery storage, solar with a battery, or onshore wind. Site Finder ranks land across England, Scotland and Wales by grid headroom, planning record and project economics, so you know which sites deserve a visit and can show your investment committee why.</p>
          <div style="margin-top:28px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;">{btn}<a href="#pricing" class="tsg-link" style="font-size:16px;">See prices and order</a><a href="#videos" class="tsg-link" style="font-size:16px;">Watch it in use</a></div>
          <p class="sf-hero-pr">{hero_prices}<br>Prices ex VAT. Order by email and pay by invoice.</p>
        </div>
        <figure class="ah-nature"><canvas class="ah-nature-cv" data-dotscene="landscape" role="img" aria-label="{e(NATURE_ALT, quote=True)}">{e(NATURE_ALT)}</canvas><figcaption class="ah-nature-cap">Illustrative. Not your data.</figcaption></figure>
      </div>
      <ol class="tsg-steps" aria-label="How a session runs"><li>Say what you want to build</li><li>See the best land first</li><li>Check why a site ranks</li><li>Test your own assumptions</li></ol>
    </div>
  </section>

  <section class="tsg-sec" id="see" aria-labelledby="see-h">
    <div class="tsg-wrap">
      <div class="ah-split">
        <div>
          <div class="tsg-eyebrow">SEE IT WORK</div>
          <h2 class="tsg-h2" id="see-h">What does Site Finder look like when you ask a question?</h2>
          <p class="tsg-lead">Load the app, read the verdict and scan the ranked list, then look across the map of scored sites. Names and figures are made up to show the interface.</p>
        </div>
        {scene("j1", hero=True)}
      </div>
    </div>
  </section>

  <section class="tsg-sec" id="who" aria-labelledby="who-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">WHO IT IS FOR</div>
      <h2 class="tsg-h2" id="who-h">Who uses Site Finder?</h2>
      <p class="tsg-lead">Developers, funds and landowners who need to decide where to spend time and money.</p>
      {cards_audience}
      <p class="sf-note">Site Finder narrows where to look. Your team still visits the land, talks to the network operator and takes planning advice.</p>
    </div>
  </section>

  <section class="tsg-sec" id="shows" aria-labelledby="shows-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">FOR EVERY SITE</div>
      <h2 class="tsg-h2" id="shows-h">What will I know about a site before I visit?</h2>
      <p class="tsg-lead">Every site opens into four answers you can take to a land agent, a network operator or your committee.</p>
      <div class="tsg-grid tsg-g2">{shows}</div>
    </div>
  </section>

  <section class="tsg-sec" id="more" aria-labelledby="more-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">BEYOND THE MAP</div>
      <h2 class="tsg-h2" id="more-h">What can I do once I have a shortlist?</h2>
      <p class="tsg-lead">Keep working the shortlist: track each site to energisation, watch what other developers are doing and check a seller's claims.</p>
      <div class="tsg-grid tsg-g2">{more}</div>
    </div>
  </section>

  <section class="tsg-sec" id="videos" aria-labelledby="videos-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">SEE IT IN USE</div>
      <h2 class="tsg-h2" id="videos-h">What does Site Finder look like in use?</h2>
      <p class="tsg-lead">Animated scenes of the interface. The names and figures are made up to show how the tool works. They are not results for any project.</p>
      <h3 class="sf-sub">A working session</h3>
      <div class="sf-vgrid sf-v3">{"".join(scene(k) for k in ("j1", "j2", "j3"))}</div>
      <h3 class="sf-sub">Features up close</h3>
      <div class="sf-vgrid sf-v4">{"".join(scene(k) for k in ("f1", "f2", "f3", "f4"))}</div>
    </div>
  </section>

  <section class="tsg-sec" id="evidence" aria-labelledby="evidence-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">PUSH BACK</div>
      <h2 class="tsg-h2" id="evidence-h">What if my team disagrees with the ranking?</h2>
      <p class="tsg-lead">Change what you believe about the market and the ranking follows, so the answer reflects your view.</p>
      <div class="tsg-grid tsg-g3">{push}</div>
    </div>
  </section>

  <section class="tsg-sec" id="pricing" aria-labelledby="pricing-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">PRICES</div>
      <h2 class="tsg-h2" id="pricing-h">How much does Site Finder cost?</h2>
      <p class="tsg-lead">Prices exclude VAT. The platform licence starts at the price shown. Press Order and your email app opens a message with the details we need.</p>
      <div class="sf-proof" id="why-price"><h3 id="why-price-h">What do I get for the price?</h3><ul class="sf-list" aria-labelledby="why-price-h">{why}</ul></div>
      <h3 class="sf-sub" id="pr-subs">Enterprise licence</h3>
      <ul class="sf-prices" aria-labelledby="pr-subs">{subs}{ent}</ul>
      <p class="sf-note sf-pr-terms">We confirm every order by email and invoice after confirmation. Orders are subject to our terms, sent with the invoice.</p>
    </div>
  </section>

  <section class="tsg-sec" id="also" aria-labelledby="also-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">NOT AN ENTERPRISE TEAM?</div>
      <h2 class="tsg-h2" id="also-h">Which single reports and data products can I buy on their own?</h2>
      <p class="tsg-lead">Each has its own page, a fixed price and an order button. No demo needed.</p>
      {also}
    </div>
  </section>

  <section class="tsg-sec" id="limits" aria-labelledby="limits-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">LIMITS</div>
      <h2 class="tsg-h2" id="limits-h">What does Site Finder not cover?</h2>
      <p class="tsg-lead">{limits}</p>
    </div>
  </section>

  <section class="tsg-sec" id="faq" aria-labelledby="faq-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">FREQUENTLY ASKED</div>
      <h2 class="tsg-h2" id="faq-h">Questions buyers ask about Site Finder</h2>
      <div class="tsg-faq">{faq}</div>
    </div>
  </section>

  <section class="sf-cta" id="demo" data-hero aria-labelledby="demo-h">
    <canvas class="ah-rb" data-ribbons="soft" aria-hidden="true"></canvas><div class="ah-rb-scrim ah-rb-c"></div>
    <div style="position:absolute;top:-30%;left:30%;width:640px;height:640px;border-radius:50%;background:radial-gradient(circle,rgba(59,111,212,0.2),transparent 60%);filter:blur(90px);animation:ah-aurora-a 20s ease-in-out infinite;pointer-events:none;"></div>
    <div class="tsg-wrap" style="position:relative;">
      <h2 id="demo-h">Want to see Site Finder run on your own brief?</h2>
      <p>Tell us the technology, the project size, how you want to connect and the regions you care about, and we will show you the ranked list and the evidence behind it.</p>
      {btn}
      <p class="sf-note" style="margin:22px auto 0;">Prefer email? Write to <a class="tsg-link" href="mailto:hello@arithim.com">hello@arithim.com</a>.</p>
    </div>
  </section>
<script src="/assets/dotscene.js?v=1" defer></script><script src="/assets/dotscene-landscape.js?v=1" defer></script>
</main>

<!-- partial:footer {{"back_href": "products.html", "back_text": "← ALL PRODUCTS"}} -->
<!-- /partial:footer -->

</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
class Component extends DCLogic {{
  componentDidMount() {{
    import('./arithim-fx.js?v=5').then((m) => {{ this._stop = m.initFx(document); }}).catch((e) => console.error('fx load failed', e));
    import('./site-finder-motion.js').then((m) => {{ this._stopMotion = m.initSfMotion(document); }}).catch((e) => console.error('motion load failed', e));
  }}
  componentWillUnmount() {{ ['_stop','_stopMotion'].forEach((k) => {{ if (this[k]) this[k](); }}); }}
  renderVals() {{ return {{}}; }}
}}
</script>
<a class="callus-link" href="/contact.html"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>Call us</a>
<script src="/assets/callus.js?v=3" defer></script>
</body>
</html>
'''


if __name__ == "__main__":
    sys.path.insert(0, str(ROOT / "tools"))
    import centralise_styles as cs
    OUT.write_text(cs.rewrite(build(), cs.load_registry()), encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT))
