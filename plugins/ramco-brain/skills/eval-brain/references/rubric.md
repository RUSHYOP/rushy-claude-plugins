# Grading rubric — deep reference

The exact scale, verdict banding, gap taxonomy, and the discipline for judging fairly — with
worked examples of the two rules that matter most (drop non-questions; superset ≠ hallucination).

## The 0–5 judge scale
An integer score assigned by an LLM-as-judge (Claude Opus, effort high), instructed to be
**rigorous, skeptical, harsh but FAIR**:

| score | meaning |
|------:|---------|
| 5 | fully correct **and** complete |
| 4 | complete with only a trivial omission |
| 3 | core present, some specifics missing |
| 2 | topic present, major specifics missing |
| 1 | barely any expected content |
| 0 | absent or incorrect |

**Verdict banding (derived strictly from score):**
- `FULL` = score ≥ 4 — the Brain substantively answers as the ground truth does.
- `PARTIAL` = score 2–3.
- `MISSING` = score 0–1.
- `answerable` = score ≥ 2 (FULL + PARTIAL).

## Rule 2 in the scale: superset answers
The ground truth (`expected_response`) is often terse. If the Brain's answer **contains all the
important expected points, correctly**, it scores **5** — the fact that the answer says *more*
does not lower the score, and the extra content is **not** a hallucination. A **4** is only for a
genuinely *trivial* omission. Never dock points for comprehensiveness, paraphrase, or format.

A miss is when a **load-bearing** expected point is absent (→ 3 if core still present, 2 if only
the topic survives) or **wrong** (→ 0/1). "Load-bearing" = a point whose absence would make the
answer materially incomplete or misleading for the asker.

## Hallucination — the narrow definition
`hallucination = true` **only** when the answer asserts a fact that is **not supported by the
Brain or the sources** — an invented name, code, value, relationship, or rule. It is **not** a
hallucination to:
- include correct detail beyond the ground truth (that's a superset — Rule 2);
- paraphrase, reorder, or synthesize facts that *are* in the Brain;
- cite a differently-named page than the idealized `source_reference` (path-vs-information rule).

**Before flagging a hallucination, try to confirm the claimed fact is actually absent** (grep
`brain/`, read the cited pages). If it's present, it's grounded, not invented. Historically
grounding is strong — a clean validation run flagged ~20 fabrications / 484; a train run had
1 / 1453 — so a hallucination call should be the exception and always backed by "I looked and it
isn't in the Brain."

## gap_present vs the gap taxonomy
`gap_present = true` **only** for a genuine Brain **knowledge** gap. It is `false` if score ≥ 4,
**or** if the only shortfall is retrieval/surfacing (the fact is in the Brain; the chatbot picked
the wrong page). `gap_category` ∈:

| category | meaning / triage |
|----------|------------------|
| `NONE` | no gap (FULL, or only surfacing) |
| `RETRIEVAL_ONLY` | Brain holds the fact; chatbot surfaced the wrong one — a **prompt/tool** fix, not a data fix |
| `MISSING_SPECIFICS` | topic present, exact value/code/column absent |
| `STRUCTURAL_DIVERGENCE` | a wiki page contradicts the `kb` JSON (e.g. "0 REST bindings" vs 7) |
| `MISSING_ENTIRELY` | the fact is genuinely absent — needs a **new source** (reindex §A) |
| `INCORRECT` | the Brain's fact is wrong |
| `EXPECTED_UNVERIFIABLE` | the `expected_response` itself is wrong / out of Layer-1 scope — **exclude** it (Rule 1) |

`gap_severity` ∈ `none / low / medium / high`. Route `RETRIEVAL_ONLY` to a **prompt addition**
(reindex §C), `MISSING_SPECIFICS`/`MISSING_ENTIRELY` to a **new artefact** (reindex §A),
`STRUCTURAL_DIVERGENCE`/`INCORRECT` to a targeted fix, `EXPECTED_UNVERIFIABLE` to curation.

## Judge discipline (the CRITICAL rules)
- **Informational equivalence, not path/format matching.** The Brain's real layout differs from
  the bank's idealized `kb/<COMP>/layer{1,2,5,6}_*.json` scheme; grade on whether the *facts* are
  present. Use the GT→Brain layer mapping (report appendix). "Wrong file cited" is not a defect if
  the fact is there.
- **Confirm before accept, refute before fail.** Open the cited `kb/<CODE>/*.json` *and* grep
  `brain/` to try to disprove a gap before marking it; confirm a claim is in the Brain before
  accepting it (this is the anti-hallucination step).
- **Full credit only when the Brain genuinely contains the key expected facts** — not merely a
  plausible-sounding answer.
- **Standing traps** (mandatory): GRN = Goods Return Note ≠ GR (receipt) — conflation fails;
  ARM-only claims must be verified against an SP-derived layer, prefer the SP layer on conflict.
- **C20 checklist** items (the only explicit pass/fail in the source instrument) are adversarial:
  e.g. "generic PO approval steps without Capital context = FAIL", "missing any rule = FAIL",
  "output reconciles row-for-row = PASS".

## Worked examples

**Example 1 — superset is CORRECT (score 5, not a hallucination)**
Question: "What is the commit stored procedure for creating a direct PO?"
Ground truth: "`pocrmn_sp_crt_hdrsav`."
Brain answer: "The commit SP is `pocrmn_sp_crt_hdrsav`. It's reached via Activity `PoCrt` →
screen `PoCrtMain` → task `Save` → service `pohdr_ser_sav`, and it enforces the budget and
supplier-calendar guards before the header row is written."
Grade: **5, hallucination=false.** All important expected content (the SP name) is present and
correct; the extra spine/guard detail is correct context, a superset — never penalized, never a
hallucination (each fact is in the Brain).

**Example 2 — fabrication IS a hallucination (score 0/1)**
Same question; Brain answer invents "`po_sp_commit_v2`" (no such SP in the Brain).
Grade: **0–1, hallucination=true** — but only after grepping `brain/` and confirming no such SP
exists.

**Example 3 — drop the question (Rule 1)**
Bank item: question = "PO budget". No interrogative, two words, ambiguous.
Action: **exclude** with `exclusion_reason = "too-short/malformed"`. Do not score it; report it in
the excluded set. (Contrast: "What does GRN stand for?" is short but well-formed — keep it.)

**Example 4 — missing a load-bearing point (PARTIAL)**
Question asks for the *three* guards that block a PO amendment; ground truth lists budget,
warehouse, supplier-calendar. Brain answer gives budget + warehouse only.
Grade: **3 (PARTIAL)** — core present, a load-bearing specific (the third guard) missing;
`gap_category` = `MISSING_SPECIFICS` if the third guard genuinely isn't in the Brain, else
`RETRIEVAL_ONLY`.
