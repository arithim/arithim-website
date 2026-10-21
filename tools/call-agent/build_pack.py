#!/usr/bin/env python3
"""Build the knowledge pack for the Arithim phone agents, then run the deny-list check.

Usage:
    python3 tools/call-agent/build_pack.py [--allow-missing-denylist] [--no-check]

Steps:
  1. Read knowledge/allowlist.txt (one repo-relative path per line, '#' comments).
  2. Extract readable text from each file (HTML: nav, footer, header, scripts, styles
     and the sticky site header are stripped; Markdown: front matter dropped).
  3. Write build/pack/<slug>.md (first line "Source: <path>") and build/pack/index.json.
  4. Deny-list check over build/pack, knowledge/ and agents/ (if present).

The deny-list lives outside the repo (env CALL_AGENT_DENYLIST, default
~/.config/arithim/call-agent-denylist.txt). One term per line, '#' comments allowed.
Matching is case-insensitive and whole-word.

Exit codes: 0 ok, 1 deny-list hits or bad allowlist, 2 deny-list file missing.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
DEFAULT_DENYLIST = "~/.config/arithim/call-agent-denylist.txt"

SKIP_TAGS = {"script", "style", "nav", "footer", "header", "noscript", "svg",
             "helmet", "template", "head", "iframe"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
             "meta", "param", "source", "track", "wbr"}
BLOCK_TAGS = {"p", "div", "section", "article", "main", "li", "ul", "ol", "h1", "h2",
              "h3", "h4", "h5", "h6", "tr", "table", "blockquote", "br", "details",
              "summary", "dd", "dt", "dl", "pre", "figure", "figcaption"}
HEADING = {"h1": "# ", "h2": "## ", "h3": "### ", "h4": "#### ", "h5": "##### ", "h6": "###### "}
BOILERPLATE = re.compile(r"^(©|\(c\)|← ?back to home|skip to)", re.I)


class TextExtractor(HTMLParser):
    """Collects readable text, skipping chrome (nav/footer/scripts/sticky header)."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self._stack: list[tuple[str, bool]] = []  # (tag, is_skip)
        self._skip_depth = 0
        self._parts: list[str] = []
        self._props: list[str] = []

    def _collect_props(self, raw: str) -> None:
        """Pages built from components keep their copy in data-props defaults of type 'text'."""
        try:
            props = json.loads(html.unescape(raw))
        except ValueError:
            return
        for key, spec in props.items():
            if not isinstance(spec, dict) or spec.get("editor") != "text":
                continue
            default = spec.get("default")
            if not isinstance(default, str) or not default.strip():
                continue
            for line in default.split("\n"):
                line = line.strip()
                if "::" in line:
                    q, a = line.split("::", 1)
                    line = f"Q: {q.strip()}\n\nA: {a.strip()}"
                if line:
                    self._props.append(line)

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "script":
            raw = dict(attrs).get("data-props")
            if raw:
                self._collect_props(raw)
        if tag == "title":
            self._in_title = True
        if tag in VOID_TAGS:
            if tag == "br" and not self._skip_depth:
                self._parts.append("\n")
            return
        style = (dict(attrs).get("style") or "").replace(" ", "").lower()
        skip = tag in SKIP_TAGS or "position:sticky" in style or "position:fixed" in style
        self._stack.append((tag, skip))
        if skip:
            self._skip_depth += 1
        elif tag in BLOCK_TAGS:
            self._parts.append("\n" + HEADING.get(tag, ""))

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "title":
            self._in_title = False
        if tag in VOID_TAGS:
            return
        # pop to the matching open tag (tolerate sloppy markup)
        for i in range(len(self._stack) - 1, -1, -1):
            if self._stack[i][0] == tag:
                while len(self._stack) > i:
                    _, was_skip = self._stack.pop()
                    if was_skip:
                        self._skip_depth -= 1
                break
        if not self._skip_depth and tag in BLOCK_TAGS:
            self._parts.append("\n")

    def handle_data(self, data):
        if self._in_title:
            self.title += data
            return
        if self._skip_depth:
            return
        self._parts.append(data)

    def text(self) -> str:
        raw = "".join(self._parts)
        lines = []
        for line in raw.split("\n"):
            line = re.sub(r"[ \t ]+", " ", line).strip()
            if not line or BOILERPLATE.match(line) or "{{" in line:
                continue
            lines.append(line)
        # collapse accidental consecutive duplicates
        out: list[str] = []
        for line in lines:
            if not out or out[-1] != line:
                out.append(line)
        result = "\n\n".join(out)
        if self._props:
            result += "\n\n## Page content\n\n" + "\n\n".join(self._props)
        return result


def extract_html(source: str) -> tuple[str, str]:
    """Return (title, readable_text) for an HTML document."""
    parser = TextExtractor()
    parser.feed(source)
    parser.close()
    title = re.sub(r"\s+", " ", html.unescape(parser.title)).strip()
    return title, parser.text()


def extract_markdown(source: str) -> tuple[str, str]:
    """Drop front matter (YAML '---' or TOML '+++') and HTML comments.

    Title comes from a 'title:' / 'title =' front-matter line, else the first heading.
    """
    title = ""
    body = source
    m = re.match(r"^(---|\+\+\+)\s*\n(.*?)\n\1\s*\n", source, re.S)
    if m:
        for line in m.group(2).splitlines():
            t = re.match(r"^title\s*[:=]\s*(.+)$", line, re.I)
            if t:
                title = t.group(1).strip().strip("\"'")
        body = source[m.end():]
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    if not title:
        h = re.search(r"^#\s+(.+)$", body, re.M)
        title = h.group(1).strip() if h else ""
    return title, body.strip()


def parse_allowlist(text: str) -> list[str]:
    """One path per line; '#' starts a comment; blank lines ignored; duplicates dropped."""
    paths: list[str] = []
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        if line.startswith("/") or ".." in Path(line).parts:
            raise ValueError(f"allowlist path must be repo-relative: {line}")
        if line not in paths:
            paths.append(line)
    return paths


def slug_for(path: str) -> str:
    stem = re.sub(r"\.[A-Za-z0-9]+$", "", path)
    return re.sub(r"[^A-Za-z0-9]+", "-", stem).strip("-").lower()


def build_pack(allowlist_file: Path, repo_root: Path, out_dir: Path) -> list[dict]:
    paths = parse_allowlist(allowlist_file.read_text(encoding="utf-8"))
    if out_dir.exists():
        for old in out_dir.glob("*"):
            if old.is_file():
                old.unlink()
    out_dir.mkdir(parents=True, exist_ok=True)
    index: list[dict] = []
    for rel in paths:
        src = repo_root / rel
        if not src.is_file():
            raise FileNotFoundError(f"allowlisted file not found: {rel}")
        raw = src.read_text(encoding="utf-8")
        if src.suffix.lower() in (".html", ".htm"):
            title, text = extract_html(raw)
        else:
            title, text = extract_markdown(raw)
        slug = slug_for(rel)
        header = f"Source: {rel}\n"
        if title:
            header += f"Title: {title}\n"
        (out_dir / f"{slug}.md").write_text(f"{header}\n{text}\n", encoding="utf-8")
        index.append({"slug": slug, "source": rel, "title": title, "chars": len(text)})
    (out_dir / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
    return index


# ---------------------------------------------------------------- deny-list

def load_denylist(path: Path) -> list[str]:
    terms: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        terms.append(line)
    return terms


def compile_terms(terms: list[str]) -> list[tuple[str, re.Pattern]]:
    # whole word: not preceded or followed by a word character
    return [(t, re.compile(r"(?<!\w)" + re.escape(t) + r"(?!\w)", re.I)) for t in terms]


def scan_text(text: str, compiled: list[tuple[str, re.Pattern]]) -> list[tuple[int, str]]:
    hits = []
    for lineno, line in enumerate(text.splitlines(), 1):
        for term, pat in compiled:
            if pat.search(line):
                hits.append((lineno, term))
    return hits


def scan_paths(roots: list[Path], terms: list[str], base: Path) -> list[tuple[str, int, str]]:
    compiled = compile_terms(terms)
    hits: list[tuple[str, int, str]] = []
    for root in roots:
        if not root.exists():
            continue
        files = [root] if root.is_file() else sorted(p for p in root.rglob("*") if p.is_file())
        for f in files:
            try:
                text = f.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            try:
                shown = str(f.relative_to(base))
            except ValueError:
                shown = str(f)
            for lineno, term in scan_text(text, compiled):
                hits.append((shown, lineno, term))
    return hits


def run_denylist_check(denylist_path: Path, roots: list[Path], base: Path,
                       allow_missing: bool) -> int:
    if not denylist_path.is_file():
        print(f"WARNING: deny-list file not found: {denylist_path}", file=sys.stderr)
        if allow_missing:
            print("Continuing without a deny-list check (--allow-missing-denylist).",
                  file=sys.stderr)
            return 0
        print("Refusing to continue: create the deny-list or pass --allow-missing-denylist.",
              file=sys.stderr)
        return 2
    terms = load_denylist(denylist_path)
    hits = scan_paths(roots, terms, base)
    if hits:
        print(f"DENY-LIST HITS: {len(hits)}", file=sys.stderr)
        for shown, lineno, term in hits:
            print(f"  {shown}:{lineno}: matches deny-listed term {term!r}", file=sys.stderr)
        return 1
    print(f"Deny-list check passed ({len(terms)} terms, zero hits).")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--allow-missing-denylist", action="store_true",
                    help="continue (with a warning) if the deny-list file is absent")
    ap.add_argument("--no-check", action="store_true", help="build only; skip the deny-list check")
    ap.add_argument("--root", default=str(REPO_ROOT), help="repo root (default: this repo)")
    args = ap.parse_args(argv)

    root = Path(args.root).resolve()
    tool = root / "tools" / "call-agent"
    allowlist = tool / "knowledge" / "allowlist.txt"
    out_dir = tool / "build" / "pack"
    try:
        index = build_pack(allowlist, root, out_dir)
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"Wrote {len(index)} pack documents to {out_dir.relative_to(root)}")
    if args.no_check:
        return 0
    deny = Path(os.path.expanduser(os.environ.get("CALL_AGENT_DENYLIST", DEFAULT_DENYLIST)))
    return run_denylist_check(deny, [out_dir, tool / "knowledge", tool / "agents"], root,
                              args.allow_missing_denylist)


if __name__ == "__main__":
    sys.exit(main())
