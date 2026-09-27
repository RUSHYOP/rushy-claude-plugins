# Field Report — variation rules

Two pages in this language should look like issues of the same publication, not
reprints of one page. This file separates what is **load-bearing** (change it and
it stops being field-report) from what is **free**.

---

## Load-bearing — do not change

1. **Display serif, large and light, over a mono data voice.** The pairing is
   the identity. A sans headline, or proportional labels, and it becomes a
   generic landing page.
2. **Numbers lead.** Each major section surfaces a few large, true figures before
   any prose. A page that is mostly paragraphs is not using this language.
3. **Warm paper ground.** Not white, not grey. Grain may be dialled down, the
   warmth may not.
4. **One accent.** Italic accent word, index rule, one hot segment, one key line.
   A second hue for emphasis breaks it immediately.
5. **Rules, not containers.** 1.5px ink to open, 1px hairlines inside, no
   shadows, no rounded layout boxes.

## Free — vary these deliberately

| Dimension | Range | Effect |
|---|---|---|
| **Accent hue** | any single warm or deep hue: vermilion `#d9481f`, oxblood `#8e2a2a`, cobalt `#2447b8`, forest `#2f6b45` | Swap `--fr-accent`, `--fr-accent-ink`, `--fr-accent-soft` and `--fr-night-accent` together. Keep `accent-ink` ≥ 4.5:1 on paper. |
| **Ground warmth** | `#f4f1ea` (source) · `#f1eee6` (cooler) · `#f6efe2` (sand) | Cooler reads more technical, sand more archival. |
| **Grain** | 0 – 7% alpha | 5% is the source. Off entirely is fine for print-first pages. |
| **Display face** | Instrument Serif · Fraunces (opsz high, weight 300–400) · Newsreader Display | Must stay a high-contrast serif used light. |
| **Section rhythm** | 88–144px | Tighter for briefings, looser for annual reports. |
| **Hero size** | clamp max 104–160px | Shorter headlines can go bigger. |
| **Index style** | `01` · `§ 1` · `I.` | Keep it mono, keep the accent rule. |
| **Dark band** | none · one | Never two. None is legitimate for a pure ledger page. |
| **Container** | 1080–1320px | 1240px is the source. |

## Cross-cutting knobs

```css
.fr {
  --fr-accent: #2447b8; --fr-accent-ink: #1d3a96; --fr-accent-soft: #e4e9f8; --fr-night-accent: #8aa4f0;
  --fr-maxw: 1120px;
  --fr-section: 96px;
}
.fr .cells, .fr .tiles, .fr .figures, .fr .sequence { --cols: 3; }  /* column counts are variables */
```

---

## Registers

**Report** (the source register)
Paper + grain · vermilion · hero with four facts · one dark band holding the key
section · diagram and timeline allowed. For: project overviews, engineering
write-ups, launch retrospectives.

**Briefing**
Set `.band` styling on the whole page root (dark ground everywhere), accent lifted
to `#f08a63`, grain off, section rhythm 88px, no pull claim. One screen per
section. For: board or leadership briefings, status decks rendered as a web page,
incident summaries.

**Ledger**
Cooler paper, grain 3%, oxblood or cobalt accent, no dark band, tables and
meters instead of tiles and timelines, figures in 3 columns. For: annual and
quarterly reports, audit summaries, grant reports, public accountability pages.
`example.html` is in this register.

---

## Avoiding the clone

If your page is starting to look like the original, it is usually because:

- **You reused its order**: facts → cells → diagram → tiles → dark band →
  sequence → meters. Recompose from `patterns.md`.
- **You kept the dark band for "effort / timeline".** The band is for whatever
  matters most on *your* page — a single result, a quote, a decision.
- **Every section has a big-number grid.** Alternate: numbers, then a table,
  then a statement, then a sequence.
- **You copied the headline formula** ("X. *The Y* does Z."). The italic accent
  word is the device; the sentence shape is not.

The test: side by side, someone should say "same publication, different issue".
