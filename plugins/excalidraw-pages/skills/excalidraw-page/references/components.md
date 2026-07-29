# Component catalog — excalidraw-page

Copy-paste markup for every component in the design system. All classes are defined in
the template's DESIGN CORE `<style>` block — nothing here requires new CSS.

## Contents

1. [Hero block](#1-hero-block)
2. [Section heads + TOC](#2-section-heads--toc)
3. [Sketch cards](#3-sketch-cards)
4. [Grids](#4-grids)
5. [Lists](#5-lists)
6. [Tags & chips](#6-tags--chips)
7. [Callouts](#7-callouts)
8. [Tables & status pills](#8-tables--status-pills)
9. [Diagram shell + all diagram types](#9-diagram-shell--all-diagram-types)
10. [Wireframes](#10-wireframes)
11. [Phase timeline](#11-phase-timeline)
12. [Collapsibles & trees](#12-collapsibles--trees)
13. [Checklist](#13-checklist)
14. [Footer](#14-footer)
15. [Palette quick reference](#15-palette-quick-reference)

---

## 1. Hero block

First viewport: title with one marker highlight, mono subtitle, one summary paragraph,
stat chips, optional tag legend. Stagger entrances with `--i`.

```html
<h1 class="animate" style="--i:0">Title with a <span class="mk">highlight</span></h1>
<p class="subtitle animate" style="--i:1">topic · audience · status — YYYY-MM-DD</p>
<p class="animate" style="--i:2; max-width:860px">
  One-paragraph summary. <span class="mk"><b>Marker the core claim.</b></span>
</p>
<div class="chips animate" style="--i:3">
  <span class="chip"><b>17</b> things preserved</span>
  <span class="chip"><b>8</b> phases</span>
</div>
```

## 2. Section heads + TOC

Numbered hand-drawn section heads; ids `s1…sN` must match TOC hrefs.

```html
<div class="sec-head" id="s3"><span class="num">3</span> Section Title</div>
<p class="sec-sub">One-line framing of what this section covers and why.</p>

<h3 class="block-title">Sub-block title</h3>
```

TOC rules: `nav.toc` is the **first child** of `.wrap`; one short link per section;
delete the whole TOC when the page has fewer than 4 sections. The scroll-spy script
handles active states and mobile behavior automatically.

## 3. Sketch cards

The workhorse container. Alternate `.sk` and `.sk.alt` between neighbors (different
wobble). Accent via `data-a`. Optional `.tape` adds a washi-tape sticker.
`.sk--recessed` (dashed, sunken) is for secondary/parenthetical content.

```html
<div class="sk" data-a="green">
  <div class="sk-label"><span class="dot"></span> Card title</div>
  <p style="font-size:12.5px">Body text.</p>
</div>

<div class="sk alt" data-a="red">
  <div class="tape"></div>
  <div class="sk-label"><span class="dot"></span> Taped card, alt border</div>
  ...
</div>
```

Accent semantics: `green` good/in-scope/done · `red` risk/out-of-scope ·
`blue` neutral/structure · `orange` new/changed · `violet` agentic/AI.

## 4. Grids

```html
<div class="g2"> ... two columns ... </div>
<div class="g3"> ... three columns ... </div>
<div class="stack"> ... vertical 16px gap ... </div>
```

Both collapse to one column under 900px. Children already get `min-width: 0` via `.sk`;
keep that property on any custom children.

## 5. Lists

```html
<ul class="sk-list">
  <li><b>Lead phrase</b> — detail sentence with <code>code</code> and tags.</li>
</ul>
```

`↝` bullets, 12.5px, wraps safely. 3–6 items per card reads best.

## 6. Tags & chips

Tags mark process ownership and models inline; chips are hero-level stats.

```html
<span class="tag tag--agent">🤖 agent</span>
<span class="tag tag--human">✋ human</span>
<span class="tag tag--det">⚙ deterministic</span>
<span class="tag tag--model">sonnet-5</span>
<span class="tag tag--warn">HIGH</span>
<span class="tag tag--new">NEW</span>
```

When tags appear, include a legend near the hero:

```html
<div class="legend">
  <span>Every process is tagged by who runs it:</span>
  <span class="tag tag--agent">🤖 agent</span> ...
</div>
```

## 7. Callouts

One promoted insight per section, at most. Left border color = mood.

```html
<div class="callout callout--orange"><strong>The headline.</strong> The supporting
sentence with <code>code</code> if needed.</div>
```

Variants: `callout--blue` / `--red` / `--green` / `--orange`.

## 8. Tables & status pills

Always wrap tables in `.tbl-wrap` (border + horizontal scroll). Caption is hand-font.

```html
<div class="tbl-wrap">
<table>
  <caption>Table title</caption>
  <thead><tr><th>Col</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>Row <span class="sub">dim sub-note</span></td>
        <td><span class="status st-keep">KEEP</span></td></tr>
  </tbody>
</table>
</div>
```

Pills: `st-keep` (green) · `st-upgrade` (blue) · `st-complete` (violet) ·
`st-absorb` / `st-new` (orange) · `st-retire` (red). Relabel the text freely
(e.g. HIGH/MED/LOW for risk severity); keep the classes.

## 9. Diagram shell + all diagram types

Duplicate this block per diagram; only the `diagram-source` changes. The DESIGN CORE
script initializes every `.diagram-shell` with zoom/pan/fit/expand automatically.

```html
<section class="diagram-shell animate">
  <p class="diagram-shell__hint">Ctrl/Cmd + wheel to zoom · drag to pan · double-click to fit · ⛶ opens full size</p>
  <div class="mermaid-wrap">
    <div class="zoom-controls">
      <button type="button" data-action="zoom-in" title="Zoom in">+</button>
      <button type="button" data-action="zoom-out" title="Zoom out">&minus;</button>
      <button type="button" data-action="zoom-fit" title="Smart fit">&#8634;</button>
      <button type="button" data-action="zoom-one" title="1:1">1:1</button>
      <button type="button" data-action="zoom-expand" title="Open full size">&#x26F6;</button>
      <span class="zoom-label">Loading…</span>
    </div>
    <div class="mermaid-viewport"><div class="mermaid mermaid-canvas"></div></div>
  </div>
  <script type="text/plain" class="diagram-source">
flowchart TD
  A["node"] --> B["node two"]
  </script>
</section>
```

For a shorter diagram, add `style="min-height:300px"` on `.mermaid-wrap`.

All four types are pre-themed hand-drawn — skeletons:

**Flowchart** (default; TD preferred, `&`-chains and subgraphs fine):
```
flowchart TD
  subgraph GROUP["Group label"]
    A["multi<br/>line"]
  end
  A -->|"edge label"| B["other"]
  style B fill:#d3f9d8,stroke:#2f9e44
```

**Sequence**:
```
sequenceDiagram
  autonumber
  participant U as User
  participant S as System
  U->>S: request
  S-->>U: streamed reply
```

**Git graph** (branch/merge/publish stories):
```
gitGraph
  commit id: "v1.0" tag: "published"
  branch feature
  checkout feature
  commit id: "work"
  checkout main
  merge feature id: "approve = merge"
```

**ER diagram** (data models; attribute types are single words):
```
erDiagram
  OWNER ||--o{ THING : has
  THING { string id PK }
```

Node emphasis uses **theme-aware palette tokens** (substituted at render time so the
node re-colors on theme toggle — raw hex would freeze it in one theme):
`style NODE fill:@green-fill,stroke:@green,color:@ink`. Available tokens: `@blue`,
`@red`, `@green`, `@orange`, `@violet` (strokes), their `-fill` variants (backgrounds),
and `@ink` (label text). Always include `color:@ink` on styled nodes.

Per-diagram layout override (e.g. when ELK scatters a cyclic flow that should read
left→right, like a lifecycle with loop-backs) — YAML frontmatter at the top of the
diagram source:

```
---
config:
  layout: dagre
---
flowchart LR
  ...
```

Rules: `<br/>` for label line breaks (never `\n`); quote labels containing
punctuation; 15+ elements → overview diagram + detail cards; emojis in labels are fine
(🤖 ⚙ ✋ used for ownership).

## 10. Wireframes

Screen-layout sketches from dashed flex boxes. Nest `.w-col` (column) and `.w-box`
(labeled box); size with inline `flex`. Box moods: `.hero` (blue), `.accent` (orange),
`.agent` (violet), `.ok` (green).

```html
<div class="wire">
  <div class="w-col" style="flex:0 0 18%"><div class="w-box">side nav</div></div>
  <div class="w-col" style="flex:1">
    <div class="w-box hero" style="flex:3">MAIN CANVAS</div>
    <div class="w-box" style="flex:0 0 30px">toolbar row</div>
  </div>
  <div class="w-col" style="flex:0 0 26%">
    <div class="w-box agent">AI panel 🤖</div>
  </div>
</div>
```

Stacks vertically under 700px automatically.

## 11. Phase timeline

Dashed spine with hand-drawn dots; each phase is a sketch card with meta tags and an
exit criterion. Alternate `.sk` / `.sk.alt` and accents.

```html
<div class="phases">
  <div class="phase sk" data-a="blue">
    <div class="phase-head"><span class="pid">P0 · Name</span>
      <span class="tag tag--model">size S</span>
      <span class="tag tag--model">deps: none</span></div>
    <p style="font-size:12.5px">What this phase builds.</p>
    <div class="exit"><b>EXIT ✓</b> the observable demo proving it's done.</div>
  </div>
</div>
```

## 12. Collapsibles & trees

Reference-weight material collapses; `open` attribute for must-see blocks.

```html
<details open>
  <summary>Collapsible title</summary>
  <div class="d-body">
<pre class="tree">
<b>root/</b>
├─ thing/        <span class="c"># dim comment</span>
└─ other/
</pre>
  </div>
</details>
```

`pre.tree` also serves for code/config snippets: `<b>` highlights names, `.c` dims
comments. It scrolls horizontally — long lines are safe.

## 13. Checklist

Hand-drawn empty checkboxes; use for acceptance criteria written as observable
behaviors. Usually wrapped in a green card.

```html
<div class="sk" data-a="green">
<ul class="checklist">
  <li>Criterion verifiable by demonstration, not assertion.</li>
</ul>
</div>
```

## 14. Footer

```html
<footer>
  doc name · date · sources · pointer to open questions
</footer>
```

## 15. Palette quick reference

| Var | Light | Dark | Fill var |
|---|---|---|---|
| `--blue` | #1971c2 | #74c0fc | `--blue-fill` #d0ebff / #1d3450 |
| `--red` | #e03131 | #ff8787 | `--red-fill` #ffe3e3 / #4a2222 |
| `--green` | #2f9e44 | #8ce99a | `--green-fill` #d3f9d8 / #1e3a24 |
| `--orange` | #f08c00 | #ffa94d | `--orange-fill` #ffe8cc / #3d2e18 |
| `--violet` | #9c36b5 | #da77f2 | `--violet-fill` #f3d9fa / #3a2242 |
| `--marker` | rgba(255,212,59,.45) | rgba(255,212,59,.22) | — |

Paper/ink: `--bg` #faf6ee / #191917 · `--surface` #fffdf7 / #21211e ·
`--text` #1e1e1e / #ece9e2 · strong borders via `--border-strong`.

Always reference the CSS variables in new markup, and the `@` palette tokens (§9) in
Mermaid `style` lines — never raw hex in either place. Both themes come free: the
template's ☀/☾ toggle (fixed top-right) overrides the system preference, persists to
localStorage, and re-renders all diagrams; it needs no per-page wiring.
