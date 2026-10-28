"""A static drawing parked for Site Finder: ranked sites on a map. The product pages now use the dotted nature scenes
(assets/dotscene.js), so nothing calls this yet. render("ranked-sites") returns the figure, styled by section 13 of site.css."""
from __future__ import annotations

import html

CAPTION = "Illustrative example. Not real data."


def t(x, y, s, c="tx", a=None):
    anchor = f' text-anchor="{a}"' if a else ""
    return f'<text x="{x}" y="{y}" class="{c}"{anchor}>{html.escape(s)}</text>'


def panel(h=244):
    return f'<rect x="8" y="8" width="344" height="{h}" rx="14" class="p"/>'


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
