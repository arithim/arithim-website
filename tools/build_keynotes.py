#!/usr/bin/env python3
"""Build keynote pages: talks, workshops, panels and case studies published as slide decks.

Usage:
    python3 tools/build_keynotes.py            # regenerate every keynote page
    python3 tools/build_keynotes.py --check    # exit 1 if a generated page is stale

Source:  content/keynotes/<slug>.md   (TOML front matter, then slides; format in docs/keynote/README.md)
Output:  keynote-<slug>.html          (template: tools/templates/keynote.html)
         assets/keynotes/<slug>-qr.svg  QR code for the closing slide, pointing at the page

The QR code needs the `segno` package (pure Python). It is only needed when a QR file is missing or the
page URL changes; otherwise the committed SVG is reused, so the build stays standard library only.
Run tools/build_insights.py afterwards (build_all.py does) to stamp the shared header and footer and
add the page to the sitemap.
"""

from __future__ import annotations

import argparse
import datetime as dt

import re
import sys
import tomllib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_insights as bi  # noqa: E402

ROOT = bi.ROOT
CONTENT_DIR = ROOT / "content" / "keynotes"
TEMPLATE = ROOT / "tools" / "templates" / "keynote.html"
QR_DIR = ROOT / "assets" / "keynotes"
SITE = bi.SITE

KINDS = {
    "keynote": ("Keynote", "Slides from the talk"),
    "workshop": ("Workshop", "Workshop slides"),
    "panel": ("Panel", "Panel write-up"),
    "case-study": ("Case study", "Case study slides"),
}
REQUIRED = ("title", "slug", "kind", "date", "description", "lede", "cta")
OPTIONAL = (
    "minutes", "speaker", "topic", "event", "event_date", "event_place", "source_insight",
    "audio", "audio_title", "audio_minutes", "keywords", "about", "faq", "sources", "footnote", "updated",
)
LAYOUTS = ("title", "statement", "list", "cards", "stats", "quote")


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

_SLIDE_RE = re.compile(r"^--- ([a-z]+)((?: [a-z]+)*)[ \t]*$", re.M)
_MARK_RE = re.compile(r"==(?=\S)(.+?)(?<=\S)==")


def parse_slides(body: str, name: str = "deck") -> list[dict]:
    """Split the body on '--- layout [flags]' lines and read each block into a slide dict."""
    parts = _SLIDE_RE.split(body)
    if parts[0].strip():
        raise ValueError(f"{name}: text before the first '--- layout' line")
    slides = []
    for i in range(1, len(parts), 3):
        layout, flags, block = parts[i], parts[i + 1].split(), parts[i + 2]
        n = len(slides) + 1
        if layout not in LAYOUTS:
            raise ValueError(f"{name}: slide {n} has unknown layout {layout!r} (use one of {', '.join(LAYOUTS)})")
        s: dict = {"layout": layout, "flags": flags, "kicker": "", "heading": "", "level": 2, "text": [],
                   "items": [], "quote": "", "cite": "", "notes": []}
        in_notes = False
        for raw in block.strip("\n").split("\n"):
            line = raw.strip()
            if not line:
                continue
            if in_notes:
                s["notes"].append(line)
            elif line.startswith("notes:"):
                in_notes = True
                if line[6:].strip():
                    s["notes"].append(line[6:].strip())
            elif line.startswith("kicker:"):
                s["kicker"] = line[7:].strip()
            elif line.startswith("cite:"):
                s["cite"] = line[5:].strip()
            elif line.startswith("# "):
                s["heading"], s["level"] = line[2:].strip(), 1
            elif line.startswith("## "):
                s["heading"], s["level"] = line[3:].strip(), 2
            elif line.startswith("> "):
                s["quote"] = (s["quote"] + " " + line[2:].strip()).strip()
            elif line.startswith("- "):
                head, _, small = line[2:].partition(" | ")
                s["items"].append((head.strip(), small.strip()))
            else:
                s["text"].append(line)
        if layout == "quote":
            if not s["quote"]:
                raise ValueError(f"{name}: quote slide {n} needs a '> ' line")
        elif not s["heading"]:
            raise ValueError(f"{name}: slide {n} needs a '# ' or '## ' heading")
        if layout in ("list", "cards", "stats") and not s["items"]:
            raise ValueError(f"{name}: {layout} slide {n} needs '- ' items")
        if layout == "cards" and not 2 <= len(s["items"]) <= 4:
            raise ValueError(f"{name}: cards slide {n} takes 2 to 4 cards")
        if layout == "stats" and not 1 <= len(s["items"]) <= 3:
            raise ValueError(f"{name}: stats slide {n} takes 1 to 3 numbers")
        if layout == "list" and len(s["items"]) > 6:
            raise ValueError(f"{name}: list slide {n} has more than 6 items; split it")
        for field in ("heading", "quote"):
            if len(_MARK_RE.findall(s[field])) > 1:
                raise ValueError(f"{name}: slide {n} highlights more than one phrase (brand rule: one amber phrase per slide)")
        slides.append(s)
    if not slides:
        raise ValueError(f"{name}: no slides")
    if slides[0]["layout"] != "title":
        raise ValueError(f"{name}: the first slide must use the 'title' layout")
    return slides


def load_deck(path: Path) -> dict:
    meta, body = bi.parse_front_matter(path.read_text(encoding="utf-8"))
    missing = [k for k in REQUIRED if not meta.get(k)]
    if missing:
        raise ValueError(f"{path.name}: missing front matter field(s): {', '.join(missing)}")
    unknown = sorted(set(meta) - set(REQUIRED) - set(OPTIONAL))
    if unknown:
        raise ValueError(f"{path.name}: unknown front matter field(s): {', '.join(unknown)}")
    if meta["slug"] != path.stem:
        raise ValueError(f"{path.name}: slug {meta['slug']!r} must match the file name")
    if meta["kind"] not in KINDS:
        raise ValueError(f"{path.name}: kind must be one of {', '.join(KINDS)}")
    for key in ("date", "updated", "event_date"):
        if key in meta and not isinstance(meta[key], dt.date):
            raise ValueError(f"{path.name}: {key} must be a TOML date, e.g. 2026-11-15 (unquoted)")
    d = dict(meta)
    d["slides"] = parse_slides(body, path.name)
    d["speaker"] = d.get("speaker") or bi.DEFAULT_AUTHOR
    d["modified"] = d.get("updated") or d["date"]
    d["file"] = f"keynote-{d['slug']}.html"
    d["url"] = f"{SITE}/{d['file']}"
    d["qr_file"] = f"assets/keynotes/{d['slug']}-qr.svg"
    if d.get("source_insight") and not (ROOT / "content" / "insights" / f"{d['source_insight']}.md").exists():
        raise ValueError(f"{path.name}: source_insight {d['source_insight']!r} has no file in content/insights/")
    return d


def load_decks(content_dir: Path = CONTENT_DIR) -> list[dict]:
    decks = [load_deck(p) for p in sorted(content_dir.glob("*.md"))]
    return sorted(decks, key=lambda d: (d["date"], d["slug"]), reverse=True)


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

def rich(text: str) -> str:
    """Inline Markdown plus ==highlight== for the one amber phrase on a slide."""
    marks: list[str] = []

    def stash(m: re.Match) -> str:
        marks.append(m.group(1))
        return f"{len(marks) - 1}"

    out = bi.inline(_MARK_RE.sub(stash, text))
    return re.sub("(\\d+)", lambda m: f'<mark class="kn-hl">{bi.inline(marks[int(m.group(1))])}</mark>', out)


def plain(text: str) -> str:
    return bi.plain_text(_MARK_RE.sub(r"\1", text))


def render_slide(s: dict, n: int, total: int, d: dict) -> str:
    kicker = f'<p class="kn-kicker">{bi.esc(s["kicker"])}</p>' if s["kicker"] else ""
    lay = s["layout"]
    inner = [kicker]
    if lay == "title":
        inner.append(f'<h2 class="kn-h1">{rich(s["heading"])}</h2>')
        bits = [d["speaker"], "Arithim"]
        if d.get("event"):
            bits.append(d["event"])
        inner.append(f'<p class="kn-byline">{bi.esc(" · ".join(bits))}</p>')
    elif lay == "quote":
        inner.append(f'<blockquote class="kn-quote"><p>{rich(s["quote"])}</p></blockquote>')
        if s["cite"]:
            inner.append(f'<p class="kn-cite">{bi.esc(s["cite"])}</p>')
    else:
        big = " kn-h2-big" if lay == "statement" else ""
        inner.append(f'<h2 class="kn-h2{big}">{rich(s["heading"])}</h2>')
    for t in s["text"]:
        inner.append(f'<p class="kn-lede">{rich(t)}</p>')
    if lay == "list":
        tag = "ol" if "numbered" in s["flags"] else "ul"
        lis = "".join(f'<li><span class="kn-li-head">{rich(h)}</span>' + (f'<span class="kn-li-small">{rich(sm)}</span>' if sm else "") + "</li>"
                      for h, sm in s["items"])
        inner.append(f'<{tag} class="kn-list">{lis}</{tag}>')
    elif lay == "cards":
        cards = "".join(f'<div class="kn-card"><h3>{rich(h)}</h3><p>{rich(sm)}</p></div>' for h, sm in s["items"])
        inner.append(f'<div class="kn-cards kn-cols-{len(s["items"])}">{cards}</div>')
    elif lay == "stats":
        stats = "".join(f'<div class="kn-stat"><div class="kn-num">{bi.esc(h)}</div><div class="kn-cap">{rich(sm)}</div></div>' for h, sm in s["items"])
        inner.append(f'<div class="kn-stats kn-cols-{len(s["items"])}">{stats}</div>')
    label = plain(s["heading"] or s["quote"])
    return (f'<section class="kn-slide kn-l-{lay}" id="slide-{n}" data-kn-slide aria-roledescription="slide" '
            f'aria-label="{n} of {total}: {bi.attr(label)}">{"".join(inner)}'
            f'<div class="kn-foot"><span class="kn-mark">arithim<span>/{bi.esc(KINDS[d["kind"]][0].lower())}</span></span>'
            f'<span class="kn-pg">{n:02d} / {total:02d}</span></div></section>')


def render_close(d: dict, n: int, total: int, qr_svg_name: str) -> str:
    short = d["url"].replace("https://", "")
    return (f'<section class="kn-slide kn-l-close" id="slide-{n}" data-kn-slide aria-roledescription="slide" aria-label="{n} of {total}: slides, notes and sources">'
            '<div class="kn-close-text"><p class="kn-kicker">Take the slides with you</p>'
            '<h2 class="kn-h2">Slides, speaker notes and sources.</h2>'
            f'<p class="kn-url">{bi.esc(short)}</p>'
            f'<p class="kn-lede">{bi.esc(d["cta"])} hello@arithim.com</p></div>'
            f'<div class="kn-qr"><img src="{bi.attr(qr_svg_name)}" alt="QR code linking to {bi.attr(short)}" width="300" height="300"></div>'
            f'<div class="kn-foot"><span class="kn-mark">arithim<span>/{bi.esc(KINDS[d["kind"]][0].lower())}</span></span>'
            f'<span class="kn-pg">{n:02d} / {total:02d}</span></div></section>')


def render_notes(d: dict) -> str:
    out = []
    for i, s in enumerate(d["slides"], 1):
        head = rich(s["heading"]) if s["heading"] else f'&ldquo;{rich(s["quote"])}&rdquo;'
        body = []
        for t in s["text"]:
            body.append(f"<p>{rich(t)}</p>")
        if s["items"]:
            tag = "ol" if "numbered" in s["flags"] else "ul"
            lis = "".join(f"<li><strong>{rich(h)}</strong>" + (f" {rich(sm)}" if sm else "") + "</li>" for h, sm in s["items"])
            body.append(f"<{tag}>{lis}</{tag}>")
        if s["cite"]:
            body.append(f"<p>{bi.esc(s['cite'])}</p>")
        if s["notes"]:
            body.append('<div class="kn-note-said"><span class="kn-note-label">Speaker notes</span>'
                        + "".join(f"<p>{rich(p)}</p>" for p in s["notes"]) + "</div>")
        out.append(f'      <li class="kn-note" id="note-{i}"><a class="kn-note-num" href="#slide-{i}" data-kn-goto="{i}" '
                   f'aria-label="Show slide {i}">{i:02d}</a><div class="kn-note-body"><h3>{head}</h3>{"".join(body)}</div></li>')
    return "\n".join(out)


def render_audio(d: dict) -> str:
    if not d.get("audio"):
        return ""
    title = bi.esc(d.get("audio_title") or "Listen to the audio version")
    mins = f' <span class="kn-audio-mins">{int(d["audio_minutes"])} MIN</span>' if d.get("audio_minutes") else ""
    # No `controls` attribute: the page runtime drops boolean attributes, so keynote.js turns controls on.
    return (f'  <div class="r-gut kn-audio"><p class="kn-audio-title">{title}{mins}</p>'
            f'<audio data-kn-audio preload="none" src="{bi.attr(d["audio"])}"></audio></div>\n')


def build_jsonld(d: dict) -> dict:
    author = {"@type": "Person", "name": d["speaker"]}
    if d["speaker"] == bi.DEFAULT_AUTHOR:
        author.update({"url": bi.AUTHOR_URL, "jobTitle": bi.AUTHOR_JOB_TITLE})
    doc: dict = {
        "@type": ["Article", "PresentationDigitalDocument"],
        "@id": f"{d['url']}#deck",
        "headline": d["title"],
        "name": d["title"],
        "description": d["description"],
        "datePublished": d["date"].isoformat(),
        "dateModified": d["modified"].isoformat(),
        "inLanguage": "en",
        "mainEntityOfPage": d["url"],
        "image": f"{SITE}/assets/og-image.png",
        "genre": KINDS[d["kind"]][0],
        "author": author,
        "publisher": {"@type": "Organization", "name": "Arithim Ltd", "url": f"{SITE}/",
                      "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/icon-512.png"}},
    }
    if d.get("keywords"):
        doc["keywords"] = list(d["keywords"])
    if d.get("about"):
        doc["about"] = [{"@type": "Thing", "name": n} for n in d["about"]]
    if d.get("source_insight"):
        doc["isBasedOn"] = f"{SITE}/insight-{d['source_insight']}.html"
    if d.get("audio"):
        doc["audio"] = {"@type": "AudioObject", "contentUrl": f"{SITE}/{d['audio'].lstrip('/')}", "name": d.get("audio_title") or d["title"]}
    graph: list = [doc]
    if d.get("faq"):
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": bi.plain_text(q["q"]), "acceptedAnswer": {"@type": "Answer", "text": bi.plain_text(q["a"])}}
            for q in d["faq"]]})
    graph.append({"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Insights", "item": f"{SITE}/insights.html"},
        {"@type": "ListItem", "position": 3, "name": d["title"], "item": d["url"]},
    ]})
    return {"@context": "https://schema.org", "@graph": graph}


def meta_line(d: dict) -> str:
    bits = [f'<span class="kn-meta-kind">{bi.esc(KINDS[d["kind"]][0].upper())}</span>']
    if d.get("event"):
        when = f" · {bi.fmt_date(d['event_date'])}" if d.get("event_date") else ""
        where = f", {d['event_place']}" if d.get("event_place") else ""
        bits.append(bi.esc(f"{d['event']}{where}".upper()) + when)
    else:
        bits.append(bi.fmt_date(d["date"]))
    if d.get("minutes"):
        bits.append(f"{int(d['minutes'])} MIN TALK")
    bits.append(f"{len(d['slides']) + 1} SLIDES")
    bits.append(f"BY {bi.esc(d['speaker'].upper())}")
    return '<span class="ah-rule">·</span>'.join(f"<span>{b}</span>" if not b.startswith("<span") else b for b in bits)


def render_page(d: dict, template: str) -> str:
    total = len(d["slides"]) + 1
    slides = [render_slide(s, i, total, d) for i, s in enumerate(d["slides"], 1)]
    slides.append(render_close(d, total, total, d["qr_file"]))
    read_more = ""
    if d.get("source_insight"):
        read_more = (f'<a class="kn-btn" href="insight-{bi.attr(d["source_insight"])}.html">Read the full article</a>')
    values = {
        "title": bi.esc(d["title"]),
        "title_attr": bi.attr(d["title"]),
        "description_attr": bi.attr(d["description"]),
        "url": bi.attr(d["url"]),
        "published": d["date"].isoformat(),
        "jsonld": bi.jsonld_script(build_jsonld(d)),
        "kind_label": bi.esc(KINDS[d["kind"]][0]),
        "deck_label": bi.attr(f"{KINDS[d['kind']][1]}: {d['title']}"),
        "meta_line": meta_line(d),
        "lede": rich(d["lede"]),
        "slides": "\n".join("      " + s for s in slides),
        "total": f"{total:02d}",
        "read_more": read_more,
        "audio": render_audio(d),
        "notes": render_notes(d),
        "faq": bi.render_faq(d),
        "sources": bi.render_sources(d),
        "cta": bi.esc(d["cta"]),
    }
    return bi.fill(template, values)


# ---------------------------------------------------------------------------
# QR code
# ---------------------------------------------------------------------------

def qr_svg(url: str) -> str | None:
    """Return the QR SVG for url, or None when segno is not installed."""
    try:
        import segno  # type: ignore
    except ImportError:
        return None
    import io
    buf = io.BytesIO()
    # Dark modules on cream: phones read dark-on-light codes far more reliably than inverted ones.
    segno.make(url, error="m", micro=False).save(buf, kind="svg", scale=10, border=2, dark="#070C16", light="#F5F1E8",
                                                 xmldecl=False, svgns=True, omitsize=True, title=f"QR code: {url}")
    return buf.getvalue().decode("utf-8") + "\n"


def ensure_qr(d: dict, check: bool) -> tuple[Path, str | None]:
    path = ROOT / d["qr_file"]
    fresh = qr_svg(d["url"])
    if fresh is not None:
        return path, fresh
    if path.exists() and d["url"] in path.read_text(encoding="utf-8"):
        return path, None
    raise ValueError(f"{d['qr_file']} is missing or out of date and segno is not installed (pip install segno)")


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def generate(root: Path = ROOT) -> tuple[list[dict], dict[Path, str]]:
    decks = load_decks(root / "content" / "keynotes")
    template = (root / "tools" / "templates" / "keynote.html").read_text(encoding="utf-8")
    partials = root / "tools" / "partials"
    outputs = {}
    for d in decks:
        page = bi.stamp_partials(bi._classify(render_page(d, template)), partials)
        outputs[root / d["file"]] = page
    return decks, outputs


def run(check: bool) -> int:
    decks, outputs = generate()
    stale = []
    for d in decks:
        path, svg = ensure_qr(d, check)
        if svg is not None:
            outputs[path] = svg
    for path, content in outputs.items():
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if current != content:
            stale.append(str(path.relative_to(ROOT)))
            if not check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")
    known = {d["file"] for d in decks}
    for p in sorted(ROOT.glob("keynote-*.html")):
        if p.name not in known:
            print(f"warning: {p.name} has no source in content/keynotes/", file=sys.stderr)
    if check:
        if stale:
            print("Keynote pages are stale; run `python3 tools/build_keynotes.py` and commit:", file=sys.stderr)
            for s in stale:
                print(f"  {s}", file=sys.stderr)
            return 1
        print(f"ok: {len(decks)} keynote pages are up to date")
        return 0
    print("updated:\n  " + "\n  ".join(stale) if stale else "no changes")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="exit non-zero if a generated page is stale")
    args = ap.parse_args(argv)
    try:
        return run(args.check)
    except (ValueError, KeyError, tomllib.TOMLDecodeError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
