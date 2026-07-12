#!/usr/bin/env python3
"""
wisprflow_figures.py — editorial "Wispr Flow" figures for Vizuara reports.

The aesthetic (from wisprflow.ai + the Vizuara L1-eval figure):
  · warm cream paper background            (#f8f5e4)
  · classical serif display type (Georgia) for big numbers & labels
  · muted pastel palette: terracotta / sage / lilac on ink
  · one hand-drawn touch — a wavy ink baseline along the bottom
  · generous whitespace, thin sage rule under the header, no chart junk

Every figure shares: cream bg, Georgia, INK text, the wavy baseline, a
big-number + sentence header, and the same six-colour palette. That shared
signature is what makes a set of them read as one family.

Public API (import or CLI):
  stat_bars(counts, labels, headline, sub, out)      vertical distribution + KPI
  comparison_bars(items, headline, sub, out)         horizontal labelled bars
  donut(value, headline, sub, out)                   single-metric ring
Run  `python3 wisprflow_figures.py demo`  to render one of each into ./examples.
"""
import sys, json, textwrap
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Wedge

# ---- palette -----------------------------------------------------------------
BG    = "#f8f5e4"   # cream paper
INK   = "#1b1a17"   # near-black text / hand-drawn line
TERRA = "#bc6e61"   # low / below-target / accent A
SAGE  = "#98b096"   # boundary / neutral-good / accent B
LILAC = "#d7bedc"   # strong / high / accent C
RULE  = "#a3b097"   # sage hairline under the header
MUTE  = "#6f6a5f"   # secondary text
SERIF = "Georgia"

# map a 0..1 position or a semantic name to a bar colour
PALETTE = {"terra": TERRA, "sage": SAGE, "lilac": LILAC, "ink": INK}
plt.rcParams["font.family"] = SERIF


# ---- shared primitives -------------------------------------------------------
def _canvas(w=1376, h=768, dpi=100):
    fig = plt.figure(figsize=(w / dpi, h / dpi), dpi=dpi)
    fig.patch.set_facecolor(BG)
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_facecolor(BG)
    ax.set_xlim(0, w); ax.set_ylim(h, 0); ax.axis("off")   # pixel coords, y down
    return fig, ax, w, h


def _header(fig, ax, w, h, headline, sub, rule=True):
    """Big serif stat on the left, a two-line sentence on the right, sage rule."""
    fig.text(70 / w, 1 - 158 / h, headline, ha="left", va="baseline",
             fontsize=86, fontweight="bold", color=INK)
    # optional small caption sits just under the big number if it has a newline
    if "\n" in headline:
        pass
    if sub:
        # keep the sentence inside the right margin: wrap each line to ~52 chars
        wrapped = "\n".join("\n".join(textwrap.wrap(ln, 52)) if ln else ""
                            for ln in sub.split("\n"))
        fig.text(528 / w, 1 - 100 / h, wrapped, ha="left", va="top",
                 fontsize=21.5, color=INK, linespacing=1.5)
    if rule:
        ax.add_line(Line2D([65, w - 65], [229, 229], color=RULE, lw=2,
                           solid_capstyle="butt"))


def _wavy_baseline(ax, w, y=715, amp=12, ink=INK):
    xs = np.linspace(20, w - 20, 600)
    ys = y + amp * np.sin((xs - 400) / 220 * 2 * np.pi + np.pi)
    ax.plot(xs, ys, color=ink, lw=2.2, solid_capstyle="round")


def _caption(fig, w, h, x_px, y_px, text, size=21, bold=False, color=INK, ha="left", va="baseline"):
    fig.text(x_px / w, 1 - y_px / h, text, ha=ha, va=va, fontsize=size,
             fontweight="bold" if bold else "normal", color=color)


def _save(fig, out):
    fig.savefig(out, dpi=fig.dpi, facecolor=BG)
    plt.close(fig)
    print(f"wrote {out}")


# ---- 1. vertical distribution + KPI (the canonical L1-eval figure) -----------
def stat_bars(counts, labels, headline, sub, out,
              colors=None, value_fmt="{:,}"):
    """
    counts   : list[int|float]  bar heights (raw counts ok)
    labels   : list[str]        category label under each bar
    headline : str              the big serif KPI, e.g. "92.3%\\ncore correct or better"
                                (first line huge; text after \\n is the small caption)
    sub      : str              1-2 line sentence, right of the KPI
    colors   : list[str]        semantic names ("terra"/"sage"/"lilac") or hex, per bar
    """
    fig, ax, w, h = _canvas()
    big, _, small = headline.partition("\n")
    _header(fig, ax, w, h, big, sub)
    if small:
        _caption(fig, w, h, 78, 224, small, size=21, color=INK)

    n = len(counts)
    if colors is None:                    # default gradient: lows terra, mid sage, highs lilac
        colors = (["terra"] * max(0, n - 3)) + ["sage"] + ["lilac"] * min(2, n - 1)
        colors = colors[:n]
    cols = [PALETTE.get(c, c) for c in colors]

    left, right = 185, w - 186
    centers = np.linspace(left, right, n)
    bar_w = min(99, (centers[1] - centers[0]) * 0.55) if n > 1 else 99
    baseline = 633
    scale = 349.0 / max(counts)

    for cx, ct, col in zip(centers, counts, cols):
        bh = max(ct * scale, 4.5)
        ax.add_patch(plt.Rectangle((cx - bar_w / 2, baseline - bh), bar_w, bh,
                                   facecolor=col, edgecolor="none"))
        ax.text(cx, baseline - bh - 20, value_fmt.format(ct), ha="center",
                va="baseline", fontsize=22, color=INK)
    for cx, lab in zip(centers, labels):
        ax.text(cx, 668, str(lab), ha="center", va="top", fontsize=23, color=INK)

    _wavy_baseline(ax, w)
    _save(fig, out)


# ---- 2. horizontal labelled bars (comparisons, before/after, model bench) ----
def comparison_bars(items, headline, sub, out, unit="", max_hint=None):
    """
    items : list of (label, value, color_name)   e.g. [("GPT-4o", 82, "terra"), ...]
    """
    fig, ax, w, h = _canvas()
    big, _, small = headline.partition("\n")
    _header(fig, ax, w, h, big, sub)
    if small:
        _caption(fig, w, h, 78, 224, small, size=21, color=INK)

    n = len(items)
    top, bottom = 300, 660
    row_h = (bottom - top) / n
    x0 = 360
    track_w = w - x0 - 190
    vmax = max_hint or max(v for _, v, _ in items)

    for i, (lab, val, cname) in enumerate(items):
        cy = top + row_h * (i + 0.5)
        col = PALETTE.get(cname, cname)
        bw = track_w * (val / vmax)
        bh = min(46, row_h * 0.52)
        # faint track
        ax.add_patch(plt.Rectangle((x0, cy - bh / 2), track_w, bh,
                                   facecolor="#efe9d4", edgecolor="none"))
        ax.add_patch(plt.Rectangle((x0, cy - bh / 2), bw, bh,
                                   facecolor=col, edgecolor="none"))
        ax.text(x0 - 22, cy, lab, ha="right", va="center", fontsize=23, color=INK)
        ax.text(x0 + bw + 14, cy, f"{val:g}{unit}", ha="left", va="center",
                fontsize=22, color=MUTE)

    _wavy_baseline(ax, w, y=718, amp=10)
    _save(fig, out)


# ---- 3. single-metric donut --------------------------------------------------
def donut(value, headline, sub, out, color="sage", track="#e9e3cd"):
    """value: 0..100 percentage filled."""
    fig, ax, w, h = _canvas()
    big, _, small = headline.partition("\n")
    _header(fig, ax, w, h, big, sub)
    if small:
        _caption(fig, w, h, 78, 224, small, size=21, color=INK)

    cx, cy, r, width = 980, 470, 150, 40
    col = PALETTE.get(color, color)
    ax.add_patch(Wedge((cx, cy), r, 0, 360, width=width, facecolor=track, edgecolor="none"))
    # matplotlib angles are CCW from +x; our y-axis is flipped, so sweep clockwise visually
    ang = 360 * (value / 100.0)
    ax.add_patch(Wedge((cx, cy), r, 90 - ang, 90, width=width, facecolor=col, edgecolor="none"))
    ax.text(cx, cy, f"{value:g}%", ha="center", va="center", fontsize=52,
            fontweight="bold", color=INK)

    _wavy_baseline(ax, w, y=718, amp=10)
    _save(fig, out)


# ---- JSON-spec driver (for non-coders) --------------------------------------
def from_spec(spec, out):
    """spec = dict with a 'type' key: stat_bars | comparison_bars | donut."""
    t = spec.pop("type")
    spec["out"] = out
    {"stat_bars": stat_bars, "comparison_bars": comparison_bars, "donut": donut}[t](**spec)


# ---- CLI ---------------------------------------------------------------------
def _demo():
    import os
    d = os.path.join(os.path.dirname(__file__), "..", "examples")
    os.makedirs(d, exist_ok=True)
    stat_bars(
        counts=[5, 53, 121, 183, 290, 1661],
        labels=[0, 1, 2, 3, 4, 5],
        headline="92.3%\ncore correct or better",
        sub=("Of 2,313 real questions, 2,134 received the correct core\n"
             "answer – above the 90% target, with 3 hallucinations (0.13%)."),
        out=os.path.join(d, "demo_stat_bars.png"),
    )
    comparison_bars(
        items=[("Manual (today)", 42, "terra"), ("Assisted", 71, "sage"),
               ("Chia engine", 93, "lilac")],
        headline="2.2×\nthroughput at the same headcount",
        sub="Journeys completed per analyst-day across the three operating modes.",
        out=os.path.join(d, "demo_comparison_bars.png"), unit="/day",
    )
    donut(78, headline="78%\nof journeys fully automated",
          sub="Share of PO-create journeys the engine runs end-to-end, no human step.",
          out=os.path.join(d, "demo_donut.png"), color="lilac")

if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "demo":
        _demo()
    elif len(sys.argv) >= 3 and sys.argv[1] == "spec":
        from_spec(json.load(open(sys.argv[2])), sys.argv[3])
    else:
        sys.exit("usage: wisprflow_figures.py demo | spec <spec.json> <out.png>")
