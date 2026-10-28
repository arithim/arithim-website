#!/usr/bin/env python3
"""Build assets/dotmap-data.json, the land dots for the globe drawn by assets/dotmap.js.

Source: Natural Earth 110m land (public domain, https://www.naturalearthdata.com). The raw file is downloaded
into a temporary directory, used once and deleted; only the small generated file is committed.

  python3 tools/build_dotmap.py                 download, sample, write
  python3 tools/build_dotmap.py --src land.geojson   use a file you already have
  python3 tools/build_dotmap.py --check         fail if the committed file differs from a fresh build (needs the download)

Dots sit on rows of latitude STEP degrees apart. Each row holds round(360 * cos(lat) / STEP) evenly spaced
dots, so the spacing on the sphere is roughly even. A dot is kept if its point lies on land. Each row is stored as
[latitude, dots in the row, start, length, start, length, ...] where each pair is a run of land dots counted from
longitude -180. Antarctica is left out below LAT_MIN so the picture stays readable.
"""
from __future__ import annotations

import json
import math
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "dotmap-data.json"
URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson"
STEP = 2.2
LAT_MIN, LAT_MAX = -57.0, 84.0


def polygons(geo: dict):
    for f in geo["features"]:
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for rings in polys:
            yield rings


def inside(rings, x: float, y: float) -> bool:
    """Even-odd ray cast over the outer ring and any holes."""
    hit = False
    for ring in rings:
        j = len(ring) - 1
        for i in range(len(ring)):
            xi, yi = ring[i][0], ring[i][1]
            xj, yj = ring[j][0], ring[j][1]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                hit = not hit
            j = i
    return hit


def build(geo: dict) -> dict:
    polys = [(rings, min(p[0] for p in rings[0]), max(p[0] for p in rings[0]), min(p[1] for p in rings[0]), max(p[1] for p in rings[0])) for rings in polygons(geo)]
    rows = []
    lat = LAT_MIN
    while lat <= LAT_MAX:
        n = max(1, round(360 * math.cos(math.radians(lat)) / STEP))
        flags = []
        for i in range(n):
            lon = -180 + (i + 0.5) * 360 / n
            flags.append(any(x0 <= lon <= x1 and y0 <= lat <= y1 and inside(r, lon, lat) for r, x0, x1, y0, y1 in polys))
        runs, i = [], 0
        while i < n:
            if flags[i]:
                j = i
                while j < n and flags[j]:
                    j += 1
                runs += [i, j - i]
                i = j
            else:
                i += 1
        if runs:
            rows.append([round(lat, 1), n, *runs])
        lat += STEP
    return {"source": "Natural Earth 110m land, public domain", "rows": rows}


def main():
    args = sys.argv[1:]
    if "--src" in args:
        geo = json.loads(Path(args[args.index("--src") + 1]).read_text(encoding="utf-8"))
    else:
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "ne_110m_land.geojson"
            urllib.request.urlretrieve(URL, dest)
            geo = json.loads(dest.read_text(encoding="utf-8"))
    text = json.dumps(build(geo), separators=(",", ":")) + "\n"
    if "--check" in args:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == text
        print("ok: dot map is up to date" if same else "stale: assets/dotmap-data.json")
        sys.exit(0 if same else 1)
    OUT.write_text(text, encoding="utf-8")
    dots = sum(sum(r[3::2]) for r in json.loads(text)["rows"])
    print(f"wrote {OUT.relative_to(ROOT)}: {len(text)} bytes, {dots} dots")


if __name__ == "__main__":
    main()
