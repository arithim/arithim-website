"""The dotted-globe section, shared by the generators.

Markup only. The drawing is assets/dotmap.js, the land dots are assets/dotmap-data.json (tools/build_dotmap.py)
and the styling is the "Dotted globe" section of site.css. A page opts in with a "globe" object holding
eyebrow, heading, text and alt (content/products.json for product pages; HOME below for index.html).
"""
from __future__ import annotations

import html

CAPTION = "Illustrative. Not your data."
VERSION = "3"
HOME = {
    "eyebrow": "ACROSS EVERY SITE",
    "heading": "Built for businesses that run in many places.",
    "text": "Arithim works with regulated, multi-site businesses, where the hard part is seeing what runs where and keeping that picture current.",
    "alt": "A dotted globe turning slowly, with arcs linking cities on several continents. A decorative illustration, not real data.",
}


def render(g: dict, sid: str) -> str:
    e = html.escape
    return (
        f'<section class="ah-globe" aria-labelledby="{sid}-h"><div class="ah-globe-in">'
        f'<div class="ah-globe-copy"><div class="ah-globe-eyebrow">{e(g["eyebrow"])}</div>'
        f'<h2 class="ah-globe-h" id="{sid}-h">{e(g["heading"])}</h2><p class="ah-globe-p">{e(g["text"])}</p></div>'
        f'<figure class="ah-globe-fig"><canvas class="ah-globe-cv" data-dotmap data-src="/assets/dotmap-data.json?v={VERSION}" role="img" aria-label="{e(g["alt"], quote=True)}">{e(g["alt"])}</canvas>'
        f'<figcaption class="ah-globe-cap">{CAPTION}</figcaption></figure>'
        f'</div></section><script src="/assets/dotmap.js?v={VERSION}" defer></script>'
    )
