# Non-regression invariants — deep reference

These are the eight devices that let the Brain grow without ever losing what it already knows,
plus the zero-loss contract they enforce and the regression gate that proves a change is safe.
**Never weaken any of these** — they are the reason "positive delta only" is achievable.

## The zero-loss contract (frozen — process_05 §1.2)
1. **count-in == count-out**: every extraction records `(items_in_source, items_captured,
   items_skipped_named)`; lint FAILS if the three don't sum.
2. **skip only by class, never by item**: fine to skip a whole housekeeping class; never fine to
   drop an unclassified individual item. Anything not extracted is emitted as a **named residual**
   with a class label (`stub`, `zero_byte`, `encoding_exception`, `unmatched_binding`,
   `blank_spname`, `unresolved_root`, …).
3. **≥1 evidence path per claim**: a name (SP, service, control, table, API property) appears in
   the wiki *only* if it appears in a raw file; every fact carries a repo-relative evidence path.
4. **never invent**: an unresolvable binding becomes `null` + a named gap, never a guess.
5. **gaps are first-class**: every layer page and journey carries a `gaps` list. "A declared gap
   is healthy; a silent one is corruption."

## The eight non-regression devices

### 1. Accepted pointer advances only on gate pass
Outputs are run-id-suffixed and never overwrite prior runs. A failed `--accept` run is suffixed
`.FAILED` and writes **no** accepted pointer; generators and cross-parser joins read only
`accepted`. So a bad new run is **invisible to the wiki** until it passes every gate. (Real
example: the P-ASPX accepted baseline was `*-accept.FAILED` from a classifier bug, so its 17,723
rows never materialized until the fix was re-accepted — the wiki was never corrupted in the
meantime.) **This is your rollback**: if a new run regresses anything, just don't advance the
pointer.

### 2. count-in == count-out per class
Enforced by the `count_in/count_out` header on every register batch plus per-bucket sums that
reconcile to file/row totals. Example: the P-CSV accepted run carries 26 gates, all pass, incl.
the row-bucket identity `225822 + 23584 + 3402787 + 0 + 0 == 3652193`. Adding content **cannot
silently drop existing rows** because the sum must still reconcile.

### 3. Skip only by class, never by item
The named-skip class 53 (NS) enumerates every confirmed-noise class with a count + one-line
reason. Its Σ-reconciliation gate **partitions every distinct repo file path into exactly one
owning bucket** (a parser input set, `named_skips`, or `residuals`), pairwise disjoint, asserting
`|union| == |distinct repo file paths|`. Nothing can vanish unnamed.

### 4. ≥1 evidence path per claim + never invent
Generators emit a `path` (register) citation on every rendered line; the chatbot prompt mandates a
Sources section of paths actually read. The commit-chain SP is the tie-breaking authority when
sources disagree (screen says optional, SP raises an error → `must_fill`). New knowledge cannot
regress by asserting unsourced facts.

### 5. Gaps are first-class
`status.json` `gaps[]` is the single canonical gap registry with stable ids (`G-1 … G-40`). Every
`G-id` cited in any plan doc must resolve there (a lint rule). Closing a gap **names the sync/run
that closed it**; per-component `<comp>-gaps.md` pages surface named gaps. You convert a gap to
`closed` with provenance — you never overwrite the record.

### 6. Golden-file regression + tripwires
Golden files are **frozen** as the regression suite: any parser change must reproduce all golden
counts, or update them with an **explained changelog diff**, before the new version may run a
batch. Corpus tripwires catch *new* patterns instead of dropping them — e.g. P-SP-SKEL asserts
`SET @m_errorid=<nonzero>` count `== 0` corpus-wide; any hit is "a new guard style to capture, not
noise" (this found 430 live sites). A `raw_passthrough` schema-drift tripwire opens a
parser-update task when a new column/attribute/x-extension appears in >0.1% of records, rather than
silently carrying it.

### 7. Provenance-tagged UNION, not replacement
Broadening a source uses **unions with provenance**, never replacement. The UDD registry is a union
(DOCNUM 227 + EMOD 1,835 + per-comp patches = 1,986 distinct) with conflicts **logged**
(`udd_conflicts.jsonl` keeps all variants rather than merging). `component_param_registry` is a
keyed union (14,491 shared + 4,576 wms-only + 499 nf-only = 19,566) citing **both** sources.
Version supersedence keeps the highest `$File_version` and logs winner/loser. New sources are added
as **supersets** — prior rows are never lost.

### 8. Blast-radius re-run on any fix
When a parser is fixed: re-run **every** batch the broken version produced (the registry-sweep
manifest says which components each run touched); replace registers **atomically per batch**;
recompile dependent wiki pages and re-generate dependent journeys; re-execute cross-parser gates
(e.g. P-CSV↔P-MXML SP reconciliation) whenever either side re-runs. A version bump on
`status.json parsers.<id>` triggers this policy. Outputs never land in `ramco-erp-brain/`.

## Two ownership rules that prevent divergent copies
- **A fact class is specified in exactly ONE document; others link to it.** Per-component
  rules/enums/topology pages are canonical at `brain/components/<comp>/`; `journeys_layer` pages
  of the same name are **link-pages, never copies**. "status.json records state; log.md records
  history; process docs record intent — no information lives in two places."
- **"V2 adds sources, not new wiki ontology."** A new parser feeds existing layers; it never
  spawns an orphan page type that could drift.

## The Regression Gate (run this before advancing any pointer)
A change is safe only when all of these are green:

- `check_links.py` → **0 dangling** `[[links]]`, **0** unreconciled A2UI packs.
- `verify_journeys.py` → 0 schema-invalid journeys, 0 dangling refs.
- Every touched batch's `gates.json` → all `pass:true`; count sums reconcile.
- **Layer-1 eval re-run** (use the `eval-brain` skill): vs the last accepted run,
  **FULL% and answerable% must not drop**, and **no previously-FULL question may regress** to
  PARTIAL/MISSING. New coverage should only add FULL answers. Diff the per-question verdicts, not
  just the headline percentages.
- Manual spot-check of 3–5 previously-good questions → answers and citations unchanged or better.
- `status.json` → gaps opened/closed with the run that changed them; parser/generator versions
  bumped.

If any previously-answered question got worse, the change **regressed** the Brain: fix it, or
leave the `accepted` pointer on the prior baseline. Never accept a regressing run.
