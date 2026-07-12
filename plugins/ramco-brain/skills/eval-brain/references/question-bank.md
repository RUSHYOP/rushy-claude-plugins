# The question bank + eval artifacts — deep reference

Where the ground truth lives, its shape, how answers are produced, the historical scores, and the
known eval gaps. Use this to load, curate, and interpret an eval run.

## Where it lives + format
- **Bank:** `BrainEvals-Layer1_V1.0`. Source of truth = `info_data/test_cases/
  BrainEvals-Layer1_V1.0.xlsx` (sheet "Ramco ERP Brain - EVALS"), converted to
  `BrainEvals-Layer1_V1.0.json`. Splits: `_train.json` / `_validation.json` / `_test.json`.
  (A separate `Ramco_Brain_Layer2_Sample_TestCases.xlsx` exists, but the scored eval is Layer-1.)
- **Size + split:** 2,419 cases; stratified 60/20/20 on (bpc × difficulty), seed 42 →
  train 1,453 / validation 484 / test 482.
- **8 fields per case:** `id`, `bpc`, `difficulty`, `category`, `question`,
  `expected_response` (the graded answer key), `source_reference`, `component`.
- **`source_reference` caveat:** it cites an idealized `kb/<COMP>/layer{1,2,5,6}_*.json` +
  `intents.json` + `_enum_registry.json` + `status_desc.xlsx` + ARM/DDL/CIM path scheme that
  **does not physically exist** in the delivered `brain/`. Grade on information, not path (see
  rubric).

## Facets (for stratified reporting)
- **bpc (11):** Purchase and Subcontracting 1062 · Payable Management 659 · Purchase 233 ·
  Inventory & PI CC 164 · PM 94 · Procurement 60 · Inventory 58 · BK 36 · Book Keeping 32 ·
  MAC 12 · GTS 9.
- **difficulty (4):** Simple 1444 · Medium 842 · Complex 122 · Very Simple 11.
- **category (C1–C18):** largest are C3 Cardinality/CIM 702 · C9 System Config & Setup 225 ·
  C2 Entity Relationships 218 · C1 Taxonomy 181 · C7 API 105 · C15 Reporting ~175 · C4 Business
  Flows 100 · C14 Schema/Data-Dictionary ~160. Labels are punctuation-fragmented (`C15:` vs
  `C15-`) — **merge to the canonical C-family before scoring.**

## How answers are produced (to reproduce a run)
- Via the `brain_chatbot` agentic API (`vercel_deploy/brain_chatbot/`, Claude on Bedrock),
  `curl POST /api/chat` (SSE).
- **Two-tier per question:** first an *unlimited* tool-rounds attempt; on error/limit, retry
  **capped at 25 rounds**. Each answer is labelled `answer_label ∈ {unlimited/completed,
  capped_fallback_25}` with `attempt`, `stop_reason`, `max_tool_rounds`, `reached_limit`. (In the
  clean validation run, 484/484 completed unlimited; 0 hit the cap.)

## Grading method (to reproduce)
Two independent LLM passes (Opus, effort high): **Answer** from the Brain only, then **Judge**
re-verifies against the Brain and scores 0–5. The judge must open the cited `kb` JSON *and* grep
`brain/` before marking a gap, and confirm each accepted fact is present. Per-question output
schema (all required): `id, score, verdict, gap_present, gap_category, gap_description,
gap_severity, correct_facts, missing_or_wrong, hallucination, suggested_resolution`.

## Artifacts an operator reads (latest run folder)
`info_data/test_cases/L1-result_v3.1/` (train, best-of) with a `validation/` subfolder (held-out):
- `answers.json` — `id, question, brain_answer, verdict, score, brain_sources, answer_label,
  _best_run`.
- `results.json` — full per-question incl. `expected_response`, `source_reference`, gap fields,
  `correct_facts`, `missing_or_wrong`, `hallucination`, `suggested_resolution`.
- `stats.json` — aggregated cross-tabs.
- `L1_GAP_Analysis.csv/.md` — thematic gaps G-L1-01..G-L1-16 (Ramco-resolution columns blank).
- `_work/judged/batch_*.json` (raw judge output) · `_work/raw_responses/q_*.json` (verbatim
  chatbot output) · `_work/judge_workflow.js` (the JUDGE_SCHEMA + discipline prompt).
- Calibration: `L1_Sample_Questions_for_Ramco_Scoring.csv` (55 sample Qs, 5/BPC) + a review SPA
  (`vercel_deploy/L1-result_v3.1_review`) queueing 333 curated cases (all hallucinations + all
  MISSING + all PARTIAL + a 5% FULL spot-check) for Agree/Unsure/Disagree human calibration.

## Historical scores (context for "did we regress?")
- **V1 first full run** (train 1453, 2026-06-20, FULL/PARTIAL/MISSING verdicts): FULL 38.7% /
  PARTIAL 42.3% / MISSING 19.0%, answerable 81.0%. Finding: 45.1% of shortfalls were
  *surfacing/synthesis* (info present, not assembled) — "surfacing before sourcing".
- **Train 2026-06-28** (0–5 judge introduced): mean 4.19, FULL 76.0%, answerable 95.6%,
  1 hallucination. After a CIM-cardinality fix: mean 4.29, FULL 79.4%.
- **Train v3.1 best-of** (2026-06-30): mean 4.329, FULL 82.5%, answerable 95.5%; 32 chatbot
  delivery hallucinations; gap mix NONE 1021 / MISSING_SPECIFICS 169 / RETRIEVAL_ONLY 97 /
  STRUCTURAL_DIVERGENCE 69 / EXPECTED_UNVERIFIABLE 45 / INCORRECT 30 / MISSING_ENTIRELY 22.
- **Held-out validation** (484, clean single run, fully-fixed chatbot): mean 4.178, FULL 79.5%,
  answerable 93.8%, 20 hallucinations. **This is the honest held-out measure.** Weakest
  categories: C6 Error Message 40% · C10 Tolerances 50% · C15 Reporting 53% · C2 Entity Rel 54% ·
  C17 SP_Chains 56% · C9 60%.
- **Product-wide (full 2,419-case)** re-run: FULL 56.0% / answerable 92.9% (71.6% of non-FULL
  classified as surfacing, not knowledge). ⚠️ Don't confuse this bank-level 92.9% *answerable*
  with the per-category 92.9% *FULL* figures (C9 in the 2026-06-28 run, C3 in v3.1).

## Known eval gaps (what the misses taught — for triage, not for penalizing)
- **Surfacing gaps G-20..G-29** (info present, not projected — cheap wins, fix by reindex §B/§C):
  G-21 CIM cardinality (~264 cases, biggest win), G-24 status_desc text (0% FULL), G-27 reverse
  indexes, G-28 enum value lists, etc. Doctrine: ~45% of misses recoverable with **no new data**.
- **Source-absence gaps G-1..G-19** (true knowledge gaps — fix by reindex §A / source sync):
  G-1 ARM/Product_Manuals absent, G-8 system-parameter defaults, G-9 error-failure reasons,
  G-10 report templates, G-13 the expected-answer key was pending.
- **V2 coverage-audit G-32..G-40**: the V1 L1–L6 core has **no** gap; all misses are perimeter
  (ARM ingestion, FAQ/regression, videos, feature-spec growth, WMS scan-flow, SP-glob blind
  spots, Analysis&Design, report zips, BMR PPTX). Lesson: the zero-loss doctrine was right; misses
  are "declared-not-built", "named-not-scheduled", temporal, glob-precision, and archive-opacity.

## Difficulty/BPC pattern (what to expect)
FULL% degrades Simple→Complex but answerability stays high — **the Brain rarely produces nothing;
it produces imprecise.** So scrutinize *functional-prose* answers (entity relationships, error
messages, SP chains, computation, reporting) hardest; technical categories (API, UI, schema,
CIM-post-fix) are reliably strong.
