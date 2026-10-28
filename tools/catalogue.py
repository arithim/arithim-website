"""Reads content/catalogue.json and content/products.json and flattens them for the products page, the header menu and the discovery files."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load() -> list[dict]:
    """Groups in order. Each group has name, lead, and either items or subgroups (each with name and items). Items are resolved to name, url, status, audience, summary."""
    cat = json.loads((ROOT / "content" / "catalogue.json").read_text(encoding="utf-8"))
    prods = {p["slug"]: p for p in json.loads((ROOT / "content" / "products.json").read_text(encoding="utf-8"))}

    def resolve(item: dict) -> dict:
        if "slug" in item:
            p = prods[item["slug"]]
            return {"name": p["name"], "url": f"product-{p['slug']}.html", "status": item["status"], "audience": p["audience"], "summary": p["card_summary"]}
        return item

    groups = []
    for g in cat["groups"]:
        g = dict(g)
        if "subgroups" in g:
            g["subgroups"] = [{"name": s["name"], "items": [resolve(i) for i in s["items"]]} for s in g["subgroups"]]
        else:
            g["items"] = [resolve(i) for i in g["items"]]
        groups.append(g)
    return groups


def flat(groups: list[dict]) -> list[dict]:
    out = []
    for g in groups:
        for i in g.get("items", []):
            out.append(i)
        for s in g.get("subgroups", []):
            out.extend(s["items"])
    return out
