# Field Report — section patterns

Archetypes built only from the primitives in `field-report.css`. Recombine them;
none is the layout of the page the language came from.

---

## Hero variants

**H1 · Headline + fact row** *(the source page's — listed so you can vary it)*
Kicker → h1 (one italic accent word) → lead → `.facts` of four numbers.

**H2 · Single figure**
Kicker, then one enormous number in the display serif (`.display`) with a short
serif line beside or below it: *"£4.2m returned to members."* No lead, no facts.
The rest of the page explains the number.

**H3 · Ledger opener**
Kicker + a two-line h1, then straight into a `table.ledger` of the period's key
lines. For reports where the table *is* the story.

**H4 · Dark cover**
The whole hero inside `.band`: h1 in paper-white, accent word in the lifted
accent, three facts. Use when the page has no other dark band.

---

## Body sections

**B1 · Cells** — 2–4 hairline-divided columns (`.cells`, `--cols`), each a mono
`who` line + serif h3 + two sentences. Principles, roles, options.

**B2 · Statement** — one serif sentence between rules (`.statement`), accent on
the decisive clause. A rhythm break after dense sections.

**B3 · Tiles** — numbered steps or parts (`.tiles`), outcome line pinned to the
bottom in mono. Six is the maximum before it reads as a feature grid.

**B4 · Figures** — `.figures` grid of 4–8 big numbers with units in small mono.
Best inside the dark band.

**B5 · Track** — proportional timeline (`.track`, flex = duration) with idle
time as `.gap` and the one decisive phase `.hot`, plus a `.legend`.

**B6 · Pull** — one giant claim with its evidence beside it (`.pull`). Put it
at the end of a band.

**B7 · Sequence** — a flow of `.node`s with tag dot, verb, reference, status.
Processes, hand-offs, journeys, pipelines.

**B8 · Measures** — `.meter` rows for completion or pass rates; a `.split` bar
with `.keys` for a composition of outcomes.

**B9 · Ledger table** — `table.ledger` with a serif `.lead` column and mono
`.num` columns. The most honest way to show comparisons.

**B10 · Diagram** — inline SVG in `.diagram` using the box/line classes; two
lanes separated by `.sep` work well (e.g. run time / build time, before / after).

**B11 · Pills** — `.pills` for stacks, tags, participants. End-of-page only.

---

## Page compositions

| Page | Composition |
|---|---|
| **Project overview** (report) | H1 → B1 → B10 → B3 → band [B4 → B5 → B6] → B7 → B8 → B11 |
| **Annual report** (ledger) | H3 → B8 → B9 → B2 → B4 (3 cols) → B9 → footer |
| **Case study** | H2 → B2 → B7 → band [B4 → B6] → B1 → footer |
| **Board briefing** (briefing) | H4 → B4 → B8 → B2 → B9 → footer |
| **Launch retrospective** | H1 → B5 → B3 → B8 → band [B6] → B11 |
| **Research summary** | H2 → B1 → B9 → B10 → B2 → footer |

Rule of thumb: **vary the rhythm, keep the vocabulary.**

## Composition heuristics

- **Numbers, then words, then structure.** Alternate a figure section, a short
  prose or statement section, and a table/sequence/diagram section.
- **The band is punctuation.** Put it where the argument turns, not at a fixed
  position.
- **Every number needs a label, every label is one line.** If a label wraps to
  three lines, the number is the wrong one.
- **Idle time is shown, not hidden.** Timelines include gaps as `.gap`; it makes
  the other figures credible.
- **Captions carry sources.** A mono line under a table or figure saying where
  the numbers come from costs nothing and is part of the look.
