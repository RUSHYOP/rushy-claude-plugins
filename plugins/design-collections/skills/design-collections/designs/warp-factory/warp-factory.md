# Warp Factory

> Design language extracted from **warp.dev/skill-doctor** (2026-08).
> All values below are transcribed from the site's own `.factories-landing`
> token block — not eyeballed from screenshots.
>
> **This file is the reference. It is not a template.** Read
> [`variations.md`](variations.md) for what you may change and the three
> registers, and [`patterns.md`](patterns.md) for section archetypes to
> recombine. [`example.html`](example.html) is a worked page in the editorial
> register — deliberately sharing no layout with the source site.

---

## 1. The one-sentence version

**An engineering drawing that happens to be a marketing site.** Everything is
monospace, everything is separated by hairlines rather than cards or shadows,
a faint dot-grid runs under the whole page, and exactly one saturated colour
(electric blue `#2a1eff`) carries every piece of emphasis.

If you take away one rule: **structure comes from rules and grids, never from
elevation.** There is no `box-shadow` anywhere in the body of this design.

---

## 2. What makes it recognisable

Five moves do almost all the work. Reproduce these and it reads as Warp Factory
even if you get details wrong:

1. **Monospace body copy at 13px.** Not just code blocks — the entire page,
   headings included. This single choice sets the whole tone.
2. **A 22px dot lattice** behind everything, at ~7% opacity.
3. **Five vertical column rails** running the full page height at sixth-points.
4. **Zero border radius, zero shadows.** Square corners on every surface.
5. **Lowercase sub-headings** with the first letter restored via `::first-letter`.

---

## 3. Colour

### Raw palette
The entire language is seven colours. Warp names them `--p-*`.

| Token | Hex | Role |
|---|---|---|
| `--p-8bit` | `#2a1eff` | Electric blue. The **only** accent. Links, CTAs, data fills, active states. |
| `--p-space` | `#1a1522` | Near-black ink, faintly violet. All primary text. |
| `--p-night` | `#0d0a3d` | Deep navy. Used **only** as a translucent base for rules — never solid. |
| `--p-lilac` | `#b7a4f2` | Accent-on-dark, e.g. text on a blue subnav. |
| `--p-braun-white` | `#fdfcf1` | Warm paper. Alternate section background. |
| `--p-yield` | `#eef17c` | Acid highlighter yellow. Hover-state fill, sparingly. |
| `--p-cool-white` | `#f6f5fb` | Cool panel fill. |

### Semantic mapping

| Token | Value | Use |
|---|---|---|
| `--bg` | `#fff` | Page |
| `--bg-panel` | `--p-cool-white` | Insets, summaries, code panels |
| `--fg` | `--p-space` | Headings, emphasis, `<b>` |
| `--muted` | `#5d5966` | Body paragraphs — note body text is *not* full-contrast |
| `--muted-2` | `#918d9a` | Eyebrows, captions, line numbers, footer heads |
| `--accent` | `--p-8bit` | Links, primary hover, fills, step numbers |
| `--accent-2` | `#7267ff` | Softer blue for inline marks and list bullets |
| `--code-fg` | `#2a2534` | Code text |

### Rules (borders)
Critical detail: **borders are never opaque grey.** They are always navy at low
alpha, so they tint to whatever sits beneath them.

- `--line: #0d0a3d29` (~16%) — real borders: sections, cells, figures, buttons
- `--line-soft: #0d0a3d12` (~7%) — grid dots, column rails, progress tracks

### Status
Desaturated and earthy. Never pure red/green — they'd fight the blue.

`--ok: #3f6b3f` · `--wait: #8a7d1a` · `--err: #b23a2f`

Status backgrounds are the same hue at 8–9% via `color-mix`, so a diff row
tints rather than blocks.

### Selection
`::selection { background: var(--accent); color: var(--bg); }` — full blue.

---

## 4. Typography

### Faces

| Role | Warp ships | Licence | Free substitute |
|---|---|---|---|
| Body + headings | `matterMono` (Matter Mono, Displaay) | **Commercial** | **Azeret Mono** — already Warp's own declared fallback, free on Google Fonts |
| Display (other pages) | `theFuture` | **Commercial** | Not used on skill-doctor; ignore |
| Sans (rare) | `matter` | **Commercial** | system-ui |

Weights actually loaded: **400, 500, 600**. Nothing bolder — there is no 700
anywhere in this language.

The shipped CSS defaults to Azeret Mono because that is the fallback Warp
themselves specify, so the substitution is theirs, not a guess.

### Scale
Base is 13px with `line-height: 1.65`. The scale is not modular — sizes are
hand-picked per component and frequently land on half-pixels.

| Element | Size | Line height | Weight | Tracking |
|---|---|---|---|---|
| Hero `h1` | `clamp(46px, 5.4vw, 72px)` | `0.94` | 500 | `-2px` |
| Section `h2` | `34px` | inherit | 500 | `-2px` |
| CTA / FAQ `h2` | `28px` | inherit | 500 | `-2px` |
| Feature `h4` | `18px` | inherit | 600 | normal |
| Card `h4` | `14px` | inherit | 600 | normal |
| Body | `13px` | `1.65` | 500 | normal |
| Description | `15px` / `13.5px` | `1.65` | 500 | normal |
| Small / meta | `12px`–`12.5px` | — | 500 | normal |
| Code / diff line | `11.5px` | `1.7` | — | normal |
| Eyebrow / caption | `9px`–`10px` | — | 600 | `0.08em`–`0.1em` |
| Big number | `46px` (stat) / `78px` (grade) | `0.8` | 500–600 | `-0.02em` / `-0.1em` |

### Two signature rules

**Negative tracking is absolute, not relative.** `letter-spacing: -2px` on all
headings. At 72px that's tight and architectural; at 28px it's aggressive. This
is deliberate — do not convert it to `em`.

**Lowercase-then-restore.** Sub-headings, nav links and footer links are set
`text-transform: lowercase`, then `::first-letter { text-transform: uppercase }`.
Result: sentence case that survives any input casing, with a terminal cadence.
Acronyms get an explicit `.upper-acronym` escape hatch.

`text-wrap: balance` is applied to all headings and lead paragraphs.

---

## 5. Spacing & layout

- **Container:** `--maxw: 1180px`, `padding: 0 24px`.
- **Section rhythm:** every `<section>` carries `border-bottom: 1px solid var(--line)`.
  Sections are divided by *lines*, not by whitespace.
- **Vertical padding:** 56–86px on hero areas, 18px inside cells, 14–16px in panels.
- **Gaps:** 12 / 16 / 18 / 22 / 24 / 34 / 40px. Roughly a 2px-quantised set,
  not a strict 4pt or 8pt grid.

### The dot grid
```css
background:
  radial-gradient(circle at 1px 1px, var(--line-soft) 1px, transparent 0) 0 0 / 22px 22px,
  var(--bg);
```
**22px on the page. 26px inside panels** (with a 1.2px dot). The difference is
intentional — a panel reads as a separate sheet laid on top, not a hole cut into
the page.

### Column rails
An absolutely-positioned `::before` spans the full page height, `1180px - 48px`
wide, with left/right borders plus five 1px vertical gradients at
16.67 / 33.33 / 50 / 66.67 / 83.33%. Pure decoration, `pointer-events: none`,
dropped below 860px.

### The cell pattern
Grid children share dividers via `border-left`, cleared on `:first-child`. At
mobile this flips to `border-top` with `:first-child` cleared. This is how every
multi-column region is built — there are no free-floating cards.

---

## 6. Shape, elevation, sizes

- **Border radius: `0`.** Universally. Two exceptions only:
  - `.chip` → `border-radius: 20px` (pill)
  - step nodes / status dots → `border-radius: 50%` (9px and 6px circles)
- **Shadows: none** in the page body. The single shadow in the entire stylesheet
  is on the nav dropdown: `0 14px 44px #0d0a3d24`. If you find yourself adding a
  second shadow, you have left the language.
- **Borders: always exactly `1px`.** No 2px emphasis borders.
- **Fixed sizes worth copying:** progress track `6px` tall · step node `9px` ·
  status dot `6px` · caret `6×12px` · icons `14px` · nav height `64px` ·
  large button `min-height: 46px`.

---

## 7. Icons

**Phosphor Icons** — identified from `viewBox="0 0 256 256"`, which is Phosphor's
canonical canvas. Confidence is high; the site does not name the library, so this
is inferred from geometry rather than a declared dependency.

Rules observed:
- `fill="currentColor"` — icons always inherit text colour, never hardcoded.
- Rendered at **14px** in buttons and links (a couple of 16px and 22px in nav).
- `aria-hidden="true"` on every decorative instance.
- Optical nudge: `transform: translateY(-1px)` to `translateY(-2.5px)` to sit on
  the monospace baseline.
- Only ~10 inline SVGs on the whole page — icons are used sparingly, as
  punctuation, not decoration.

For non-icon marks the language prefers **typographic glyphs**: `+` for list
bullets, `[+]` for expand affordances, `>` for prompts, a solid block for the
caret. Reach for a character before an SVG.

---

## 8. Motion

Fast, mechanical, and short. Nothing floats, bounces, or eases lazily.

| Purpose | Duration | Curve |
|---|---|---|
| Hover (colour/border) | `120–150ms` | default |
| Nav transforms | `250ms` | default |
| Entrance (bar fill, line reveal) | `420–700ms` | `cubic-bezier(.22, 1, .36, 1)` |
| Blink (caret, status dot) | `1s` / `2s` | `step-end` |

Sequenced reveals use a per-item `--metric-delay` / `--line-delay` custom
property rather than `nth-child` rules — so the stagger is data-driven.

`@media (prefers-reduced-motion: reduce)` disables the fill and reveal
animations outright. Honour this.

---

## 9. Components at a glance

- **Button** — square, 1px bordered, lowercase, `9px 14px`, 12px/600.
  Primary = solid ink, inverting to blue on hover. Ghost = white with blue border on hover.
- **Chip** — pill, 10px, uppercase tracked, optional leading status dot.
- **Figure** — 1px border, uppercase 9px caption bar with its own bottom rule.
- **Panel** — cool-white fill + 26px dot grid + 1px border.
- **Metric** — label/value flex row, then a 6px `--line-soft` track with a blue fill.
- **Diff line** — 30px gutter holding a single `+`/`-` marker (not a line number — that is why 30px suffices), tinted row background at 8–9%.
- **Step rail** — hairline connector with hollow 9px circular nodes, blue border.
- **Callout list** — monospace `+` in `--accent-2` at 22px indent.

---

## 10. Building in this language — checklist

- [ ] Monospace everything, 13px base, `1.65` line height
- [ ] Dot grid at 22px page / 26px panels
- [ ] Every section divided by a 1px `--line` rule
- [ ] `border-radius: 0` (chips and dots excepted)
- [ ] No shadows
- [ ] One accent only — resist introducing a second hue
- [ ] Body copy in `--muted`, not full black
- [ ] Headings at weight 500 with `-2px` tracking
- [ ] Sub-headings lowercase + `::first-letter` uppercase
- [ ] Eyebrows at 9–10px uppercase, `0.1em` tracking, `--muted-2`
- [ ] Phosphor icons at 14px, `currentColor`, baseline-nudged
- [ ] Hovers at 150ms, entrances on `cubic-bezier(.22, 1, .36, 1)`
- [ ] `prefers-reduced-motion` respected

## 11. Building in this language without cloning it

Sections 1–10 describe the language. They do **not** describe a page layout —
the hero split, the grade block and the three-step rail belong to
warp.dev/skill-doctor, not to warp-factory.

- `variations.md` — the five load-bearing rules, the free dimensions with
  their usable ranges, three registers, and the specific tells that mean you
  have drifted into cloning.
- `patterns.md` — five hero variants, ten body sections, and six page
  compositions built from the primitives above.
- `example.html` — a changelog in the editorial register: warm ground, rails
  off, 15px, table-led. Same language, unmistakably a different product.

## 12. Where it breaks

This language suits developer tools, technical docs, changelogs and dashboards.
It fights back when you need: dense photography (the dot grid clashes), long-form
reading (13px mono tires the eye past ~800 words), or a warm/consumer register
(the monospace reads as clinical). For those, borrow the *structure* — hairline
dividers, no shadows, one accent — and swap the mono for a humanist sans.
