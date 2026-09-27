# Field Report

> An **original** design language (2026-09), not extracted from a third-party
> site: first built for an engineering project's overview page, then generalised
> here. Every value below is in [`field-report.css`](field-report.css), scoped
> to `.fr`.
>
> **This file is the reference. It is not a template.** Read
> [`variations.md`](variations.md) for what you may change and the three
> registers, and [`patterns.md`](patterns.md) for section archetypes to
> recombine. [`example.html`](example.html) is a worked page in the ledger
> register — deliberately sharing no layout with the page the language came from.

---

## 1. The one-sentence version

**An engineering report typeset like a magazine feature.** Warm paper, huge
serif headlines at weight 400, every figure and label in a small tracked mono,
exactly one vermilion accent, and structure from horizontal rules — never
from cards, shadows or boxes.

If you take away one rule: **the numbers are the content.** Pages in this
language lead with a few large, true figures set in the display serif, each
with a one-line mono or sans label. Prose is short and always subordinate.

---

## 2. What makes it recognisable

Six moves do almost all the work:

1. **A display serif that is large and light.** Instrument Serif at 400, never
   bold, `line-height: .92` on the hero, tracking `-.02em`. Size carries
   hierarchy; weight never does.
2. **Mono for everything that is data or label**: section indices (`01`),
   eyebrows, units, captions, statuses, table heads, timeline labels.
   Uppercase, tracked `.06–.12em`, 11.5–14px.
3. **Warm paper with grain** (`#f4f1ea` + a 5%-alpha SVG noise tile). Never
   pure white.
4. **One accent, vermilion `#d9481f`**, used for: the italic emphasis word in a
   headline, the section index rule, one "hot" segment, and the single most
   important line on a diagram. Nothing else is coloured.
5. **Rules, two weights only.** A `1.5px` ink rule opens a block (fact row,
   table, sequence); `1px` hairlines divide inside it. Cells share dividers.
6. **One dark band per page** (`#16130f`) holding the section that matters most.

---

## 3. Colour

| Token | Hex | Role |
|---|---|---|
| `--fr-paper` | `#f4f1ea` | Ground, with grain |
| `--fr-paper-2` | `#ebe6db` | Meter tracks, insets, external-system boxes |
| `--fr-card` | `#f8f6f1` | The one lighter fill: diagram boxes, pills |
| `--fr-ink` | `#15120f` | Headlines, heavy rules, solid fills, meter fills |
| `--fr-ink-2` | `#3b3530` | Body copy — not full ink |
| `--fr-muted` | `#6f675e` | Labels, captions, secondary copy |
| `--fr-rule` | `#d6cebf` | Hairlines |
| `--fr-accent` | `#d9481f` | The only accent (large text, fills, lines) |
| `--fr-accent-ink` | `#a8330f` | Accent for small text — passes AA on paper |
| `--fr-accent-soft` | `#fbe8df` | Accent tint, fills only |
| `--fr-night` | `#16130f` | The dark band |

On the band, tokens are **re-pointed**, not overridden: rule `#3a322a`, text
`#fbf7f0`, muted `#b9b0a4`, accent `#f08a63` (the vermilion lifted for contrast on
dark). Every component inside the band therefore adapts with no extra CSS.

Rules for colour: a second hue is never introduced for emphasis. Categorical
colour is allowed in exactly one place — the 8px dots on sequence tags
(`--c`), where it distinguishes stages, and it stays desaturated
(`#6b5bd2`, `#1f8a9e`, `#3f8f4f` beside the accent).

---

## 4. Typography

| Role | Face | Licence | Fallback |
|---|---|---|---|
| Display: h1, h2, h3, big numbers | **Instrument Serif** 400 (+ italic) | SIL OFL, Google Fonts | Iowan Old Style, Georgia |
| Text: body, leads, labels in prose | **Geist** 400/500/600 | SIL OFL | Avenir Next, Segoe UI |
| Data: indices, eyebrows, units, tables, captions | **Geist Mono** 400/500 | SIL OFL | SF Mono, Menlo |

All three are free to use and redistribute. The fallbacks are chosen so the page
still reads as this language offline (a warm serif + a geometric sans).

### Scale

| Element | Size | Line height | Tracking |
|---|---|---|---|
| Hero `h1` | `clamp(56px, 9.2vw, 140px)`, max 14ch | `.92` | `-.02em` |
| Section `h2` | `clamp(40px, 5vw, 72px)`, max 18ch | `1` | `-.015em` |
| Card / tile `h3` | 28–40px serif | `1.05–1.08` | 0 |
| Fact number | `clamp(48px, 5.6vw, 84px)` | `1` | `-.02em` |
| Pull claim | `clamp(56px, 7vw, 108px)` | `.95` | `-.02em` |
| Lead | `clamp(19px, 1.9vw, 24px)` | `1.45` | 0 |
| Body | 18px (17px mobile) | `1.55` | 0 |
| Section intro | 20px | `1.55` | 0 |
| Labels (mono) | 11.5–14px, 500 | 1–1.5 | `.06–.12em`, uppercase |

Two signature moves:

- **The italic accent word.** One word or short phrase in each headline may be
  set `<em>` — italic serif in vermilion. One per headline, never two.
- **Units in small mono inside big serif numbers:** `9<small>h</small>20<small>min</small>`,
  `33<small>/ 35</small>`. The unit drops to `.32em` mono so the number stays the
  figure and the unit stays a label.

`text-wrap: balance` on headings, `pretty` on paragraphs.

---

## 5. Spacing & layout

- **Container** `1240px`, gutter `40px` (`22px` on mobile).
- **Section rhythm** `112px` between sections. Generous on purpose: the page
  should feel like spreads, not a feed.
- **The index rail.** Every section head is a two-column grid: a `160px` rail
  holding the mono index (`01`) under a 1.5px accent rule, then the `h2` and a
  one-sentence intro. The rail is the page's spine; it collapses above the
  headline on mobile.
- **Cells share dividers.** Multi-column regions are grids whose children split
  with `border-left` (cleared on the first), flipping to `border-top` on mobile.
  Tiles use the `gap: 1px` over a rule-coloured background technique instead.
- **Measures:** h1 14ch, h2 18ch, lead 34em, intro 36em.

---

## 6. Shape, elevation, sizes

- **No shadows.** Anywhere.
- **Radius:** 0 on cells, tiles and rules; `3–6px` only on data shapes
  (timeline track, split bar, meter track, diagram boxes); `999px` pills and 50%
  dots. A radius on a layout container means you have left the language.
- **Borders:** `1px` hairline or `1.5px` ink. Nothing else.
- **Fixed sizes:** meter track `10px` · split bar and timeline `64px` tall
  (`44px` mobile) · sequence dot `8px` · swatch `14px`.

---

## 7. Icons

**None, by design.** The language uses typographic marks instead: `→` for
flows, `·` as a separator, `≈` for estimates, `/` inside fractions, counters
(`01`) for order, and coloured 8px dots for categories. If a concept truly needs
an icon, use a single-weight line set at text size, `currentColor`, and
`aria-hidden="true"` — but try a glyph first.

---

## 8. Motion

One orchestrated moment, then restraint.

| Purpose | Duration | Curve |
|---|---|---|
| Hero load (`.rise` children, staggered 0 / .08 / .18 / .3 / .4 s) | `.9s` | `cubic-bezier(.2,.7,.2,1)` |
| Section reveal on scroll (`.reveal` → `.in`) | `.8s` | same |
| Meter fills after reveal | `1.1s`, `.15s` delay | same |
| Hover (links, nav) | default | — |

`.reveal` only hides content when `<html>` carries `.js`, so the page is
complete without JavaScript. `prefers-reduced-motion` disables all of it. Print
shows everything and drops the grain.

---

## 9. Components at a glance

- **Top bar** — mono uppercase, brand left, anchor nav right, hairline below.
- **Hero** — kicker (accent mono) → h1 with one italic accent word → lead →
  **fact row** (4 big numbers opened by a 1.5px ink rule).
- **Section head** — index rail + h2 + one-sentence intro.
- **Cells** — hairline-divided columns with a mono `who` line, serif h3, short copy.
- **Statement** — one serif sentence between a heavy and a hairline rule.
- **Tiles** — numbered grid (`01`–`06`) with a mono outcome line pinned to the bottom.
- **Band** — the dark section; tokens re-pointed.
- **Figures** — big serif numbers in a ruled 4-column grid, units in small mono.
- **Track + legend** — a proportional timeline (`flex` = duration), idle time
  shown as `.gap`, the key phase as `.hot`, with a 3-column legend beneath.
- **Pull** — one giant claim with an italic accent, its evidence beside it.
- **Sequence** — a flow of nodes, each with a coloured tag dot, a serif verb, a
  mono reference and a status.
- **Meter / split / keys** — ink fills on paper tracks; a proportional split bar
  with a keyed legend.
- **Ledger table** — 1.5px ink top rule, mono uppercase heads, hairline rows,
  mono right-aligned numerics, serif lead column.
- **Pills** — mono, 999px, the only rounded container.
- **Diagram** — inline SVG with class-based fills whose meaning is fixed:
  accent-soft = automated/AI, card = your system, paper-2 = external system,
  ink = shipped/final; dashed accent line = the one path that matters.

---

## 10. Building in this language — checklist

- [ ] Paper ground with grain; no pure white anywhere
- [ ] Headlines in the display serif at 400; nothing bold above 600, and never in the serif
- [ ] Every label, index, unit, caption and table head in mono, uppercase, tracked
- [ ] At most one italic accent word per headline
- [ ] One accent colour; `--fr-accent-ink` for small accent text
- [ ] Blocks open with a 1.5px ink rule; inner divisions are 1px hairlines
- [ ] No shadows; no radius on layout containers
- [ ] Every section head uses the index rail
- [ ] Numbers lead; each has a one-line label; prose stays short
- [ ] At most one dark band
- [ ] Motion: one load stagger, reveals on scroll, reduced-motion honoured, readable without JS
- [ ] Check at 390px: fact rows go 2-up, rails collapse, diagrams and ledger tables scroll inside themselves, the page never scrolls sideways

## 11. Building in this language without cloning it

The page it came from ran: hero with four facts → three cells → diagram →
six tiles → dark band of figures + timeline + pull → sequence → meters →
pills. That order belongs to that page. See `variations.md` ("Avoiding the
clone") and `patterns.md` for other compositions; `example.html` is a ledger-led
annual report with no timeline, no tiles and no diagram.

## 12. Where it breaks

Strong for: project and engineering reports, annual/quarterly reviews, case
studies, research summaries, launch retrospectives, investor-style one-pagers —
anything where a handful of true numbers carries the story.

It fights back when you need: dense application UI (the section rhythm and
display sizes waste space), long documentation (the serif-display / sans-body
split works for spreads, not for 40 screens of reference), heavy imagery (grain
and paper compete with photos), or a playful consumer tone (it reads serious by
design). For product UI, borrow the mono labels, the rule weights and the single
accent, and drop the display serif below `h2`.
