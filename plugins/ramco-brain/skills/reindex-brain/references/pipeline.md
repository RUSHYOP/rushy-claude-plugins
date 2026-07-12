# Reindex pipeline — deep reference

How to add each kind of change, with the real component/gate/file names. Read the section
for the change you are making.

## Table of contents
- [The six stages + the pointer contract](#the-six-stages)
- [Add a parser / artefact](#add-a-parser--artefact)
- [Per-component ingest loop](#per-component-ingest-loop)
- [Cross-connections (edges)](#cross-connections)
- [Prompt & tools](#prompt--tools)
- [BM25 re-index](#bm25-re-index)
- [Run order for a coverage wave](#run-order)

## The six stages
1. **RAW** — `ramco-erp-brain/` (~390k files, 825 component dirs, 10 BPC). Immutable,
   read-only. Nothing the Brain does ever writes here.
2. **PARSER `P-*`** — extracts a *mechanical skeleton* to run-id'd JSONL registers at
   `brain/_registers/<parser_id>/<run_id>/*.jsonl`. Parsers never interpret; they capture.
3. **REGISTER family** — each register is a JSONL whose **first line is a
   `record_type:header`** carrying `counts.in/out/skipped_named` + residuals + named_skips;
   beside it `gates.json` holds `gates[]` of `{gate, expected, actual, pass}`, plus
   `manifest.json` and `_residuals.jsonl`. There are 19 family subdirs
   (16 `P-*` + `registry-sweep`, `gen_sp_callgraph`, `activation_gates`, `named-skips`).
4. **GENERATOR `gen_*.py`** — *pure projection* of registers into wiki pages. Never reads raw,
   never invents, cites ≥1 register per line, idempotent, ends in a self-gate. Reads only the
   `accepted` pointer via `parserlib.resolve_pointer(pdir, which)`.
5. **WIKI** — `brain/components/<comp>/` L1–L6 pages + overlays (`journeys/`,
   `screens/**/a2ui/`, `migration_layer/`) + `brain/kb/` machine projection JSON.
6. **INDEX** — one unified BM25 inverted index + a table-of-contents tree
   (`index.md` / `_index.md` shards).

**Pointer contract (the core non-regression device).** Each register family has two pointers:
- `accepted` — last fully-passing `--accept` run = the gated baseline. **Generators and
  cross-parser joins read only this.**
- `current` — last successful run of *any* mode (may be a scoped/ungated batch).
- A failed `--accept` run is suffixed `.FAILED` and writes **no** accepted pointer.
- On unelevated Windows (`os.symlink` WinError 1314) parserlib falls back to a plain
  `<name>.txt` pointer file holding the run_id.

`run_id` = sortable timestamp + mode suffix, e.g. `20260621T172333-accept`. Runs are never
overwritten — new runs sit beside old ones; only the pointer moves.

## Add a parser / artefact
1. **Add a class row** to `parser_plan.md` (V1 1–44) or `parser_plan_v2.md` (45–53). Choose the
   mode by the decision rule:
   - Build a real **PARSER** only if the source is *structured AND repeated at scale*
     (hundreds+ files/rows).
   - **HYBRID** if the structure is mechanical but the meaning is prose (parser captures the
     skeleton; the LLM reads the prose bodies).
   - **LLM-DIRECT** otherwise — with only a container/encoding shim that extracts *nothing*
     itself.
2. **Dispatch by magic bytes**, not extension: `PK\x03\x04` → OOXML, `\xd0\xcf\x11\xe0` → OLE2,
   size 0 → gap ledger. (71/139 `.docx` in this corpus are actually OLE2 Excel — extension
   lies.)
3. **Inherit the output contract** (§stage 3 above) and freeze a **golden-file regression
   suite** (a few real files with known expected counts). Register header must carry
   `{parser_id, parser_version, run_id}`; new parsers get their own semver (e.g. `v1.0.0`).
4. **Glob widening (adding more of an existing source)** — e.g. P-SP-SKEL G-37 added
   `**/RM/Sprocs/**`, `**/RM/Sprocs-Old/**`, `**/RM/RAMCOCLR/**`, `**/RM/Init/Sproc/**`:
   - the new globs must be **disjoint** from the existing glob (prove 0 overlap);
   - a per-BPC recount must assert `old_total + new_disjoint = new_total` with the delta
     **enumerated** (e.g. `49+149+4+30 = ~232`);
   - tag the new sub-classes (`logic_class ∈ {tsql, tsql_legacy, tsql_analytics, clr}`) — never
     silently merge into main counts;
   - a version bump re-runs the **newly-included dirs only**, not the whole corpus.
5. **Acceptance** (parser_plan §5, unchanged in V2): a parser that fails acceptance produces
   **zero** wiki-visible output; partial outputs are **deleted, not patched**; the first
   production batch still gets the LLM spot-audit (cross-read ≥5 random source files vs parser
   output) before any page links its registers. Only then does `--accept` write the `accepted`
   pointer.
6. **Rebuild run-maps** — `python _tools/build_runmaps.py` (writes `_tools/_work/*.json`).
   Generators use these because parsers batch at different granularity (P-SP-SKEL per-component,
   P-DDL/P-MXML per-comp-or-pointer, P-STATE per-BPC, P-XLSX/P-SWAG/P-XLS product-wide). For
   product-wide `--batch` registers that live only in `current`, `gen_l1` flips its lookup
   order.
7. **Re-run generators** — idempotent, register-only, so new rows flow into pages by projection.

## Per-component ingest loop
process_05 §1.4, the operator loop for one component:
1. **Scout** — confirm which artefact classes exist; write a `gaps.md` skeleton for missing ones.
2. **Mine (parallel)** — one extraction pass per artefact class; each writes structured output +
   reconciliation counts.
3. **Compile** — merge passes into wiki pages; cross-link slot↔rule↔service↔screen; update
   `index.md`.
4. **Lint** — run the reconciliation gates; resolve or *name* every failure; append to `log.md`.
5. **Maintain** — when new raw data lands, re-run **only** the affected pass, re-lint, and
   re-generate dependent journeys.

## Cross-connections
Five independently-generated edge layers weld ~620 component pages into one graph, all keyed on
the component **basename**:
1. `[[Name]]` **wikilinks** — resolved by basename anywhere in the tree.
2. `gen_cim_cardinality.py` — CIM publisher/subscriber topology from `Component_Dep_CIM.xls`
   (5,530 edges); cardinality from org hierarchy LO > Company > BU > OU.
3. `gen_sp_callgraph.py` — 277,328 caller→callee edges over 80,212 SP nodes from P-SP-SKEL
   `sp_exec_edges`. Edges classed `logic / raise_helper / relay / dynamic`; **raise-helper
   excluded** from the logic graph; `dynamic/relay/external` disclosed as an unresolved
   `frontier(...)`, never resolved by invention. Caps `DEPTH_CAP=6`, `REACH_CAP=600`.
4. `gen_reverse_indexes.py` (from P-CSV `xcomp_edges`, ~6,335) + `gen_cross_fk.py` (from P-DDL
   columns/udds/pks/view_edges).
5. `gen_journey_index` — `journeys_layer` **links** to `components/` and `screens/`, never copies.

To add an edge, **extend one of these generators** so it emits `[[Basename]]` links, honoring:
- **basename convergence** (a CIM page, a call-graph page, and a journey index all writing
  `[[NSO]]` must land on the same node);
- the **`_SER` alias merge** (205 service-subsets fold into their parent);
- the **backtick-escape** `` `CODE`† `` + footnote for a partner with no component page (a real
  gap, not a fabricated link);
- **gates**: `check_links.py` (exit 0 iff 0 dangling `[[links]]` — code spans stripped so
  `` `CODE`† `` escapes aren't flagged — and 0 unreconciled A2UI packs) and
  `verify_journeys.py` (jsonschema Draft-2020-12 against `journeys/format.json` v3.1 + every
  slot/tool ref resolves).

## Prompt & tools
The chatbot lives in `vercel_deploy/brain_chatbot/`. It never reads raw files; it navigates the
wiki with 9 tools under a system prompt.
- **System prompt** — `buildSystemPrompt()` in `src/prompt.js`. Sections: what the Brain
  contains (the BPC→…→SP spine + doc-type/suffix guide) · modules at a glance · the 9 tools ·
  how-to-work rules 1–10 (incl. 4a call-graph traversal, 6 ARM cross-check, 9 don't-lock-onto-a-
  component, 9a don't-refuse-a-vague-question, 10 enumerate-before-answering) · answer format
  (lead direct, cite codes exactly, **end with a Sources section** of repo-relative paths read).
  Doc counts are injected at runtime via `indexMeta()`.
- **Tool descriptions** — `TOOL_SCHEMAS` in `src/tools.js`; each `function.description` tells the
  model *when* to use it. The 9 tools: `search_brain` (BM25, start here), `read_page`,
  `read_journey`, `list_journeys`, `list_component_pages`, `grep_brain`, `find_service` (C7 API),
  `find_config` (C9 params/gates), `trace_sp_validations` (call-graph). Each executor returns
  `{content, trace}`.
- **A new tool** = a `TOOL_SCHEMAS` entry (schema + description) + an `EXECUTORS` executor + an
  `indexStore.js` function.
- **Additive only** — append or clarify; never remove/contradict an existing rule.

## BM25 re-index
`scripts/build_index.js` builds ONE unified inverted index over ~22,733 docs: `brain/**/*.md`
(17,516) + `brain/kb/**/*.json` (3,724, but **skip** `layer7_callgraph.json`) + all
`journeys/**/*.json` (1,493). One file = one doc (no chunking); type-capped bodies; field-weighted
(title 3×, component 2×); Okapi BM25 `k1=1.4 b=0.75`; `TYPE_BOOST` (component 1.35 … screen 0.68);
entity-alias linker (`aliases.json`, ~1,111 aliases) boosts entity-linked docs ×1.8/×1.45; shared
`src/tokenizer.js` splits camelCase/snake_case. Deterministic, dependency-free, ~6s. **Always
rebuild the index after adding pages** or the chatbot can't find the new content.

## Run order
For a coverage wave (master_plan_v2 P8/P9):
- **P8.0 is run-anytime** — glob widenings + named-skip enumeration + prose refresh: they only
  ADD registers / fix prose and break nothing, so run them immediately.
- **P8.2–P8.9 are gated** on the V1 pipeline being done (they consume V1 registers), and fan out
  per gap.
- **P9 is a barrier** — re-run dependent overlays (journeys / migration / A2UI / semantics),
  re-run the Layer-1 eval as a regression check, and lint (0 dangling + cross-parser gates).
