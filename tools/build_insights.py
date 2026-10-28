#!/usr/bin/env python3
"""Build the generated parts of arithim.com: the Insights section and the shared page partials.

Usage:
    python3 tools/build_insights.py            # regenerate everything
    python3 tools/build_insights.py --check    # exit 1 if generated files are stale

Generated outputs:
    insight-<slug>.html   one page per article (template: tools/templates/insight.html)
    insights.html         article list between <!-- insights:start --> / <!-- insights:end -->
    research.html         "Latest research" between <!-- research:start --> / <!-- research:end -->
    every *.html page     head, header and footer between <!-- partial:name --> / <!-- /partial:name -->
                          (sources in tools/partials/, see its README)
    sitemap.xml           every *.html page in the repo root

Standard library only (Python 3.11+ for tomllib).
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import math
import re
import subprocess
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content" / "insights"
TEMPLATE = ROOT / "tools" / "templates" / "insight.html"

SITE = "https://arithim.com"
DEFAULT_AUTHOR = "Tarun Bulchandani"
AUTHOR_URL = f"{SITE}/about.html"
AUTHOR_JOB_TITLE = "Founder, Arithim"
WORDS_PER_MINUTE = 230
MORE_INSIGHTS_COUNT = 3
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

REQUIRED_FIELDS = ("title", "slug", "date", "category", "breadcrumb", "description", "lede", "cta")
OPTIONAL_FIELDS = (
    "updated", "read_minutes", "author", "keywords", "research", "faq", "sources",
    "citation", "mentions", "about", "card_label", "summary", "footnote",
)

# Pages that get priority 0.8 in the sitemap. index.html is 1.0, everything else 0.6.
HUB_PAGES = {"about.html", "case-studies.html", "contact.html", "insights.html", "product-assay.html", "product-site-finder.html", "products.html", "research.html", "services.html", "technical-sales-guide.html"}
SITEMAP_SKIP = {"404.html"}

# Header nav, in order. The header partial renders these; the page's "active" param highlights one.
NAV_LINKS = (
    ("products.html", "Products"),
    ("services.html", "Services"),
    ("case-studies.html", "Case Studies"),
    ("research.html", "Research"),
    ("insights.html", "Insights"),
    ("about.html", "About"),
)
HEADER_CTAS = ("talk", "contact", "demo")


# ---------------------------------------------------------------------------
# Markdown subset
# ---------------------------------------------------------------------------

_ESC_CHARS = "\\*[]()|{}"
_ESC_MAP = {c: chr(0xE000 + i) for i, c in enumerate(_ESC_CHARS)}
_UNESC_MAP = {v: k for k, v in _ESC_MAP.items()}
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
_CODE_RE = re.compile(r"`([^`]+)`")
_BOLD_RE = re.compile(r"\*\*(?=\S)(.+?)(?<=\S)\*\*")
_ITALIC_RE = re.compile(r"(?<![*\w])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![*\w])")
_SAFE_URL_RE = re.compile(r"^(https?://|mailto:|/|#|\./|\.\./|[A-Za-z0-9_\-][A-Za-z0-9_\-./]*(\?.*)?(#.*)?$)")


def _protect(text: str) -> str:
    return re.sub(r"\\([\\*\[\]()|{}])", lambda m: _ESC_MAP[m.group(1)], text)


def _restore(text: str) -> str:
    return "".join(_UNESC_MAP.get(c, c) for c in text)


def _fmt(text: str) -> str:
    """Escape plain text, then apply bold/italic. Input must already be protected."""
    out = html.escape(text, quote=False)
    # The page runtime treats {{ ... }} as a template expression, so never emit it raw.
    out = out.replace("{{", "&#123;&#123;")
    out = _BOLD_RE.sub(r"<strong>\1</strong>", out)
    out = _ITALIC_RE.sub(r"<em>\1</em>", out)
    return out


def is_external(url: str) -> bool:
    return bool(re.match(r"^(https?:)?//", url))


def inline(text: str) -> str:
    """Render inline Markdown (code, bold, italic, links) to escaped HTML."""
    text = _protect(text)
    codes: list[str] = []

    def stash_code(m: re.Match) -> str:
        codes.append(m.group(1))
        return f"\ue100{len(codes) - 1}\ue101"

    text = re.sub(r"[\ue100\ue101]", "", text)
    text = _CODE_RE.sub(stash_code, text)
    links: list[tuple[str, str]] = []

    def stash(m: re.Match) -> str:
        links.append((m.group(1), m.group(2)))
        return f"{len(links) - 1}"

    text = re.sub(r"[]", "", text)
    text = _LINK_RE.sub(stash, text)
    out = _fmt(text)

    def build_link(m: re.Match) -> str:
        label, url = links[int(m.group(1))]
        url = _restore(url)
        if not _SAFE_URL_RE.match(url):
            raise ValueError(f"unsafe or malformed link URL: {url!r}")
        rel = ' rel="noopener"' if is_external(url) else ""
        return f'<a href="{html.escape(url, quote=True)}"{rel}>{_fmt(label)}</a>'

    out = re.sub(r"(\d+)", build_link, out)
    out = re.sub(
        "\ue100(\\d+)\ue101",
        lambda m: "<code>" + html.escape(_restore(codes[int(m.group(1))]), quote=False).replace("{{", "&#123;&#123;") + "</code>",
        out,
    )
    return _restore(out)


def plain_text(md: str) -> str:
    """Inline Markdown to plain text (for JSON-LD answers)."""
    rendered = inline(md)
    return html.unescape(re.sub(r"<[^>]+>", "", rendered))


def _split_row(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|") and not line.endswith("\\|"):
        line = line[:-1]
    cells, cur, i = [], "", 0
    while i < len(line):
        if line[i] == "\\" and i + 1 < len(line) and line[i + 1] == "|":
            cur += "\\|"
            i += 2
        elif line[i] == "|":
            cells.append(cur.strip())
            cur = ""
            i += 1
        else:
            cur += line[i]
            i += 1
    cells.append(cur.strip())
    return cells


_SEP_RE = re.compile(r"^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$")
_UL_RE = re.compile(r"^- +(.*)$")
_OL_RE = re.compile(r"^\d+\. +(.*)$")
_NOTE_RE = re.compile(r"\s*\{\.note\}\s*$")

PULL_QUOTE = (
    '<div style="border-left:2px solid #E8A13C;padding:8px 0 8px 24px;margin:36px 0;">'
    '<p style="font-family:\'Schibsted Grotesk\',sans-serif;font-weight:500;font-size:24px;'
    'line-height:1.35;color:#F5F1E8;margin:0;">{}</p></div>'
)


def render_markdown(md: str) -> str:
    """Convert the restricted Markdown subset to HTML.

    Supported: ##/### headings, paragraphs, '- ' lists, '1. ' lists, '> ' pull quotes,
    pipe tables, **bold**, *italic*, [links](url), and a trailing {.note} paragraph marker.
    Raw HTML is escaped, never passed through.
    """
    lines = md.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("### "):
            out.append(f"<h3>{inline(line[4:].strip())}</h3>")
            i += 1
        elif line.startswith("## "):
            out.append(f"<h2>{inline(line[3:].strip())}</h2>")
            i += 1
        elif line.startswith("#"):
            raise ValueError(f"unsupported heading (use ## or ###): {line!r}")
        elif _UL_RE.match(line) or _OL_RE.match(line):
            ordered = bool(_OL_RE.match(line))
            pat = _OL_RE if ordered else _UL_RE
            items: list[str] = []
            while i < n and lines[i].strip():
                m = pat.match(lines[i])
                if m:
                    items.append(m.group(1).strip())
                elif _UL_RE.match(lines[i]) or _OL_RE.match(lines[i]):
                    break  # a different kind of list starts here
                elif items:
                    items[-1] += " " + lines[i].strip()
                else:
                    break
                i += 1
            tag = "ol" if ordered else "ul"
            lis = "".join(f"<li>{inline(t)}</li>" for t in items)
            out.append(f"<{tag}>{lis}</{tag}>")
        elif line.lstrip().startswith("|"):
            block = []
            while i < n and lines[i].lstrip().startswith("|"):
                block.append(lines[i])
                i += 1
            if len(block) < 2 or not _SEP_RE.match(block[1]):
                raise ValueError("table needs a header row followed by a |---| separator row")
            head = _split_row(block[0])
            rows = [_split_row(r) for r in block[2:]]
            width = len(head)
            ths = "".join(f"<th>{inline(c)}</th>" for c in head)
            trs = []
            for r in rows:
                r = (r + [""] * width)[:width]
                trs.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
            out.append(
                '<div class="ai-table"><table>\n'
                f"<thead><tr>{ths}</tr></thead>\n<tbody>\n" + "\n".join(trs) + "\n</tbody>\n</table></div>"
            )
        elif line.startswith(">"):
            parts = []
            while i < n and lines[i].startswith(">"):
                parts.append(lines[i][1:].strip())
                i += 1
            out.append(PULL_QUOTE.format(inline(" ".join(parts))))
        else:
            parts = []
            while i < n and lines[i].strip():
                parts.append(lines[i].strip())
                i += 1
            text = " ".join(parts)
            note = bool(_NOTE_RE.search(text))
            if note:
                text = _NOTE_RE.sub("", text)
            out.append(f'<p class="ai-note">{inline(text)}</p>' if note else f"<p>{inline(text)}</p>")
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Content loading
# ---------------------------------------------------------------------------

def parse_front_matter(text: str) -> tuple[dict, str]:
    """Split '+++\\n<toml>\\n+++\\n<body>' into (meta, body)."""
    text = text.replace("\r\n", "\n")
    m = re.match(r"\A\+\+\+[ \t]*\n(.*?)\n\+\+\+[ \t]*(?:\n|\Z)(.*)\Z", text, re.S)
    if not m:
        raise ValueError("file must start with a +++ TOML front matter block closed by a +++ line")
    return tomllib.loads(m.group(1)), m.group(2).strip("\n")


def _validate(meta: dict, path: Path) -> None:
    missing = [k for k in REQUIRED_FIELDS if not meta.get(k)]
    if missing:
        raise ValueError(f"{path.name}: missing front matter field(s): {', '.join(missing)}")
    unknown = sorted(set(meta) - set(REQUIRED_FIELDS) - set(OPTIONAL_FIELDS))
    if unknown:
        raise ValueError(f"{path.name}: unknown front matter field(s): {', '.join(unknown)}")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", str(meta["slug"])):
        raise ValueError(f"{path.name}: slug must be lowercase letters, digits and hyphens")
    for key in ("date", "updated"):
        if key in meta and not isinstance(meta[key], dt.date):
            raise ValueError(f"{path.name}: {key} must be a TOML date, e.g. 2026-10-20 (unquoted)")
    for i, q in enumerate(meta.get("faq", [])):
        if not q.get("q") or not q.get("a"):
            raise ValueError(f"{path.name}: faq entry {i + 1} needs q and a")
    for i, s in enumerate(meta.get("sources", [])):
        if not s.get("text"):
            raise ValueError(f"{path.name}: sources entry {i + 1} needs text")


def count_words(*chunks: str) -> int:
    return sum(len(re.sub(r"<[^>]+>", " ", c).split()) for c in chunks)


def load_article(path: Path) -> dict:
    meta, body_md = parse_front_matter(path.read_text(encoding="utf-8"))
    _validate(meta, path)
    a = dict(meta)
    if a["slug"] != path.stem:
        raise ValueError(f"{path.name}: slug {a['slug']!r} must match the file name")
    a["body_md"] = body_md
    a["author"] = a.get("author") or DEFAULT_AUTHOR
    a["research"] = bool(a.get("research", False))
    a["modified"] = a.get("updated") or a["date"]
    a["body_html"] = render_markdown(body_md)
    if not a.get("read_minutes"):
        text = " ".join([inline(a["lede"]), a["body_html"]] +
                        [inline(q["q"]) + " " + inline(q["a"]) for q in a.get("faq", [])])
        a["read_minutes"] = max(1, math.ceil(count_words(text) / WORDS_PER_MINUTE))
    a["file"] = f"insight-{a['slug']}.html"
    a["url"] = f"{SITE}/{a['file']}"
    return a


def load_articles(content_dir: Path = CONTENT_DIR) -> list[dict]:
    articles = [load_article(p) for p in sorted(content_dir.glob("*.md"))]
    slugs = [a["slug"] for a in articles]
    dupes = {s for s in slugs if slugs.count(s) > 1}
    if dupes:
        raise ValueError(f"duplicate slug(s): {', '.join(sorted(dupes))}")
    return sorted(articles, key=lambda a: (a["date"], a["slug"]), reverse=True)


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

def fmt_date(d: dt.date) -> str:
    return f"{d.day:02d} {MONTHS[d.month - 1]} {d.year}"


def attr(s: str) -> str:
    return html.escape(str(s), quote=True)


def esc(s: str) -> str:
    return html.escape(str(s), quote=False)


def card_label(a: dict) -> str:
    return a.get("card_label") or a["category"]


def card_summary(a: dict) -> str:
    return a.get("summary") or a["description"]


def more_insights(article: dict, articles: list[dict]) -> list[dict]:
    others = [a for a in articles if a["slug"] != article["slug"]]
    # Same category first, then newest first (articles is already newest first).
    others.sort(key=lambda a: a["category"] != article["category"])
    return others[:MORE_INSIGHTS_COUNT]


def render_more_insights(items: list[dict]) -> str:
    rows = []
    for i, a in enumerate(items):
        border = "border-top:1px solid rgba(245,241,232,0.1);"
        if i == len(items) - 1:
            border += "border-bottom:1px solid rgba(245,241,232,0.1);"
        rows.append(
            f'    <a href="{attr(a["file"])}" style="display:block;padding:22px 0;{border}" style-hover="opacity:0.7;">'
            f'<h3 style="font-family:\'Schibsted Grotesk\',sans-serif;font-weight:600;font-size:22px;letter-spacing:-0.02em;margin:0 0 6px;color:#F5F1E8;">{esc(a["title"])}</h3>'
            f'<span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#7C8AA0;">{esc(card_label(a))} · {fmt_date(a["date"])}</span></a>'
        )
    return "\n".join(rows)


def render_faq(a: dict) -> str:
    if not a.get("faq"):
        return ""
    parts = ["    <h2>Common questions</h2>"]
    for q in a["faq"]:
        parts.append(f"    <h3>{inline(q['q'])}</h3>\n    <p>{inline(q['a'])}</p>")
    return "\n".join(parts) + "\n"


def render_sources(a: dict) -> str:
    srcs = a.get("sources") or []
    out = ""
    if srcs:
        lis = []
        for s in srcs:
            text = inline(s["text"])
            if s.get("url"):
                rel = ' rel="noopener"' if is_external(s["url"]) else ""
                text = f'<a href="{attr(s["url"])}"{rel}>{text}</a>'
            if s.get("note"):
                text += " " + inline(s["note"])
            lis.append(f"      <li>{text}</li>")
        out += ('    <h2>Sources</h2>\n    <ul class="ai-note" style="font-size:13px;">\n'
                + "\n".join(lis) + "\n    </ul>\n")
    if a.get("footnote"):
        out += f'    <p class="ai-note">{inline(a["footnote"])}</p>\n'
    return out


def build_jsonld(a: dict) -> dict:
    author: dict = {"@type": "Person", "name": a["author"]}
    if a["author"] == DEFAULT_AUTHOR:
        author.update({"url": AUTHOR_URL, "jobTitle": AUTHOR_JOB_TITLE})
    article: dict = {
        "@type": "Article",
        "@id": f"{a['url']}#article",
        "headline": a["title"],
        "description": a["description"],
        "datePublished": a["date"].isoformat(),
        "dateModified": a["modified"].isoformat(),
        "inLanguage": "en",
        "mainEntityOfPage": a["url"],
        "image": f"{SITE}/assets/og-image.png",
        "articleSection": a["breadcrumb"],
    }
    if a.get("keywords"):
        article["keywords"] = list(a["keywords"])
    if a.get("about"):
        article["about"] = [{"@type": "Thing", "name": n} for n in a["about"]]
    if a.get("mentions"):
        article["mentions"] = [{"@type": "Organization", "name": m["name"], "url": m["url"]} for m in a["mentions"]]
    c = a.get("citation")
    if c:
        cite: dict = {"@type": "Report", "name": c["name"]}
        if c.get("publisher"):
            cite["publisher"] = {"@type": "Organization", "name": c["publisher"]}
        if c.get("date"):
            cite["datePublished"] = c["date"].isoformat() if isinstance(c["date"], dt.date) else str(c["date"])
        if c.get("identifier"):
            cite["identifier"] = c["identifier"]
        if c.get("url"):
            cite["url"] = c["url"]
        article["citation"] = cite
    article["author"] = author
    article["publisher"] = {
        "@type": "Organization", "name": "Arithim Ltd", "url": f"{SITE}/",
        "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/icon-512.png"},
    }
    graph = [article]
    if a.get("faq"):
        graph.append({
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": plain_text(q["q"]),
                 "acceptedAnswer": {"@type": "Answer", "text": q.get("schema_a") or plain_text(q["a"])}}
                for q in a["faq"]
            ],
        })
    graph.append({
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Insights", "item": f"{SITE}/insights.html"},
            {"@type": "ListItem", "position": 3, "name": a["title"], "item": a["url"]},
        ],
    })
    return {"@context": "https://schema.org", "@graph": graph}


def jsonld_script(data: dict) -> str:
    text = json.dumps(data, indent=2, ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/ld+json">\n{text}\n</script>'


def fill(template: str, values: dict[str, str]) -> str:
    """Single-pass @@key@@ substitution so substituted text is never re-scanned."""
    def sub(m: re.Match) -> str:
        key = m.group(1)
        if key not in values:
            raise KeyError(f"template placeholder @@{key}@@ has no value")
        return values[key]
    return re.sub(r"@@([a-z_]+)@@", sub, template)


def render_article(a: dict, articles: list[dict], template: str | None = None) -> str:
    template = template if template is not None else TEMPLATE.read_text(encoding="utf-8")
    extra_meta = []
    if a.get("updated"):
        extra_meta.append(f'<meta property="article:modified_time" content="{a["updated"].isoformat()}">')
    extra_meta.append(f'<meta property="article:section" content="{attr(a["breadcrumb"])}">')
    values = {
        "title": esc(a["title"]),
        "title_attr": attr(a["title"]),
        "description_attr": attr(a["description"]),
        "url": attr(a["url"]),
        "published": a["date"].isoformat(),
        "extra_meta": "\n".join(extra_meta),
        "jsonld": jsonld_script(build_jsonld(a)),
        "breadcrumb": esc(a["breadcrumb"]),
        "category": esc(a["category"]),
        "date_label": fmt_date(a["date"]),
        "read_minutes": str(a["read_minutes"]),
        "author_label": esc(a["author"].upper()),
        "lede": inline(a["lede"]),
        "body": "\n".join("    " + ln if ln else ln for ln in a["body_html"].split("\n")),
        "faq": render_faq(a),
        "sources": render_sources(a),
        "more_insights": render_more_insights(more_insights(a, articles)),
        "cta": esc(a["cta"]),
    }
    return fill(template, values)


def render_insights_list(articles: list[dict]) -> str:
    rows = []
    for i, a in enumerate(articles):
        border = "border-top:1px solid rgba(245,241,232,0.1);"
        if i == len(articles) - 1:
            border += "border-bottom:1px solid rgba(245,241,232,0.1);"
        rows.append(
            f'    <a href="{attr(a["file"])}" class="r-ga" style="display:grid;grid-template-columns:1fr auto;gap:24px;align-items:baseline;padding:34px 0;{border}" style-hover="opacity:0.7;">\n'
            f'      <div><h2 class="r-f5" style="font-family:\'Schibsted Grotesk\',sans-serif;font-weight:600;font-size:30px;letter-spacing:-0.025em;margin:0 0 10px;color:#F5F1E8;">{esc(a["title"])}</h2>'
            f'<p style="font-size:16px;line-height:1.6;color:#8794A6;margin:0;max-width:640px;">{esc(card_summary(a))}</p></div>\n'
            f'      <span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#7C8AA0;white-space:nowrap;text-align:right;">{esc(card_label(a))}<br>{fmt_date(a["date"])}</span>\n'
            f'    </a>'
        )
    return "\n".join(rows)


def render_research_section(articles: list[dict]) -> str:
    items = [a for a in articles if a["research"]]
    if not items:
        return ""
    cards = []
    for a in items:
        cards.append(
            f'      <a href="{attr(a["file"])}" style="display:block;background:#0B1220;border:1px solid rgba(245,241,232,0.08);border-radius:16px;padding:30px;" style-hover="opacity:0.8;">'
            f'<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;letter-spacing:0.08em;color:#7C8AA0;margin-bottom:14px;">{esc(card_label(a))} · {fmt_date(a["date"])}</div>'
            f'<h3 style="font-family:\'Schibsted Grotesk\',sans-serif;font-weight:600;font-size:24px;letter-spacing:-0.02em;margin:0 0 10px;color:#F5F1E8;">{esc(a["title"])}</h3>'
            f'<p style="font-size:14.5px;line-height:1.6;color:#8794A6;margin:0 0 18px;max-width:700px;">{esc(card_summary(a))}</p>'
            f'<span style="font-size:14px;font-weight:600;color:#E8A13C;">Read the research →</span></a>'
        )
    return (
        '  <div class="r-gut" style="max-width:1000px;margin:0 auto;padding:40px 40px 0;">\n'
        '    <div style="font-family:\'JetBrains Mono\',monospace;font-size:12px;letter-spacing:0.14em;color:#E8A13C;margin-bottom:26px;">LATEST RESEARCH</div>\n'
        '    <div style="display:grid;gap:18px;">\n' + "\n".join(cards) + "\n    </div>\n  </div>"
    )


def replace_between(text: str, name: str, content: str) -> str:
    """Replace everything between <!-- name:start --> and <!-- name:end -->."""
    pat = re.compile(rf"([ \t]*<!-- {name}:start -->)(.*?)([ \t]*<!-- {name}:end -->)", re.S)
    if not pat.search(text):
        raise ValueError(f"markers <!-- {name}:start --> / <!-- {name}:end --> not found")
    body = f"\n{content}\n" if content else "\n"
    return pat.sub(lambda m: m.group(1) + body + m.group(3), text, count=1)


# ---------------------------------------------------------------------------
# Shared partials (head, header, footer)
# ---------------------------------------------------------------------------

_PARTIAL_RE = re.compile(r"(<!-- partial:([a-z]+)(?: (\{.*?\}))? -->)(.*?)(<!-- /partial:\2 -->)", re.S)
_NAV_LINK = '        <a href="{href}" class="ah-nav-link">{label}</a>'
_NAV_LINK_ACTIVE = '        <a href="{href}" class="ah-nav-link-on" aria-current="page">{label}</a>'


def render_partial(name: str, params: dict, partials_dir: Path) -> str:
    def read(n: str) -> str:
        return (partials_dir / f"{n}.html").read_text(encoding="utf-8").rstrip("\n")

    if name == "head":
        return read("head")
    if name == "header":
        active = params.get("active", "")
        if active and active not in {href for href, _ in NAV_LINKS}:
            raise ValueError(f"header active link {active!r} is not in NAV_LINKS")
        cta = params.get("cta", "talk")
        if cta not in HEADER_CTAS:
            raise ValueError(f"header cta {cta!r} must be one of {', '.join(HEADER_CTAS)}")
        links = "\n".join((_NAV_LINK_ACTIVE if href == active else _NAV_LINK).format(href=href, label=label) for href, label in NAV_LINKS)
        return fill(read("header"), {"label": esc(params["label"]), "links": links, "cta": read(f"cta-{cta}")})
    if name == "footer":
        return fill(read("footer"), {
            "back_href": attr(params["back_href"]),
            "back_text": esc(params["back_text"]),
            "email": esc(params.get("email", "hello@arithim.com").upper()),
        })
    raise ValueError(f"unknown partial {name!r}")


def stamp_partials(text: str, partials_dir: Path) -> str:
    """Re-render every <!-- partial:name {params} --> ... <!-- /partial:name --> block in a page."""
    def sub(m: re.Match) -> str:
        params = json.loads(m.group(3)) if m.group(3) else {}
        return m.group(1) + "\n" + render_partial(m.group(2), params, partials_dir) + "\n" + m.group(5)
    return _PARTIAL_RE.sub(sub, text)


# ---------------------------------------------------------------------------
# Sitemap
# ---------------------------------------------------------------------------

def git_last_date(path: Path) -> str | None:
    try:
        res = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", path.name],
            cwd=path.parent, capture_output=True, text=True, check=False,
        )
    except OSError:
        return None
    out = res.stdout.strip()
    return out if res.returncode == 0 and out else None


def build_sitemap(articles: list[dict], root: Path = ROOT, today: dt.date | None = None) -> str:
    today = today or dt.date.today()
    by_file = {a["file"]: a for a in articles}
    newest_any = max((a["modified"] for a in articles), default=None)
    newest_research = max((a["modified"] for a in articles if a["research"]), default=None)
    entries = []
    for page in sorted(root.glob("*.html")):
        name = page.name
        if name in SITEMAP_SKIP:
            continue
        if name in by_file:
            lastmod = by_file[name]["modified"].isoformat()
        else:
            candidates = [git_last_date(page) or today.isoformat()]
            if name == "insights.html" and newest_any:
                candidates.append(newest_any.isoformat())
            if name == "research.html" and newest_research:
                candidates.append(newest_research.isoformat())
            lastmod = max(candidates)
        loc = f"{SITE}/" if name == "index.html" else f"{SITE}/{name}"
        priority = "1.0" if name == "index.html" else "0.8" if name in HUB_PAGES else "0.6"
        entries.append((loc, lastmod, priority))
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod, priority in sorted(entries, key=lambda e: e[0].replace(f"{SITE}/", "", 1) or "index.html"):
        lines.append(f"  <url><loc>{html.escape(loc)}</loc><lastmod>{lastmod}</lastmod><priority>{priority}</priority></url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


_LASTMOD_RE = re.compile(r"(<loc>[^<]*</loc>)<lastmod>[^<]*</lastmod>")


def _sitemap_for_check(xml: str, article_files: set[str]) -> str:
    """Drop lastmod for git-derived entries; those shift when a branch is rebased or squashed."""
    def sub(m: re.Match) -> str:
        loc = m.group(1)
        return m.group(0) if any(loc.endswith(f"/{f}</loc>") for f in article_files) else loc
    return _LASTMOD_RE.sub(sub, xml)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def generate(root: Path = ROOT, articles: list[dict] | None = None) -> dict[Path, str]:
    """Return {path: new_content} for every generated file."""
    articles = articles if articles is not None else load_articles(root / "content" / "insights")
    template = (root / "tools" / "templates" / "insight.html").read_text(encoding="utf-8")
    outputs: dict[Path, str] = {}
    for a in articles:
        outputs[root / a["file"]] = render_article(a, articles, template)
    insights_path = root / "insights.html"
    outputs[insights_path] = replace_between(insights_path.read_text(encoding="utf-8"), "insights", render_insights_list(articles))
    research_path = root / "research.html"
    outputs[research_path] = replace_between(research_path.read_text(encoding="utf-8"), "research", render_research_section(articles))
    partials_dir = root / "tools" / "partials"
    template_path = root / "tools" / "templates" / "insight.html"
    for page in [*sorted(root.glob("*.html")), template_path, *outputs]:
        current = outputs[page] if page in outputs else page.read_text(encoding="utf-8")
        outputs[page] = stamp_partials(current, partials_dir)
    # The sitemap is built last because it lists the pages above (including new ones).
    return outputs


def run(check: bool) -> int:
    articles = load_articles()
    outputs = generate(articles=articles)
    stale: list[str] = []

    def emit(path: Path, content: str) -> None:
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if current != content:
            stale.append(str(path.relative_to(ROOT)))
            if not check:
                path.write_text(content, encoding="utf-8")

    for path, content in outputs.items():
        emit(path, content)

    sitemap_path = ROOT / "sitemap.xml"
    sitemap = build_sitemap(articles)
    if check:
        # New article pages may not exist on disk yet in a fresh checkout, but they are in outputs.
        current = sitemap_path.read_text(encoding="utf-8") if sitemap_path.exists() else ""
        files = {a["file"] for a in articles}
        if _sitemap_for_check(current, files) != _sitemap_for_check(sitemap, files):
            stale.append("sitemap.xml")
    else:
        emit(sitemap_path, sitemap)

    known = {a["file"] for a in articles}
    for p in sorted(ROOT.glob("insight-*.html")):
        if p.name not in known:
            print(f"warning: {p.name} has no source in content/insights/", file=sys.stderr)

    if check:
        if stale:
            print("Generated files are stale; run `python3 tools/build_insights.py` and commit:", file=sys.stderr)
            for s in stale:
                print(f"  {s}", file=sys.stderr)
            return 1
        print(f"ok: {len(articles)} articles, generated files are up to date")
        return 0
    if stale:
        print("updated:")
        for s in stale:
            print(f"  {s}")
    else:
        print("no changes")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="exit non-zero if generated output is stale")
    args = ap.parse_args(argv)
    try:
        return run(args.check)
    except (ValueError, KeyError, tomllib.TOMLDecodeError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
