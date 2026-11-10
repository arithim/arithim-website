#!/usr/bin/env python3
"""Build the live energy dashboard pages (live*.html) from the Claude dashboard artifacts' pages.

The dashboard pages are written in ~/code/global-solar-live/solar-dashboard/page (index.html is the
solar one; wind.html, battery.html and renewables.html are built there by build_pages.py). This script:
  - drops every element marked data-private (the coverage tab, the private source notes);
  - wraps each dashboard in the site's layout with the head, header and footer partial markers;
  - loads d3 and assets/live/live-dash.js (its styles are the live section of site.css, scoped to
    .live-wrap and body.live-page, because site.css is the only stylesheet the site allows), which stands in for the artifact's data layer and reads
    /live/data/<id>.json (served from R2 by functions/live/data/[name].js);
  - adds a question-style title, a short Q&A and a credits block filled from /live/data/credits.json.
Then run tools/build_insights.py to stamp the partials and refresh the sitemap.

  python3 tools/build_live.py [--src ~/code/global-solar-live/solar-dashboard/page]
"""
import hashlib, html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[sys.argv.index("--src") + 1]).expanduser() if "--src" in sys.argv else Path.home() / "code" / "global-solar-live" / "solar-dashboard" / "page"
SITE = "https://arithim.com"

PAGES = [
    {
        "file": "live-solar.html", "src": "index.html", "nav": "Solar",
        "title": "How much solar power is Great Britain generating right now?",
        "description": "Live solar generation for Great Britain by region, with a two-week forecast, alongside other grids that publish solar output in real time and yearly figures for every country.",
        "lede": "Half-hourly solar output for Great Britain and its 14 network regions, NESO's forecast for the next two weeks, and live solar from the other grids we are allowed to show, with yearly figures for every country.",
        "faq": [
            ("Where do the Great Britain figures come from?", "Sheffield Solar's PV_Live service estimates all of Great Britain's solar output every half hour, scaling up readings from a sample of metered systems. The forecast is NESO's embedded solar forecast. Both are published under open licences."),
            ("Why is output so far below installed capacity?", "Panels reach their rated output only in bright, cool sunshine with the sun high and square on. Cloud, season, time of day and the angle each array faces all pull it down, which is why the regional map shows capacity factor: the share of what the panels could make running flat out."),
            ("How up to date is this page?", "The data is fetched every hour. Each grid publishes on its own schedule, so the latest reading for one may be a few minutes old and for another an hour or two."),
        ],
    },
    {
        "file": "live-wind.html", "src": "wind.html", "nav": "Wind",
        "title": "How much wind power is Great Britain generating right now?",
        "description": "Live wind generation for Great Britain, onshore and offshore, with NESO's 14-day forecast, alongside other grids that publish wind output in real time and yearly figures for every country.",
        "lede": "Wind output metered on Great Britain's transmission network, split into onshore and offshore, with NESO's forecast for the next two weeks and live wind from other grids we are allowed to show.",
        "faq": [
            ("Why can the live Great Britain figure look low?", "The live figure counts wind farms metered on the transmission network. Several gigawatts of smaller farms are connected to the local distribution networks, and they appear only in NESO's embedded wind forecast, which the chart shows separately."),
            ("Where do the numbers come from?", "Elexon publishes half-hourly generation by fuel and actual generation by type for Great Britain, and NESO publishes the wind forecasts. Other grids come from their own system operators, and the yearly figures from Ember."),
            ("How often is it updated?", "Every hour. Elexon's onshore and offshore split runs about three hours behind; the other GB figures are within the last half hour."),
        ],
    },
    {
        "file": "live-batteries.html", "src": "battery.html", "nav": "Batteries",
        "title": "How much are grid batteries charging and discharging right now?",
        "description": "Live charging and discharging of grid batteries in Great Britain and California: what batteries are doing now, their highest discharge and the energy through them in the last 24 hours.",
        "lede": "What grid batteries are doing right now and over the last two days. Positive means discharging to the grid, negative means charging from it.",
        "faq": [
            ("How is the Great Britain figure worked out?", "No one publishes a live total for GB batteries. We add up the physical notifications of battery units in the Balancing Mechanism, the plan each unit sends to the system operator an hour ahead, from Elexon's data. It is an estimate: instructions after that hour change what actually happens, and smaller batteries outside the Balancing Mechanism are not counted."),
            ("Why do batteries charge in the middle of the day?", "Where there is a lot of solar, power is cheapest around midday. Batteries charge then and discharge into the evening peak, when solar fades and demand rises. California shows the pattern clearly."),
            ("Why do batteries take in more than they give back?", "Every charge and discharge loses some energy as heat, so over a day the energy charged runs a little above the energy discharged."),
        ],
    },
    {
        "file": "live-renewables.html", "src": "renewables.html", "nav": "All renewables",
        "title": "What share of Great Britain's electricity is renewable right now?",
        "description": "Live renewable generation by source for Great Britain and other grids, the renewable share hour by hour, and yearly renewable figures for every country.",
        "lede": "Solar, wind, hydro and bioenergy hour by hour, and their share of generation where the whole mix is published, with yearly renewable shares for every country.",
        "faq": [
            ("What counts as renewable here?", "Solar, wind, hydro (not pumped storage), bioenergy and other renewables such as geothermal. Nuclear is not counted as renewable, and neither are imports."),
            ("Why do some grids show no renewable share?", "A share needs the whole generation mix. Great Britain publishes it; for several other grids only solar and wind are available live, so the page shows their output without a share."),
            ("Where do the Great Britain numbers come from?", "Solar is Sheffield Solar's PV_Live estimate; every other source is Elexon's half-hourly generation by fuel, which covers the transmission network."),
        ],
    },
]

INDEX = {
    "file": "live.html", "nav": "All dashboards",
    "title": "Where can I see live solar, wind and battery data for Great Britain?",
    "description": "Four live energy dashboards from Arithim: solar, wind, grid batteries and all renewables, refreshed every hour from open data.",
    "lede": "Four dashboards built on open data and refreshed every hour. Great Britain is covered in full; other grids appear as their operators allow their data on a commercial site.",
}

CARDS = {
    "live-solar.html": "Solar output now, by region, with a two-week forecast and a check of real output against modelled yield.",
    "live-wind.html": "Wind output now, onshore and offshore, with NESO's 14-day forecast.",
    "live-batteries.html": "What grid batteries are charging and discharging right now.",
    "live-renewables.html": "Renewables by source and their share of generation, hour by hour.",
}

PRIVATE = re.compile(r"<(button|section|details|span|div|p)\b[^>]*\bdata-private\b[^>]*>.*?</\1>", re.S)


def dashboard(src: str) -> str:
    text = (SRC / src).read_text(encoding="utf-8")
    text = text.replace('<meta name="dash-one-writer">', "")
    text = PRIVATE.sub("", text)
    if "data-private" in text:
        raise SystemExit(f"{src}: an element marked data-private could not be removed")
    return text.strip()


def ver(rel: str) -> str:
    """Content hash for cache busting: the site caches .js for an hour, so a changed file needs a new URL."""
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:8]


def head(p: dict, ld: dict) -> str:
    t, d, url = html.escape(p["title"]), html.escape(p["description"]), f"{SITE}/{p['file']}"
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t} | Arithim</title>
<meta name="description" content="{d}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Arithim">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:image" content="{SITE}/assets/og-image.png">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<!-- partial:head -->
<!-- /partial:head -->
<script src="/assets/live/d3.v7.9.0.min.js"></script>
<script src="/assets/live/live-dash.js?v={ver('assets/live/live-dash.js')}"></script>
</head>
<body class="live-page">
<x-dc>

<div class="ah-page">

<a class="tsg-skip" href="#main">Skip to content</a>

<!-- partial:header {{"label": "/live", "active": ""}} -->
<!-- /partial:header -->

</div>
</x-dc>

<!-- The dashboard sits outside <x-dc>: support.js re-renders everything inside it with React, which
     would drop the listeners and styles the dashboard scripts set up while the page loads. -->
<div class="ah-page">

<main id="main">
<div class="r-gut">
<div class="live-wrap">
"""


def switcher(current: str) -> str:
    items = [("live.html", "All dashboards")] + [(p["file"], p["nav"]) for p in PAGES]
    links = "".join(f'<a href="/{f[:-5]}"{" aria-current=\"page\"" if f == current else ""}>{html.escape(n)}</a>' for f, n in items)
    return f'<nav class="live-switch" aria-label="Live dashboards">{links}</nav>'


def tail() -> str:
    return """</div>
</div>
</main>

<!-- partial:footer {"back_href": "live.html", "back_text": "← ALL LIVE DASHBOARDS"} -->
<!-- /partial:footer -->

</div>
<!-- the shared card lift and pointer glow; other pages start it from their <x-dc> component script -->
<script type="module">import('/arithim-fx.js?v=5').then((m) => m.initFx(document)).catch((e) => console.error('fx load failed', e));</script>
</body>
</html>
"""


def page(p: dict) -> str:
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]}
    faq = "".join(f"<h3>{html.escape(q)}</h3><p>{html.escape(a)}</p>" for q, a in p["faq"])
    return (head(p, faq_ld)
            + f"""<header class="live-hero">
<p class="live-kicker">LIVE ENERGY DATA</p>
<h1>{html.escape(p['title'])}</h1>
<p>{html.escape(p['lede'])}</p>
</header>
{switcher(p['file'])}
{dashboard(p['src'])}
<section class="live-section" id="questions">
<h2>Questions</h2>
{faq}
</section>
<section class="live-section live-credits" id="sources">
<h2>Sources and credits</h2>
<div data-live-credits><p class="live-note">Loading the source list…</p></div>
<p class="live-note">Some grids that appear on our private dashboards are held back here until their operators allow display on a commercial website.</p>
</section>
""" + tail())


def index() -> str:
    p = INDEX
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": p["title"], "url": f"{SITE}/{p['file']}", "description": p["description"]}
    cards = "".join(f'<a href="/{q["file"][:-5]}"><h2>{html.escape(q["nav"])}</h2><p>{html.escape(CARDS[q["file"]])}</p></a>' for q in PAGES)
    return (head(p, ld)
            + f"""<header class="live-hero">
<p class="live-kicker">LIVE ENERGY DATA</p>
<h1>{html.escape(p['title'])}</h1>
<p>{html.escape(p['lede'])}</p>
</header>
<div class="live-index">{cards}</div>
<section class="live-section">
<h2>How these dashboards work</h2>
<p>Every hour a job fetches the latest figures from each grid operator and open data service, keeps only the sources whose licences allow display on a commercial site, and publishes them here. Each dashboard lists its sources and credit lines at the bottom.</p>
</section>
""" + tail())


def main():
    for p in PAGES:
        (ROOT / p["file"]).write_text(page(p), encoding="utf-8")
        print("wrote", p["file"])
    (ROOT / INDEX["file"]).write_text(index(), encoding="utf-8")
    print("wrote", INDEX["file"])


if __name__ == "__main__":
    main()
