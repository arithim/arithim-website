#!/usr/bin/env python3
"""Run every generator in the right order, so adding or changing a page needs one command.

  python3 tools/build_all.py            regenerate everything: classes and tokens, the product, products-hub,
                                        legal, Site Finder and insight pages, the shared header and footer, the
                                        sitemap, the themes, llms.txt and the structured data, and the call-agent pack
  python3 tools/build_all.py --check    what CI runs: every generator in check mode, the style lint and the tests

What belongs to a page is its text: content/products.json, content/catalogue.json, content/legal.json,
content/insights/*.md and content/navigation.json. Everything else is written from those and from site.css.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY = sys.executable


def run(*args: str, ok=(0,)) -> int:
    p = subprocess.run([PY, *args], cwd=ROOT, capture_output=True, text=True)
    if p.returncode not in ok:
        print(f"FAILED: {' '.join(args)}\n{p.stdout}{p.stderr}")
        sys.exit(p.returncode or 1)
    return p.returncode


def build():
    steps = [
        ("tools/centralise_styles.py", "--write"), ("tools/build_product_pages.py",), ("tools/build_legal_pages.py",), ("tools/build_site_finder.py",),
        ("tools/build_products_hub.py",), ("tools/build_insights.py",), ("tools/build_themes.py",), ("tools/centralise_styles.py", "--write"),
        ("tools/build_product_pages.py",), ("tools/build_insights.py",), ("tools/build_discovery.py",), ("tools/call-agent/build_pack.py", "--allow-missing-denylist"),
    ]
    for s in steps:
        run(*s)
    print("built everything")


def check():
    checks = [
        ("tools/build_insights.py", "--check"), ("tools/build_discovery.py", "--check"), ("tools/build_product_pages.py", "--check"),
        ("tools/build_products_hub.py", "--check"), ("tools/build_legal_pages.py", "--check"), ("tools/build_themes.py", "--check"),
        ("tools/centralise_styles.py", "--lint"), ("-m", "unittest", "tools/test_build_insights.py"),
    ]
    for c in checks:
        run(*c)
    print("all checks passed")


if __name__ == "__main__":
    check() if "--check" in sys.argv else build()
