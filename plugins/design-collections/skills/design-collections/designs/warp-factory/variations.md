# Warp Factory — variation rules

The point of a design language is that two pages built in it look like siblings,
not photocopies. This file draws the line between what is **load-bearing** (change
it and it stops being warp-factory) and what is **free** (vary it, or every page
you build will be a clone of warp.dev/skill-doctor).

Read this before building anything. The spec tells you what the language *is*;
this tells you how far you can move inside it.

---

## Load-bearing — do not change

These five carry the identity. Break one and the result reads as a different
design language wearing warp-factory's colours.

1. **Monospace for everything, including headings.** The moment a proportional
   sans appears in an `h1`, the whole thing collapses into a generic startup page.
2. **Structure from hairlines, never elevation.** No shadows, no cards floating
   on grey. Sections divided by `1px solid var(--wf-line)`.
3. **`border-radius: 0`** everywhere except pills and status dots.
4. **One saturated accent.** A second competing hue destroys the language faster
   than any other single change.
5. **A dot lattice on the ground plane.** Density can move; presence cannot.

## Free — vary these deliberately

| Dimension | Range | Effect |
|---|---|---|
| **Accent hue** | Any single saturated colour | `#2a1eff` is Warp's. Swap `--wf-accent` and the page re-skins coherently — the language survives, the brand changes. Keep `--wf-accent-2` a desaturated neighbour of whatever you pick. |
| **Ground** | `#fff` · `--p-braun-white` · `--p-space` | Cool white is the default. Warm paper reads as documentation/editorial. Space reads as a product surface. |
| **Grid density** | 16px–32px | 22px is the source. Tighter = more technical, denser. Looser = calmer, more editorial. Keep the panel grid ~4px larger than the page grid so panels stay distinguishable. |
| **Base size** | 12px–15px | 13px is the source and is genuinely small. Long-form content wants 14–15px. |
| **Tracking** | `-1px` to `-3px` | `-2px` is the source. Less is softer; more is more architectural. |
| **Column rails** | 3, 5, or none | Five sixth-points is the source. Three works on narrower containers. Dropping them entirely is legitimate for app UI, where they read as noise. |
| **Casing** | lowercase-restore · sentence · title | Lowercase-restore is the strongest tell. Plain sentence case is a quieter register that still reads as the same language. |
| **Container** | 1080px–1320px | 1180px is the source. |
| **Icon weight** | Phosphor regular / bold / duotone | Regular is the source. |

## Cross-cutting knobs

Set these on the `.wf` root to re-tune a whole page at once:

```css
.wf {
  --wf-accent: #2a1eff;   /* the brand dial */
  --wf-maxw:   1180px;    /* container */
  --wf-gutter: 24px;
}
/* Grid density — override the background shorthand: */
.wf { background:
  radial-gradient(circle at 1px 1px, var(--wf-line-soft) 1px, transparent 0) 0 0 / 28px 28px,
  var(--wf-bg); }
```

For a dark section, apply `.band-dark` — it re-points the semantic tokens rather
than overriding individual rules, so every component inside adapts automatically.

---

## Registers

Three tested combinations. Each stays unmistakably warp-factory while reading
differently enough that nobody would call them the same page.

**Technical** (the source register)
White ground · 22px grid · 13px · `-2px` · rails on · lowercase-restore · blue accent.
For: developer tools, CLIs, API docs, status pages.

**Editorial**
Warm `--p-braun-white` ground · 28px grid · 15px · `-1px` · rails off · sentence
case · ink or deep-green accent.
For: long-form writing, research notes, changelogs, handbooks.

**Console**
`--p-space` ground via `.band-dark` on the root · 18px grid · 12px · rails on ·
lowercase · lilac or amber accent.
For: dashboards, monitoring, log viewers, anything that lives next to a terminal.

---

## Avoiding the clone

If you are building a page and it is starting to look like warp.dev's, these are
usually why:

- **You reused their section order.** Hero-left/report-right → three steps →
  three cells → FAQ is *their* page, not the language. See `patterns.md` for
  other section archetypes built from the same parts.
- **You copied the grade/metric block.** That is a skill-doctor component, not a
  warp-factory one. The underlying pieces — figure, caption bar, track, big
  number — recombine into many other things.
- **Every section is full-bleed 1180px.** Vary the rhythm: let a section be a
  two-column split, another a single narrow measure, another edge-to-edge.
- **You used their exact copy voice.** The lowercase headings do a lot of work;
  don't also borrow the terse imperative phrasing.

A good check: put your page and theirs side by side. Someone should be able to
tell they were made by the same *studio* and immediately see they are different
*products*. If they look like the same product, go back to the section rhythm.
