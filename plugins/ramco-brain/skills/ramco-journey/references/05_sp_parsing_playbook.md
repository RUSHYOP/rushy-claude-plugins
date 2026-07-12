# 05 · SP Parsing Playbook

The stored procedures are where the real logic lives. This is how to read them. Grounded in the SP interview (`SP_interview.md`) and verified against the drop.

## A. The task-type model (from the screen event)

Every screen **task** is one user event and calls exactly one service, which runs one or more SPs in sequence. Five task types:

| Type | Fires | SP behaviour | Signal |
|---|---|---|---|
| **init** | on screen launch | read-only; load combo/dropdown values for the OU/company | low — defines the valid data universe |
| **fetch** (`fet`/`hdrfet`) | once after init | read-only; default header+grid values; pre-populate when launched from another screen | low–med — pre-conditions/defaults |
| **uitask** (`UI`) | user enters a field + Enter | validate the value vs master; load dependent combos; default related fields | med — master-data deps & conditional defaults |
| **help** (`hlp`) | user clicks the lens/search icon | sets the popup's context (usually the OU); the real search is the popup's own task | very low — context only |
| **trans** (`trans`/`sav`) | user clicks a write button | validate end-to-end and COMMIT | **high — the heart of the activity** |

**Canonical trans (commit) chain** — memorise this:
```
1 hdrsav   header save  — validates header; stages to _tmp (SCM may insert MAIN header directly)
2 grdsav   grid save (×N rows) — each grid row → _tmp
3 hdrchk   THE critical SP — reads _tmp, runs document-level validation (conditional-mandatory,
           tolerance, parameter cross-checks, budget), mints the doc number (brief serialization
           lock), migrates _tmp → MAIN, fires workflow + VAT integration, sets status
4 workflow IS (conditional)  po_common_wf_sp — multi-level approval routing; control_flag output
5 VAT/tax IS (unconditional) po_common_vat_sp — GST/statutory taxes across all lines
6 IS calls (conditional)     other components (finance, budget, …) gated by control expressions
7 hdrref   header refresh — re-SELECT MAIN → return header to screen
8 gridout  re-SELECT MAIN item-detail → return grid to screen
```
`hdrsav`+`grdsav` are lightweight stagers; **`hdrchk` is where the business happens.** Why both: stagers give instant UI feedback; `hdrchk` holds the numbering lock only for the final mint step.

> **Same SPs serve all variants.** General/Capital/Dropship/Consignment all run the same SP set; branching is **inside** the SP, driven by `po_type` (1/2/3/4) and other params. When mining, look for branches in `IF/CASE` **and** in `WHERE`-clause filters.

## B. Write-detection → tool `purpose` (the classification that past journeys got wrong)

Classify a task by **what its SP chain actually writes**, not by the task/button name. Run on each SP:
```
grep -nioE "insert[[:space:]]+into[[:space:]]+[a-z0-9_.]+|update[[:space:]]+[a-z0-9_.]+|delete[[:space:]]+from[[:space:]]+[a-z0-9_.]+" <sp>.sql
```
Then classify each target table:
- **MAIN write** → target is a domain table **not** ending in `_tmp`/`_temp` (e.g. `po_pomas_pur_order_hdr`, `po_poitm_item_detail`, `prq_preqm_pur_reqst_hdr`, `prq_prqst_status_history`, `po_portn_return_dtl`). ⇒ **commit**.
- **TMP write** → target matches `_tmp`/`_temp` (`po_item_detail_tmp`, `cmn_availableqty_tmp`, …). Staging only. ⇒ NOT a commit.
- **Read-only** → only SELECTs. ⇒ init/fetch/help/ui_cascade/report.

| SP role / suffix | Real example (in drop) | Writes | `purpose` |
|---|---|---|---|
| `*_crt_hdrchk`, `*_apr_hdrchk` | `PO/SPS/pocrmn_sp_crt_hdrchk.sql` | **MAIN** + status | **commit** |
| `*_apr_hdrsav` (migrates directly) | `PO/SPS/poaprmn_sp_apr_hdrsav.sql` | **MAIN** hdr + doc-level detail | **commit** |
| `*_ret_docsav`, `*_del_docsav`, `*_can_docsav` | `PO/SPS/poaprmn_sp_ret_docsav.sql`, `poemn_sp_del_docsav.sql` | **MAIN** hdr + status (RT/DE) | **commit** |
| `*_rprt_spo` | `Pur_Req/SPs/PRQmnsrSpPrn1_Rprt_spO.sql` | **none** (SELECT-only) | **report** (terminal, non-persisting) |
| `*crtgrd`, `*grdsav`, `*grd` | `PO/SPS/pocrmn_sp_crtgrd.sql` | `_tmp` only | **validate** (grid stager) |
| `*_crt_hdrsav` (header stage) | header save | `_tmp` only | **validate** (header stager) |
| `*_def_*`, Default / Get-All-Quote-Line-No | `PO/SPS/pobud_sp_def_hdrsav.sql`, `pocrtqtnqtnlnk_sp.sql` | read-only or `_tmp` | **ui_assist** (round-trips to same screen) |
| `*uihdr`, `*umgrd`, `*ui*` | `PO/SPS/pocrmn_sp_uomumgrd.sql` | read-only | **ui_cascade** |
| `*_init*`, `*cbiuse*` | `GR/Sps/GRTmai103_sp_initStatus.sql` | read-only | **init** |
| `*_hdrfet`, `*_fetgrd`, `*HdrRef`, `*gridout` | `GR/Sps/gr_emn_sp_fet_hdrfet.sql` | read-only (a `delete …_tmp` scratch-clear is OK) | **fetch** / post_commit_fetch |
| `*hlp`, `*href`, `*_help` | `PO/SPS/pocrmn_sp_aprhref.sql` | read-only | **help_lookup** |
| `*_srch*`, `*_sch_*`, "Get Details" | `GR/Sps/gr_cen_sp_sch_hdrfet.sql` | read-only | **fetch** (a search/Get-Details is NEVER a commit) |

**Tie-breakers (suffix is NOT authoritative — read the body):**
- `def_` overrides the suffix: `prqcrtmn_sp_def_hdrchk.sql` is read-only ⇒ **ui_assist**, despite `hdrchk`.
- A `docsav` that only SELECTs is a header refresh ⇒ **fetch** (`pqpqtnrh_sp_hqafrh_docsav.sql`).
- "Save Search" SPs write only `_tmp` filter tables ⇒ read-side, not a commit.
- Commit confirmation beyond the table write: presence of `pocomn_sp_setstatus` / assignment to `*_podocstatus` / a status-history insert.

**Enumerate ALL commits.** Each terminal MAIN-writing SP is its own commit; an activity routinely has several (Approve **and** Return on both entry+main screens; Edit + Edit&Approve + Delete). Never collapse to one. Put every commit in `termination.commit_options`.

## C. Rule mining (→ `rules[]`, target hundreds)

Depth comes from mining **every** validation in **every** SP of the activity (especially the `hdrchk` and `grdsav`). For each error-raise, emit a rule.

Find them:
```
grep -niE "raiserror|fin_german_raiserror|@m_errorid|errmsg|error_id|RETURN" <sp>.sql
```
For each raise: capture the **condition** (the `IF`/`WHERE` that guards it), the **error code**, and which **finish-paths** it applies to (the same check often appears in both `crt_*` and `apr_*` SPs — record both).
- Map `kind` from the condition shape: null-check→`required_slot`; conditional null→`conditional_required`; mutual-exclusion→`forbidden_combination`; value not in set→`forbidden_value`; lookup-not-found→`existence_check`; from/to or tolerance→`range_or_tolerance`; date validity→`temporal_validity`; derived value→`computed`; default assignment→`default_value`; status precondition→`status_guard`; A-implies-B→`cross_field_consistency`; duplicate→`uniqueness`; pattern→`format`; else→`other`.
- Decode `error_id` → human text from `ModelInfo/*_Design_Error[_ ]Message.xlsx` (match on `spname` + `Sp_Errorid`). Put it in the rule's `consequence`/`statement` and the tool's `errors[]`.
- `bucket`: `pre_variant` (unconditional, always checked) vs `intra_variant` (only under a variant/discriminator condition).
- `client_side: true` only for cheap null/range/mutual-exclusion checks; deep checks stay server-side.
- **Exclude dead code.** Commented-out raises are not rules — note them as excluded (the gold journey did exactly this for `crtgrd:1025-1032` and `:2812-2829`). Validate by error code / SP name, not line number (SP drops differ by revision).

## D. Discriminators (→ `discriminator: true` + `variants[]`)

A discriminator is a slot whose **value gates other slots/rules at the SP layer** — NOT merely "it's a combo field". Identify by:
1. A param whose value drives `IF/CASE`/`WHERE` branches in the commit SP (e.g. `@po_type` 1/2/3/4; `@imports_flag`; `@num_series='~MANUAL~'`).
2. It makes other slots become required/forbidden (capture in `associated_slots` and in `conditional_required`/`forbidden_*` rules).
3. Enumerated combos (PO Type) get their code↔caption from the **component model XML metadata**, not an init SP — they won't appear in init traces.

Then build one `variants[]` entry per branch with its `when` predicate and `effect` (which slots/rules it activates). For **lifecycle** activities, discriminators are **locked & fetched** — surface read-only, never elicit.

## E. Integration-service (IS) / cross-component dependency tracing — the TCAL fix

This is the dependency that was previously missed. The tax computation is an integration service to the **TCAL** component, reached through a bridge SP; its targets are **not in this drop**, so it must be surfaced as an explicit `external_dependency`.

**Recipe (for each commit task):**
1. **Collect IS rows** from `Service_details_<M>.csv`: take the commit method(s) — `*_met_crt_hdrchk` / `*_met_edt_hdrchk` / `*_met_apr_hdrchk`/`_hdrsav` — and select every `lvl>0` row whose `parent_method_name` **contains** that method (parents are comma-lists → substring match). Record `service_name, method_name, spname, component_name, lvl`.
2. **Resolve each IS SP** by searching ALL `*/SPs|Sps|SPS` folders (the `component_name` column casing is unreliable).
3. **Recurse one level into the common bridges:**
   - **VAT/tax bridge** `po_common_vat_sp` (lives in `GR/Sps`; service `po_vat_local_is`). Parse its body for `exec <sp>` + the header "Object Referred" block. It EXECs `tcal_sp_credauth_hsave1`, `tcal_status_upd_sp`, `po_cmn_get_tran_mode_sp`, `po_vat_wh_validation_sp`, `po_dim_populate_sp`, `pocomn_sp_setstatus`, … and references TCAL views (`tcal_amount_dtl_vw`, `tcal_taxtype_tran_map_vw`, `tcal_tran_hdr`, `tcal_tax_hdr`) and the IGST rule sequence (`tcal_000xx`). This is the 9-sequence IGST tax-rule loop documented in `TCAL_Execution_Flow_and_Errors_V1.0.docx` (Seq 1–9: `tcal_IGSTDetTxDet_sp` … `tcal_IGSTDisTxCorr_sp`).
   - **Workflow bridge** `po_common_wf_sp` (also `GR/Sps`; service `po_common_wf_ser`). Resolves `destinationcomponentname='WFMTASKBAS'` via the Component Interaction Model, builds the workflow tran (CRAU on amendment 0, AMAU otherwise), and routes to `wfm_*_is_sp`.
4. **Emit `external_dependency`** for every called SP/component **absent** from the drop, naming the component, the bridge SP, and the business purpose. Mandatory entries for a PO commit:

| Absent SP / family | Component | Bridge | Purpose |
|---|---|---|---|
| `tcal_sp_credauth_hsave[1]`, `tcal_status_upd_sp`, `tcal_createparam_sp`, `tcal_IGSTDetTxDet_sp` (+9-seq IGST loop `tcal_000xx`) | **TCAL** | `po_common_vat_sp` | tax computation (GST/IGST), tax status |
| `po_cmn_get_tran_mode_sp`, `po_vat_wh_validation_sp`, `po_dim_populate_sp` | tax helpers | `po_common_vat_sp` | tran-mode, withholding validation, tax dimensions |
| `pocomn_sp_setstatus` | po/status | `*_hdrchk` / `po_common_vat_sp` | the Draft/Fresh authority (see F) |
| `wfm_amendment_is_sp`, `wfm_terminate_is_sp`, `wfm_shortclose_is_sp`, `wfm_processscm_is_sp` | **WFMTASKBAS** | `po_common_wf_sp` | approval routing / workflow |
| `pb_sys_budget_update_Is` / `po_pb_budget_val_sp` | **Pur_budget** | `po_common_local_is` | budget validate vs consume |

5. **Budget validate→consume shift:** on plain Create/Edit only **validate** is implied (no `*budget*val*` row in the PO CSV); on **Create&Approve / Edit&Approve** the budget IS that fires is the **consume** SP `pb_sys_budget_update_Is → pb_utilzationqty_upd_sp`, reached via the approval bridge `po_common_local_is` (FR→OP).

> The integration map must record the **call even when the callee is absent**. Silence is the exact failure Ramco flagged ("we did not find the dependency of Tax computation … po_vat_common_sp not getting highlighted … because TCAL component SPs were not considered"). The journey must show: *this commit depends on TCAL tax computation via `po_common_vat_sp`, whose 9-sequence IGST rules are external to this drop.*

## F. Status-determination mining (→ `status_determination`)

Status assignment is a **separate body of logic** from error-raising rules and is invisible to error-keyed extraction (it raises no error — it does `SELECT @status='DF'/'FR'/'AM' … RETURN`). Mine it separately:
```
grep -niE "podocstatus|_status[[:space:]]*=|select[[:space:]]+@[a-z_]*status|allowdraftcreation|setstatus|tax_status" <sp>.sql
```
- The PO authority SP `pocomn_sp_setstatus` is **EXEC'd from `pocrmn_sp_crt_hdrchk:1691`** and its result written to `pomas_podocstatus:1737`, but the **SP file itself is absent from this drop** → record it as an `external_dependency` and reconstruct the Draft/Fresh checklist from `Vizuara_CreatePO_Review_15Jun.docx §5.5` + the TCAL doc (the ~40 conditions are listed verbatim in `02_journey_schema.md`).
- Build the `required_for_fresh` tier as a **second required-set**, distinct from "allowed-to-save". The agent must drive these before commit whenever an approvable PO is the goal — *saved ≠ Fresh; only Fresh is approvable*.
- On amendment (`@amendmentno>0`) the same predicates assign `AM` — the checklist is lifecycle-aware and feeds the Amend journey too.

## G. UI-helper firing economy (informs `flow`/`process_flow`)

UI-cascade helpers (`supplier_ui`, `currency_ui`, `podate_ui`, …) **fetch live derived values** (e.g. the exchange rate for a currency+date+supplier) — they cannot be "baked into rules". But fire them **conditionally**, not on every step: call a helper iff (a) its output slot is empty, or (b) its trigger slot just changed; never overwrite a user-typed value (`??=` semantics). Example: entering supplier code fires `supplier_ui` (fills ship-from, name, tax region, pay-term in one shot); afterwards do NOT re-fire `podate_ui`/`currency_ui`/`shipfrom_listedit_ui` to repopulate already-filled slots. The final server validation at commit is never skipped.
