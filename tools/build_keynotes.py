#!/usr/bin/env python3
"""Slide decks on insight pages: a talk, workshop or panel shown as slides at the top of its article.

Usage:
    python3 tools/build_keynotes.py            # write missing or out-of-date QR codes
    python3 tools/build_keynotes.py --check    # exit 1 if a deck is invalid or a QR code is missing or stale

Source:  content/keynotes/<slug>.md   TOML front matter, then slides (format in docs/keynote/README.md).
         <slug> is the slug of the insight in content/insights/ that the deck sits on.
Output:  the deck block in insight-<slug>.html, rendered by tools/build_insights.py through render_block()
         assets/keynotes/<slug>-qr.svg   QR code on the closing slide, pointing at the insight page

The QR code needs the `segno` package (pure Python) when it is first made or the page URL changes.
Otherwise the committed SVG is reused, so CI and the rest of the build stay standard library only.
"""

from __future__ import annotations

import argparse
import datetime as dt
import functools
import re
import sys
import tomllib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_insights as bi  # noqa: E402

ROOT = bi.ROOT
CONTENT_DIR = ROOT / "content" / "keynotes"
SITE = bi.SITE
LICENCE_URL = "https://creativecommons.org/licenses/by-nc/4.0/"
LICENCE_NAME = "CC BY-NC 4.0"

KINDS = {"keynote": "Keynote", "workshop": "Workshop", "panel": "Panel", "case-study": "Case study"}
OPTIONAL = ("kind", "minutes", "speaker", "event", "event_date", "event_place", "audio", "audio_title", "audio_minutes")
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
    unknown = sorted(set(meta) - set(OPTIONAL))
    if unknown:
        raise ValueError(f"{path.name}: unknown front matter field(s): {', '.join(unknown)}")
    if meta.get("kind", "keynote") not in KINDS:
        raise ValueError(f"{path.name}: kind must be one of {', '.join(KINDS)}")
    if "event_date" in meta and not isinstance(meta["event_date"], dt.date):
        raise ValueError(f"{path.name}: event_date must be a TOML date, e.g. 2026-11-15 (unquoted)")
    slug = path.stem
    if not (ROOT / "content" / "insights" / f"{slug}.md").exists():
        raise ValueError(f"{path.name}: no insight content/insights/{slug}.md for this deck to sit on")
    d = dict(meta)
    d["slug"] = slug
    d["kind"] = d.get("kind", "keynote")
    d["slides"] = parse_slides(body, path.name)
    d["speaker"] = d.get("speaker") or bi.DEFAULT_AUTHOR
    d["url"] = f"{SITE}/insight-{slug}.html"
    d["qr_file"] = f"assets/keynotes/{slug}-qr.svg"
    return d


def load_decks(content_dir: Path = CONTENT_DIR) -> list[dict]:
    return [load_deck(p) for p in sorted(content_dir.glob("*.md"))]


@functools.lru_cache(maxsize=None)
def _decks_by_slug() -> dict:
    return {d["slug"]: d for d in load_decks()}


def deck_for(slug: str) -> dict | None:
    return _decks_by_slug().get(slug)


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




def _foot(d: dict, n: int, total: int) -> str:
    return (f'<footer class="kn-foot"><span class="kn-mark">arithim<span>/{bi.esc(KINDS[d["kind"]].lower())}</span></span>'
            f'<span class="kn-pg">{n:02d} / {total:02d}</span></footer>')


def render_slide(s: dict, n: int, total: int, d: dict) -> str:
    lay = s["layout"]
    inner = [f'<p class="kn-kicker">{bi.esc(s["kicker"])}</p>' if s["kicker"] else ""]
    if lay == "title":
        inner.append(f'<h2 class="kn-h1">{rich(s["heading"])}</h2>')
        bits = [d["speaker"], "Arithim"] + ([d["event"]] if d.get("event") else [])
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
            f'aria-label="{n} of {total}: {bi.attr(label)}">{"".join(inner)}{_foot(d, n, total)}</section>')


def render_close(d: dict, cta: str, n: int, total: int) -> str:
    short = d["url"].replace("https://", "")
    return (f'<section class="kn-slide kn-l-close" id="slide-{n}" data-kn-slide aria-roledescription="slide" aria-label="{n} of {total}: slides, notes and sources">'
            '<div class="kn-close-text"><p class="kn-kicker">Take the slides with you</p>'
            '<h2 class="kn-h2">Slides, the full article and sources.</h2>'
            f'<p class="kn-url">{bi.esc(short)}</p>'
            f'<p class="kn-lede">Free to reuse inside your organisation ({LICENCE_NAME}). {bi.esc(cta)} hello@arithim.com</p></div>'
            f'<div class="kn-qr"><img src="{bi.attr(d["qr_file"])}" alt="QR code linking to {bi.attr(short)}" width="300" height="300"></div>'
            f'{_foot(d, n, total)}</section>')


def render_notes(d: dict) -> str:
    out = []
    for i, s in enumerate(d["slides"], 1):
        if not s["notes"]:
            continue
        head = rich(s["heading"]) if s["heading"] else f'&ldquo;{rich(s["quote"])}&rdquo;'
        notes = "".join(f"<p>{rich(p)}</p>" for p in s["notes"])
        out.append(f'<li class="kn-note"><a class="kn-note-num" href="#slide-{i}" data-kn-goto="{i}" aria-label="Show slide {i}">{i:02d}</a>'
                   f'<div class="kn-note-body"><h3>{head}</h3>{notes}</div></li>')
    return "".join(out)


def render_audio(d: dict) -> str:
    if not d.get("audio"):
        return ""
    title = bi.esc(d.get("audio_title") or "Listen to the audio version")
    mins = f' <span class="kn-audio-mins">{int(d["audio_minutes"])} MIN</span>' if d.get("audio_minutes") else ""
    # No `controls` attribute: the page runtime drops boolean attributes, so keynote.js turns controls on.
    return (f'<div class="kn-audio"><p class="kn-audio-title">{title}{mins}</p>'
            f'<audio data-kn-audio preload="none" src="{bi.attr(d["audio"])}"></audio></div>')


def render_block(d: dict, article: dict) -> str:
    """The deck band that sits between the insight's hero and its article body."""
    total = len(d["slides"]) + 1
    slides = [render_slide(s, i, total, d) for i, s in enumerate(d["slides"], 1)]
    slides.append(render_close(d, article["cta"], total, total))
    meta = [KINDS[d["kind"]].upper()]
    if d.get("event"):
        where = f", {d['event_place']}" if d.get("event_place") else ""
        when = f" · {bi.fmt_date(d['event_date'])}" if d.get("event_date") else ""
        meta.append(bi.esc(f"{d['event']}{where}".upper()) + when)
    if d.get("minutes"):
        meta.append(f"{int(d['minutes'])} MIN TALK")
    meta.append(f"{total} SLIDES")
    meta_html = '<span class="ah-rule">·</span>'.join(f"<span>{m}</span>" for m in meta)
    notes = render_notes(d)
    notes_html = (f'<details class="kn-notes-box"><summary>Speaker notes</summary><ol class="kn-notes">{notes}</ol></details>' if notes else "")
    label = bi.attr(f"{KINDS[d['kind']]} slides: {article['title']}")
    return f"""  <div class="r-gut kn-deck-band" id="slides">
    <div class="kn-deck-meta">{meta_html}</div>
    <div class="kn-deck" data-kn-deck role="region" aria-roledescription="slide deck" aria-label="{label}">
      <div class="kn-frame" data-kn-frame>
        <div class="kn-stage" data-kn-stage>
{chr(10).join("          " + s for s in slides)}
        </div>
      </div>
      <div class="kn-bar"><i data-kn-progress></i></div>
      <div class="kn-controls">
        <button type="button" class="kn-ctl" data-kn-prev aria-label="Previous slide">←</button>
        <span class="kn-count" data-kn-count aria-live="polite">01 / {total:02d}</span>
        <button type="button" class="kn-ctl" data-kn-next aria-label="Next slide">→</button>
        <span class="kn-ctl-gap"></span>
        <button type="button" class="kn-ctl kn-ctl-text" data-kn-present>Present</button>
        <button type="button" class="kn-ctl kn-ctl-text" data-kn-print>Save as PDF</button>
        <button type="button" class="kn-ctl kn-ctl-text" data-kn-share>Copy link</button>
      </div>
    </div>
    <p class="kn-licence">Slides by Arithim, licensed under <a href="{LICENCE_URL}" rel="noopener license">{LICENCE_NAME}</a>. Use them inside your organisation with a credit and a link to this page; selling them needs our permission. Third-party figures and quotes, and the Arithim name and logo, are not covered. <a href="legal.html#slides">Details</a>.</p>
    {render_audio(d)}{notes_html}
  </div>
"""


def jsonld_node(d: dict, article: dict) -> dict:
    node: dict = {
        "@type": "PresentationDigitalDocument",
        "@id": f"{d['url']}#slides",
        "name": f"{article['title']} ({KINDS[d['kind']].lower()} slides)",
        "url": f"{d['url']}#slides",
        "isPartOf": {"@id": f"{d['url']}#article"},
        "author": {"@type": "Person", "name": d["speaker"]},
        "inLanguage": "en",
        "license": LICENCE_URL,
        "copyrightHolder": {"@type": "Organization", "name": "Arithim Ltd"},
    }
    if d.get("audio"):
        node["audio"] = {"@type": "AudioObject", "contentUrl": f"{SITE}/{d['audio'].lstrip('/')}", "name": d.get("audio_title") or article["title"]}
    return node


DECK_SCRIPT = ("\n    import('./keynote.js?v=1').then((m) => { this._stopDeck = m.initKeynote(document); })"
               ".catch((e) => console.error('deck load failed', e));")


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



def qr_output(d: dict) -> tuple[Path, str | None]:
    """(path, fresh svg) when segno is installed; (path, None) when the committed SVG is current."""
    path = ROOT / d["qr_file"]
    fresh = qr_svg(d["url"])
    if fresh is not None:
        return path, fresh
    if path.exists() and d["url"] in path.read_text(encoding="utf-8"):
        return path, None
    raise ValueError(f"{d['qr_file']} is missing or out of date and segno is not installed (pip install segno)")


def run(check: bool) -> int:
    decks = load_decks()
    stale = []
    for d in decks:
        path, svg = qr_output(d)
        if svg is None:
            continue
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if current != svg:
            stale.append(str(path.relative_to(ROOT)))
            if not check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(svg, encoding="utf-8")
    if check:
        if stale:
            print("QR codes are stale; run `python3 tools/build_keynotes.py` and commit:", file=sys.stderr)
            print("  " + "\n  ".join(stale), file=sys.stderr)
            return 1
        print(f"ok: {len(decks)} decks valid, QR codes up to date")
        return 0
    print("updated:\n  " + "\n  ".join(stale) if stale else "no changes")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="exit non-zero if a deck is invalid or a QR code is stale")
    args = ap.parse_args(argv)
    try:
        return run(args.check)
    except (ValueError, KeyError, tomllib.TOMLDecodeError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
