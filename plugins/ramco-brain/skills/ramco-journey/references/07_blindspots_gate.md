# 07 · Blind-Spots Validation Gate

This is the **definition of done**, distilled from Ramco's seven review documents. Run `scripts/validate_journey.py` for the mechanical checks, then walk this list manually for the judgement checks. **A journey ships only when every applicable check passes.** Each check names the review finding it comes from.

Mark each: ✅ pass · ❌ fail (fix before ship) · ➖ N/A for this activity class.

## 1 · Commit / terminal-action classification
1.1 **Every task whose SP chain writes a MAIN (non-`_tmp`) table is `purpose: commit`** and appears in `termination.commit_options`. (Edit/Approve reviews F3/F4)
1.2 **All commits enumerated, not collapsed to one.** Approve activity has Approve **and** Return on *both* entry and main screens; Edit has Edit + Edit&Approve + Delete; entry screens often have their own commit. (Approve F3, Edit F3/F4)
1.3 **`_rprt_spo`/Print tasks are `purpose: report`** (terminal, non-persisting) — NOT `commit`, NOT `validate` — and live in `output_options`, never `commit_options`. (Edit F4, Print F2)
1.4 **Default / Get-All-Quote-Line-No and other same-screen helpers are `ui_assist`**, not `validate` and not a finish-path. (Edit F4, Approve F3)
1.5 **A search / "Get Details" task is `fetch`, never the commit.** (Item F5)
1.6 Each commit's `result_state` is the real outcome (approved/returned/edited/deleted/FR/OP), not a templated guess.

## 2 · Fill-behaviour & display-only
2.1 **No `*displayonly*` control (or label without a `*mandatory*` class) is `user_entry` or `must_fill`.** All such → `display_only` + `optional`. (Edit F2: 21 fields; Approve F2: 25 fields)
2.2 Computed totals, audit stamps, and `dsp…` lookup descriptions are `display_only`. (Edit F2)
2.3 Status fields (`txtstatus`/order status) are system-set `display_only`, never elicited. (Edit F2, Approve F2)
2.4 Mandatory obligations are grounded `screen_mandatory` (the `*mandatory*` class), not imported from a commit-time validation SP. (Approve F9, Edit F5)

## 3 · Cross-screen flow
3.1 **`flow.data_flow` is non-empty** for any activity with an entry/search + main screen: an edge carrying the doc number entry→main. (Edit F1, Approve F1)
3.2 **Both nav paths are tools**: the header `forwardlink` (typed doc-No) AND the grid `linkcolumn`/`mldbforwardlink` (selected row). Neither omitted. (Edit F7, Approve F6)
3.3 The main-screen doc-No slot exists and is `mandatory` + `display_only` + `derived_from` the entry selection. (Edit F8, Approve F7)
3.4 The entry/search screen forces **no** unconditional mandatory field (PO No is `conditional`, required only on the header-link path); the search-blindly-then-pick path stays open. (Edit F5, Approve F4, Print F3)

## 4 · Lifecycle-aware elicitation
4.1 For Edit/Approve/Amend/View/Report: `process_flow` Step 0 is the **fetch** of the existing doc; header/discriminator slots are pre-filled-from-fetch, not `must_fill`. (Edit F5, Approve F4, CreatePO §11)
4.2 Elicitation is the **delta** (Edit) or the **decision + date/reason** (Approve) — not the full Create header. (Edit F5, Approve F4)
4.3 `entry_precondition` (legal-from-status GUARD) is present for lifecycle activities. (CreatePO §11.2 gap 2)
4.4 `locked_on_existing` set on discriminators/type/series; `commit_semantics` set (validate/consume/revise/reverse/toggle). (CreatePO §11.5)
4.5 "Create & Approve" is the create-side approval SP set (`*_apr_hdrsav`) bound as a finish-path — not two journeys chained, not a nested function. (CreatePO §11; Journey review Q3)

## 5 · Discriminator grounding
5.1 Every `discriminator: true` slot is grounded in **SP-layer branching** (its value gates other slots/rules via `sp_parameter`), not the control kind "it's a combo". (Edit F6, Approve F5, Print F6)
5.2 `variants[]` each have a `when` predicate and an `effect` listing activated slots/rules.
5.3 For reports: **no discriminator phase** (filters are co-equal optional). (Print F6)

## 6 · Sub-screens & their own commits
6.1 **`flow.subflows` is non-empty** when the screen has "Specify…" `forwardlink`s; each is a nav tool to its child ilbo. (Edit F9, Approve F8)
6.2 **Each sub-screen's OWN commit task is modelled** (e.g. `pocrtschtran4` "Specify Schedule", plus its Approve). The two-tier commit structure (main-screen + per-sub-screen) is represented. (Edit F9)
6.3 **Conditional sub-screen triggers** are captured (e.g. staggered/multi-schedule ⇒ must visit & commit Specify Schedule & Distribution), not just a lone optional date on the main screen. (Edit F9)

## 7 · Activity-type correctness (esp. reports)
7.1 The journey's class (genesis/lifecycle/inquiry-report/master-sequence/processing/hub) matches the commit-write evidence. (all reviews)
7.2 A **report** has NO Create commit, NO Fresh `document_state`, `tables_written:{}`, optional filters, and filter-validation rules (range/temporal), not "blocks save". Intent reads "print/show", not "raise/create". (Print F1/F3/F5/F7)
7.3 The activity's terminal SP convention is honoured: `_rprt_spo` ⇒ report template.

## 8 · Master multi-screen sequences
8.1 Modelled as **one composite** journey (or parent + sub-journeys), not N disconnected single-screen journeys. (Item F1)
8.2 Ordered `process_flow` across member activities + `data_flow` carrying the **entity key** (item code) into each. (Item F1)
8.3 **Source/Usage conditional routing** as journey-level required visit-and-commit (Manuf iff manufactured; Purchase iff purchased/subcontracted; Sales iff usage=Sales) — not just intra-screen field rules. (Item F2)
8.4 **Terminal activation** present: the entity becomes Active via the status-change activity; Accounting mapping is its precondition; never "state unchanged". (Item F3)
8.5 Each member commit binds to the **real save** task (`IsDataSavingTask`/writes MAIN), not a read or help-lookup. (Item F5/F6)
8.6 The set is **complete** (no required member screen missing). (Item F7)
8.7 Rules are **scoped per activity** (no one global rule block copied into every member); cross-screen routing rules lifted to the composite. (Item F8)

## 9 · Integration / external dependencies
9.1 Every commit's **lvl>0 IS calls are enumerated** (VAT, workflow, budget, ICT, coverage write-back). (CreatePO §9.4)
9.2 **The tax dependency is surfaced**: this commit depends on `po_common_vat_sp` → TCAL tax computation (the 9-seq IGST loop). (Ramco email; TCAL doc)
9.3 **`external_dependency` records emitted for every called SP/component absent from the drop** (TCAL `tcal_*`, WFMTASKBAS `wfm_*_is_sp`, `pocomn_sp_setstatus`, budget). Silence on an absent dependency = fail. (Ramco email)
9.4 Budget validate→consume shift noted for the approve paths. (CreatePO §9.4)

## 10 · Status determination / required-for-Fresh
10.1 `status_determination` block present with the `required_for_fresh` tier (the ~40-condition Draft checklist), distinct from error-raising rules. (CreatePO §5)
10.2 The Draft/Fresh authority (`pocomn_sp_setstatus`) is recorded (and flagged absent-in-drop here). (CreatePO §5.2)
10.3 `agent_guidance` states "saved ≠ Fresh; only Fresh is approvable"; Create&Approve requires required_for_fresh satisfied. (CreatePO §5.6)
10.4 Amendment branch (`@amendmentno>0 ⇒ AM`) noted. (CreatePO §5.5)

## 11 · Node kind & state guards
11.1 The acted-on object's **node kind (A–E)** is tagged; status semantics match (transition lifecycle for A/B vs derived band for E vs degenerate for C). (Graph-validation v3)
11.2 **State guards on edges**: inter-doc links carry source-state preconditions (create-from-PR requires PR Approved + uncovered qty); intra-doc transitions guarded by current status. (Journey review Q5; Graph v3)
11.3 "Approve" is one function with multiple entry points (not multiple approve nodes); "bulk approve" is a loop over single Approve. (Journey review Q1/Q3)

## 12 · Provenance / coverage honesty
12.1 Every slot/tool/rule/dependency carries `evidence[]` (real `.csv`/`.sql`/`.htm`/`.xlsx`).
12.2 `provenance.coverage` counts are accurate; `gaps[]` honestly lists mechanically-derived vs SME-verified items and all external dependencies. (CreatePO §13)
12.3 Dead code (commented-out raises) excluded from rules and noted. (CreatePO §12)
12.4 **Depth check**: counts are in the right order of magnitude for the activity. A transaction create/edit/approve should have dozens of screens-worth of slots, dozens-to-hundreds of rules, and all tools — not a thin shell. (Ramco: "depth of the Create PO journey, ~20,000 lines")

---

### Quick scorecard to fill in `provenance`
`screens_inventoried · slots_total (by obligation, by fill_behaviour) · tools_total (by purpose) · rules_total (by kind) · commits_total · subflows_total · data_flow_edges · external_dependencies · required_for_fresh_conditions · confidence(gold/silver/bronze)`
