#!/usr/bin/env python3
"""Make the site easy for search engines, AI assistants and agents to read and quote.

Generates and stamps, from the pages themselves:

  llms.txt       an index of the site for language-model tools (https://llmstxt.org format)
  llms-full.txt  the readable text of every public page in one file, for tools that read it whole
  JSON-LD        schema.org data (Organization, WebSite, page type, breadcrumbs, service and
                 collection lists) on every hand-written page that has none, between
                 <!-- discovery:ld:start --> and <!-- discovery:ld:end --> markers
  <main>         a main landmark and a skip link on pages that lack one
  noindex        on 404.html

Pages that already carry their own JSON-LD (the products and the Technical Sales Guide) and the
insight articles (built by tools/build_insights.py) are left alone.

  python3 tools/build_discovery.py          write the files and stamp the pages
  python3 tools/build_discovery.py --check  exit 1 if anything is stale (CI)
"""
from __future__ import annotations

import html
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://arithim.com"
ORG_ID = f"{SITE}/#organization"
LD_START, LD_END = "<!-- discovery:ld:start -->", "<!-- discovery:ld:end -->"
SKIP_LINK = '<a class="tsg-skip" href="#main">Skip to content</a>'

PRODUCT_NAMES = {
    "technical-sales-guide.html": "Technical Sales Guide",
    "technical-sales-guide-security.html": "Technical Sales Guide: security and trust",
    "product-site-finder.html": "Site Finder",
    "product-ai-model-inventory.html": "AI model inventory",
}
HUBS = {  # file -> (schema type, breadcrumb name)
    "about.html": ("AboutPage", "About"), "contact.html": ("ContactPage", "Contact"),
    "services.html": ("CollectionPage", "Services"), "case-studies.html": ("CollectionPage", "Case studies"),
    "insights.html": ("CollectionPage", "Insights"), "research.html": ("CollectionPage", "Research"),
    "privacy.html": ("WebPage", "Privacy policy"), "legal.html": ("WebPage", "Legal notice"), "terms.html": ("WebPage", "Terms of sale"),
}


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def attr(text: str, pattern: str) -> str:
    m = re.search(pattern, text, re.S)
    return html.unescape(m.group(1)).strip() if m else ""


def info(path: Path) -> dict:
    t = read(path)
    title = attr(t, r"<title>(.*?)</title>")
    short = re.split(r"\s+[—|]\s+", title)[0]
    h1 = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", attr(t, r"<h1\b[^>]*>(.*?)</h1>")))
    return {"file": path.name, "url": f"{SITE}/" if path.name == "index.html" else f"{SITE}/{path.name}",
            "title": title, "name": PRODUCT_NAMES.get(path.name) or short, "desc": attr(t, r'<meta name="description" content="([^"]*)"'),
            "h1": h1, "text": t}


def all_pages() -> list[dict]:
    return [info(p) for p in sorted(ROOT.glob("*.html")) if p.name != "404.html"]


def jsonld(obj: dict) -> str:
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + "</script>"


def crumbs(items: list[tuple[str, str]]) -> dict:
    return {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}


def item_list(pages: list[dict]) -> dict:
    return {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": p["name"], "url": p["url"]} for i, p in enumerate(pages)]}


def graph_for(page: dict, pages: dict[str, dict]) -> dict | None:
    f = page["file"]
    org = {"@type": "Organization", "@id": ORG_ID, "name": "Arithim Ltd", "url": f"{SITE}/", "logo": f"{SITE}/assets/icon-512.png",
           "legalName": "Arithim Ltd", "identifier": {"@type": "PropertyValue", "propertyID": "Companies House number", "value": "17209022"}, "email": "hello@arithim.com", "address": {"@type": "PostalAddress", "addressLocality": "London", "addressCountry": "GB"}}
    pub = {"@id": ORG_ID}
    group = lambda prefix: [p for n, p in sorted(pages.items()) if n.startswith(prefix)]
    if f == "index.html":
        org["description"] = page["desc"]
        return {"@context": "https://schema.org", "@graph": [
            org, {"@type": "WebSite", "@id": f"{SITE}/#website", "url": f"{SITE}/", "name": "Arithim", "publisher": pub, "inLanguage": "en-GB"}]}
    if f in HUBS:
        typ, crumb = HUBS[f]
        page_node = {"@type": typ, "@id": page["url"] + "#page", "url": page["url"], "name": page["h1"] or page["name"], "description": page["desc"], "isPartOf": {"@id": f"{SITE}/#website"}, "publisher": pub, "inLanguage": "en-GB"}
        if f == "about.html":
            page_node["about"] = pub
        children = {"services.html": group("services-"), "case-studies.html": group("case-"), "insights.html": group("insight-")}.get(f)
        if children:
            page_node["mainEntity"] = item_list(children)
        return {"@context": "https://schema.org", "@graph": [page_node, crumbs([("Arithim", f"{SITE}/"), (crumb, page["url"])])]}
    if f.startswith("services-"):
        svc = {"@type": "Service", "@id": page["url"] + "#service", "name": page["h1"] or page["name"], "description": page["desc"], "url": page["url"], "provider": pub, "serviceType": page["name"]}
        return {"@context": "https://schema.org", "@graph": [svc, crumbs([("Arithim", f"{SITE}/"), ("Services", f"{SITE}/services.html"), (page["name"], page["url"])])]}
    if f.startswith("case-"):
        node = {"@type": "WebPage", "@id": page["url"] + "#page", "url": page["url"], "name": page["h1"] or page["name"], "description": page["desc"], "isPartOf": {"@id": f"{SITE}/#website"}, "publisher": pub, "inLanguage": "en-GB"}
        return {"@context": "https://schema.org", "@graph": [node, crumbs([("Arithim", f"{SITE}/"), ("Case studies", f"{SITE}/case-studies.html"), (page["name"], page["url"])])]}
    return None


def stamp_page(text: str, page: dict, pages: dict[str, dict]) -> str:
    name = page["file"]
    if name.startswith("insight-"):
        return text  # built from tools/templates/insight.html
    if name == "404.html":
        if 'name="robots"' not in text:
            text = text.replace("</head>", '<meta name="robots" content="noindex">\n</head>', 1)
        return text
    # JSON-LD: only on pages with none of their own
    own = re.search(r'<script type="application/ld\+json">', re.sub(re.escape(LD_START) + ".*?" + re.escape(LD_END), "", text, flags=re.S))
    if not own and not name.startswith("insight-") and not name.startswith("product"):
        g = graph_for(page, pages)
        if g:
            block = f"{LD_START}\n{jsonld(g)}\n{LD_END}\n"
            rx = re.compile(re.escape(LD_START) + r".*?" + re.escape(LD_END) + r"\n?", re.S)
            text = rx.sub(lambda _: block, text) if rx.search(text) else text.replace("<!-- partial:head -->", block + "<!-- partial:head -->", 1)
    # main landmark
    if "<main" not in text and "<!-- /partial:header -->" in text and "<!-- partial:footer" in text:
        text = text.replace("<!-- /partial:header -->", f"<!-- /partial:header -->\n\n<main id=\"main\">", 1)
        text = re.sub(r"(\n*)(<!-- partial:footer)", r"\n</main>\n\n\2", text, count=1)
        if SKIP_LINK not in text:
            text = text.replace("<!-- partial:header", SKIP_LINK + "\n\n<!-- partial:header", 1)
    return text


def load_extractor():
    spec = importlib.util.spec_from_file_location("build_pack", ROOT / "tools" / "call-agent" / "build_pack.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.extract_html


def products_list(pages: dict[str, dict]) -> list[tuple[str, str, str]]:
    out = []
    t = pages["products.html"]["text"]
    m = re.search(r'"@type": "ItemList".*?</script>', t, re.S)
    if m:
        for it in re.findall(r'"name": "([^"]+)", "url": "([^"]+)"', m.group(0)):
            f = it[1].replace(SITE + "/", "")
            out.append((it[0], it[1], pages[f]["desc"] if f in pages else ""))
    return out


def build_llms(pages: dict[str, dict]) -> tuple[str, str]:
    home = pages["index.html"]
    def line(name, url, desc):
        d = re.sub(r"\s+", " ", desc).strip()
        return f"- [{name}]({url})" + (f": {d}" if d else "")
    L = ["# Arithim", "", f"> {home['desc']}", "",
         "Arithim Ltd is based in London. It builds enterprise software and SaaS products and takes on applied AI, automation and reporting work for operational, regulated businesses. "
         "Contact: hello@arithim.com. Pages are plain HTML, and the sitemap lists every public page.", ""]
    L += ["## Products", ""]
    listed = products_list(pages)
    for n, u, d in listed:
        L.append(line(n, u, d))
    seen = {u for _, u, _ in listed}
    for f in ("technical-sales-guide-security.html", "product-assay.html"):
        if f in pages and pages[f]["url"] not in seen:
            L.append(line(pages[f]["name"], pages[f]["url"], pages[f]["desc"]))
    L.append(line("All products", pages["products.html"]["url"], pages["products.html"]["desc"]))
    sections = [("Services", "services.html", "services-"), ("Case studies", "case-studies.html", "case-"), ("Insights", "insights.html", "insight-")]
    for title, hub, prefix in sections:
        L += ["", f"## {title}", "", line(pages[hub]["name"] + " overview" if title != "Insights" else "Insights overview", pages[hub]["url"], pages[hub]["desc"])]
        for n, p in sorted(pages.items()):
            if n.startswith(prefix) and n != hub:
                L.append(line(p["h1"] if title == "Insights" and p["h1"] else p["name"], p["url"], p["desc"]))
    L += ["", "## Company", ""]
    for f in ("about.html", "research.html", "contact.html"):
        L.append(line(pages[f]["name"], pages[f]["url"], pages[f]["desc"]))
    L += ["", "## Optional", "", line("Privacy policy", pages["privacy.html"]["url"], pages["privacy.html"]["desc"]), line("Legal notice", pages["legal.html"]["url"], pages["legal.html"]["desc"]),
          f"- [Sitemap]({SITE}/sitemap.xml): every public page with its last modified date", ""]
    llms = "\n".join(L)

    extract = load_extractor()
    order = ["index.html", "about.html", "products.html", "technical-sales-guide.html", "technical-sales-guide-security.html", "product-site-finder.html", "product-ai-model-inventory.html",
             "services.html", *sorted(n for n in pages if n.startswith("services-")), "case-studies.html", *sorted(n for n in pages if n.startswith("case-") and n != "case-studies.html"),
             "insights.html", *sorted(n for n in pages if n.startswith("insight-")), "research.html", "contact.html", "privacy.html", "legal.html", "terms.html"]
    parts = ["# Arithim: full text of the public site", "", f"Source: {SITE}/. One section per page. Generated by tools/build_discovery.py.", ""]
    for f in dict.fromkeys(order):
        if f not in pages:
            continue
        _, body = extract(pages[f]["text"])
        parts += [f"---", "", f"## {pages[f]['h1'] or pages[f]['name']}", "", f"URL: {pages[f]['url']}", "", body.strip(), ""]
    return llms + "\n", "\n".join(parts) + "\n"


def main():
    check = "--check" in sys.argv
    pages = {p["file"]: p for p in all_pages()}
    stale = []
    for name, page in pages.items():
        path = ROOT / name
        new = stamp_page(page["text"], page, pages)
        if new != page["text"]:
            if check:
                stale.append(name)
            else:
                path.write_text(new, encoding="utf-8")
                page["text"] = new
    p404 = ROOT / "404.html"
    new404 = stamp_page(read(p404), {"file": "404.html"}, pages)
    if new404 != read(p404):
        stale.append("404.html") if check else p404.write_text(new404, encoding="utf-8")
    llms, full = build_llms(pages)
    for fname, content in (("llms.txt", llms), ("llms-full.txt", full)):
        path = ROOT / fname
        if not path.exists() or read(path) != content:
            stale.append(fname) if check else path.write_text(content, encoding="utf-8")
    if check:
        print("ok: discovery files are up to date" if not stale else "stale: " + ", ".join(stale))
        sys.exit(1 if stale else 0)
    print("done")


if __name__ == "__main__":
    main()
