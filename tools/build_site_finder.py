#!/usr/bin/env python3
"""Build product-site-finder.html (the Site Finder product page).

The roadmap section is rendered from tools/site-finder/roadmap.json into static HTML, so the
page needs no JavaScript to show it. Run `python3 tools/build_site_finder.py`, then
`python3 tools/build_insights.py` to stamp the shared head, header and footer partials.
"""
from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "product-site-finder.html"
URL = "https://arithim.com/product-site-finder.html"
A = "/assets/site-finder/"

TITLE = "Where to build a solar farm in Great Britain | Arithim"
DESC = ("Site Finder ranks candidate land for utility-scale solar across Great Britain and shows "
        "the evidence behind every site. Book a demo with Arithim.")
H1 = "Where in Great Britain should we build our next utility-scale solar farm?"

e = html.escape

VIDEOS = {
    "j1": ("Ask the question and read the answer", "0:40", "j1-ask-the-question",
           "Load the app, read the verdict and scan the ranked list, then explore the map of scored sites."),
    "j2": ("Open the evidence for a site", "0:40", "j2-open-the-evidence",
           "Open the evidence for the top site: the score waterfall, substations, planning record and economics, then the one-page print pack."),
    "j3": ("Push back and see what changed", "0:43", "j3-push-back",
           "Mark a substation as full and rescore. Read the What changed card, then assume a Gate 2 offer and see how the answer moves."),
    "f1": ("Gate 2 and headroom allocation", "0:18", "f1-gate2-and-headroom",
           "Higher-ranked sites take shared Gate 2 zone and substation capacity first. Assume a Gate 2 offer and watch the ranking move."),
    "f2": ("Planning record by local authority", "0:20", "f2-planning-record",
           "Search the planning record by local authority to see decisions, approval rates and recent schemes."),
    "f3": ("Red flags for refused schemes nearby", "0:25", "f3-red-flags",
           "A refused solar scheme nearby lowers a site's score. The waterfall and the planning tab name the scheme."),
    "f4": ("Economics and sizing cliffs", "0:23", "f4-economics-and-sizing",
           "Move project size across 100 MWac and watch the consent route, TNUoS charges and NPV change."),
}

STEPS = [
    ("Exclude", "Statutory designations, flood and peat rules, built-up areas, aerodromes and military land are removed from the buildable area. The default exclusion set is a starting position, and every rule can be relaxed."),
    ("Score", "Each candidate area is scored on grid, planning, solar resource and terrain, economics, deliverability and environment, using weights and value curves you can edit."),
    ("Allocate grid", "A site counts as connectable only if a suitable substation is within reach. NESO's zonal Gate 2 capacity and each substation's published headroom are spent in rank order, so ten sites cannot all claim the same spare megawatts."),
    ("Price", "Capex, operating cost, connection cost, TNUoS rules and the revenue route give the price needed to reach your hurdle rate, plus NPV and IRR."),
    ("Rank", "Sites are ordered by what is deliverable at your assumptions first, then by suitability score. You can switch the ranking basis."),
    ("Prove", "Each site carries a score waterfall, every raw input with its source, the constraint checklist, the nearest substations, nearby schemes and the weight-stability result."),
]

PUSHBACK = [
    ("Change the assumptions", "Change weights, value curves, exclusion modes and buffers, project size, revenue route, capex and hurdle rate. Draw include and exclude areas on the map. Override a single substation (\"this one is full\") or a single land grade, with a note saying why."),
    ("See what changed", "After each edit, a card lists the sites that entered or left the top list, the rank moves and the assumption that drove each one."),
    ("Save and share scenarios", "Save a set of assumptions under a name, compare two side by side and share one as a link."),
    ("Take the evidence away", "Print a one-page evidence pack for any site, or export the ranked list as CSV and the site outlines as GeoJSON."),
    ("Test weight stability", "For each site, the tool reruns the ranking with the weights perturbed and reports how often the site stays in the list."),
    ("Check the rankings against planning outcomes", "The tool checks its own rankings against how real schemes fared at planning, and shows that check to you. The check is a diagnostic, not proof, and the app labels it that way."),
]

DNO = "Licence area"
SOURCES = [
    ("NESO", "Transmission Entry Capacity register, embedded register, TNUoS generation tariffs and zones, ETYS boundaries (B6, B4), GSP regions, DNO areas, 24-month constraint limits, Gate 2 and Clean Power 2030 zonal results for solar", "Great Britain"),
    ("National Grid Electricity Distribution", "Capacity heat map, Embedded Capacity Register", DNO),
    ("Northern Powergrid", "Capacity heat map data, Embedded Capacity Register", DNO),
    ("SSEN Distribution", "Headroom dashboard data, Embedded Capacity Register", DNO),
    ("UK Power Networks", "Capacity heat map, Embedded Capacity Register", DNO),
    ("Electricity North West", "Heat map and Embedded Capacity Register", DNO),
    ("SP Energy Networks", "Distribution heat maps and Embedded Capacity Register", DNO),
    ("DESNZ", "Renewable Energy Planning Database (REPD), quarterly extract", "Great Britain"),
    ("Natural England", "Designations (national parks, AONB, SSSI, SAC, SPA, Ramsar, NNR), ancient woodland, peat, open access land, agricultural land classification surveys", "England"),
    ("JNCC", "SAC, SPA and Ramsar boundaries", "Great Britain"),
    ("Natural Resources Wales", "Designations, ancient woodland, flood zones, common land and open access", "Wales"),
    ("NatureScot", "Protected areas, ancient woodland inventory, Wild Land Areas, Carbon and Peatland map", "Scotland"),
    ("Scottish Government and James Hutton Institute", "National Scenic Areas, National Parks, prime agricultural land (one combined flag, not separate grades)", "Scotland"),
    ("Environment Agency", "Flood Map for Planning, Flood Zones 2 and 3", "England"),
    ("SEPA", "Flood maps", "Scotland"),
    ("Defra and Welsh Government", "Predictive agricultural land classification", "England, Wales"),
    ("Historic England, Cadw, Historic Environment Scotland", "Heritage lists: scheduled monuments, listed buildings, registered parks and gardens, battlefields, World Heritage Sites", "England, Wales, Scotland"),
    ("MHCLG", "Green belt and local planning authority boundaries (planning.data.gov.uk)", "England"),
    ("Ordnance Survey", "Terrain 50, Open Roads, Open Rivers, Open UPRN, Boundary-Line", "Great Britain"),
    ("Office for National Statistics", "Built-up areas, country and local planning authority boundaries", "Great Britain"),
    ("ESA", "WorldCover 10 m land cover (2021)", "Great Britain"),
    ("World Bank and Solargis", "Global Solar Atlas solar resource", "Great Britain"),
    ("OpenStreetMap contributors via Geofabrik", "Power infrastructure, aerodromes, military land, place names", "Great Britain"),
]

LIMITS = [
    "Connection costs are indicative. They come from a cost table with a route factor, not from a network operator quote.",
    "Network headroom is only as complete as what each operator publishes. Where there is no published figure, the site is marked \"unknown\" and carries a lower data-confidence tier. This includes SSEN Hydro areas, where no item carries a headroom number, and parts of the ENWL and SP Energy Networks coverage.",
    "There is no aerodrome or Ministry of Defence safeguarding data, because none is openly published. Aerodromes from OpenStreetMap are excluded with a 500 m buffer, which is a proxy.",
    "There are no land ownership boundaries. Sites are areas of land, not parcels with owners.",
    "Solar yield comes from the Global Solar Atlas. A per-site PVGIS calculation and a P50 and P90 range are not in this version.",
    "Agricultural land grade is available in England and Wales. Scotland has one combined prime-land flag.",
    "Refused schemes in the planning database are under-recorded, so the red-flag check will miss some.",
    "There is no glint and glare check, no aerial imagery check and no land price model beyond a flat rent assumption.",
    "Coverage is Great Britain only. Northern Ireland is not included.",
    "Council political context is left out, because the source data has no clear licence.",
]

QUESTIONS = [
    ("Grid and connection", [
        "Which land is free of hard constraints and within reach of a substation with published headroom?",
        "What is the likely energisation year for this site, given the Gate 2 allocation in its zone?",
        "Which zones have Phase 1 solar capacity left under Clean Power 2030?"]),
    ("Planning", [
        "What has this local planning authority done with solar schemes since 2019, how long did decisions take, and what happened at appeal?",
        "How much solar is already built or consented within 5 km, and have schemes nearby been refused?",
        "What heritage assets sit near the site that could slow consent?"]),
    ("Land", [
        "How much of the site is Grade 1, 2 or 3a agricultural land?"]),
    ("Money", [
        "What does connection cost at 33 kV against 132 kV for this size of project?",
        "Which site has the lowest price needed across a region?",
        "What price per MWh does this site need to hit our hurdle rate?"]),
]

FAQ = [
    ("Does Site Finder tell me where to build?",
     "It ranks candidate land and shows the evidence for each rank. The decision stays with your team. A ranked list is somewhere to start a conversation with a land agent and the network operator, and planning advice and site visits still come first."),
    ("Where does the data come from?",
     "It comes from open datasets published by UK government bodies, the system operator and the distribution network operators, plus ESA WorldCover, the Global Solar Atlas and OpenStreetMap. The Data sources page in the app lists the publisher, version, retrieval date and licence of each one."),
    ("How reliable are the connection costs?",
     "They are indicative. The tool estimates connection cost from a cost table for each voltage, a route factor and the distance to the substation, so a network operator quote will differ. The estimate lets you compare sites with each other and shows when a change in project size moves the connection voltage."),
    ("Does it know if a substation has spare capacity?",
     "Where the operator publishes a headroom figure, the tool uses it and marks the site as high confidence. Where it does not, the site is marked unknown, and the app shows a banner when most of a shortlist has no published headroom. You can override the figure for any substation and record why."),
    ("How does it use Gate 2 and Clean Power 2030?",
     "Each NESO zone has a limited amount of solar capacity. As the tool ranks sites, it spends that capacity in rank order, and spends each substation's published headroom the same way. A site that no longer fits is shown as needing the next window, with a later energisation year. You can also assume a Gate 2 offer is secured and see how the answer changes."),
    ("Can I change the assumptions?",
     "Yes. Weights, value curves, exclusion rules, project size, revenue route, capex, hurdle rate and per-object overrides are all editable. After each change the tool re-ranks and shows which sites moved and why. There is no chatbot, so every result comes from a rule you can open and read."),
    ("Does Site Finder test itself against planning outcomes?",
     "Yes. It runs three diagnostics against the government's planning database. One counts built schemes that sit on land the rules exclude. One looks at whether consented schemes cluster in the top-scoring land. One checks how well the score separates approved from refused applications. The app shows all three and labels them as diagnostics, not proof."),
    ("Does it cover Northern Ireland or show who owns the land?",
     "Coverage is Great Britain only for now, and ownership is not in version 1. An ownership chain that links planning applicants, capacity holders, Companies House parents and company-owned land from HM Land Registry is on the roadmap."),
    ("Does it check airfields and military safeguarding?",
     "It excludes aerodromes and military land that appear in OpenStreetMap, with a 500 m buffer for aerodromes. Official safeguarding zones are not published as open data, so the tool does not assess them. Check them with the aerodrome or the Ministry of Defence before you commit to a site."),
    ("How do I get access?",
     "Book a demo. We set up an account for each customer and walk through the tool on a brief of your choosing."),
]


def video(key: str, *, hero: bool = False) -> str:
    title, dur, stem, cap = VIDEOS[key]
    vid = f"sf-v-{key}{'-hero' if hero else ''}"
    h4 = "" if hero else f'<h4 id="{vid}-t">{e(title)}</h4>'
    label = f"Screen recording: {title}, {dur}"
    capid = f"{vid}-c"
    cap_html = (f'<p class="sf-cap" id="{capid}">{e(cap)} <span class="sf-meta">{dur}</span></p>' if not hero else
                f'<p class="sf-cap" id="{capid}">Screen recording, {dur}: {e(title.lower()[0] + title[1:])}. The recording shows the interface on the launch data.</p>')
    return (f'<figure class="sf-fig">'
            f'<video class="sf-vid" controls muted playsinline preload="none" poster="{A}{stem}-poster.jpg" '
            f'width="1920" height="1080" aria-label="{e(label)}" aria-describedby="{capid}">'
            f'<source src="{A}{stem}.mp4" type="video/mp4">'
            f'Your browser cannot play this video. <a href="{A}{stem}.mp4">Download the recording</a>.</video>'
            f'{h4}{cap_html}</figure>')


def roadmap() -> str:
    items = json.loads((ROOT / "tools" / "site-finder" / "roadmap.json").read_text(encoding="utf-8"))
    order: list[str] = []
    for it in items:
        if it["quarter"] not in order:
            order.append(it["quarter"])
    cols = []
    for q in order:
        lis = []
        for it in (i for i in items if i["quarter"] == q):
            st = it["status"]
            lis.append(
                f'<li class="sf-item"><span class="sf-st {st}">{e(st)}</span>'
                f'<h4>{e(it["title"])}</h4><p>{e(it["description"])}</p>'
                f'<p><span>Why it matters:</span> {e(it["why"])}</p></li>')
        qid = q.lower().replace(" ", "-")
        cols.append(f'<li class="sf-q"><h3 id="sf-q-{qid}">{e(q.upper())}</h3>'
                    f'<ul aria-labelledby="sf-q-{qid}">{"".join(lis)}</ul></li>')
    return f'<ol class="sf-tl" aria-label="Roadmap by quarter">{"".join(cols)}</ol>'


def table() -> str:
    rows = "".join(f"<tr><td>{e(p)}</td><td>{e(d)}</td><td>{e(c)}</td></tr>" for p, d, c in SOURCES)
    return ('<div class="sf-table"><table><caption>Open datasets used by Site Finder</caption>'
            '<thead><tr><th scope="col">Publisher</th><th scope="col">Dataset</th><th scope="col">Coverage</th></tr></thead>'
            f'<tbody>{rows}</tbody></table></div>')


def ld() -> str:
    app = {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Site Finder",
           "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "url": URL,
           "description": DESC,
           "audience": {"@type": "Audience", "audienceType": "Origination teams at UK renewable independent power producers"},
           "publisher": {"@type": "Organization", "name": "Arithim", "url": "https://arithim.com/"}}
    faq = {"@context": "https://schema.org", "@type": "FAQPage",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Arithim", "item": "https://arithim.com/"},
        {"@type": "ListItem", "position": 2, "name": "Site Finder", "item": URL}]}
    return "\n".join(f'<script type="application/ld+json">{json.dumps(o, ensure_ascii=False)}</script>' for o in (app, faq, bc))


def build() -> str:
    cards_audience = (
        '<div class="tsg-grid tsg-g2">'
        '<div class="tsg-card"><h3>Origination analysts</h3><p>An analyst gets a long list of land to take to a land agent or a network operator, with the reasoning attached.</p></div>'
        '<div class="tsg-card"><h3>Investment committees</h3><p>A committee member can ask why this site and not that one, see the answer in the data, then change an assumption and watch the ranking respond.</p></div>'
        '</div>')
    steps = "".join(f'<li><div class="tsg-card"><div class="sf-eb">{e(n.upper())}</div><p>{e(t)}</p></div></li>' for n, t in STEPS)
    qgroups = "".join(
        f'<div class="tsg-card"><h3>{e(g)}</h3><ul>{"".join(f"<li>{e(q)}</li>" for q in qs)}</ul></div>' for g, qs in QUESTIONS)
    push = "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in PUSHBACK)
    faq = "".join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in FAQ)
    limits = "".join(f"<li>{e(x)}</li>" for x in LIMITS)
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
<link rel="stylesheet" href="/assets/site-finder/site-finder.css?v=3">
<link rel="stylesheet" href="/assets/callus.css?v=3">
</head>
<body>
<x-dc>

<div class="tsg sf" style="background:#070C16;color:#F5F1E8;min-height:100vh;">
<a class="tsg-skip" href="#main">Skip to content</a>

<!-- partial:header {{"label": "/site-finder", "active": "", "cta": "contact"}} -->
<!-- /partial:header -->

<main id="main">
  <section data-hero style="position:relative;overflow:hidden;" aria-labelledby="sf-h1">
    <div style="position:absolute;top:-30%;right:-5%;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(59,111,212,0.2),transparent 60%);filter:blur(80px);animation:ah-aurora-a 18s ease-in-out infinite;pointer-events:none;"></div>
    <div data-hero-glow style="position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 0.4s;"></div>
    <div class="tsg-wrap r-gut sf-hero" style="position:relative;">
      <div class="tsg-hero-grid">
        <div>
          <div class="sf-chip-row"><span class="sf-badge">ARITHIM PRODUCT</span><span class="sf-badge" style="color:#9AA6B6;background:rgba(245,241,232,0.06);">SITE FINDER</span></div>
          <h1 class="sf-h1" id="sf-h1">{e(H1)}</h1>
          <p class="sf-lead">Site Finder is a map-based tool for renewable origination teams. Describe the project you have in mind and it ranks candidate land across England, Scotland and Wales. Each site opens into the evidence behind its rank: the data, the grid connection, the planning record and the economics.</p>
          <div class="sf-btns">
            <a class="sf-btn" href="contact.html"><i></i><span>Book a demo →</span></a>
            <a class="sf-link" href="#questions">See the questions your team can ask</a>
          </div>
        </div>
        {video("j1", hero=True)}
      </div>
    </div>
  </section>

  <section class="tsg-sec" id="who" aria-labelledby="who-h">
    <div class="tsg-wrap r-gut">
      <div class="tsg-eyebrow">WHO IT IS FOR</div>
      <h2 class="tsg-h2 r-f4" id="who-h">Who is Site Finder for?</h2>
      <p class="tsg-lead">Site Finder is built for origination analysts and investment committees at UK renewable independent power producers (IPPs).</p>
      {cards_audience}
      <p class="sf-note">Site Finder is a screening tool. It narrows where to look, and the people who develop the site still visit the land, talk to the network operator and take the planning advice.</p>
    </div>
  </section>

  <section class="tsg-sec" id="how" aria-labelledby="how-h">
    <div class="tsg-wrap r-gut">
      <div class="tsg-eyebrow">HOW IT WORKS</div>
      <h2 class="tsg-h2 r-f4" id="how-h">How does Site Finder reach an answer?</h2>
      <p class="tsg-lead">The route from raw data to a ranked list has six steps, and the app shows each one.</p>
      <ol class="sf-steps">{steps}</ol>
    </div>
  </section>

  <section class="tsg-sec" id="videos" aria-labelledby="videos-h">
    <div class="tsg-wrap r-gut">
      <div class="tsg-eyebrow">SEE IT IN USE</div>
      <h2 class="tsg-h2 r-f4" id="videos-h">What does Site Finder look like in use?</h2>
      <p class="tsg-lead">These are screen recordings of the interface on the launch data. They illustrate how the tool works and are not results for any project.</p>
      <h3 class="sf-sub">Walkthroughs of a working session</h3>
      <div class="sf-vgrid sf-v3">{"".join(video(k) for k in ("j1", "j2", "j3"))}</div>
      <h3 class="sf-sub">Features up close</h3>
      <div class="sf-vgrid sf-v4">{"".join(video(k) for k in ("f1", "f2", "f3", "f4"))}</div>
    </div>
  </section>

  <section class="tsg-sec" id="evidence" aria-labelledby="evidence-h">
    <div class="tsg-wrap r-gut">
      <div class="tsg-eyebrow">EVIDENCE AND PUSHBACK</div>
      <h2 class="tsg-h2 r-f4" id="evidence-h">How can my team check and challenge the answer?</h2>
      <p class="tsg-lead">An analyst's first instinct is to push back, and the tool is built for that. It has no chat box. Every challenge is a control, and each control re-ranks the map.</p>
      <div class="tsg-grid tsg-g3">{push}</div>
    </div>
  </section>

  <section class="tsg-sec" id="data" aria-labelledby="data-h">
    <div class="tsg-wrap r-gut">
      <div class="tsg-eyebrow">DATA SOURCES</div>
      <h2 class="tsg-h2 r-f4" id="data-h">Which data does Site Finder use?</h2>
      <p class="tsg-lead">Site Finder is built from open data: UK government and agency datasets, the system operator's and network operators' published registers and heat maps, and three open international or community datasets (ESA WorldCover, Global Solar Atlas and OpenStreetMap). The app's Data sources page lists every dataset with its version, retrieval date and licence.</p>
      {table()}
    </div>
  </section>

  <section class="tsg-sec" id="limits" aria-labelledby="limits-h">
    <div class="tsg-wrap r-gut">
      <div class="tsg-eyebrow">LIMITS</div>
      <h2 class="tsg-h2 r-f4" id="limits-h">What does Site Finder not do yet?</h2>
      <p class="tsg-lead">The app states these limits on screen as well.</p>
      <ul class="sf-list">{limits}</ul>
      <p class="sf-note">Items on this list are candidates for later versions. The roadmap below shows what is planned, and none of it is a commitment.</p>
    </div>
  </section>

  <section class="tsg-sec" id="questions" aria-labelledby="questions-h">
    <div class="tsg-wrap r-gut">
      <div class="tsg-eyebrow">QUESTIONS</div>
      <h2 class="tsg-h2 r-f4" id="questions-h">What questions can my team ask?</h2>
      <p class="tsg-lead">These come from the questions UK renewable IPP teams ask of siting data. Each one can be put to Site Finder today, within the limits above.</p>
      <div class="sf-qgrid">{qgroups}</div>
    </div>
  </section>

  <section class="tsg-sec" id="roadmap" aria-labelledby="roadmap-h">
    <div class="tsg-wrap r-gut" style="max-width:1240px;">
      <div class="tsg-eyebrow">ROADMAP</div>
      <h2 class="tsg-h2 r-f4" id="roadmap-h">What is on the Site Finder roadmap?</h2>
      <p class="tsg-lead">Version 1 is available in demonstrations. The next versions add an ownership chain, client accounts and sign-in, per-site yield with P50 and P90, and more. Items are grouped by quarter.</p>
      <ul class="sf-legend" aria-label="Status legend">
        <li><span class="sf-st shipped">shipped</span> Available in version 1</li>
        <li><span class="sf-st planned">planned</span> Scoped for a quarter</li>
        <li><span class="sf-st exploring">exploring</span> Under consideration, no date</li>
      </ul>
      <p class="sf-warn">Planned items are not commitments, and timing can change.</p>
      {roadmap()}
    </div>
  </section>

  <section class="tsg-sec" id="faq" aria-labelledby="faq-h">
    <div class="tsg-wrap r-gut">
      <div class="tsg-eyebrow">FAQ</div>
      <h2 class="tsg-h2 r-f4" id="faq-h">Frequently asked questions about Site Finder</h2>
      <div class="sf-faq">{faq}</div>
    </div>
  </section>

  <section class="sf-cta" id="demo" data-hero aria-labelledby="demo-h">
    <div style="position:absolute;top:-30%;left:30%;width:640px;height:640px;border-radius:50%;background:radial-gradient(circle,rgba(232,161,60,0.2),transparent 60%);filter:blur(90px);animation:ah-aurora-b 20s ease-in-out infinite;pointer-events:none;"></div>
    <div class="tsg-wrap r-gut" style="position:relative;">
      <h2 id="demo-h" class="r-f4">Want to see Site Finder run on your own brief?</h2>
      <p>Tell us the project size, the connection preference and the regions you care about, and we will show you the ranked list and the evidence behind it.</p>
      <a class="sf-btn" href="contact.html"><i></i><span>Book a demo →</span></a>
      <p class="sf-note" style="margin:22px auto 0;">Prefer email? Write to <a class="sf-link" href="mailto:hello@arithim.com">hello@arithim.com</a>.</p>
    </div>
  </section>
</main>

<!-- partial:footer {{"back_href": "services.html", "back_text": "← ALL SERVICES"}} -->
<!-- /partial:footer -->

</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
class Component extends DCLogic {{
  componentDidMount() {{ import('./arithim-fx.js').then((m) => {{ this._stop = m.initFx(document); }}).catch((e) => console.error('fx load failed', e)); }}
  componentWillUnmount() {{ if (this._stop) this._stop(); }}
  renderVals() {{ return {{}}; }}
}}
</script>
<a class="callus-link" href="/contact.html"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>Call us</a>
<script src="/assets/callus.js?v=3" defer></script>
</body>
</html>
'''


if __name__ == "__main__":
    OUT.write_text(build(), encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT))
