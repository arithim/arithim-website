"""Hero illustrations for the product pages, shared by the generators.

Each drawing is a small inline SVG that shows what the product returns, in the same 360 x 260 frame. Nothing is
loaded from outside and nothing is hard-coded to a theme: colours come from classes in the "Hero illustrations"
section of site.css, which read the --ah-* tokens, so the drawings follow the light and dark themes. A page opts in
with an "art" key in content/products.json naming one of the drawings in ART below. The sample names and figures in
the drawings are made up, and the caption under each drawing says so.

Every drawing stays under 3 KB. `python3 tools/illustrations.py` prints the sizes.
"""
from __future__ import annotations

import html

CAPTION = "Illustrative example. Not real data."


def t(x, y, s, c="tx", a=None):
    anchor = f' text-anchor="{a}"' if a else ""
    return f'<text x="{x}" y="{y}" class="{c}"{anchor}>{html.escape(s)}</text>'


def panel(h=244):
    return f'<rect x="8" y="8" width="344" height="{h}" rx="14" class="p"/>'


def models():
    rows = [("support-chat-llm", "Support", "ok", "Approved"), ("invoice-reader", "Finance", "ok", "Approved"),
            ("fraud-scorer", "Risk", "rv", "In review"), ("cv-screener", "HR", "bd", "Flagged"), ("code-assist", "Data", "ok", "Approved")]
    b = panel() + t(26, 38, "MODEL INVENTORY") + '<rect x="262" y="23" width="72" height="22" rx="11" class="k"/>' + t(298, 38, "5 models", "tx", "middle")
    b += '<path d="M8 54H352" class="k"/>'
    for i, (n, o, s, l) in enumerate(rows):
        y = 56 + i * 36
        if s == "bd":
            b += f'<rect x="9" y="{y}" width="342" height="36" class="hl"/>'
        b += f'<circle cx="30" cy="{y + 18}" r="5" class="{s}"/>' + t(46, y + 22, n, "tb") + t(196, y + 22, o) + t(334, y + 22, l, "tx", "end")
        if i < 4:
            b += f'<path d="M26 {y + 36}H334" class="g"/>'
    return b


def battery():
    b = panel() + '<path d="M20 84H210M20 140H210M20 196H210M80 22V238M144 22V238" class="g"/>'
    b += '<path d="M60 92L130 78L152 120L120 168L66 156Z" class="site"/>' + t(100, 127, "SITE", "am", "middle")
    b += '<path d="M28 214L118 198L196 150" class="k"/><circle cx="118" cy="198" r="3" class="n"/><rect x="190" y="144" width="12" height="12" class="n"/>'
    b += '<path d="M152 120L194 148" class="dash"/>' + t(172, 124, "0.8 km")
    b += '<path d="M222 22V238" class="k"/>' + t(240, 44, "SCORE") + t(240, 86, "74", "big") + t(282, 86, "/100")
    b += '<rect x="240" y="98" width="62" height="22" rx="11" class="pill"/>' + t(271, 113, "Pursue", "tb s", "middle")
    for i, (l, w, c) in enumerate([("Grid", 72, "ok"), ("Planning", 48, "rv"), ("Land", 66, "ok"), ("Returns", 56, "ok")]):
        y = 146 + i * 23
        b += t(240, y, l, "tx s") + f'<rect x="240" y="{y + 4}" width="92" height="5" rx="2.5" class="g f"/><rect x="240" y="{y + 4}" width="{w}" height="5" rx="2.5" class="{c}"/>'
    return b


def grid():
    nodes = [(66, 76), (160, 56), (270, 88), (112, 140)]
    b = panel() + t(26, 36, "SUBSTATIONS NEAR THE SITE")
    b += '<path d="M66 76L160 56L270 88L112 140L66 76M160 56L112 140" class="k"/>'
    for x, y in nodes:
        b += f'<circle cx="{x}" cy="{y}" r="9" class="nd"/><circle cx="{x}" cy="{y}" r="3" class="n"/>'
    b += '<path d="M230 150L270 88" class="dash"/><path d="M230 140l9 10l-9 10l-9-10z" class="site"/>' + t(250, 166, "Site", "am") + t(282, 112, "2.1 km")
    b += t(26, 196, "HEADROOM") + t(334, 196, "38 MW free", "tb s", "end")
    b += '<rect x="26" y="204" width="308" height="12" rx="6" class="g f"/><rect x="26" y="204" width="190" height="12" rx="6" class="ok"/>'
    b += '<path d="M146 199V221" class="ac"/>' + t(146, 238, "20 MW request", "am", "middle")
    return b


def planning():
    b = panel() + '<clipPath id="ah-art-c"><rect x="20" y="40" width="320" height="150" rx="10"/></clipPath>' + t(26, 30, "PLANNING RISK")
    b += '<g clip-path="url(#ah-art-c)"><rect x="20" y="40" width="320" height="150" class="g f"/>'
    b += '<ellipse cx="226" cy="108" rx="150" ry="100" class="ok b"/><ellipse cx="226" cy="108" rx="96" ry="64" class="rv b"/><ellipse cx="226" cy="108" rx="44" ry="30" class="bd b"/>'
    b += '<path d="M20 124C100 104 180 150 340 112M110 40V190M262 40C250 100 282 150 270 190" class="k"/></g>'
    b += '<circle cx="150" cy="118" r="9" class="ring"/><circle cx="150" cy="118" r="4" class="am f"/>' + t(150, 142, "Site", "am", "middle")
    for i, (l, c) in enumerate([("Low", "ok"), ("Medium", "rv"), ("High", "bd")]):
        x = 26 + i * 54 + (12 if i == 2 else 0)
        b += f'<circle cx="{x + 4}" cy="219" r="4" class="{c}"/>' + t(x + 14, 223, l)
    b += t(334, 223, "2 constraints", "tx s", "end")
    return b


def company():
    b = panel() + '<rect x="80" y="32" width="200" height="62" rx="10" class="nd"/>' + t(180, 58, "Example Trading Ltd", "tb", "middle") + t(180, 78, "Company 01234567", "tx", "middle")
    b += '<rect x="224" y="21" width="70" height="22" rx="11" class="pill pf"/><circle cx="238" cy="32" r="4" class="ok"/>' + t(247, 36, "Active", "tx s")
    b += '<path d="M130 94C130 126 66 118 66 150M180 94V150M230 94C230 126 294 118 294 150" class="k"/>'
    for x, l, s in [(66, "Director", "Since 2019"), (180, "Director", "Since 2021"), (294, "Controller", "Over 75% owned")]:
        b += f'<circle cx="{x}" cy="170" r="20" class="nd"/><circle cx="{x}" cy="164" r="5" class="am f"/><path d="M{x - 9} 181a9 8 0 0 1 18 0z" class="am f"/>'
        b += t(x, 208, l, "tb s", "middle") + t(x, 224, s, "tx s", "middle")
    return b


def solar():
    b = panel() + t(26, 36, "ROOF SUITABILITY") + '<path d="M40 140Q155-10 270 140" class="dash"/><circle cx="183" cy="69" r="11" class="sun"/><circle cx="183" cy="69" r="18" class="halo"/>'
    b += '<rect x="76" y="204" width="220" height="32" class="g f"/><path d="M40 236H330" class="k"/>'
    b += '<path d="M56 204L124 146H284L316 204Z" class="roof"/>'
    b += '<path d="M164 146L121 204M204 146L186 204M244 146L251 204M101.7 165H294.5M78.3 185H305.5" class="k t"/>'
    b += '<circle cx="300" cy="52" r="26" class="g tr"/><circle cx="300" cy="52" r="26" class="arc" transform="rotate(-90 300 52)"/>' + t(300, 58, "82", "tb", "middle")
    b += t(300, 96, "Suitability", "tx s", "middle")
    return b


def shortlist():
    dots = [(30, 40), (58, 76), (84, 48), (110, 96), (140, 56), (170, 100), (196, 44), (220, 82), (246, 58), (270, 104), (300, 50), (322, 86), (46, 112), (96, 120), (150, 124), (204, 118), (258, 126), (310, 120), (130, 80), (284, 74)]
    b = panel() + "".join(f'<circle cx="{x}" cy="{y}" r="2.5" class="dt"/>' for x, y in dots)
    for (x, y), n in [((196, 44), 1), ((110, 96), 2), ((270, 104), 3)]:
        b += f'<circle cx="{x}" cy="{y}" r="10" class="rk"/>' + t(x, y + 4, str(n), "tb s", "middle")
    for i, (n, w, sc) in enumerate([("Unit 4, Eastgate Park", 84, 92), ("Plot 12, Mill Lane", 72, 85), ("Yard 3, Quay Road", 62, 78)]):
        y = 150 + i * 32
        b += f'<path d="M26 {y - 10}H334" class="g"/><circle cx="36" cy="{y + 8}" r="9" class="rk"/>' + t(36, y + 12, str(i + 1), "tb s", "middle") + t(56, y + 12, n, "tb s")
        b += f'<rect x="230" y="{y + 5}" width="84" height="5" rx="2.5" class="g f"/><rect x="230" y="{y + 5}" width="{w * 84 // 100}" height="5" rx="2.5" class="ok"/>' + t(334, y + 12, str(sc), "tx s", "end")
    return b


ART = {
    "model-inventory": (models, "A list of five AI models, each with an owner and a status dot: three approved, one in review and one flagged."),
    "battery-site": (battery, "A site outline beside a grid line and substation, 0.8 km away, with a site score of 74 out of 100, a verdict of pursue and bars for grid, planning, land and returns."),
    "grid-headroom": (grid, "Four substations linked by network lines with a site 2.1 km from the nearest, and a bar showing 38 MW of headroom against a 20 MW request."),
    "planning-bands": (planning, "A map tile with the site at its centre and coloured bands of low, medium and high planning risk around it, with two constraints within 500 metres."),
    "company-links": (company, "A company node marked active, linked to two directors and one person with significant control."),
    "roof-sun": (solar, "A roof plane with solar panels beneath the arc of the sun's path, with a suitability score of 82 out of 100."),
    "ranked-sites": (shortlist, "A scatter of map points with the three best marked 1, 2 and 3, above a ranked shortlist of three sites with scores."),
}


def render(key: str) -> str:
    fn, alt = ART[key]
    a = html.escape(alt, quote=True)
    svg = f'<svg viewBox="0 0 360 260" role="img" aria-label="{a}" focusable="false">{fn()}</svg>'
    return f'<figure class="ah-art">{svg}<figcaption class="ah-art-cap">{CAPTION}</figcaption></figure>'


if __name__ == "__main__":
    for k, (fn, alt) in ART.items():
        print(f"{k}: {len(render(k).encode())} bytes")
