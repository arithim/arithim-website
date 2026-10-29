"""Short looping SVG scenes for the large features on a product page (assets/fanim.js plays them, site.css styles them).

A scene is a function returning SVG markup in a 480 x 300 box. Every shape that should appear on a beat carries data-t (seconds in) and
optionally data-off; what has no data-off is still there in the frozen frame, which is also what shows without script or with reduced motion.
render(name, title, desc) wraps a scene in the svg element the script looks for. Colours come from classes defined in site.css, so
both themes work. No real names or figures appear: the scenes use invented, generic examples.
"""
from __future__ import annotations

import html

e = html.escape
W, H = 480, 300


def _a(t=None, off=None, extra=""):
    s = ""
    if t is not None:
        s += f' data-t="{t}"'
    if off is not None:
        s += f' data-off="{off}"'
    return s + extra


def g(inner, t=None, off=None, cls="", style=""):
    st = f' style="{style}"' if style else ""
    return f'<g class="fa-i {cls}"{_a(t, off)}{st}>{inner}</g>'


def rect(x, y, w, h, cls="f-card", r=8):
    return f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}"/>'


def text(x, y, s, cls="f-txt", anchor="start", extra=""):
    return f'<text class="{cls}" x="{x}" y="{y}" text-anchor="{anchor}"{extra}>{e(s)}</text>'


def chip(x, y, s, kind="", w=None):
    w = w or int(len(s) * 6.4 + 16)
    return (f'<g class="f-chip {kind}"><rect x="{x}" y="{y}" width="{w}" height="20" rx="10"/>'
            f'<text x="{x + w / 2}" y="{y + 14}" text-anchor="middle">{e(s)}</text></g>')


def line(x1, y1, x2, y2, t, cls="f-line", off=None):
    return f'<path class="fa-draw {cls}" d="M{x1} {y1} L{x2} {y2}" pathLength="1"{_a(t, off)}/>'


def curve(d, t, cls="f-line", off=None):
    return f'<path class="fa-draw {cls}" d="{d}" pathLength="1"{_a(t, off)}/>'


def flow(x1, y1, x2, y2, t, dl=0.0, dur=1.6, off=None):
    return (f'<circle class="fa-i fa-flow f-dot" r="3" cx="{x1}" cy="{y1}" data-dx="{x2 - x1}" data-dy="{y2 - y1}" data-dl="{dl}" data-du="{dur}"{_a(t, off)}/>')


def count(x, y, a, b, t0, t1, cls="f-big", dec=0, pre="", suf="", anchor="start", t=0.2):
    return (f'<text class="fa-i {cls}" x="{x}" y="{y}" text-anchor="{anchor}" data-count="{a},{b},{t0},{t1}" data-dec="{dec}" data-pre="{pre}" data-suf="{suf}" data-t="{t}">'
            f'{pre}{b:,.{dec}f}{suf}</text>')


def frame(inner):
    return f'<g class="fa-stage">{rect(0, 0, W, H, "f-bg", 16)}{inner}</g>'


# ---- scenes -------------------------------------------------------------------------------------------------

def report():
    out = [text(24, 26, "SOURCES", "f-cap")]
    srcs = ["Identity", "Finance", "Cards", "Contracts"]
    for i, s in enumerate(srcs):
        y = 38 + i * 56
        out.append(g(rect(16, y, 104, 40) + text(68, y + 25, s, "f-txt", "middle"), t=0.2 + i * 0.25))
        out.append(line(120, y + 20, 196, 150, 0.7 + i * 0.25))
        out.append(flow(120, y + 20, 196, 150, 1.0 + i * 0.25, dl=i * 0.35))
    out.append(rect(196, 16, 268, 268, "f-panel", 12))
    out.append(text(212, 40, "INVENTORY", "f-cap"))
    rows = [("Design suite", "612k", 300), ("Chat", "340k", 300), ("CRM", "905k", 300), ("Notes app", "18k", 300), ("Survey tool", "44k", 300)]
    for i, (n, v, _) in enumerate(rows):
        y = 52 + i * 34
        shadow = i == 3
        row = rect(208, y, 244, 28, "f-card" + (" f-warn" if shadow else ""), 6) + text(220, y + 19, n) + text(440, y + 19, v, "f-dim", "end")
        out.append(g(row, t=1.6 + i * 0.4))
    out.append(g(chip(330, 52 + 3 * 34 + 4, "Shadow IT", "f-amber"), t=4.6))
    out.append(text(212, 248, "ANNUAL SPEND", "f-cap"))
    out.append(count(212, 272, 0, 4.2, 1.5, 5.0, "f-big", dec=1, suf="M"))
    out.append(text(344, 248, "UNUSED SEATS", "f-cap"))
    out.append(count(344, 272, 0, 1420, 1.5, 5.0, "f-big"))
    return frame("".join(out)), 7.4


def trust():
    out = [text(24, 30, "SEATS · DESIGN SUITE", "f-cap")]
    out.append(g(rect(16, 44, 200, 148, "f-panel", 12) + text(32, 100, "520", "f-huge") + text(32, 124, "paid seats", "f-dim"), t=0.4))
    out.append(g(chip(28, 138, "Vendor API", "f-sage") + chip(112, 138, "4 min ago", "") + chip(28, 162, "Likely", "f-amber"), t=1.1))
    out.append(g(rect(264, 44, 200, 148, "f-panel", 12) + text(280, 100, "400", "f-huge") + text(280, 124, "assigned in identity", "f-dim"), t=3.2))
    out.append(g(chip(276, 138, "Identity", "f-sage") + chip(340, 138, "2 min ago", "") + chip(276, 162, "Confirmed", "f-sage"), t=3.8))
    out.append(g(f'<path class="f-conflict" d="M216 109 L264 109"/>' + chip(205, 92, "≠", "f-amber", 22), t=4.6))
    out.append(g(rect(16, 204, 448, 76, "f-card", 12) + text(32, 226, "Disagreement kept, never picked silently", "f-txt") + text(32, 245, "Raised as an exception for a person to reconcile.", "f-dim")
                 + chip(380, 244, "Reconcile", "f-amber"), t=5.2))
    out.append(g(text(240, 292, "Grey after twice its refresh interval", "f-cap", "middle"), t=6.4))
    return frame("".join(out)), 7.6


def ai():
    out = [g(chip(20, 18, "New agent seen", "f-amber"), t=0.3)]
    out.append(g('<circle class="f-node" cx="120" cy="150" r="42"/>' + text(120, 146, "Agent", "f-txt", "middle") + text(120, 164, "support bot", "f-dim", "middle"), t=0.8))
    for i, (lbl, y) in enumerate([("Customer data", 70), ("Documents", 150), ("Tickets", 230)]):
        out.append(curve(f"M160 140 C230 140 240 {y} 300 {y}", 1.6 + i * 0.4))
        out.append(g(rect(300, y - 18, 160, 36, "f-card") + text(380, y + 5, lbl, "f-txt", "middle"), t=1.7 + i * 0.4))
    out.append(g(chip(78, 204, "Tier 2", "f-amber"), t=3.4))
    out.append(g(rect(20, 238, 180, 46, "f-panel") + text(32, 258, "Owner needed", "f-txt") + text(32, 275, "Asked of their manager", "f-dim"), t=4.4, off=6.0))
    out.append(g(rect(20, 238, 180, 46, "f-panel f-ok") + text(32, 258, "Owner confirmed", "f-txt") + text(32, 275, "Re-attest in 90 days", "f-dim"), t=6.0))
    return frame("".join(out)), 7.6


def door():
    out = [rect(16, 16, 260, 268, "f-panel", 12), text(32, 40, "CHAT", "f-cap")]
    out.append(g(rect(88, 52, 176, 44, "f-bubble-me", 12) + text(100, 70, "I need a tool to", "f-txt") + text(100, 86, "draw diagrams.", "f-txt"), t=0.6))
    out.append(g('<circle class="f-dot2" cx="44" cy="136" r="3"/><circle class="f-dot2" cx="56" cy="136" r="3"/><circle class="f-dot2" cx="68" cy="136" r="3"/>', t=1.8, off=2.6))
    out.append(g(rect(32, 112, 192, 70, "f-bubble", 12) + text(44, 132, "You already own Design", "f-txt") + text(44, 148, "suite. 14 seats are free.", "f-txt") + text(44, 168, "Want one?", "f-dim"), t=2.6))
    out.append(g(chip(44, 194, "Yes, use it", "f-amber") + chip(138, 194, "No, I need more", ""), t=3.6))
    out.append(g(rect(32, 228, 140, 40, "f-card") + text(44, 246, "Capability", "f-dim") + text(44, 261, "Diagramming", "f-txt"), t=3.2))
    out.append(text(372, 40, "ROUTE", "f-cap", "middle"))
    for i, (lbl, y, hot) in enumerate([("Access", 62, True), ("Purchase", 112, False), ("Review", 162, False), ("Demand", 212, False)]):
        out.append(g(rect(300, y, 164, 38, "f-card") + text(382, y + 24, lbl, "f-txt", "middle"), t=3.0 + i * 0.2))
        if hot:
            out.append(g(rect(300, y, 164, 38, "f-glow"), t=4.8))
    out.append(g(text(382, 270, "Sized by value and risk", "f-cap", "middle"), t=5.2))
    return frame("".join(out)), 7.4


def renewal():
    out = [g(rect(16, 16, 250, 42, "f-panel") + text(30, 34, "Design suite", "f-txt") + text(30, 50, "Notice by 14 March", "f-dim"), t=0.2)]
    out.append('<path class="f-axis" d="M32 160 L448 160"/>')
    out.append(curve("M32 160 L400 160", 0.6, "f-axis-hot"))
    pts = [(80, "120", "Reclaim unused seats", "Position posted", 1.0, -1), (176, "90", "Renewal brief", "Renew · right-size · replace", 2.2, 1), (272, "60", "Decision due", "Budget owner decides", 3.4, -1), (368, "30", "Escalate", "Notice drafted for a person", 4.6, 1)]
    for x, d, a, b, t, side in pts:
        out.append(g(f'<circle class="f-tick" cx="{x}" cy="160" r="7"/>' + text(x, 188 if side > 0 else 142, f"{d} days", "f-cap", "middle"), t=t))
        by = 206 if side > 0 else 72
        out.append(g(rect(x - 52, by, 104, 50, "f-card") + text(x, by + 22, a, "f-txt f-sm", "middle") + text(x, by + 38, b, "f-dim f-xs", "middle"), t=t + 0.2))
    out.append(g(f'<path class="f-flag" d="M430 160 L430 128 L452 136 L430 144"/>' + text(440, 178, "Notice", "f-cap", "middle"), t=0.8))
    out.append(g(chip(330, 28, "Never sent for you", "f-sage"), t=5.8))
    return frame("".join(out)), 7.6


def reclaim():
    out = [text(24, 28, "SEATS", "f-cap")]
    cols, rows = 8, 5
    unused = {(1, 0), (4, 0), (6, 1), (2, 2), (7, 2), (0, 3), (5, 3), (3, 4)}
    moved = [(1, 0), (4, 0), (6, 1), (2, 2)]
    for r in range(rows):
        for c in range(cols):
            x, y = 24 + c * 30, 40 + r * 30
            if (c, r) in unused:
                if (c, r) in moved:
                    out.append(f'<rect class="f-seat f-unused" x="{x}" y="{y}" width="22" height="22" rx="5"/>')
                    dx, dy = 392 - x + (moved.index((c, r)) % 2) * 28, 190 - y + (moved.index((c, r)) // 2) * 28
                    out.append(f'<rect class="fa-i fa-fly f-seat f-pooled" x="{x}" y="{y}" width="22" height="22" rx="5" data-dx="{dx}" data-dy="{dy}"{_a(4.6)}/>')
                else:
                    out.append(f'<rect class="f-seat f-unused2" x="{x}" y="{y}" width="22" height="22" rx="5"/>')
                out.append(f'<rect class="fa-i f-seat f-mark" x="{x}" y="{y}" width="22" height="22" rx="5"{_a(1.0, 4.6) if (c, r) in moved else _a(1.0)}/>')
            else:
                out.append(f'<rect class="f-seat" x="{x}" y="{y}" width="22" height="22" rx="5"/>')
    out.append(g(rect(280, 28, 184, 96, "f-panel") + text(294, 52, "Keep or release?", "f-txt") + text(294, 70, "Not used in 90 days · 640 a year", "f-dim f-sm")
                 + chip(294, 84, "Release", "f-amber") + chip(364, 84, "Keep", ""), t=2.2))
    out.append(g(rect(340, 150, 124, 100, "f-pool") + text(402, 168, "POOL", "f-cap", "middle"), t=0.4))
    out.append(g(chip(296, 262, "Undo for 14 days", "f-sage") + chip(24, 262, "Review only for 30 days", ""), t=5.6))
    return frame("".join(out)), 7.6


def mapc():
    out = [g(chip(16, 14, "Lens: Spend", "f-amber"), t=0.3, off=4.2), g(chip(16, 14, "Lens: TIME", "f-amber"), t=4.2)]
    names = ["Sales", "Marketing", "Finance", "People", "Delivery", "Support", "Product", "Legal", "Data", "Security", "Planning", "Operations"]
    heat = [0.9, 0.5, 0.3, 0.25, 0.7, 0.45, 0.8, 0.15, 0.6, 0.35, 0.2, 0.4]
    time_ = ["I", "T", "T", "T", "I", "M", "M", "T", "I", "I", "T", "E"]
    tcls = {"I": "f-t-i", "T": "f-t-t", "M": "f-t-m", "E": "f-t-e"}
    for i, n in enumerate(names):
        x, y = 16 + (i % 4) * 74, 48 + (i // 4) * 58
        out.append(g(rect(x, y, 68, 52, "f-card") + text(x + 34, y + 22, n, "f-txt f-sm", "middle"), t=0.4 + i * 0.07))
        out.append(f'<rect class="fa-i f-heat f-o{int(heat[i] * 10)}" x="{x}" y="{y}" width="68" height="52" rx="8" {_a(1.4, 4.2)}/>')
        out.append(f'<rect class="fa-i f-tile {tcls[time_[i]]}" x="{x}" y="{y + 42}" width="68" height="10" rx="3"{_a(4.4)}/>')
    out.append(g(text(16, 232, "Every application is placed on a capability.", "f-dim"), t=2.0))
    out.append(g(rect(322, 48, 142, 168, "f-panel", 12) + text(334, 70, "Design suite", "f-txt") + text(334, 86, "Product design", "f-dim")
                 + chip(334, 98, "Migrate", "f-amber") + text(334, 136, "Overlap: 3 apps", "f-dim") + text(334, 152, "Active users: 61", "f-dim") + text(334, 168, "Cost per user: high", "f-dim")
                 + chip(334, 182, "Inferred", ""), t=5.4))
    out.append(g(chip(16, 246, "Tolerate", "f-blue") + chip(88, 246, "Invest", "f-sage") + chip(148, 246, "Migrate", "f-amber") + chip(220, 246, "Eliminate", ""), t=4.6))
    return frame("".join(out)), 7.6


def review():
    out = []
    reqs = [("Small tool", "Tier 1", 26), ("Team platform", "Tier 2", 104), ("Customer data AI", "Tier 3", 182)]
    for i, (n, tier, y) in enumerate(reqs):
        out.append(g(rect(16, y, 128, 64, "f-card") + text(30, y + 26, n, "f-txt") + chip(30, y + 36, tier, "f-amber" if i == 2 else ""), t=0.3 + i * 0.4))
        out.append(curve(f"M144 {y + 32} L196 {y + 32}", 1.2 + i * 0.4))
    # lane 1: clock
    out.append(g(rect(196, 26, 268, 64, "f-panel") + text(210, 48, "Clock", "f-cap") + '<rect class="f-bar" x="210" y="60" width="150" height="8" rx="4"/>', t=1.4))
    out.append(f'<rect class="fa-i f-barfill" x="210" y="60" width="150" height="8" rx="4"{_a(1.8)}/>')
    out.append(g(chip(380, 52, "Approved", "f-sage"), t=3.0))
    out.append(g(rect(196, 104, 268, 64, "f-panel") + text(210, 126, "One architect", "f-cap") + '<circle class="f-node" cx="226" cy="148" r="11"/>', t=2.0))
    out.append(g(chip(260, 134, "Approved with conditions", "f-amber"), t=4.0))
    out.append(g(rect(196, 182, 268, 64, "f-panel") + text(210, 204, "Design authority", "f-cap")
                 + "".join(f'<circle class="f-node" cx="{226 + k * 26}" cy="226" r="11"/>' for k in range(4)), t=2.6))
    out.append(g(chip(340, 212, "On the agenda", "f-amber"), t=5.0))
    out.append(g(text(240, 276, "One decision, written to the gate and the risk log", "f-cap", "middle"), t=5.8))
    return frame("".join(out)), 7.6


def portfolio():
    stages = ["Demand", "Case", "Gate", "Build", "Live"]
    out = []
    for i, s in enumerate(stages):
        x = 18 + i * 92
        out.append(g(rect(x, 28, 80, 40, "f-card") + text(x + 40, 53, s, "f-txt", "middle"), t=0.2 + i * 0.15))
    out.append(curve("M58 80 L418 80", 0.8, "f-axis-hot"))
    for i, t0 in enumerate([1.0, 2.0, 3.0, 4.0, 5.0]):
        x = 18 + i * 92
        off = t0 + 1.0 if i < 4 else None
        out.append(g(rect(x + 12, 90, 56, 30, "f-token") + text(x + 40, 109, "Card", "f-on-amber f-sm", "middle"), t=t0, off=off))
    out.append(g(rect(16, 142, 448, 140, "f-panel", 12) + text(32, 166, "STATUS, DERIVED FROM THE DELIVERY TOOL", "f-cap"), t=4.6))
    for k, (lbl, cls) in enumerate([("Schedule", "f-rag-g"), ("Cost", "f-rag-g"), ("Scope", "f-rag-a"), ("Adoption", "f-rag-g")]):
        x = 36 + k * 108
        out.append(g(f'<circle class="{cls}" cx="{x + 8}" cy="198" r="8"/>' + text(x + 24, 202, lbl, "f-txt"), t=5.0 + k * 0.2))
    out.append(g(rect(32, 222, 416, 44, "f-card") + text(46, 241, "Project manager override: scope amber, 2 changes added", "f-txt") + text(46, 258, "Shown beside the derived value, never in place of it", "f-dim"), t=6.2))
    return frame("".join(out)), 7.8


def ledger():
    out = [g(rect(16, 20, 140, 120, "f-panel", 12) + text(30, 44, "SAVING", "f-cap") + text(30, 70, "Retire notes app", "f-txt") + chip(30, 84, "Retirement", "") + chip(30, 108, "Realised", "f-sage"), t=0.4)]
    out.append(curve("M156 80 L204 80", 1.4))
    out.append(g(rect(204, 20, 124, 120, "f-panel", 12) + text(266, 70, "Finance", "f-txt", "middle") + text(266, 88, "signs once", "f-dim", "middle"), t=1.6))
    out.append(g('<circle class="f-stamp" cx="266" cy="112" r="14"/><path class="f-check" d="M259 112 L264 118 L274 106"/>', t=3.0))
    out.append(curve("M328 80 L368 80", 3.4))
    out.append(g(rect(368, 20, 96, 120, "f-panel", 12) + text(380, 44, "BENEFIT", "f-cap") + text(380, 70, "Line 3", "f-txt") + text(380, 88, "refers to", "f-dim") + text(380, 104, "the saving", "f-dim"), t=3.6))
    out.append(text(24, 176, "LEDGER", "f-cap"))
    out.append(rect(16, 186, 448, 98, "f-card", 12))
    out.append(text(32, 212, "Realised", "f-dim") + count(32, 242, 0, 412, 3.6, 5.6, "f-big", suf="k", pre=""))
    out.append(text(176, 212, "Avoided", "f-dim") + count(176, 242, 0, 96, 3.8, 5.8, "f-big", suf="k"))
    out.append(g(text(320, 212, "Potential", "f-dim") + text(320, 242, "182k", "f-big f-faint") + text(320, 266, "never added in", "f-cap"), t=4.4))
    return frame("".join(out)), 7.6


SCENES = {"report": report, "trust": trust, "ai": ai, "door": door, "renewal": renewal, "reclaim": reclaim, "map": mapc, "review": review, "portfolio": portfolio, "ledger": ledger}


def render(name: str, title: str, desc: str) -> str:
    inner, freeze = SCENES[name]()
    return (f'<svg class="fa" data-fanim="{name}" data-cycle="9.4" data-freeze="{freeze}" viewBox="0 0 {W} {H}" role="img" aria-label="{e(title + ". " + desc, quote=True)}" xmlns="http://www.w3.org/2000/svg">'
            f'<title>{e(title)}</title>{inner}</svg>')
