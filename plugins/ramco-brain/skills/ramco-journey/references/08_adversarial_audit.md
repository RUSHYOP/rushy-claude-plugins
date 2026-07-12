# Reference 08 — The Adversarial Audit (the final, mandatory gate)

> Run this **after** the journey is built and `scripts/validate_journey.py` passes **0 FAIL**.
> The validator is mechanical and checks *structure*. This gate is **semantic and source-grounded**, and it is run by a **fleet of adversarial agents** whose only job is to **prove the journey wrong**. A journey is not "done" until it survives this.

---

## 1. Why this gate exists — what it targets

A journey has two layers, and they fail very differently:

| Layer | How it's produced | Reliability |
|---|---|---|
| **The skeleton** — screens, tasks, SP chains, slot inventory | *Deterministic* scripts reading the CSV + `.htm` | High. If a script emits it, it's in the source. |
| **The authored semantic layer** — tool *purposes*, commit *result_states*, *discriminators*, *is_calls* cascades, *sub-flow* mappings, mandatory/display *classification*, *descriptions* | *Auto-generated / LLM-assisted* judgement | **Low. This is where every mistake lives.** |

Auto-generation does not produce random garbage — it produces **plausible-but-false** content: a task id that looks exactly like a real one but doesn't exist (`PoCrtSoCovTrn1` for the real `PoCrtSoCovTran1`); an `is_calls` cascade copied verbatim from a sibling SP that the bound SP never actually calls; a `result_state` that reads sensibly ("Returned → Draft") but contradicts what the SP sets (`'RT'`, a status *distinct* from Draft); a discriminator flag stuck on a display *label* while the real editable combo it describes was never captured as a slot.

These are the errors a careful Chia-team reviewer will `grep` for — and **finding one makes them distrust the 95% that is correct.** For a shared source-of-truth artifact, the trust cost of a fabricated id is far higher than its runtime cost. This gate exists to catch them before the artifact leaves your hands.

**The audit assumes every authored claim is GUILTY until the raw source proves it innocent.**

---

## 2. The adversarial stance — five rules every audit agent follows

1. **Refute, don't confirm.** Each agent's job is to *find the hole*, not tick a box. Default the verdict to "wrong" and make the source overturn it.
2. **Ground independently.** Ignore the journey's own `evidence[]` pointers — they can be wrong too. Re-derive every fact from the raw `.htm` / `.sql` / `.csv` / `.xlsx` / Table DDL.
3. **Existence before semantics.** First prove every referenced id / SP / column *exists*. A fabricated id is a worse defect than a debatable label, and it's the cheapest to check.
4. **Two passes, not one.** Every verdict is re-checked by a *second, skeptical* agent that tries to refute the *first* agent. (In the audit that built this gate, the first auditor rubber-stamped a sub-screen commit; the skeptic caught that its approve tool was fabricated and bound to the wrong SP.)
5. **Grade by Chia-impact, not by how it reads.** An action that *breaks* outranks a label that *misleads*, which outranks a doc detail that's merely imprecise (see §5).

---

## 3. What to check — the probe catalogue

Run **one agent per probe** (for large files, one agent per `probe × screen`). Each agent gets: the probe's *target*, its *recipe*, the *defect signature*, and a structured-verdict schema (§4). Probes are grouped; **Group A is the highest-value — run it first and completely.**

### Group A — Fabrication & binding integrity (existence checks)
> The plausible-but-false layer. These are the trust-killers and the cheapest to verify.

| # | Target | Recipe | Defect signature | Sev |
|---|---|---|---|---|
| **A1** | Every task/tool id is real | Collect every id referenced in `tools[].binding.task`, `termination.commit_options[].tool`, `termination.subscreen_commits[].save/approve`, `flow.subflows[].*_tool`, `flow.data_flow[]` tasks. Grep each against `task_name` in `Service_details_<M>.csv` (case-insensitive) and the screen Tasks meta. | **Zero matches** = fabricated id. | **S1** |
| **A2** | Every SP exists or is declared absent | Every `sp` in every `sp_chain` is a real `*.sql` in the drop, **or** appears in `external_dependencies`. | SP file missing *and* not declared external. | S1/S2 |
| **A3** | SP family matches the tool's role | `*_apr*`=approve, `*_edt*`=edit, `*_ret*`=return, `*_del*`=delete, `*_spfy*`/`*_hdrsav*`=save, `*_hdrchk*`=validate, `povwmn`/`*_rprt*`=report. Compare to the tool's `purpose`/role. | Approve tool bound to a save/grid SP (or vice-versa). | S2 |
| **A4** | `is_calls` is truthful, not templated | For each bridge in a tool's `is_calls`, grep the **bound** SP for `exec <bridge>`. Then check whether the *same* `is_calls` array repeats across many tools/journeys. | Bridge not actually `exec`'d by the SP; or a verbatim-identical cascade copied across SPs (template signature). | S2/S3 |
| **A5** | Service + method resolve | `binding.service_name`/`method` exist in the CSV / API specs. | No such service/method. | S2 |
| **A6** | `db_column` resolves | `maps_to.db_column` is a real `TABLE.column` in the Table DDL. | No such table/column. | S3 |

### Group B — Source-fidelity of the authored semantics
> The claim is about a real object, but does it match what the object actually does?

| # | Target | Recipe | Defect signature | Sev |
|---|---|---|---|---|
| **B1** | Display vs input | Every `user_entry` slot maps to a real **input** control in the `.htm`; every `displayonly`/label control is `display_only`. | A `displayonly`/label control marked `user_entry`; an input marked `display_only`. | S2 |
| **B2** | Mandatory is screen-grounded | Every `mandatory` slot has the `*mandatory*` CSS class **on its own screen**, or is a real finish-path guard. Entry/search-screen mandatories must be screen-grounded, not imported from a commit-time validation SP. | A mandatory invented on a search screen the source leaves optional. | S2 |
| **B3** | Result-state truthfulness | For each commit, find the status its persisting SP `SET`s (`grep "pomas_*status *= *'XX'"`). Compare to `commit_options[].result_state` and `post_conditions.document_state`. | Claimed end-state ≠ status the SP sets (e.g. "Returned→Draft" when the SP sets `'RT'`). | S2 |
| **B4** | Purpose truthfulness | A transtask whose chain writes a **MAIN** (non-`_tmp`) table = `commit`; `_tmp`-only / `povwmn` = `report`; Default / Get-All-… / `def_` = `ui_assist`; search/Get-Details = `fetch`. | A commit demoted to `validate`; a report or helper mislabeled as commit. | S1/S2 |
| **B5** | Discriminators are SP-grounded | Every `discriminator` slot must be (a) an **editable** control (not a `dsp*`/display label) **and** (b) its `sp_parameter` appears in a real `IF`/`CASE` branch in some SP. | A display label flagged discriminator; a flag whose param never branches; the real code-combo missing while its `*_desc` label is flagged. | S2/S3 |
| **B6** | Carried identity | The document key (e.g. PO No) is `display_only` on the main screen, typed/optional on the entry screen. | One typed entry slot only; no carried display-only main slot. | S3 |

### Group C — Completeness vs source (the historical blind-spots)
> What did the journey silently leave out?

| # | Target | Recipe | Defect signature | Sev |
|---|---|---|---|---|
| **C1** | All action tasks captured | Every `transtask` on every screen appears as a tool. | A screen action with no tool. | S2 |
| **C2** | All commits enumerated | Every persisting action in `commit_options` — main **and** entry-screen commits **and** each sub-screen's own save/approve. | A first-class outcome (Approve/Return/Delete/sub-screen save) absent or demoted. | S1/S2 |
| **C3** | All sub-screens reachable | Every `forwardlink`/`link` to a child screen is a `subflow`. | A "Specify…" sub-screen the main screen exposes but the journey omits. | S2 |
| **C4** | All controls captured as slots | Every input/select/displayonly control in each screen `.htm` has a slot. | A screen control (esp. an editable combo) with no slot. | S2 |
| **C5** | Cross-screen data_flow | Entry→main hand-off carries the doc key; **both** nav links (header + grid hyperlink) are represented. | `data_flow` empty or a missing nav link. | S2 |
| **C6** | Conditional triggers | Conditions that *force* a sub-flow visit (e.g. staggered/multi-schedule ⇒ Specify Schedule) are modeled and cross-linked to the sub-flow. | The trigger condition is absent or not linked to its sub-flow. | S3 |
| **C7** | External deps complete | Every absent-but-`exec`'d SP (TCAL `tcal_*`, workflow `WFM*`, budget, `pocomn_sp_setstatus`) is an `external_dependency`. | A silently-missing integration SP. | S2 |

### Group D — Internal consistency (does the file cohere with itself?)
| # | Target | Defect signature | Sev |
|---|---|---|---|
| **D1** | Reference integrity | `commit_options.tool`, `thin_slot_view[].id`, `rule.slots[]`, `slot.rules[]` all resolve within the file. | S2 |
| **D2** | subflow ↔ subscreen_commit parity | A subflow with no matching subscreen_commit, or vice-versa. | S3 |
| **D3** | Status vocabulary | Any `result_state`/status not in the documented PO status set (DF/FR/OP/RT/LI/SC/…). | S3 |
| **D4** | Path discriminators valid | `flow.path_discriminator` slots exist and are genuine discriminators. | S3 |

### Group E — Lifecycle correctness
| # | Target | Defect signature | Sev |
|---|---|---|---|
| **E1** | Lifecycle = fetch-first | For Edit/Approve/Amend/Hold/Short-close: the **fetch** tool is the first `process_flow` step; header/discriminator slots are `auto_fetched`, not `must_fill`; elicitation is the **delta** only; no "discriminators first". | S2 |
| **E2** | Genesis = blank-fill | For Create/from-source: blank-start, `default → discriminator → mandatory` order is correct. | — |

> **One trap to avoid in the audit itself:** do **not** auto-flag a display-only document key (PO No) carrying `obligation: mandatory` as a bug — that is the SME-recommended "carried identity" pattern (mandatory in identity, `display_only` in fill). Distinguish "mandatory + `display_only`" (correct) from "mandatory + `user_entry`" (the real B1 defect).

---

## 4. The structured verdict (schema each agent returns)

```
VERIFY  = { finding_id, addressed: yes|partial|no, correct_vs_source: yes|no|uncertain,
            evidence_journey, evidence_source, residual_or_new_issue, severity: S1|S2|S3|none, confidence }
SKEPTIC = { finding_id, holds_up: bool, hole_or_correction, final_status:
            fixed | fixed-with-minor-gap | partial | not-fixed | new-mistake, note }
```

`evidence_*` must cite **specific** locations — a JSON path / `slot_id` / `tool_id` **and** a source filename + the exact token/line seen. "Looks fine" is not a verdict.

---

## 5. Severity — grade by what it does to Chia at runtime

Chia runs a journey as a **deterministic Executioner** firing Ramco *services*; the LLM **Resolver** only ever sees the `thin_slot_view` + `paths` + `authorization`. Grade accordingly:

- **S1 — Blocker (breaks an action).** A fabricated commit id, a missing required slot, a first-class outcome made unreachable. Chia would error or be unable to do the thing. **Must fix before the journey ships.**
- **S2 — Fix before sharing (misleads / mis-binds).** A wrong `result_state` (action fires, but Chia reports the wrong outcome), a mis-bound tool, a missing sub-screen/slot, a display field mis-typed mandatory. The core path works; correctness and reviewer-trust suffer.
- **S3 — Backlog / generator-level (depth & precision).** Templated `is_calls`, a heuristic discriminator basis, imprecise `db_column`. Doesn't change runtime; improve at the generator, ideally across all journeys at once.

**Gate rule:** any **S1** blocks; **S2** is fixed before the artifact is shared; **S3** is logged. Always separate **file-local** defects (patch the journey) from **generator-systemic** ones (fix the script + regenerate every journey).

---

## 6. How to run it — the workflow

Use the Workflow tool with `scripts/adversarial_audit_workflow.js` (a self-contained, parameterized version of the audit that produced this gate). It:

1. **Fans out** one verifier agent per probe (× screen for large files), each with the refute-by-default stance and its recipe.
2. **Pipelines** each verifier into a **second skeptic** that tries to refute it (two-pass).
3. Adds a **fresh-eyes critic** per file — an agent with *no* probe list, told only "find mistakes this file introduced that a checklist would miss."
4. **Synthesizes** a defect report sorted by severity, splitting file-local vs generator-systemic.

Invoke: `Workflow({ name: 'adversarial-journey-audit', args: { files: ['journeys/po_edit.json', ...], component: 'PO' } })` — or run `scripts/adversarial_audit_workflow.js` via `{scriptPath}`. Scale the fleet to the journey: a thin from-source conversion needs Group A + B; a transactional Edit/Approve needs all five groups.

---

## 7. What this gate is **not**

It is **not** `scripts/validate_journey.py` (`references/07`). That gate is deterministic and structural — it confirms the *shape* (no empty `data_flow`, commits present, display fields not `must_fill`). This gate confirms the *truth* — that every id exists, every binding is right, every state matches the SP, nothing was fabricated or templated. Run **07 first** (cheap, deterministic), then **08** (the adversarial fleet). A journey ships only when both pass and all S1/S2 findings are resolved.
