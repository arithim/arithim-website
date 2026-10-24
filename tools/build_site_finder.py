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
H1 = "Find the land worth a site visit, with the evidence for every site."

e = html.escape

SCENES = {
    "j1": ("Ask the question and read the answer",
           "Load the app, read the verdict and scan the ranked list, then look across the map of scored sites.",
           "A question is typed: where should we build next? Chips show the project as 50 MWp, auto connection, CfD and a 6.5% hurdle. A verdict box says 8 of the top 20 sites are deliverable. A hex map fills in and a ranked list follows. Hulcott in Buckinghamshire needs £57.1 against a CfD price of £65.23, Stone Street in East Suffolk needs £60.5, and Belchamp St Paul in Braintree needs £59.7. Numbered markers place the sites on the map."),
    "j2": ("Open the evidence for a site",
           "Open the top site: its score breakdown, substations, planning record and economics, then the one-page print pack.",
           "The top row, Hulcott in Buckinghamshire, is selected and an evidence drawer slides up. Six bars grow for grid, planning, solar and terrain, economics, deliverability and environment. Cards then show the nearest substation, Aylesbury East Grid 33kV at 0.5 km with capacity ok, the planning record, and the economics: the site needs £57.1 against a CfD price of £65.23."),
    "j3": ("Push back and see what changed",
           "Mark a substation as full and rescore, read the What changed card, then assume a Gate 2 offer and watch the answer move.",
           "Four ranked sites sit above a card for the substation Aylesbury East Grid 33kV. Challenge is pressed, the substation is marked full, and a note says the operator has no spare capacity. After Rescore the rows move. Hulcott falls from first to fourth and the other three each rise one place. A What changed card lists each move and names the override as the cause."),
    "f1": ("Gate 2 and grid headroom",
           "See which sites can connect in the current window, then assume a Gate 2 offer and watch the ranking move.",
           "A bar shows 134.6 MW of Gate 2 solar capacity left in a zone. Three ranked sites of 40 MWac each take their share in rank order, and the figure falls to 94.6, 54.6 and then 14.6 MW. The fourth site, Weedon, also needs 40 MWac. It does not fit, so it moves to a box marked needs next window, with a later energisation year."),
    "f2": ("Planning record by local authority",
           "Search the planning record by local authority for decisions, approval rates and recent schemes.",
           "A table lists local authorities, with a bar for the share of solar schemes approved. Wiltshire is selected. Its panel says it approved 11 of 12 solar schemes since 2019, with a median decision time of 9 months, and a small chart shows decisions per year. A note says the rate is the authority's record and does not predict the outcome for a specific scheme."),
    "f3": ("Refused schemes nearby",
           "A refused solar scheme near a site lowers its score, and the site's evidence names the scheme.",
           "A score waterfall for a site at Smeeth in Ashford starts at 0.83 before flags. Three multipliers follow: 0.90 for a refused scheme 1.4 km away, 0.94 for a National Park or AONB setting, and 0.93 for a listed building. The score ends at 0.65. A small map then shows the site, a dashed 1.4 km line and the refused scheme, East Stour Solar Farm, 49.9 MW."),
    "f4": ("Economics and project size",
           "Take the project size past 100 MWac and watch the consent route, transmission charges and NPV change.",
           "A slider for project size moves from 90 to 110 MWac. As it passes 100 MWac the consent route changes from the local planning authority to the NSIP Development Consent Order route, and the NPV falls from +£8.5m to −£0.1m. A note names the size threshold and both values."),
}

SHOWS = [
    ("Grid connection", "The nearest substations, whether the network operator publishes headroom for them, and an estimated energisation year."),
    ("Planning record", "Solar schemes built, consented and refused nearby, and how the local authority has decided solar applications."),
    ("Economics", "An indicative connection cost, the price per MWh the site needs to reach your hurdle rate, and NPV and IRR."),
    ("Evidence pack", "Every input with its source and a constraint checklist, printable as one page or exported as CSV and GeoJSON."),
]

PUSHBACK = [
    ("Change the assumptions", "Change the weights, exclusion rules, project size, revenue route, capex and hurdle rate. Draw areas on the map to include or exclude, or override a single substation (\"this one is full\") with a note saying why."),
    ("See what changed", "After each edit, a card lists the sites that entered or left the top of the list, how far each moved and which assumption moved it."),
    ("Save and share scenarios", "Save a set of assumptions under a name, compare two side by side and send one to a colleague as a link."),
]

LIMITS = [
    "Connection costs are indicative estimates for comparing sites. A network operator quote will differ.",
    "Headroom is only as complete as what each network operator publishes. Where nothing is published, the app marks the site as unknown.",
    "Aerodrome and Ministry of Defence safeguarding zones are not openly published, so the tool does not assess them.",
    "Sites are areas of land, not parcels with owners. Ownership is not in this version.",
    "Coverage is Great Britain. Northern Ireland is not included.",
]

FAQ = [
    ("Does Site Finder tell us where to build?",
     "It ranks candidate land and shows the evidence for each rank, and your team makes the decision. Use the list to start a conversation with a land agent and the network operator. Planning advice and site visits still come first."),
    ("Where does the data come from?",
     "From open datasets published by UK government bodies, NESO and the distribution network operators, plus open land cover, solar resource and mapping data. The app lists every dataset with its version, retrieval date and licence."),
    ("How reliable are the connection costs?",
     "They are indicative. They are good for comparing one site with another and for spotting when a larger project would need a higher connection voltage, and a network operator quote will differ."),
    ("Does it know whether a substation has spare capacity?",
     "Where the network operator publishes a headroom figure, the tool uses it and marks the site as high confidence. Where it does not, the site is marked unknown, and the app warns you when most of a shortlist has no published headroom. You can override the figure for any substation and note why."),
    ("Does it account for Gate 2 and Clean Power 2030?",
     "Yes. A site that is unlikely to get capacity in the current window is shown with a later energisation year. You can assume a Gate 2 offer is secured and see how the ranking changes."),
    ("Can we change the assumptions?",
     "Yes. Weights, exclusion rules, project size, revenue route, capex, hurdle rate and single-substation overrides are all editable. After each change the tool re-ranks and shows which sites moved and why. Every result comes from a rule you can open and read."),
    ("Can it show how a local authority has handled solar applications?",
     "Yes. Search the planning record by local authority for decisions, approval rates and recent schemes. A refused scheme near a site lowers its score, and the evidence names it."),
    ("Does Site Finder check its rankings against real planning outcomes?",
     "Yes. The app compares its rankings with how solar schemes have fared at planning and shows you the result. It labels the check as a diagnostic."),
    ("Does it check airfields and military safeguarding?",
     "It excludes mapped aerodromes and military land. Official safeguarding zones are not published as open data, so check them with the aerodrome or the Ministry of Defence before you commit to a site."),
    ("Does it cover Northern Ireland or show who owns the land?",
     "Not yet. Coverage is Great Britain, and land ownership is on the roadmap."),
    ("How do we get access?",
     "Book a demo. We set up an account for each customer and walk through the tool on a brief you choose."),
]


def scene(key: str, *, hero: bool = False) -> str:
    title, cap, desc = SCENES[key]
    desc_html = f'<details class="tsg-desc"><summary>Describe this animation</summary><p>{e(desc)} All names and figures illustrate the interface on the launch data.</p></details>'
    mount = f'<div data-sf-scene="{key}" data-title="{e(title)}"></div>'
    if hero:
        return f'<figure class="sf-fig">{mount}{desc_html}</figure>'
    return (f'<figure class="sf-fig"><div class="sf-sc-v">{mount}</div>'
            f'<div class="sf-sc-t"><h4>{e(title)}</h4><p class="sf-cap">{e(cap)}</p>{desc_html}</div></figure>')


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
                f'<h4>{e(it["title"])}</h4><p>{e(it["why"])}</p></li>')
        qid = q.lower().replace(" ", "-")
        cols.append(f'<li class="sf-q"><h3 id="sf-q-{qid}">{e(q.upper())}</h3>'
                    f'<ul aria-labelledby="sf-q-{qid}">{"".join(lis)}</ul></li>')
    return f'<ol class="sf-tl" aria-label="Roadmap by quarter">{"".join(cols)}</ol>'



def ld() -> str:
    app = {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Site Finder",
           "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "url": URL,
           "description": DESC,
           "audience": {"@type": "Audience", "audienceType": "Origination teams at UK renewable independent power producers"},
           "publisher": {"@type": "Organization", "name": "Arithim Ltd", "url": "https://arithim.com/"}}
    faq = {"@context": "https://schema.org", "@type": "FAQPage",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Arithim", "item": "https://arithim.com/"},
        {"@type": "ListItem", "position": 2, "name": "Products", "item": "https://arithim.com/products.html"},
        {"@type": "ListItem", "position": 3, "name": "Site Finder", "item": URL}]}
    return "\n".join(f'<script type="application/ld+json">{json.dumps(o, ensure_ascii=False)}</script>' for o in (app, faq, bc))


def build() -> str:
    cards_audience = (
        '<div class="tsg-grid tsg-g2">'
        '<div class="tsg-card"><h3>Origination analysts</h3><p>An analyst gets a long list of land to take to a land agent or a network operator, with the reasoning attached.</p></div>'
        '<div class="tsg-card"><h3>Investment committees</h3><p>A committee member can ask why this site and not that one, see the answer in the data, then change an assumption and watch the ranking respond.</p></div>'
        '</div>')
    shows = "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in SHOWS)
    push = "".join(f'<div class="tsg-card"><h3>{e(t)}</h3><p>{e(b)}</p></div>' for t, b in PUSHBACK)
    faq = "".join(f'<details><summary>{e(q)}</summary><div class="ans"><p>{e(a)}</p></div></details>' for q, a in FAQ)
    limits = "".join(f"<li>{e(x)}</li>" for x in LIMITS)
    btn = ('<a href="contact.html?product=site-finder" data-magnetic style="position:relative;display:inline-block;padding:1.5px;border-radius:999px;overflow:hidden;">'
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
<link rel="stylesheet" href="/assets/site-finder/site-finder.css?v=7">
<link rel="stylesheet" href="/assets/callus.css?v=3">
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
    <div data-hero-glow style="position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 0.4s;"></div>
    <div class="tsg-wrap" style="position:relative;padding-top:56px;padding-bottom:10px;">
      <div class="tsg-hero-grid">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.12em;color:#E8A13C;margin-bottom:18px;">SITE FINDER · FOR SOLAR TEAMS IN GREAT BRITAIN</div>
          <h1 id="sf-h1" class="tsg-hero-h" style="font-weight:700;font-size:52px;line-height:1;letter-spacing:-0.04em;color:#F5F1E8;">{e(H1)}</h1>
          <p style="font-size:19px;line-height:1.55;color:#AEB8C6;max-width:560px;margin-top:20px;">Describe the solar farm you want to build. Site Finder ranks candidate land across England, Scotland and Wales, and each site opens into the evidence behind its rank: the grid connection, the planning record nearby and the economics.</p>
          <div style="margin-top:28px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;">{btn}<a href="#videos" class="tsg-link" style="font-size:16px;">Watch it in use</a></div>
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
      <p class="tsg-lead">Origination analysts and investment committees at UK independent power producers (IPPs).</p>
      {cards_audience}
      <p class="sf-note">Site Finder is a screening tool. It narrows where to look, and your team still visits the land, talks to the network operator and takes planning advice.</p>
    </div>
  </section>

  <section class="tsg-sec" id="shows" aria-labelledby="shows-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">FOR EVERY SITE</div>
      <h2 class="tsg-h2" id="shows-h">What does Site Finder show for each site?</h2>
      <p class="tsg-lead">Each site in the list opens into four views, and each view names its sources.</p>
      <div class="tsg-grid tsg-g2">{shows}</div>
    </div>
  </section>

  <section class="tsg-sec" id="videos" aria-labelledby="videos-h">
    <div class="tsg-wrap">
      <div class="tsg-eyebrow">SEE IT IN USE</div>
      <h2 class="tsg-h2" id="videos-h">What does Site Finder look like in use?</h2>
      <p class="tsg-lead">Animated scenes of the interface. The names and figures come from the launch data and show how the tool works. They are not results for any project.</p>
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
      <p class="tsg-lead">Version 1 is available in demos. Planned items are grouped by quarter, and their timing can change.</p>
      <ul class="sf-legend" aria-label="Status legend">
        <li><span class="sf-st shipped">shipped</span> Available in version 1</li>
        <li><span class="sf-st planned">planned</span> Scoped for a quarter</li>
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
      <p>Tell us the project size, how you want to connect and the regions you care about, and we will show you the ranked list and the evidence behind it.</p>
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
    import('./arithim-fx.js').then((m) => {{ this._stop = m.initFx(document); }}).catch((e) => console.error('fx load failed', e));
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
    OUT.write_text(build(), encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT))
