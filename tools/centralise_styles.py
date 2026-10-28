#!/usr/bin/env python3
"""Centralise the site's inline styles.

Two jobs, both safe to run again:

1. Colours, fonts and the pill radius that appear in inline style="" attributes are replaced by
   design tokens (var(--ah-...)). The tokens live in the managed block at the top of site.css, so
   changing the look of the whole site means changing that block.
2. Whole inline style strings that repeat are moved into classes. The classes live in the managed
   block at the end of site.css. The selector is doubled (.ah-x.ah-x) so a class beats the same rules
   that an inline style used to beat.

Pages built from sources (insight-*.html, product-site-finder.html) are skipped: change their
template or build script and rebuild. Partials in tools/partials and the insight template are
converted at the source, then `python3 tools/build_insights.py` restamps the pages.

  python3 tools/centralise_styles.py            report only
  python3 tools/centralise_styles.py --write    rewrite pages, partials, template and site.css
  python3 tools/centralise_styles.py --lint     exit 1 if a page still repeats an inline style or
                                                 holds a raw token colour in an inline style
"""
from __future__ import annotations

import collections
import glob
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_CSS = ROOT / "site.css"
MIN_REPEATS = 1  # every inline style that can be a class becomes one, so site.css is the only source of design

REGISTRY_FILE = ROOT / "tools" / "style_classes.json"  # canonical style -> class name; append only, so names stay stable
PRODUCTS_JSON = ROOT / "content" / "products.json"


def generated_names() -> set:
    names = {"product-site-finder.html"}
    if PRODUCTS_JSON.exists():
        names |= {f"product-{p['slug']}.html" for p in json.loads(PRODUCTS_JSON.read_text(encoding="utf-8"))}
    return names


class _Generated:
    def match(self, name: str) -> bool:
        return name.startswith("insight-") or name in generated_names()


GENERATED = _Generated()
PARTIALS = sorted((ROOT / "tools" / "partials").glob("*.html"))
TEMPLATES = [ROOT / "tools" / "templates" / "insight.html"]

# ---- tokens -------------------------------------------------------------------------------------
HEX_TOKENS = {
    "#070C16": "ink", "#060A12": "ink-deep", "#0A101C": "band", "#0B1220": "card", "#0C1424": "card-2",
    "#F5F1E8": "cream", "#AEB8C6": "text-2", "#9AA6B6": "text-3", "#8794A6": "text-4", "#7C8AA0": "text-5",
    "#556074": "text-6", "#3A4557": "rule-faint", "#E8A13C": "amber", "#F6CE8C": "amber-light",
    "#D8C3A0": "sand", "#7E9B87": "sage", "#8FB29B": "sage-light", "#3B6FD4": "blue", "#AEC2E0": "blue-light",
    "#C6CEDA": "text-1", "#0A1526": "on-accent", "#A9C8B3": "sage-text", "#0F1828": "surface-2", "#131D30": "surface-3", "#0B1320": "surface-4",
}
RGB_BASES = {(245, 241, 232): "cream", (232, 161, 60): "amber", (7, 12, 22): "ink", (126, 155, 135): "sage", (59, 111, 212): "blue"}
FONT_TOKENS = {
    "'JetBrains Mono',monospace": "font-mono",
    "'Schibsted Grotesk',sans-serif": "font-display",
    "'Space Grotesk',sans-serif": "font-mark",
    "'Hanken Grotesk',sans-serif": "font-body",
}
RADIUS_TOKENS = {"999px": "r-pill"}

RGBA_RX = re.compile(r"rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0?\.\d+|1|0)\s*\)")
HEX_RX = re.compile(r"#[0-9A-Fa-f]{6}\b")

# Readable names for the commonest patterns. Everything else is named ah-<hash>.
NAMES = {
    "position:relative;padding:9px 15px;font-size:15px;color:#9AA6B6;transition:color 0.2s;": "ah-nav-link",
    "position:relative;padding:9px 15px;font-size:15px;color:#F5F1E8;": "ah-nav-link-on",
    "position:relative;display:inline-block;padding:1.5px;border-radius:999px;overflow:hidden;": "ah-btn-ring",
    "position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 0.4s;": "ah-glow-layer",
    "position:absolute;inset:0;opacity:0;transition:opacity 0.3s;pointer-events:none;": "ah-glow-layer-fast",
    "display:inline-flex;align-items:baseline;gap:3px;": "ah-mark",
    "max-width:1200px;margin:0 auto;padding:18px 40px;display:flex;align-items:center;justify-content:space-between;": "ah-header-in",
    "font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:22px;letter-spacing:-0.01em;color:#F5F1E8;": "ah-wordmark",
    "font-family:'JetBrains Mono',monospace;font-size:12px;color:#9AA6B6;": "ah-wordmark-sub",
    "position:relative;display:flex;align-items:center;gap:2px;": "ah-nav",
    "background:#070C16;color:#F5F1E8;min-height:100vh;": "ah-page",
    "background:#060A12;border-top:1px solid rgba(245,241,232,0.06);": "ah-footer",
    "position:relative;overflow:hidden;": "ah-clip",
    "color:#E8A13C;": "ah-amber",
    "color:#3A4557;": "ah-rule",
}


def canon(value: str) -> str:
    decls = []
    for d in value.split(";"):
        d = d.strip()
        if not d:
            continue
        if ":" not in d:
            return ""  # not a plain declaration list; leave the attribute alone
        k, v = d.split(":", 1)
        decls.append(f"{k.strip()}:{v.strip()}")
    return ";".join(decls) + ";" if decls else ""


def tokenise(value: str) -> str:
    """Swap exact colour, font and pill-radius literals for var(--ah-...)."""
    def rgba(m):
        r, g, b, a = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
        base = RGB_BASES.get((r, g, b))
        alpha = round(float(a) * 100)
        if base is None or abs(float(a) * 100 - alpha) > 1e-9 or not 0 < alpha < 100:
            return m.group(0)
        return f"var(--ah-{base}-{alpha:02d})"
    out = RGBA_RX.sub(rgba, value)
    out = HEX_RX.sub(lambda m: f"var(--ah-{HEX_TOKENS[m.group(0).upper()]})" if m.group(0).upper() in HEX_TOKENS else m.group(0), out)
    out = out.replace("rgba(", "rgba(")  # no-op, keeps intent obvious
    return out


def tokenise_decl(decl: str) -> str:
    k, v = decl.split(":", 1)
    k = k.strip()
    v = v.strip()
    if k == "font-family" and v in FONT_TOKENS:
        return f"{k}:var(--ah-{FONT_TOKENS[v]})"
    if k == "border-radius" and v in RADIUS_TOKENS:
        return f"{k}:var(--ah-{RADIUS_TOKENS[v]})"
    return f"{k}:{tokenise(v)}"


def tokenise_value(value: str) -> str:
    return ";".join(tokenise_decl(d) for d in value.split(";") if d.strip()) + (";" if value.strip().endswith(";") else "")


# ---- html scanning ------------------------------------------------------------------------------
PROTECTED = re.compile(r"<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->", re.S | re.I)
TAG_RX = re.compile(r"<([a-zA-Z][\w:-]*)((?:\s+[^\s=>/\"']+(?:\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s>\"']+))?)*)\s*(/?)>")
STYLE_ATTR = re.compile(r"\sstyle=\"([^\"]*)\"")
CLASS_ATTR = re.compile(r"(\sclass=\")([^\"]*)(\")")
PARTIAL_BLOCK = re.compile(r"<!-- partial:(\w+)[^>]*?-->.*?<!-- /partial:\1 -->", re.S)
GENERATED_REGION = re.compile(r"<!-- (insights|research):start -->.*?<!-- \1:end -->", re.S)  # written by tools/build_insights.py


def convertible(value: str) -> bool:
    return bool(canon(value)) and not any(s in value for s in ("{{", "}}", "@@", "url(", "{", "}"))


def walk(text: str, fn):
    """Apply fn(tag_match) to every tag outside script, style and comments."""
    out, pos = [], 0
    for m in PROTECTED.finditer(text):
        out.append(TAG_RX.sub(fn, text[pos:m.start()]))
        out.append(m.group(0))
        pos = m.end()
    out.append(TAG_RX.sub(fn, text[pos:]))
    return "".join(out)


def styles_in(text: str):
    found = []
    def grab(m):
        s = STYLE_ATTR.search(m.group(0))
        if s and convertible(s.group(1)):
            found.append(canon(s.group(1)))
        return m.group(0)
    walk(text, grab)
    return found


def name_for(c: str) -> str:
    return NAMES.get(c) or "ah-" + hashlib.sha1(c.encode()).hexdigest()[:6]


def page_files():
    return [p for p in sorted(ROOT.glob("*.html")) if not GENERATED.match(p.name)]


def load_registry() -> dict:
    return json.loads(REGISTRY_FILE.read_text(encoding="utf-8")) if REGISTRY_FILE.exists() else {}


def generator_pages() -> list[str]:
    """Raw output of tools/build_product_pages.py, so its inline styles join the registry."""
    if not PRODUCTS_JSON.exists():
        return []
    sys.path.insert(0, str(ROOT / "tools"))
    import build_product_pages as bp
    products = json.loads(PRODUCTS_JSON.read_text(encoding="utf-8"))
    return [bp.render(p, products) for p in products]


def build_registry():
    registry = load_registry()
    counts = collections.Counter()
    for p in page_files():
        text = PARTIAL_BLOCK.sub("", p.read_text(encoding="utf-8"))
        counts.update(styles_in(text))
    for c, n in counts.items():
        if n >= MIN_REPEATS:
            registry.setdefault(c, name_for(c))
    for p in [*PARTIALS, *TEMPLATES]:
        for c in styles_in(p.read_text(encoding="utf-8")):
            registry.setdefault(c, name_for(c))
    for p in page_files():  # list cards that tools/build_insights.py writes into insights.html and research.html
        for region in GENERATED_REGION.finditer(p.read_text(encoding="utf-8")):
            for c in styles_in(region.group(0)):
                registry.setdefault(c, name_for(c))
    for p in sorted(ROOT.glob("*.html")):  # pages built by tools/build_insights.py and tools/build_site_finder.py
        if GENERATED.match(p.name):
            for s in styles_in(PARTIAL_BLOCK.sub("", p.read_text(encoding="utf-8"))):
                registry.setdefault(s, name_for(s))
    for page in generator_pages():
        for c in styles_in(page):
            registry.setdefault(c, name_for(c))
    for c, n in NAMES.items():  # strings written by Python (the nav in build_insights.py) and named by hand
        registry.setdefault(c, n)
    names = collections.Counter(registry.values())
    clash = [n for n, k in names.items() if k > 1]
    if clash:
        raise SystemExit(f"class name clash: {clash}")
    return registry, counts


def rewrite(text: str, registry: dict) -> str:
    def fix(m):
        tag = m.group(0)
        s = STYLE_ATTR.search(tag)
        if not s:
            return tag
        value = s.group(1)
        if not convertible(value):
            return tag
        c = canon(value)
        cls = registry.get(c)
        if cls is None:
            return tag[:s.start()] + f' style="{tokenise_value(value)}"' + tag[s.end():]
        without = tag[:s.start()] + tag[s.end():]
        cm = CLASS_ATTR.search(without)
        if cm:
            return without[:cm.start()] + cm.group(1) + cm.group(2) + " " + cls + cm.group(3) + without[cm.end():]
        return tag[:s.start()] + f' class="{cls}"' + tag[s.end():]
    return walk(text, fix)


# ---- site.css managed blocks --------------------------------------------------------------------
TOK_START, TOK_END = "/* ah-tokens:start (managed by tools/centralise_styles.py; edit values here to restyle the site) */", "/* ah-tokens:end */"
THEMES_START, THEMES_END = "/* ah-themes:start", "/* ah-themes:end */"  # written by tools/build_themes.py
CLS_START, CLS_END = "/* ah-classes:start (generated by tools/centralise_styles.py from inline styles; rename or edit freely, the script only adds) */", "/* ah-classes:end */"


def token_block(used_rgba: set) -> str:
    lines = [TOK_START, ":root {"]
    for hexv, name in HEX_TOKENS.items():
        lines.append(f"  --ah-{name}: {hexv};")
    for (r, g, b), base in RGB_BASES.items():
        for alpha in sorted(a for (bb, a) in used_rgba if bb == base):
            lines.append(f"  --ah-{base}-{alpha:02d}: rgba({r},{g},{b},{alpha / 100:g});")
    lines += ["  --ah-font-mono: 'JetBrains Mono',monospace;", "  --ah-font-display: 'Schibsted Grotesk',sans-serif;",
              "  --ah-font-mark: 'Space Grotesk',sans-serif;", "  --ah-font-body: 'Hanken Grotesk',sans-serif;", "  --ah-r-pill: 999px;", "}", TOK_END]
    return "\n".join(lines)


def used_alphas(texts) -> set:
    used = set()
    for t in texts:
        for m in re.finditer(r"var\(--ah-(cream|amber|ink|sage|blue)-(\d\d)\)", t):
            used.add((m.group(1), int(m.group(2))))
    return used


def class_block(registry: dict) -> str:
    lines = [CLS_START]
    for c, name in sorted(registry.items(), key=lambda kv: kv[1]):
        decls = ";".join(tokenise_decl(d) for d in c.rstrip(";").split(";"))
        lines.append(f".{name}.{name} {{ {decls}; }}")
    lines.append(CLS_END)
    return "\n".join(lines)


def put_block(css: str, start: str, end: str, block: str, before: str | None = None) -> str:
    rx = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if rx.search(css):
        return rx.sub(lambda _: block, css)
    if before and before in css:
        return css.replace(before, block + "\n\n" + before, 1)
    return css.rstrip("\n") + "\n\n" + block + "\n"


# ---- stylesheets ----------------------------------------------------------------------------------
CSS_FILES = ["site.css"]
URL_RX = re.compile(r"url\((?:[^()]|\([^()]*\))*\)")
FONT_RX = re.compile(r"font-family:\s*('[^']+'),\s*(monospace|sans-serif)")


def tokenise_css(text: str) -> str:
    """Swap colour and font literals in a stylesheet for tokens, leaving url(...) and the token block alone."""
    def swap(chunk: str) -> str:
        chunk = tokenise(chunk)
        def font(m):
            key = f"{m.group(1)},{m.group(2)}"
            return f"font-family:var(--ah-{FONT_TOKENS[key]})" if key in FONT_TOKENS else m.group(0)
        return FONT_RX.sub(font, chunk)
    out, pos = [], 0
    for m in URL_RX.finditer(text):
        out.append(swap(text[pos:m.start()]))
        out.append(m.group(0))
        pos = m.end()
    out.append(swap(text[pos:]))
    return "".join(out)


def tokenise_stylesheet(css: str) -> str:
    """Tokenise everything outside the two managed blocks."""
    parts, pos = [], 0
    for s, e in ((TOK_START, TOK_END), (CLS_START, CLS_END)):
        pass
    spans = []
    for s, e in ((TOK_START, TOK_END), (CLS_START, CLS_END), (THEMES_START, THEMES_END)):
        i = css.find(s)
        j = css.find(e, i) + len(e) if i >= 0 else -1
        if i >= 0 and j > i:
            spans.append((i, j))
    for i, j in sorted(spans):
        parts.append(tokenise_css(css[pos:i]))
        parts.append(css[i:j])
        pos = j
    parts.append(tokenise_css(css[pos:]))
    return "".join(parts)


def main():
    write = "--write" in sys.argv
    lint = "--lint" in sys.argv
    registry, counts = build_registry()
    targets = [*page_files(), *PARTIALS, *TEMPLATES]
    if lint:
        bad = 0
        sheets = re.compile(r'<link rel="stylesheet" href="([^"]+)"')
        for p in sorted(ROOT.glob("*.html")):
            extra = [h for h in sheets.findall(p.read_text(encoding="utf-8")) if not h.startswith("https://fonts.googleapis.com") and not h.startswith("/site.css")]
            if extra:
                bad += 1
                print(f"{p.name}: links a second stylesheet {extra}; site.css is the only stylesheet")
        for p in page_files():
            text = GENERATED_REGION.sub("", PARTIAL_BLOCK.sub("", p.read_text(encoding="utf-8")))
            dup = styles_in(text)
            raw = [m for m in re.findall(r'\sstyle="([^"]*)"', text) if convertible(m) and any(h.upper() in HEX_TOKENS for h in HEX_RX.findall(m))]
            if dup or raw:
                bad += 1
                print(f"{p.name}: {len(dup)} inline styles, {len(raw)} inline styles with raw token colours")
        print("lint ok" if not bad else f"{bad} page(s) need `python3 tools/centralise_styles.py --write`")
        sys.exit(1 if bad else 0)

    before_attrs = sum(len(STYLE_ATTR.findall(p.read_text(encoding="utf-8"))) for p in targets)
    new_texts = {}
    for p in targets:
        new_texts[p] = rewrite(p.read_text(encoding="utf-8"), registry)
    after_attrs = sum(len(STYLE_ATTR.findall(t)) for t in new_texts.values())
    css = SITE_CSS.read_text(encoding="utf-8")
    cb = class_block(registry)
    css2 = put_block(css, CLS_START, CLS_END, cb)
    css2 = tokenise_stylesheet(css2)
    extra = [(ROOT / rel).read_text(encoding="utf-8") for rel in CSS_FILES[1:] if (ROOT / rel).exists()]
    used = used_alphas([css2, cb, *[tokenise_stylesheet(x) for x in extra], *new_texts.values()])
    css2 = put_block(css2, TOK_START, TOK_END, token_block(used), before="/* ---- Base: every page ---- */")
    print(f"inline style attributes: {before_attrs} -> {after_attrs}; classes: {len(registry)}; site.css {len(css)} -> {len(css2)} bytes")
    if write:
        for p, t in new_texts.items():
            if t != p.read_text(encoding="utf-8"):
                p.write_text(t, encoding="utf-8")
        SITE_CSS.write_text(css2, encoding="utf-8")
        for rel in CSS_FILES[1:]:
            f = ROOT / rel
            if f.exists():
                f.write_text(tokenise_stylesheet(f.read_text(encoding="utf-8")), encoding="utf-8")
        REGISTRY_FILE.write_text(json.dumps(dict(sorted(registry.items(), key=lambda kv: kv[1])), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print("written")
    else:
        print("dry run; pass --write to apply")


if __name__ == "__main__":
    main()
