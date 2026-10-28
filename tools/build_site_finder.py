#!/usr/bin/env python3
"""Build product-site-finder.html (the Site Finder product page).

The roadmap section is rendered from tools/site-finder/roadmap.json into static HTML, so the
page needs no JavaScript to show it. Run `python3 tools/build_site_finder.py`, then
`python3 tools/build_insights.py` to stamp the shared head, header and footer partials.
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
DESC = ("Site Finder ranks land in Great Britain for solar, battery and onshore wind, with the grid, planning "
        "and economics evidence for every site. Reports from £195 ex VAT, ordered by email.")
H1 = "Find the land worth a site visit, with the evidence for every site."

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
    ("Grid connection", "The nearest substations, the headroom each network operator publishes and the date of that figure, the Gate 2 context, and who holds capacity at the node and how firm their position is."),
    ("Planning record", "Schemes built, consented and refused nearby, how the local authority has decided similar applications, and the likely consent route for the project's size and nation."),
    ("Economics", "An indicative connection cost, the price per MWh the site needs to reach your hurdle rate, and sensitivities. For batteries, the break-even capex with and without the export credit."),
    ("Evidence", "The source, version, date and licence of every number, and a constraint checklist. Any site can go into a feasibility report, a grid pack, an investment committee pack or an Excel model."),
]

MORE = [
    ("Site upload and screening", "Upload a boundary, a KML or a shapefile, or draw one on the map, and screen it against the same rules as the ranked list."),
    ("Pipeline board", "Track each site on a connection evidence ladder that runs from map only to energised, with clocks for Gate 2 milestones and land-rights deadlines."),
    ("Company holdings", "See a company group's projects and connections by technology, stage, substation and planning authority, a league table, Gate 2 positions with no planning application, and connections that sit idle."),
    ("Change feed and weekly digest", "New connection applications, Gate changes, status moves and holder changes appear in the app and in a weekly email, filtered by the companies, substations and areas on your watchlists."),
    ("Diligence", "Import a seller's site list and each claim is marked confirmed, contradicted, not verifiable or seller-supplied, then exported as a data-room PDF and Excel workbook."),
    ("\"Can I build here?\"", "Three guided checks: for a landowner approached by a developer, for a developer weighing one site, and for an investor testing a pipeline. Each ends with a one-page summary and questions for an adviser."),
    ("GB rules cards", "Dated cards on the consent route by nation and size, Gate 2 milestones and battery fire-safety guidance, each with a review date."),
    ("Data API and MCP server", "Your own tools and AI assistants can read projects, substations, map cells, company holdings and changes, each with its source, date and licence, through per-organisation keys."),
]

PUSHBACK = [
    ("Change the assumptions", "Change the technology, weights, exclusion rules, project size, revenue route, capex and hurdle rate. Draw areas on the map to include or exclude, or override a single substation (\"this one is full\") with a note saying why."),
    ("See what changed", "After each edit, a card lists the sites that entered or left the top of the list, how far each moved and which assumption moved it."),
    ("Save and share scenarios", "Save a set of assumptions under a name, compare two side by side and send one to a colleague as a link."),
]

YOUR_DETAILS = ["Name:", "Company:", "Invoice address:", "Purchase order number (if any):"]
SUB_NEEDS_END = ["Preferred start date:", "Demo first (yes or no):"]

# (name, price, what you get, what we need from you, delivery or None)
REPORTS = [
    ("Landowner check", "£195 a report",
     "One page on what the land looks like for solar, battery or wind, the nearest grid point and how crowded it is, who the developer is and what else they hold nearby, the likely consent route, any pressure terms in the letter, and questions for an adviser.",
     ["Postcode or map pin:", "Developer's name:", "The developer's letter, if you have one (attach it):"],
     "3 working days"),
    ("Site feasibility report", "£1,950 a site (solar, battery or wind)",
     "A verdict with reasons, constraints with a map, grid, planning, economics, contacts, and sources and licences. PDF, with Word and Excel on request.",
     ["Location (a point, a drawn boundary, or a KML or shapefile attached):", "Technology (solar, battery or wind):", "Project size (MW):"],
     "3 working days"),
    ("Solar and battery hybrid add-on", "£500 on top of a feasibility report",
     "Hybrid economics on a shared connection, with clipping and dispatch, compared with solar alone.",
     ["The feasibility report this goes with (order both together, or give the reference of an earlier order):", "Solar size (MW):", "Battery size (MW and MWh):"],
     "With the report"),
    ("Portfolio screen", "£7,500 for up to 50 sites; £120 for each extra site",
     "Every claim in a seller's list checked against the public record and marked confirmed, contradicted, not verifiable or seller-supplied, with both values and the source for each contradiction, a portfolio roll-up, and a data-room PDF and Excel workbook with a sources and licence appendix.",
     ["The seller's site list (spreadsheet, KML or GeoJSON attached):", "Number of sites:"],
     "5 working days"),
]

SUBS = [
    ("Site Finder platform", "From £30,000 a year for 5 seats",
     "The origination desk: the ranked map for solar, battery, hybrid and onshore wind, pushback with what changed, evidence for every number, site upload, the pipeline board, documents, GB rules cards and alerts. Your own team can make unlimited landowner checks and feasibility reports.",
     ["Number of seats (the price includes 5):"] + SUB_NEEDS_END),
    ("Market Watch", "From £15,000 a year",
     "Company holdings by group, substation and league table, exposed Gate 2 positions, idle connections, the change feed with a weekly email digest, and watchlists.",
     ["Number of users:"] + SUB_NEEDS_END),
    ("Data API and MCP", "From £18,000 a year",
     "A read-only API and an MCP server for your own tools and AI assistants: projects, substations and grid nodes, map cells, company groups and holdings, changes and licences. Every record carries its source, date and licence. Per-organisation keys and usage limits.",
     ["Tools or assistants you plan to connect:"] + SUB_NEEDS_END),
]

ENTERPRISE = ("Enterprise terms", "On quote",
              "More seats, internal redistribution and named support.",
              ["Seats, internal redistribution or named support:"])

# (who, what they get, product to order, price as shown on its card)
AUDIENCE = [
    ("Origination teams at developers and IPPs",
     "A ranked map for solar, battery, hybrid and onshore wind, a pipeline board that tracks each site's connection evidence and deadlines, and packs for the investment committee. Your team makes unlimited landowner checks and feasibility reports.",
     "Site Finder platform", "from £30,000 a year"),
    ("Fund and acquisition analysts",
     "Each claim in a seller's pipeline is checked against the public record and marked confirmed, contradicted, not verifiable or seller-supplied, with a data-room PDF and Excel workbook.",
     "Portfolio screen", "£7,500 for up to 50 sites"),
    ("Landowners and land agents",
     "One page on the land after a developer's letter: the nearest grid point and how crowded it is, who the developer is, what else they hold nearby and any pressure terms in the letter.",
     "Landowner check", "£195"),
    ("First-time developers and consultants",
     "A feasibility report on one site with a verdict, the reasons, the grid and planning position, the economics and the source of every number.",
     "Site feasibility report", "£1,950"),
]

WHY_PRICE = [
    "Grid, planning, capacity holders and economics joined in one answer for each site.",
    "The source, version, date and licence of every number, so a committee or lender can check it.",
    "Who holds capacity at each substation and how firm their position is, from the TEC register, the embedded capacity registers and the Renewable Energy Planning Database, joined to company groups.",
    "Weekly snapshots of the registers, so new queue entries, Gate moves and sales of project companies show up.",
    "Any assumption can be changed, and the app shows which sites moved and why.",
]

LIMITS_HTML = [
    'Aerodrome and Ministry of Defence safeguarding zones are not published as open data, so Site Finder does not assess them. Check with the aerodrome operator, the <a class="tsg-link" href="https://www.gov.uk/guidance/mod-safeguarding" rel="noopener">MoD safeguarding team</a> and, for wind, the <a class="tsg-link" href="https://www.nats.aero/our-solutions/wind-farms/self-assessment-maps/" rel="noopener">NATS self-assessment maps</a> before you commit to a site.',
    e("Connection costs are indicative estimates for comparing sites. A network operator quote will differ."),
    e("Headroom is only as complete as what each network operator publishes. Where nothing is published, the app marks the site as unknown."),
    e("Company holdings cover projects and grid connections. HM Land Registry data on company-owned land is not included, and nor are land titles, so Site Finder does not show who owns a particular field."),
    e("Coverage is Great Britain. Northern Ireland is not included."),
]

FAQ = [
    ("Does Site Finder tell us where to build?",
     "It ranks candidate land and shows the evidence for each rank, and your team makes the decision. Use the list to start a conversation with a land agent and the network operator. Planning advice and site visits still come first."),
    ("Which technologies does Site Finder cover?",
     "Solar, battery storage, solar with battery on a shared connection, and onshore wind, across England, Scotland and Wales. For wind, each site shows the modelled mean wind speed at 100 m from the Global Wind Atlas beside noise buffers, peat and designations."),
    ("How much does Site Finder cost?",
     "Prices exclude VAT. A landowner check is £195 a report. A site feasibility report is £1,950 a site, and the solar and battery hybrid add-on is £500 on top. A portfolio screen is £7,500 for up to 50 sites and £120 for each extra site. The Site Finder platform is from £30,000 a year for 5 seats, Market Watch from £15,000 a year, and the data API and MCP from £18,000 a year. Enterprise terms are on quote."),
    ("Why does Site Finder cost more than a land tool?",
     "Each site gets one answer that joins grid, planning, capacity holders and economics, and every number carries its source, version, date and licence, so a committee or lender can check it. Site Finder shows who holds capacity at each substation and how firm their position is, from the TEC register, the embedded capacity registers and the Renewable Energy Planning Database joined to company groups. Weekly snapshots of the registers show new queue entries, Gate moves and sales of project companies, and you can change any assumption and see which sites moved."),
    ("How do I order a report or a subscription?",
     "Press Order on the product in the pricing section. Your email app opens a message to tarun@arithim.com with the product in the subject and the details we need listed in the body. We confirm the order by email and invoice after confirmation. Orders are subject to our terms, sent with the invoice."),
    ("How long does a report take?",
     "A landowner check and a site feasibility report each take 3 working days. A hybrid add-on comes with its feasibility report. A portfolio screen takes 5 working days."),
    ("Can our AI assistant use Site Finder data?",
     "Yes. The data API and MCP server let your own tools and AI assistants read projects, substations and grid nodes, map cells, company groups and holdings, changes and licences. Every record carries its source, date and licence, and each organisation has its own keys and usage limits. A screening call, a report call and change webhooks are in early access, available to API customers on request."),
    ("Where does the data come from?",
     "From open datasets published by UK government bodies, NESO and the distribution network operators, plus Companies House, the Global Wind Atlas, and open land cover, solar resource and mapping data. Every source is licensed for commercial use. The data refreshes every week, and the app lists every dataset with its version, retrieval date and licence."),
    ("How reliable are the connection costs?",
     "They are indicative. They are good for comparing one site with another and for spotting when a larger project would need a higher connection voltage, and a network operator quote will differ."),
    ("Does it know whether a substation has spare capacity?",
     "Where the network operator publishes a headroom figure, the tool uses it and shows its date. Where it does not, the site is marked unknown, and the app warns you when most of a shortlist has no published headroom. You can override the figure for any substation and note why. The app also shows who already holds capacity at the node."),
    ("Does it account for Gate 2 and Clean Power 2030?",
     "Yes. A site that is unlikely to get capacity in the current window is shown with a later energisation year. You can assume a Gate 2 offer is secured and see how the ranking changes, and the pipeline board keeps a clock for each site's Gate 2 milestones."),
    ("Can we change the assumptions?",
     "Yes. Technology, weights, exclusion rules, project size, revenue route, capex, hurdle rate and single-substation overrides are all editable. After each change the tool re-ranks and shows which sites moved and why. Every result comes from a rule you can open and read."),
    ("Can it show how a local authority has handled applications?",
     "Yes. Search the planning record by local authority for decisions, approval rates and recent schemes. A refused scheme near a site lowers its score, and the evidence names it."),
    ("Does Site Finder check its rankings against real planning outcomes?",
     "Yes. The app compares its rankings with how solar schemes have fared at planning and shows you the result. It labels the check as a diagnostic."),
    ("Does it check airfields and military safeguarding?",
     "It excludes mapped aerodromes and military land. Official aerodrome and Ministry of Defence safeguarding zones are not published as open data, so check them with the aerodrome or the MoD before you commit to a site. For wind, also check the NATS self-assessment maps."),
    ("Does it cover Northern Ireland or show who owns the land?",
     "Coverage is Great Britain, and Northern Ireland is on the roadmap. Site Finder shows which company groups hold projects and grid connections, by substation and planning authority. It does not include land titles, so it does not show who owns a particular field."),
    ("Can we see a demo before we subscribe?",
     "Yes. Book a demo and we run Site Finder on a brief you choose: the technology, the project size, how you want to connect and the regions you care about. You can also order a subscription straight away from the pricing section."),
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


ST_LABEL = {"shipped": "shipped", "early-access": "early access", "planned": "planned", "exploring": "exploring"}


def _item(it: dict) -> str:
    st = it["status"]
    return (f'<li class="sf-item"><span class="sf-st {st}">{e(ST_LABEL[st])}</span>'
            f'<h4>{e(it["title"])}</h4><p>{e(it["why"])}</p></li>')


def roadmap() -> str:
    items = json.loads((ROOT / "tools" / "site-finder" / "roadmap.json").read_text(encoding="utf-8"))
    shipped = [i for i in items if i["status"] == "shipped"]
    rest = [i for i in items if i["status"] != "shipped"]
    order: list[str] = []
    for it in rest:
        if it["quarter"] not in order:
            order.append(it["quarter"])
    cols = []
    for q in order:
        lis = "".join(_item(it) for it in rest if it["quarter"] == q)
        qid = q.lower().replace(" ", "-")
        cols.append(f'<li class="sf-q"><h3 id="sf-q-{qid}">{e(q.upper())}</h3>'
                    f'<ul aria-labelledby="sf-q-{qid}">{lis}</ul></li>')
    chips = "".join(f'<li>{e(i["title"])}</li>' for i in shipped)
    return (f'<h3 class="sf-sub" id="sf-shipped">Live in the app today</h3>'
            f'<ul class="sf-chips" aria-labelledby="sf-shipped">{chips}</ul>'
            f'<h3 class="sf-sub">Early access and what comes next</h3>'
            f'<ol class="sf-tl" aria-label="Early access and planned work">{"".join(cols)}</ol>')


def ld() -> str:
    app = {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Site Finder",
           "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "url": URL,
           "description": DESC,
           "audience": {"@type": "Audience", "audienceType": "Renewable developers, investors, landowners and land agents in Great Britain"},
           "offers": [{"@type": "Offer", "name": n, "price": v, "priceCurrency": "GBP",
                       "priceSpecification": {"@type": "PriceSpecification", "price": v, "priceCurrency": "GBP", "valueAddedTaxIncluded": False},
                       "url": URL + "#" + slug(k)}
                      for k, n, v in (("Landowner check", "Landowner check", "195"),
                                      ("Site feasibility report", "Site feasibility report", "1950"),
                                      ("Solar and battery hybrid add-on", "Solar and battery hybrid add-on", "500"),
                                      ("Portfolio screen", "Portfolio screen, up to 50 sites", "7500"))],
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
    hero_prices = " · ".join(f'<a href="#{slug(n)}">{e(label)}</a>' for n, label in (
        ("Landowner check", "Landowner check £195"), ("Site feasibility report", "Feasibility report £1,950"),
        ("Portfolio screen", "Portfolio screen £7,500"), ("Site Finder platform", "Platform from £30,000 a year")))
    shows = "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in SHOWS)
    more = "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in MORE)
    push = "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in PUSHBACK)
    faq = "".join(f'<details><summary>{e(q)}</summary><div class="ans"><p>{e(a)}</p></div></details>' for q, a in FAQ)
    limits = "".join(f"<li>{x}</li>" for x in LIMITS_HTML)
    why = "".join(f"<li>{e(x)}</li>" for x in WHY_PRICE)
    reports = "".join(price_card(*r) for r in REPORTS)
    subs = "".join(price_card(n, p, w, nd, None) for n, p, w, nd in SUBS)
    ent = price_card(*ENTERPRISE, None)
    btn = ('<a href="contact.html?product=site-finder" style="position:relative;display:inline-block;padding:1.5px;border-radius:999px;overflow:hidden;">'
           '<span style="position:absolute;inset:-150%;background:conic-gradient(from 0deg,transparent 50%,#E8A13C,#F6CE8C,transparent 78%);animation:ah-spin 3s linear infinite;"></span>'
           '<span style="position:relative;display:inline-flex;align-items:center;gap:10px;background:#0B1320;color:#F5F1E8;font-size:16px;font-weight:600;padding:16px 30px;border-radius:999px;">Book a demo →</span></a>')
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
          <p style="font-size:19px;line-height:1.55;color:#AEB8C6;max-width:560px;margin-top:20px;">Describe the project you want to build: solar, battery storage, solar with a battery, or onshore wind. Site Finder ranks candidate land across England, Scotland and Wales, and each site opens into the evidence behind its rank: the grid connection and who holds capacity there, the planning record nearby and the economics.</p>
          <div style="margin-top:28px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;">{btn}<a href="#pricing" class="tsg-link" style="font-size:16px;">See prices and order</a><a href="#videos" class="tsg-link" style="font-size:16px;">Watch it in use</a></div>
          <p class="sf-hero-pr">{hero_prices}<br>Prices ex VAT. Order by email and pay by invoice.</p>
        </div>
        {scene("j1", hero=True)}
      </div>
      <ol class="tsg-steps" aria-label="How a session runs"><li>Describe the project</li><li>Read the ranked list</li><li>Open a site&#x27;s evidence</li><li>Push back and re-rank</li></ol>
    </div>
  </section>

  <section class="tsg-sec" id="who" aria-labelledby="who-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">WHO IT IS FOR</div>
      <h2 class="tsg-h2" id="who-h">Who is Site Finder for?</h2>
      <p class="tsg-lead">Teams that develop, buy or host renewable projects in Great Britain.</p>
      {cards_audience}
      <p class="sf-note">Site Finder is a screening tool. It narrows where to look, and your team still visits the land, talks to the network operator and takes planning advice.</p>
    </div>
  </section>

  <section class="tsg-sec" id="shows" aria-labelledby="shows-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">FOR EVERY SITE</div>
      <h2 class="tsg-h2" id="shows-h">What does Site Finder show for each site?</h2>
      <p class="tsg-lead">Each site in the list opens into four views, and every number in them carries its source, date and licence.</p>
      <div class="tsg-grid tsg-g2">{shows}</div>
    </div>
  </section>

  <section class="tsg-sec" id="more" aria-labelledby="more-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">BEYOND THE MAP</div>
      <h2 class="tsg-h2" id="more-h">What else can I do in Site Finder?</h2>
      <p class="tsg-lead">The ranked map sits beside tools for tracking a pipeline, watching the market and checking someone else's sites. The data refreshes every week.</p>
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
      <h2 class="tsg-h2" id="evidence-h">How can my team challenge the answer?</h2>
      <p class="tsg-lead">Analysts push back, so every challenge is a control on screen, and each one re-ranks the map.</p>
      <div class="tsg-grid tsg-g3">{push}</div>
    </div>
  </section>

  <section class="tsg-sec" id="pricing" aria-labelledby="pricing-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">PRICES</div>
      <h2 class="tsg-h2" id="pricing-h">How much does Site Finder cost?</h2>
      <p class="tsg-lead">Prices exclude VAT. Reports have fixed prices and subscriptions start at the price shown. Press Order and your email app opens a message with the details we need.</p>
      <h3 class="sf-sub" id="pr-reports">One-off reports</h3>
      <ul class="sf-prices" aria-labelledby="pr-reports">{reports}</ul>
      <div class="sf-proof" id="why-price"><h3 id="why-price-h">Why it costs more than a land tool</h3><ul class="sf-list" aria-labelledby="why-price-h">{why}</ul></div>
      <h3 class="sf-sub" id="pr-subs">Subscriptions</h3>
      <ul class="sf-prices" aria-labelledby="pr-subs">{subs}{ent}</ul>
      <p class="sf-note sf-pr-terms">We confirm every order by email and invoice after confirmation. Orders are subject to our terms, sent with the invoice.</p>
    </div>
  </section>

  <section class="tsg-sec" id="limits" aria-labelledby="limits-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">LIMITS</div>
      <h2 class="tsg-h2" id="limits-h">What does Site Finder not do yet?</h2>
      <p class="tsg-lead">The app shows these on screen too.</p>
      <ul class="sf-list">{limits}</ul>
    </div>
  </section>

  <section class="tsg-sec" id="roadmap" aria-labelledby="roadmap-h">
    <div class="tsg-wrap" style="max-width:1240px;">
      <div class="tsg-eyebrow">ROADMAP</div>
      <h2 class="tsg-h2" id="roadmap-h">What is on the Site Finder roadmap?</h2>
      <p class="tsg-lead">Everything described above this section is in the app today. Early-access items are available to API customers on request and are not yet part of the live product. Planned items are grouped by quarter, and their timing can change.</p>
      <ul class="sf-legend" aria-label="Status legend">
        <li><span class="sf-st early-access">early access</span> Available to API customers on request</li>
        <li><span class="sf-st planned">planned</span> Scoped, timing can change</li>
        <li><span class="sf-st exploring">exploring</span> Under consideration, no date</li>
      </ul>
      {roadmap()}
    </div>
  </section>

  <section class="tsg-sec" id="faq" aria-labelledby="faq-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">FREQUENTLY ASKED</div>
      <h2 class="tsg-h2" id="faq-h">Questions about Site Finder</h2>
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
</main>

<!-- partial:footer {{"back_href": "products.html", "back_text": "← ALL PRODUCTS"}} -->
<!-- /partial:footer -->

</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
class Component extends DCLogic {{
  componentDidMount() {{
    import('./arithim-fx.js?v=4').then((m) => {{ this._stop = m.initFx(document); }}).catch((e) => console.error('fx load failed', e));
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
