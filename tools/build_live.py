#!/usr/bin/env python3
"""Build the live energy pages (live*.html) from the Claude dashboard artifacts' pages.

The dashboard pages are written in ~/code/global-solar-live/solar-dashboard/page (index.html is the
solar one; wind.html, battery.html and renewables.html are built there by build_pages.py). Each is one long
page with tabs. This script turns them into a short drill-down:

  live.html                         landing: a Renewables band, then Solar, Wind and Batteries cards
  live-<tech>.html                  a dashboard overview: headline numbers, one hero chart, a card per region
  live-<tech>-<region>.html         one region: what was a tab, with a breadcrumb and a sibling-region nav

where <tech> is solar, wind, batteries or renewables. The script:
  - drops every element marked data-private (the coverage tab, the private source notes);
  - splits each dashboard's tab sections into their own pages, and moves the intro cards that are not the
    hero chart or the live counter onto a region page, so no chart is lost;
  - writes the dashboards' own style rules to the live section of site.css (never a new stylesheet) and
    their scripts to assets/live/<bundle>.js; assets/live/live-dash.js stands in for the artifact's data
    layer and reads /live/data/<id>.json (served from R2 by functions/live/data/[name].js);
  - gives every page its own question-style title, description, canonical URL, JSON-LD, short Q&A and a
    credits block filled from /live/data/credits.json (the words are in tools/live_content.py).
Then run tools/build_insights.py to stamp the partials and refresh the sitemap.

  python3 tools/build_live.py [--src ~/code/global-solar-live/solar-dashboard/page]
"""
import hashlib, html, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from live_content import CREDITS, LANDING, LIVE_NOTE, TECHS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[sys.argv.index("--src") + 1]).expanduser() if "--src" in sys.argv else Path.home() / "code" / "global-solar-live" / "solar-dashboard" / "page"
SITE = "https://arithim.com"
ASSETS = ROOT / "assets" / "live"
CSS = ROOT / "site.css"
CSS_START, CSS_END = "/* live:gsl:start (written by tools/build_live.py) */", "/* live:gsl:end */"

# The two bundles a landing card number or chart is copied from: later bundles win a draw-name clash.
LANDING_ORDER = ["solar", "renewables", "wind", "battery"]

# {{n:bundle:draw}} is the headline-number element for that draw, {{c:bundle:draw}} its chart, copied from the dashboard's own page.
LANDING_BAND = """<section class="live-band live-linked" id="renewables" aria-labelledby="live-r">
<div class="live-band-text">
<h2 id="live-r"><a class="live-stretch" href="/live-renewables">Renewables</a></h2>
<p class="live-sub">Solar, wind, hydro and bioenergy on every live grid, added together.</p>
<div class="live-stats">
<div><p class="live-stat-l">Renewable output, latest hour</p><p class="live-stat-v">{{n:renewables:r-gw}}<small>GW</small></p></div>
<div><p class="live-stat-l">Share of generation, where the full mix is published</p><p class="live-stat-v">{{n:renewables:r-share}}<small>%</small></p></div>
<div><p class="live-stat-l">Live grids</p><p class="live-stat-v">{{n:renewables:r-n}}</p></div>
</div>
</div>
<div class="live-band-chart">
<p class="live-chart-t">Great Britain's generation by source, last two days</p>
<div class="gsl-key"><span style="--k: var(--src-solar)">Solar</span><span style="--k: var(--src-wind)">Wind</span><span style="--k: var(--src-hydro)">Hydro</span><span style="--k: var(--src-bio)">Bioenergy</span><span style="--k: var(--src-other)">Other renewables</span></div>
{{c:renewables:gb-mix}}
</div>
</section>"""

# slug, heading, (stat label, number, unit)..., chart title, chart
LANDING_CARDS = [
    ("solar", "Solar", [("Live grids, now", "{{n:solar:live-total}}", "GW"), ("Great Britain, now", "{{n:solar:t-uk-now}}", "GW"),
                        ("World, share of electricity", "{{n:solar:world-share}}", "%")],
     "Live solar output by grid, sized by output", "{{c:solar:live-map}}"),
    ("wind", "Wind", [("Live grids, now", "{{n:wind:w-total}}", "GW"), ("Great Britain, now", "{{n:wind:gb-wind-rate}}", "GW"),
                      ("World, share of electricity", "{{n:wind:w-share}}", "%")],
     "Where the wind is blowing now, sized by output", "{{c:wind:w-map}}"),
    ("batteries", "Batteries", [("Discharging now", "{{n:battery:b-dis}}", "GW"), ("Charging now", "{{n:battery:b-chg}}", "GW"),
                                ("Grids reporting", "{{n:battery:b-n}}", "")],
     "Great Britain, last two days, GW (positive discharges)", "{{c:battery:gb-lines}}"),
]

PRIVATE = re.compile(r"<(button|section|details|span|div|p)\b[^>]*\bdata-private\b[^>]*>.*?</\1>", re.S)


# ---------------------------------------------------------------- reading the dashboards
def div_end(s: str, start: int) -> int:
    """Index just after the </div> that closes the <div starting at `start`."""
    depth = 0
    for m in re.finditer(r"<(/?)div\b", s[start:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return start + s[start:].index(">", m.start()) + 1
    raise SystemExit("unbalanced div in a dashboard page")


def parse(src: str) -> dict:
    text = (SRC / src).read_text(encoding="utf-8").replace('<meta name="dash-one-writer">', "")
    text = PRIVATE.sub("", text)
    if "data-private" in text:
        raise SystemExit(f"{src}: an element marked data-private could not be removed")
    p = {"text": text}
    p["style"] = re.search(r"<style>(.*?)</style>", text, re.S).group(1)
    after = text[text.index("</style>") + 8:]
    p["take"] = re.search(r'<p class="gsl-take">.*?</p>', re.search(r'<header class="gsl-head" id="top">.*?</header>', after, re.S).group(0), re.S).group(0)
    ts = after.index('<div class="gsl-tiles" id="headline">')
    p["tiles"] = after[ts:div_end(after, ts)]
    gs = after.index('<div class="gsl-grid">', ts)
    gend = div_end(after, gs)
    inner = after[gs + len('<div class="gsl-grid">'):gend - len("</div>")]
    cards, i = {}, 0
    while True:
        j = inner.find('<div class="gsl-card', i)
        if j < 0:
            break
        e = div_end(inner, j)
        cards[re.search(r'id="([^"]+)"', inner[j:e]).group(1)] = inner[j:e]
        i = e
    p["cards"] = cards
    nav = re.search(r'<nav class="gsl-tabs".*?</nav>', after, re.S).group(0)
    p["labels"] = {m.group(1): m.group(2) for m in re.finditer(r'data-tab="(\w+)"[^>]*>([^<]+)</button>', nav)}
    p["sections"] = {m.group(1): m.group(3) for m in re.finditer(r'<section class="gsl-page" id="(\w+)" data-page="\w+"([^>]*)>(.*?)</section>', after, re.S)}
    p["scripts"] = [m.group(1) for m in re.finditer(r"<script>(.*?)</script>", text, re.S)]
    return p


def sources(markup: str) -> str:
    """The dataset ids a piece of markup draws from, so a page link can hide itself when none is published."""
    ids = set()
    for m in re.finditer(r'data-source="([^"]+)"', markup):
        ids.update(m.group(1).split())
    return " ".join(sorted(ids))


def plain(markup: str) -> str:
    """Drop the explanatory captions under chart titles and the small-print notes; the figures and charts stay."""
    markup = re.sub(r'<p class="gsl-sub">.*?</p>\s*', "", markup, flags=re.S)
    return re.sub(r'<p class="gsl-note">.*?</p>\s*', "", markup, flags=re.S)


def link_tiles(tiles: str, t: dict, src: dict) -> str:
    """Each headline tile becomes a link to the region page it summarises."""
    targets = {r["id"]: url_of(region_file(t, r)) for r in t["regions"]}

    def one(m):
        label = re.search(r'gsl-tile-l">(.*?)</p>', m.group(2)).group(1)
        to = next((rid for start, rid in t["tiles"] if label.startswith(start)), None)
        if not to:
            return m.group(0)
        return f'<a class="gsl-tile live-tile" href="{targets[to]}"{m.group(1)}>{m.group(2)}</a>'
    return re.sub(r'<div class="gsl-tile"([^>]*)>(.*?)</div>', one, tiles, flags=re.S)


def link_hero(card: str, href: str) -> str:
    card = re.sub(r'<div class="gsl-key">.*?</div>\s*', "", card, flags=re.S) if "r-now-bars" in card else card  # the sparklines are one colour
    return re.sub(r"<h3>(.*?)</h3>", lambda m: f'<h3><a class="live-hlink" href="{href}">{m.group(1)}</a></h3>', card, count=1, flags=re.S)


def element(src_text: str, name: str, kind: str) -> str:
    """Copy a headline element (kind n) or a chart div (kind c) carrying data-draw=name, verbatim."""
    if kind == "n":
        m = re.search(r'<(b|span)\b[^>]*data-draw="%s"[^>]*>.*?</\1>' % re.escape(name), src_text, re.S)
        if not m:
            raise SystemExit(f"landing: no headline element for draw {name}")
        return re.sub(r"^<b\b", "<span", m.group(0)).replace("</b>", "</span>")
    m = re.search(r'<div class="gsl-chart[^"]*"[^>]*data-draw="%s"[^>]*></div>' % re.escape(name), src_text)
    if not m:
        raise SystemExit(f"landing: no chart element for draw {name}")
    return m.group(0)


# ---------------------------------------------------------------- assets: styles and scripts
def ver(rel: str) -> str:
    """Content hash for cache busting: assets are cached for a year and .js for an hour, so a changed file needs a new URL."""
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:8]


def write_if_changed(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text(encoding="utf-8") != text:
        path.write_text(text, encoding="utf-8")


def write_assets(pages: dict) -> None:
    helpers = {p["scripts"][0] for p in pages.values()}
    if len(helpers) != 1:
        raise SystemExit("the dashboard pages carry different shared helper scripts")
    write_if_changed(ASSETS / "gsl.js", helpers.pop().strip() + "\n")
    # every script after the helper, in source order (calculations, colours, headline numbers, drawings). Draws do nothing
    # without a matching element and calculations run only when a draw asks, so a page can load its dashboard's whole bundle.
    for t in TECHS:
        write_if_changed(ASSETS / f"{t['bundle']}.js", "\n;\n".join(s.strip() for s in pages[t["bundle"]]["scripts"][1:]) + "\n")
    # one calculation id must mean one thing: the landing page loads several bundles into one registry
    owner = {}
    for t in TECHS:
        for cid in re.findall(r"dash\.calc\('([\w-]+)'", (ASSETS / f"{t['bundle']}.js").read_text(encoding="utf-8")):
            if cid in owner and owner[cid] != t["bundle"]:
                raise SystemExit(f"calculation {cid} is defined in both {owner[cid]} and {t['bundle']}; the landing page loads both")
            owner[cid] = t["bundle"]
    # the dashboards' style rules are the union of the four pages' blocks, minus the scrolling box around tables
    seen, rules = set(), []
    for t in TECHS:
        for line in pages[t["bundle"]]["style"].splitlines():
            if line.strip() and line not in seen and not line.startswith(".gsl-tablebox"):
                seen.add(line)
                rules.append(line)
    block = f"{CSS_START}\n" + "\n".join(rules) + f"\n{CSS_END}"
    css = CSS.read_text(encoding="utf-8")
    if CSS_START not in css:
        raise SystemExit("site.css has no live:gsl markers in its live energy dashboards section")
    css = re.sub(re.escape(CSS_START) + r".*?" + re.escape(CSS_END), lambda _: block, css, flags=re.S)
    if re.search(r"overflow(-[xy])?:\s*(auto|scroll)", block):
        raise SystemExit("a dashboard style rule scrolls inside the page")
    write_if_changed(CSS, css)


# ---------------------------------------------------------------- page shell
def url_of(file: str) -> str:
    """Internal links use the clean URL (/live-solar), as the live pages always have."""
    return "/" + file[:-5]


def head(p: dict, ld: dict, bundles: list) -> str:
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


def tail(back_href: str, back_text: str, bundles: list) -> str:
    scripts = "".join(f'<script src="/assets/live/{b}.js?v={ver(f"assets/live/{b}.js")}"></script>\n' for b in (["gsl"] + bundles + ["live-charts"] if bundles else []))
    return f"""</div>
</div>
</main>

<!-- partial:footer {json.dumps({"back_href": back_href, "back_text": back_text})} -->
<!-- /partial:footer -->

</div>
{scripts}<!-- the shared card lift and pointer glow; other pages start it from their <x-dc> component script -->
<script type="module">import('/arithim-fx.js?v=5').then((m) => m.initFx(document)).catch((e) => console.error('fx load failed', e));</script>
</body>
</html>
"""


def ld_graph(p: dict, crumbs: list, collection: bool = False) -> dict:
    graph = []
    if collection:
        graph.append({"@type": "CollectionPage", "name": p["title"], "url": f"{SITE}/{p['file']}", "description": p["description"]})
    if crumbs:
        graph.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": f"{SITE}/{f}"} for i, (n, f) in enumerate(crumbs)]})
    return {"@context": "https://schema.org", "@graph": graph}


def crumbs_nav(items: list) -> str:
    lis = "".join(
        f'<li><a href="{url_of(f)}">{html.escape(n)}</a></li>' if f else f'<li><span aria-current="page">{html.escape(n)}</span></li>'
        for n, f in items)
    return f'<nav class="live-crumbs" aria-label="Breadcrumb"><ol>{lis}</ol></nav>'


def hero(p: dict, sub: str = "") -> str:
    line = f"<p>{html.escape(sub)}</p>\n" if sub else ""
    return f"""<header class="live-hero">
<p class="live-kicker">LIVE ENERGY DATA</p>
<h1>{html.escape(p['title'])}</h1>
{line}</header>
"""


def foot() -> str:
    return '<p class="live-foot"><a href="/live-credits">Sources and credits</a></p>\n'


def switcher(current: str) -> str:
    items = [("live.html", "Live")] + [(f"live-{t['slug']}.html", t["nav"]) for t in TECHS] + [(CREDITS["file"], "Credits")]
    links = "".join(f'<a href="{url_of(f)}"{" aria-current=\"page\"" if f == current else ""}>{html.escape(n)}</a>' for f, n in items)
    return f'<nav class="live-switch" aria-label="Live pages">{links}</nav>\n'


# ---------------------------------------------------------------- pages
def region_file(t: dict, r: dict) -> str:
    return f"live-{t['slug']}-{r['slug']}.html"


def overview(t: dict, src: dict) -> tuple:
    o = t["overview"]
    file = f"live-{t['slug']}.html"
    p = {"file": file, "title": o["title"], "description": o["description"]}
    crumbs = [("Live", "live.html"), (t["nav"], file)]
    cards = ""
    for r in t["regions"]:
        needs = sources(src["sections"][r["id"]])
        cards += (f'<a class="live-rcard" href="{url_of(region_file(t, r))}" data-live-needs="{needs}"><h3>{html.escape(src["labels"][r["id"]])}</h3>'
                  f'<p>{html.escape(r["blurb"])}</p><span class="live-rgo">See {html.escape(src["labels"][r["id"]])} &rarr;</span></a>')
    hero_to = url_of(region_file(t, next(r for r in t["regions"] if r["id"] == t["hero_to"])))
    keep = [c for c in src["cards"].values() if "gsl-counter-card" in c.split(">", 1)[0]] + [link_hero(plain(src["cards"][t["hero"]]), hero_to)]
    body = (crumbs_nav(crumbs) + hero(p) + switcher(file)
            + f'<div class="gsl">\n<header class="gsl-head">\n{src["take"]}\n</header>\n{link_tiles(src["tiles"], t, src)}\n'
            + '<div class="gsl-grid">\n' + "\n".join(keep) + "\n</div>\n"
            + f'<h2 class="gsl-h2" id="regions">Explore by region</h2>\n<div class="live-rgrid">{cards}</div>\n</div>\n' + foot())
    page = head(p, ld_graph(p, crumbs, collection=True), [t["bundle"]]) + body + tail("live.html", "← BACK TO LIVE", [t["bundle"]])
    return file, page


def region(t: dict, src: dict, r: dict) -> tuple:
    file = region_file(t, r)
    label = src["labels"][r["id"]]
    p = {"file": file, "title": r["title"], "description": r["description"]}
    ov = f"live-{t['slug']}.html"
    crumbs = [("Live", "live.html"), (t["nav"], ov), (label, file)]
    inner = plain(src["sections"][r["id"]])
    items = [(ov, "Overview", "")] + [(region_file(t, o), src["labels"][o["id"]], sources(src["sections"][o["id"]])) for o in t["regions"]]
    nav = "".join(
        f'<a href="{url_of(f)}"{" aria-current=\"page\"" if f == file else ""}' + (f' data-live-needs="{n}"' if n else "") + f'>{html.escape(name)}</a>'
        for f, name, n in items)
    regionnav = f'<nav class="live-regionnav" aria-label="{html.escape(t["nav"])} regions">{nav}</nav>\n'
    body = (crumbs_nav(crumbs) + hero(p, r["blurb"]) + switcher(ov) + regionnav
            + f'<div class="gsl">\n<section class="gsl-page" id="{r["id"]}" data-page="{r["id"]}">{inner}</section>\n'
            + '<p class="live-note live-none" data-live-none hidden>No live data for this region is published here yet. Some grids are held back until their operators allow display on a commercial website.</p>\n</div>\n'
            + foot())
    page = head(p, ld_graph(p, crumbs), [t["bundle"]]) + body + tail("live.html", "← BACK TO LIVE", [t["bundle"]])
    return file, page


def landing(pages: dict, bundle_text: dict) -> tuple:
    p = {"file": LANDING["file"], "title": LANDING["title"], "description": LANDING["description"]}

    def fill(text: str) -> str:
        def sub(m):
            kind, bundle, name = m.group(1), m.group(2), m.group(3)
            owners = [b for b in LANDING_ORDER if re.search(r"""['"]%s['"]""" % re.escape(name), bundle_text[b])]
            if not owners or owners[-1] != bundle:
                raise SystemExit(f"landing: draw {name} is registered by {owners}, and the last one wins; wanted {bundle}")
            return element(pages[bundle]["text"], name, kind)
        return re.sub(r"\{\{([nc]):(\w+):([\w-]+)\}\}", sub, text)

    cards = ""
    for slug, title, stats, ctitle, chart in LANDING_CARDS:
        t = next(x for x in TECHS if x["slug"] == slug)
        st = "".join(
            f'<div><p class="live-stat-l">{html.escape(l)}</p><p class="live-stat-v">{fill(v)}{f"<small>{u}</small>" if u else ""}</p></div>' for l, v, u in stats)
        cards += (f'<section class="live-card live-linked" aria-labelledby="live-{slug}"><div class="live-card-body">'
                  f'<h2 id="live-{slug}"><a class="live-stretch" href="/live-{slug}">{title}</a></h2><p class="live-sub">{html.escape(t["card"])}</p>'
                  f'<div class="live-stats">{st}</div><p class="live-chart-t">{html.escape(ctitle)}</p>{fill(chart)}</div></section>\n')
    body = (hero(p, LANDING["lede"])
            + f'<div class="gsl">\n{fill(LANDING_BAND)}\n<div class="live-cards">\n{cards}</div>\n</div>\n' + foot())
    page = head(p, ld_graph(p, [], collection=True), LANDING_ORDER) + body + tail("index.html", "← BACK TO HOME", LANDING_ORDER)
    return p["file"], page


def credits_page() -> tuple:
    p = {"file": CREDITS["file"], "title": CREDITS["title"], "description": CREDITS["description"]}
    crumbs = [("Live", "live.html"), ("Credits", p["file"])]
    notes = list(LANDING["faq"])
    for t in TECHS:
        notes += t["overview"]["faq"]
    notes += [t["regions"][0]["faq"][0] for t in TECHS]
    notes += [TECHS[0]["regions"][0]["faq"][1]]
    seen, dl = set(), ""
    for q, a in notes:
        if q in seen:
            continue
        seen.add(q)
        dl += f"<dt>{html.escape(q)}</dt><dd>{html.escape(a)}</dd>"
    body = (crumbs_nav(crumbs) + hero(p, CREDITS["sub"]) + switcher(p["file"])
            + f"""<section class="live-section live-credits" id="sources">
<h2>Data sources</h2>
<div data-live-credits data-all><p class="live-note">Loading the source list…</p></div>
</section>
<section class="live-section" id="licences">
<h2>Licences</h2>
<p>{html.escape(LIVE_NOTE)}</p>
</section>
<section class="live-section live-notes" id="notes">
<h2>How to read the figures</h2>
<dl>{dl}</dl>
</section>
""")
    page = head(p, ld_graph(p, crumbs), []) + body + tail("live.html", "← BACK TO LIVE", [])
    return p["file"], page


def main():
    pages = {t["bundle"]: parse(t["src"]) for t in TECHS}
    write_assets(pages)
    bundle_text = {t["bundle"]: (ASSETS / f"{t['bundle']}.js").read_text(encoding="utf-8") for t in TECHS}
    out = {}
    for t in TECHS:
        src = pages[t["bundle"]]
        regions = {r["id"] for r in t["regions"]}
        missing = (set(src["sections"]) | set(src["labels"])) - regions
        if missing:
            raise SystemExit(f"{t['src']}: tabs {sorted(missing)} have no region entry in tools/live_content.py")
        for f, text in [overview(t, src)] + [region(t, src, r) for r in t["regions"]]:
            out[f] = text
    for f, text in (landing(pages, bundle_text), credits_page()):
        out[f] = text
    for f, text in sorted(out.items()):
        if "data-private" in text:
            raise SystemExit(f"{f}: data-private left in the output")
        write_if_changed(ROOT / f, text)
        print("wrote", f)
    # a page left over from an earlier layout must not stay published
    for old in sorted(ROOT.glob("live*.html")):
        if old.name not in out:
            old.unlink()
            print("removed", old.name)


if __name__ == "__main__":
    main()
