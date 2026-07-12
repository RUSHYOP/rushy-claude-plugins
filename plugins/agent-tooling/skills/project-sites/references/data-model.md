# project-sites — data model, schemas & workflows

ONE builder emits three self-contained, offline, single-file site types — **docs**, **tracker**,
**tutorial** — all skinned by ONE canonical stylesheet (`assets/tailwind.css`) so they read as
one product. This file documents the shared conventions, all three JSON schemas, the block
vocabulary, the project-style overrides, and the `ingest-logs` archive schema.

```
node scripts/build.mjs <docs|tracker|tutorial> <in.json> <out.html> [options]
```

## Table of contents
- [Shared conventions](#shared-conventions)
- [The one stylesheet](#the-one-stylesheet)
- [Project-style overrides (must-have)](#project-style-overrides)
- [docs schema](#docs-schema)
- [tracker schema](#tracker-schema)
- [tutorial schema](#tutorial-schema)
- [Block vocabulary (docs + tutorial)](#block-vocabulary)
- [ingest-logs — the archive / journal](#ingest-logs)
- [add-day + the AI auto-update calendar](#add-day)
- [Optional lock](#optional-lock)
- [Hosting & verify](#hosting--verify)

---

## Shared conventions

- **The JSON is the source of truth; the `.html` is a rebuildable artifact** — never hand-edit
  the output. Re-running the build is idempotent (same input → same output).
- **XSS-safe by construction.** `tracker` and `docs` embed the data as JSON in a
  `<script type="application/json">` and render it client-side with `textContent` /
  `createElement` (never `innerHTML` on user data). `tutorial` is rendered server-side with
  every author string HTML-escaped. Either way, no raw HTML from the data reaches the DOM as
  markup — angle brackets, ampersands, quotes all display literally. Use the structured fields
  (URLs, block types) for links/markup, not embedded HTML.
- **URLs are scheme-checked** — only `http(s):`, `mailto:`, `#`, and relative URLs are allowed;
  anything else (e.g. `javascript:`) is dropped.
- **Self-contained.** CSS is inlined; Mermaid (docs + tutorial, when a `diagram` block exists)
  is inlined — no CDN. The ONLY external reference is the Google Fonts link, which degrades to
  system fonts if blocked (drop it entirely with `--no-fonts`).
- **Colour names → shared RXD `--lp-*` tokens** (docs + tutorial blocks): `accent`/`blue`
  (brand / info → `--lp-info`), `green` (success → `--lp-ok`), `amber` (warning → `--lp-warn`),
  `violet` (purple → `--lp-new`), `red` (error → `--lp-danger`), plus `text`/`muted`/`faint`.

Build options (all optional): `--project-css <path|url>`, `--project-css-only`,
`--project-theme <light|dark|auto>`, `--no-fonts`, `--title "…"`, `--lock [passcode]`
(`--lock-title` / `--lock-kicker` / `--lock-hint` / `--iter`).

## The one stylesheet

`assets/tailwind.css` is the ONE canonical sheet, banner-marked into sections:

```
/* === base (canonical) === */          shared --lp-* tokens + Tailwind utility subset
                                         (byte-identical to the original tracker-site base)
/* === tracker extensions === */         .tk-* status/progress primitives + archive (.tk-arc-*)
/* === docs extensions === */            .dp-* documentation-site primitives
/* === tutorial (.tut) extensions === */ .tut field-course / explainer primitives
```

All three templates REFERENCE classes from this one sheet — **do not author inline styles in a
template**. If a genuinely-new component style is needed, ADD its class into the matching
banner-marked section in the same `--lp-*` token style. Every colour goes through the tokens, so
a project re-skins by overriding the tokens (see below) — never hardcode a colour.

## Project-style overrides

The skill's own sheet is a **fallback**. If the host project has its own stylesheet, USE IT:

| Flag | Effect |
|---|---|
| `--project-css <path>` | Inline the project's CSS **after** the skill sheet. The skill's semantic classes are still emitted; the project CSS wins by cascade order. Re-skin by overriding `--lp-*` tokens (e.g. `:root{--lp-accent:#C026D3}`) or any `.tk-*/.dp-*/.tut` class. |
| `--project-css <url>` | Same, but `<link>`ed (and the URL's origin is added to the CSP `style-src`). |
| `--project-css-only` | Ship **no** skill sheet — inherit the host app's global CSS (for embedding the site as a route inside an app). Also drops the CSP so the host controls it. Combine with `--project-css` to inline/link a specific sheet, or omit it to inherit whatever the surrounding app already loads. |
| `--project-theme light\|dark\|auto` | Honor the project's default theme and **drop the standalone light/dark toggle**. `auto` follows `prefers-color-scheme`. Omit to keep the standalone RXD light+dark toggle (the default). |
| `--no-fonts` | Omit the Google Fonts link (and its CSP origins) — degrade to system fonts / inherit the app's fonts. Implied by `--project-css-only`. |

**Mapping guidance for a project re-skin:** the fastest path is to override the `--lp-*` tokens
in your project sheet (all components derive from them). To restyle a specific component, target
its class (`.tk-mscard`, `.dp-callout`, `.tut .card`, …) — your rule wins because the project
sheet cascades last. For an app-embedded route, use `--project-css-only --project-theme <t>
--no-fonts` so the page inherits the app's CSS, fonts, and theme and ships nothing of its own.

---

## docs schema

A documentation site: sticky left sidebar (grouped, collapsible, **scrollspy**), a hero, doc
sections, and rich blocks. `search` (top-bar filter) and the theme toggle are on by default.

```jsonc
{
  "title": "Orbit CLI — Documentation",   // REQUIRED — hero + <title>
  "brand": "Orbit Docs",                   // top-bar brand (defaults to title)
  "version": "v2.4.0",                     // small version pill by the brand (optional)
  "kicker": "reference · v2.4",            // eyebrow above the hero title (optional)
  "subtitle": "…",                          // hero lede paragraph (alias: "lede")
  "footer_left": "…", "footer_right": "…",
  "search": true,                           // top-bar search/filter (default true)
  "nav": [                                  // OPTIONAL grouped sidebar; else auto from `group`
    { "group": "Getting started", "sections": ["intro", "install"] },
    { "group": "Reference", "sections": ["commands"], "collapsed": true }
  ],
  "sections": [
    { "id": "intro", "title": "Introduction", "navtitle": "Intro (optional short)",
      "eyebrow": "overview", "summary": "one-line section summary",
      "group": "Getting started",          // used only if `nav` groups are omitted
      "blocks": [ /* …blocks… */ ] }
  ]
}
```

- Section ids are slugged and de-duplicated; each `<h2>` gets a `#id` anchor. The sidebar order
  follows `nav` (valid ids first; leftovers appended as "More"), else section order grouped by
  `group`. Scrollspy highlights the section nearest the top; the mobile drawer auto-closes on
  pick. Blocks: see [block vocabulary](#block-vocabulary) (docs supports the `steps`/`workflow`
  block in addition to the shared set; docs does NOT use `legend`/`stat-row`/`cards`).

## tracker schema

A status / progress dashboard: hero + stat tiles, milestone bars, two-column resource exchange,
a calendar month-grid with a click-to-open day modal, a daily timeline, and an **archive**
(journal) section. Every section auto-hides when empty; only `title` is required.

```jsonc
{
  "title": "Apollo Platform Rebuild",       // REQUIRED
  "brand": "Apollo Tracker", "kicker": "…", "subtitle": "…",
  "today": "2026-02-09",                     // highlights this day + calendar cell
  "footer_left": "…", "footer_right": "…",
  "stats": [ { "value": "92%", "label": "Test coverage" } ],
  "milestones_note": "…",
  "milestones": [ { "label": "Milestone 1", "pct": 100, "note": "…" } ],   // pct clamped 0–100
  "resources_note": "…",
  "resources": { "out": { "heading","subheading","groups":[{ "heading","items":[…] }] },
                 "in":  { … } },
  "calendar": { "start": "2026-01-12", "end": "2026-03-20" }, "calendar_note": "…",
  "timeline_note": "…",
  "days": [ { "date": "2026-02-09", "title": "…", "badge": "…",
              "bullets": ["…"], "note": "…" } ],
  "archive": { … }                           // see ingest-logs (or authored by hand)
}
```

- **resource item**: `{ kind:"file"|"website"|"video", title, desc?, url?, file?, tags?, note?,
  credentials? }`. `url` makes it a link (file → `download`; website/video → new tab). **tag
  chip**: a string, or `{ text, kind }` where `kind ∈ file|website|video|new|lock|size|filename`
  gets a semantic colour. **credentials**: `{ headers:[…], rows:[[…]], note? }`.
- **days** feed BOTH the calendar and the timeline (newest-first). A logged calendar cell is
  clickable → day-detail modal. `calendar` sets the month range (defaults to earliest→latest day).

## tutorial schema

A field-course / explainer: a hero (optional gradient-highlighted word), mono kickers, stat row,
legend, topic cards, and **hash-routed section pages** with prev/next. Content is
**yours to author per project** — invent the sections; keep the flow (hero → cards → section
views) and the depth.

```jsonc
{
  "title": "How a Search Engine Works",      // REQUIRED
  "highlight": "Search Engine",              // substring of title → violet→green gradient
  "kicker": "a field course · for new engineers",
  "brand": "field course · **search internals**",   // top-bar brand (inline formatting)
  "subtitle": "…",
  "legend": [ ["green","deterministic code"], ["violet","scoring"] ],
  "intro":  [ /* home blocks between legend and stat row */ ],
  "stats":  [ { "n":"12,480", "label":"documents", "color":"green" } ],
  "footer": "… **bold** …",
  "nav": ["why","parsing"],                  // explicit section order (ids); else declaration order
  "sections": [
    { "id":"why", "title":"Why it exists", "eyebrow":"orientation",
      "summary":"card description", "blocks":[ /* …blocks… */ ] }
  ]
}
```

- The home page auto-generates one card per section (numbered, in nav order). Each section becomes
  a hidden `#view-<id>` page; the router shows one at a time with prev/next.

## Block vocabulary

Shared by **docs** and **tutorial** section `blocks` (the tracker uses fixed sections, not blocks):

| type | shape | docs | tutorial |
|---|---|:--:|:--:|
| `prose` | `{ text, variant?: "lede"\|"note"\|"framing" }` — inline `` `code` ``/`**bold**`/`*em*`/`[t](url)` | ✓ | ✓ |
| `heading` | `{ text }` | ✓ | ✓ |
| `eyebrow` | `{ text }` (mono label + tick) | | ✓ |
| `list` | `{ items: […] }` | ✓ | ✓ |
| `stat-row` | `{ stats: [ { n, label, color } ] }` | | ✓ |
| `cards` | `{ items: [ { href?, n?, title, desc } ] }` | | ✓ |
| `callout` | docs `{ kind:"note"\|"tip"\|"warn", title?, body }` · tutorial `{ kind:<colour>, title?, body }` | ✓ | ✓ |
| `kv-table` | `{ rows: [ [k, v] ] }` | ✓ | ✓ |
| `table` | `{ headers: […], rows: [[…]] }` | ✓ | ✓ |
| `steps`/`workflow` | `{ steps: [ { title?, body } \| "…" ] }` | ✓ | |
| `code` | `{ title?, lang?, color?, code }` (docs adds a Copy button) | ✓ | ✓ |
| `legend` | `{ items: [ [colour, label] ] }` | | ✓ |
| `image` | `{ src, alt?, caption? }` (data: URLs allowed) | | ✓ |
| `diagram` | `{ code \| mermaid, caption? }` — Mermaid, `securityLevel:'strict'`, lib inlined on demand | ✓ | ✓ |

---

## ingest-logs

`scripts/ingest-logs.mjs` ingests a project's journal markdown into a tracker JSON's `archive`
section as **dated, verbatim** entries. Conditional on the files existing.

```bash
node scripts/ingest-logs.mjs --data tracker.json --dir /path/to/project
node scripts/ingest-logs.mjs --data tracker.json --file notes/worklog.md --file CHANGELOG.md
# then rebuild:  node scripts/build.mjs tracker tracker.json dashboard.html
```

- **Discovery**: with no `--file`, auto-discovers `mistakes.md` / `learnings.md` / `worklog.md`
  in `--dir` (default CWD). `--file` (repeatable) names files explicitly.
- **Dating**: a file is split on `##`/`###` headings whose text carries a date (ISO
  `YYYY-MM-DD`, `9 Jul 2026`, or `Jul 9, 2026`) into one entry per date. A file with **no** dated
  headings becomes ONE snapshot dated to **TODAY** (local date via `new Date()` at runtime; this
  runs in Node, so `Date` is real — override with `--today YYYY-MM-DD`). A substantive preamble
  before the first dated heading also becomes a TODAY snapshot; a lone `# Title` preamble is skipped.
- **Content is preserved VERBATIM** (escaped only at render time — never `innerHTML`).
- **Idempotent** — entries are keyed by **(file, date)**: re-ingesting unchanged content is a
  no-op (same date + same content-hash → skipped); changed content for a date **updates** that
  dated entry; a new date (e.g. a next-day snapshot of a changed file) is **appended** as a new
  dated snapshot. Safe to run on a schedule — unchanged history never duplicates.

The archive schema the tracker template renders (an expandable, dated, per-file section):

```jsonc
"archive": {
  "note": "…",                               // optional intro line
  "files": [
    { "file": "worklog.md",
      "entries": [
        { "date": "2026-07-09",              // YYYY-MM-DD
          "heading": "## 2026-07-09 — …",    // the original heading text
          "content": "…verbatim markdown…",  // rendered in a <pre> (escaped)
          "hash": "…sha256…" }               // used for idempotent no-op detection
      ] }
  ]
}
```

**Because the tracker now holds the canonical dated originals, the source `.md` files MAY be
deleted afterwards** — this script does NOT delete them; that is your call.

## add-day

`scripts/add-day.mjs` appends (or updates) one standup day — the common daily action.

```bash
node scripts/add-day.mjs --data tracker.json --date 2026-07-10 \
  --bullet "Shipped the API layer" --bullet "Fixed 12 eval failures" \
  --note "Milestone 1 — day 12 of 14" --today
node scripts/build.mjs tracker tracker.json dashboard.html
```

Idempotent per date: re-running for the same `--date` updates that day (add `--append-bullets`
to add to, rather than replace, its bullets). `--today` moves the highlighted day.

**AI auto-update calendar (the maintenance loop).** Because the state is one JSON file and the
build is one deterministic command, the AI (or a cron/CI step) keeps the calendar current: check
the local date, append a **brief, planned** task entry to the correct day via `add-day.mjs`
(idempotent per date), then rebuild + republish. Keep `tracker.json` in version control — its
diff is the changelog; the HTML can be regenerated anytime.

## Optional lock

Any finished page — docs, tracker, or tutorial — can be wrapped in a client-side AES-256-GCM gate
(decrypts in the browser via Web Crypto; no server) with `--lock <passcode>`:

```bash
node scripts/build.mjs docs docs.json out.html --lock 'correct horse battery staple'
node scripts/build.mjs tutorial t.json out.html --lock            # prompts for the passcode
```

The gate needs a **secure context** — HTTPS or `localhost`; it will not decrypt from a bare
`file://`. The whole security reduces to **passcode entropy**. Read `security-model.md` before
calling a locked page "secure". There is no recovery if the passcode is lost.

## Hosting & verify

The output is one self-contained `.html` — commit it, upload it, email it; works on any static
host (GitHub Pages, S3, Netlify, a shared drive). A locked page additionally needs HTTPS/localhost.

Verify in a real browser (serve over `localhost`; over `localhost` if locked). Confirm: correct
render in light AND dark, Mermaid renders (docs + tutorial), the tracker calendar days are
clickable and the archive expands, code-copy works (docs), ZERO console errors, and ZERO external
requests beyond the (optional) Google Fonts link. Tests: `node --test tests/*.test.mjs`.
