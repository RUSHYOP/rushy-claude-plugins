# Warp Factory — section patterns

A kit of section archetypes assembled from the language's primitives. None of
these is the layout of the page the design was extracted from — that is the
point. Recombine these instead of reproducing the source page.

Each entry lists the primitives it uses so you can see there is no new machinery
underneath: it is always cells, rules, figures, panels and the dot grid.

---

## Hero variants

**H1 · Split hero** *(the source page's — listed so you can avoid it)*
Copy left, live artefact right, divided by a vertical rule.
`.wrap` + 2-col grid + `border-left` on the right column.

**H2 · Stacked measure**
Prompt line, then a wide `h1` capped at ~14ch per line, then a single narrow
paragraph at 48ch, then one primary + one ghost button. Nothing to the right.
Reads calmer and more editorial. Good when you have no product screenshot.

**H3 · Terminal hero**
The `h1` is a shell line: a muted `>` prompt, the headline as the "command", and
a blinking `.caret`. Below it, three `.status` lines resolving `[..] → [ok]`.
Strong, and only appropriate for genuinely developer-facing products.

**H4 · Full-bleed figure**
Short headline in the top-left corner, a bordered `figure` spanning the container
below it with `.edge-label`s on left and right. The caption bar carries the
version/build string. Reads as a technical drawing plate.

**H5 · Index hero**
No hero at all — open on a `table` of contents/releases/endpoints under a single
line of `h1`. Suits docs, changelogs and reference sites where getting to the
list fast matters more than a pitch.

---

## Body sections

**B1 · Cell row** — 2–4 `.cell`s sharing `border-left`, each with an `h4`, a
paragraph, and optionally a `.callouts` list. The workhorse.

**B2 · Step rail** — numbered `.step`s joined by the hairline connector with
hollow nodes. Use for sequential processes only; a cell row is better for
non-sequential features.

**B3 · Stats band** — `.stats-grid` of three `.stat`s on `--bg-panel`. Big
number, lowercase label, muted description. Good as a rhythm break between two
text-heavy sections.

**B4 · Spec table** — a `table` with an uppercase tracked `thead` and hairline
rows. Right-align numerics with `.num`. The most underused pattern in this
language and often the most honest way to present comparisons.

**B5 · Annotated figure** — bordered `figure` + caption bar + `.edge-label`s.
Wrap a screenshot, diagram, chart or code sample. The caption bar should carry
metadata (file path, version, timestamp), not a title.

**B6 · Two-column prose** — `minmax(0,1fr) minmax(300px,440px)` grid: argument on
the left, supporting panel or figure on the right, aligned to `start`.

**B7 · Log / diff** — `.line` rows with `+`/`−` markers. Not just for code —
works for changelogs, audit trails, and before/after copy.

**B8 · Accordion** — stacked `details` with `[+]`/`[−]`. FAQ, spec details,
anything progressive.

**B9 · Inverted band** — one `.band-dark` section as punctuation. Testimonial,
manifesto line, or a single CTA. At most one per page; two and it stops reading
as an accent.

**B10 · Empty / placeholder** — `.empty` with an ASCII mark. Ships with the
language so unbuilt states still look designed.

---

## Page compositions

Recipes that produce recognisably different pages from the same parts.

| Page | Composition |
|---|---|
| **Product landing** | H2 → B1 → B3 → B2 → B9 → B8 → footer |
| **Docs / reference** | H5 → B4 → B5 → B7 → footer *(rails off, warm ground, 15px)* |
| **Changelog** | H5 → repeating B7 blocks under date headings → footer |
| **Dashboard** | nav → B3 → B5 grid → B4 → *(console register, `.band-dark` root)* |
| **Pricing** | H2 → B4 as the plan comparison → B8 → B9 |
| **Status page** | H3 → `.status` list → B7 incident log → B4 uptime table |

The rule of thumb: **vary the rhythm, not the vocabulary.** Two pages should
share every component and share almost no section order.

---

## Composition heuristics

- **Alternate density.** A text section, then a figure or stats band, then text.
  Three prose sections in a row is where warp-factory gets monotonous.
- **Let one section break the container.** Full-bleed bands and inverted sections
  give the page a spine. If everything is 1180px, the page reads flat.
- **Vary the measure.** 48ch for lead paragraphs, 68ch for body prose, full width
  for tables and figures. Constant width is the most common tell of a template.
- **Put metadata in caption bars.** Version strings, paths, timestamps, counts.
  This is what makes the language feel like instrumentation rather than styling —
  and it is content, so it is the cheapest way to differentiate from the source.
- **Use ASCII before SVG.** `[ok]`, `[+]`, `>`, `+`. Reach for a Phosphor icon
  only when a glyph genuinely will not carry the meaning.
