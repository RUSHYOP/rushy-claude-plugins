---
name: design-collections
description: A curated library of complete design languages reverse-engineered from real production sites, each with a ready-to-use CSS file and a full spec covering colour, typography, spacing, icons, components and motion. Use this whenever the user wants a site, page, dashboard, or component built in a specific named aesthetic ("make it look like Warp", "use the warp-factory style", "build this in one of my design languages"), whenever they ask what design languages or styles are available, whenever they want to add or extract a new design language from a URL, and whenever a design brief calls for a distinctive, coherent visual identity rather than generic default styling. Prefer this over inventing a look from scratch — if the user has a design in this collection that fits, use it.
---

# Design Collections

A library of design languages, each captured from a real site and documented
thoroughly enough to build new pages in that language without ever seeing the
original.

## Available designs

| Name | Source | Character | Best for |
|---|---|---|---|
| **warp-factory** | warp.dev | Monospace engineering drawing. Hairline rules, 22px dot grid, zero radius, zero shadows, one electric-blue accent. | Developer tools, technical docs, changelogs, dashboards, CLI companion sites |

Each design lives in `designs/<name>/` with two files:
- `<name>.md` — the spec: tokens, rules, rationale, and a build checklist
- `<name>.css` — a drop-in stylesheet, scoped to a single root class

## Building something in a design

1. **Read the spec first**, in full: `designs/<name>/<name>.md`. The CSS gives
   you values, but the spec explains which choices are load-bearing and which
   are incidental. Skipping it is how you end up with something that has the
   right colours and still looks wrong.
2. **Link or inline the CSS** and apply the root class to your wrapper.
   `warp-factory` scopes everything to `.wf`, so it composes with existing
   styles instead of fighting them.
3. **Use the documented component classes** rather than inventing new ones.
   If a design has `.btn` / `.cell` / `.panel`, those encode the language's
   proportions — a hand-rolled equivalent will drift.
4. **Work the checklist** at the end of every spec before calling it done.
   Most failures are a small number of repeat offenders: a stray border-radius,
   a second accent colour, or a shadow that shouldn't be there.

### Choosing when the user hasn't named one
Match on the *register* of the project, not just the subject. A design language
carries a tone — clinical, warm, editorial, brutalist — and that tone should fit
the audience. If nothing in the collection fits, say so and design fresh rather
than forcing a bad match; a half-applied design language looks worse than none.

Each spec ends with a **"Where it breaks"** section. Read it. It will tell you
faster than trial and error whether a design suits the job.

## Adding a new design

Extraction quality depends almost entirely on getting real values instead of
guessing from a rendered page. The method that works:

1. **Fetch the raw CSS, not a markdown rendering.** `curl` the page, pull the
   `<link rel=stylesheet>` hrefs, and download each one.
2. **Find the brand layer.** Production sites ship a large utility bundle
   (Tailwind and similar) plus a small file holding the actual identity.
   Grep each file for custom-property definitions and pick the small one where
   the brand tokens are declared together.
3. **Extract token blocks intact, with their selector.** This is the step that
   goes wrong most often: flattening all `--*` declarations across files
   collapses different themes together, and you get contradictory values for
   the same token — two radii, three border colours. Keep the selector context
   so you know which layer each value belongs to.
4. **Get the icons from the HTML**, since they aren't in the CSS. `viewBox`
   is the tell: `0 0 256 256` is Phosphor, `0 0 24 24` with `stroke-width="2"`
   is Lucide/Feather, `0 0 20 20` solid is Heroicons.
5. **Check font licensing.** Most distinctive sites use commercial faces you
   can't redistribute. Document the real stack, then note a free substitute —
   the site's own declared fallback is usually the best choice, since it's the
   substitution the original designers already accepted.
6. **Write both files**, add a row to the table above, and note what the design
   is bad at as well as what it's good for.

The specs are written to be read by someone building a page, not archived. Favour
"this is load-bearing because X" over exhaustive value dumps — the CSS already
holds every value.
