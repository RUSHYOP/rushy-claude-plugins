# 02 · Journey Schema — the output contract

The generated journey is one JSON object. Below is the exact shape of the gold `po_create_direct`, every block, with the **enumerations actually used** (scanned from the 197 slots / 146 tools / 493 rules). Match this structure and these vocabularies so every journey is consistent. Open the gold file alongside this doc as a worked example.

## Top-level blocks (12)

```
journey · prerequisites · slots[] · tools[] · rules[] · status_determination ·
flow · termination · post_conditions · post_options[] · linked_journeys · provenance
```

---

## 1. `journey`

```json
{
  "journey_id": "PO-CRT-001",            // <MODULE>-<ACT>-NNN
  "slug": "po_create_direct",
  "title": "Create Direct Purchase Order",   // from BPC_Comp_Act_ilbo / activitydesc
  "component": "PO",
  "bpc": "SCM / Purchase",
  "activity_code": "PoCrt",              // = activity_name in the CSV
  "screens": ["pocrtmain", ...],         // ordered ilbo list (ui_name lowercased)
  "intent": { "summary": "...", "utterance_examples": [...], "synonyms": [...] },
  "persona": [...],                      // who runs it (buyer, approver, ...)
  "variants": [ { "variant_id":"V1","label":"General PO","when":"po_type='1'","effect":"..." }, ... ]
}
```
`variants[]` are the discriminator-driven branches (General/Capital/Dropship/Consignment/Imports/LC/Manual). Each `when` is a discriminator predicate; `effect` lists which slots/rules it turns on.

## 2. `prerequisites`

```json
{
  "upstream_documents": [...],   // e.g. authorized PR / SO / quotation (with required source state)
  "master_data": [...],          // 11 in gold: supplier, item, currency, buyer, numbering series, ...
  "configuration": [...],        // 17 in gold: OU/company feature params (PURSYS/BUYERCONTROL, DEFSUPDET, BUDCTRLCAP, ...) each citing the SP that reads it
  "entitlements": [...]          // roles/permissions (e.g. approval authority for Create&Approve)
}
```

## 3. `slots[]` — one per UI control (gold: 197)

```json
{
  "slot_id": "numbering_series",
  "label": "Numbering Series",
  "scope": "header",                     // header | line | subscreen:<ilbo>
  "control": { "field":"cbonumberingseries", "kind":"masterdata_dropdown", "screen":"pocrtmain" },
  "requirement": "must_fill",            // see enum below
  "description": "...",
  "data_type": "char",
  "condition": null,                     // predicate that makes it apply (else null)
  "discriminator": true,                 // present+true only on real discriminators
  "valid_values": { "lookup_tool": "main_init" },
  "associated_slots": [ { "slot_id":"po_no","effect":"becomes_required","when":"numbering_series='~MANUAL~'" } ],
  "rules": ["PO-CRT-R002", ...],         // rule_ids that reference this slot
  "fallback": { "link_type":"service","ref":"pocrmn_ser_init","provides":["numbering_series"],"note":"..." },
  "default": { "value":"...","user_overridable":false,"semantics":"fill_if_empty" },
  "maps_to": { "api_property":"NumberingSeries","sp_parameter":"@num_series","db_column":null },
  "evidence": ["...pocrt_pocrtmain.htm", "...pocrmn_sp_crt_hdrsav.sql:519-523"],
  "obligation": "mandatory",             // mandatory | conditional | optional
  "fill_behaviour": "prefilled_default"  // see enum below
}
```

**Enumerations (use exactly these):**
- `scope`: `header` · `line` · `subscreen:<ilbo>`
- `requirement`: `auto_prefilled` · `must_fill` · `conditional` · `optional`
- `obligation`: `mandatory` · `conditional` · `optional`
- `fill_behaviour`: `auto_fetched` · `prefilled_default` · `user_entry` · `lookup` · `dependent_list` · `computed` · **`display_only`** (add for display fields — gold PoCrt had none mandatory-displayed, but Edit/Approve do; reviews require it)
- `control.kind`: `system_context` · `hidden` · `masterdata_dropdown` · `typed` · `enum_dropdown` · `lookup` · `display` · `boolean` (map from the `.htm` CSS class — see `06_screen_extraction.md`)
- `discriminator`: boolean (gold: 13 true). Set true **only** when the slot's value gates other slots/rules at the SP layer (see `05`, Discriminators).

`maps_to` triples a slot to its REST property, its SP `@parameter`, and its DB column. Fill what you can prove; `null` otherwise.

## 4. `tools[]` — one per task (gold: 146)

```json
{
  "tool_id": "create_po_commit",
  "purpose": "commit",
  "binding": {
    "service_name": "pocrmn_ser_crt",
    "task": "PoCrtMainSbt",
    "tasktype": "Trans",
    "sp_chain": [ { "seq":"1.1","sp":"pocrmn_sp_crt_hdrsav","role":"header_save","lvl":0,"writes":"po_pomas_pur_order_hdr (INSERT ...)" }, ... ],
    "api": { ... }                       // REST binding if an API spec exists (highest version)
  },
  "description": "...",
  "inputs": ["numbering_series", ...],   // slot_ids consumed
  "outputs": ["po_no", ...],
  "errors": [ { "error_id":"2130290","message":"Numbering series is mandatory","cause":"@num_series IS NULL","resolution":{...} } ],
  "evidence": ["...Po.csv", "...pocrmn_sp_crt_hdrsav.sql"],
  "rules_enforced": ["PO-CRT-R001", ...]
}
```

**`purpose` enum (gold uses):** `init` · `fetch_defaults` · `ui_cascade` · `help_lookup` · `commit` · `post_commit_fetch` · `verify`.
**Add (required by reviews):** `report` (terminal `_rprt_spo`, non-persisting — NOT a commit) · `ui_assist` (Default / Get-All-Quote-Line-No helpers that round-trip to the same screen).
Choose purpose by **write behaviour**, not task name (see `05`). The terminal commit(s) feed `termination.commit_options`; `report` outputs feed `termination.output_options`; `ui_assist`/`ui_cascade`/`help_lookup`/`init`/`fetch_defaults` are never finish-paths.

## 5. `rules[]` — one per validation (gold: 493)

```json
{
  "rule_id": "PO-CRT-R001",
  "kind": "required_slot",
  "bucket": "pre_variant",               // pre_variant | intra_variant
  "slots": ["ship_from_id"],
  "statement": "[required_slot] ship-from id null/'' → fin_german_raiserror 'PO' 1025213 ...",
  "condition": "@shipfromid is null or ''",
  "consequence": "fin_german_raiserror 'PO' 1025213 ...; RETURN",
  "error_id": "PO/1025213",
  "enforced_by": ["pocrmn_sp_crt_hdrsav"],
  "evidence": ["...pocrmn_sp_crt_hdrsav.sql:439-447"],
  "client_side": true,                   // true only if cheaply checkable in UI (mirror; server stays authority)
  "finish_paths": [ { "path":"create","enforced":true,"enforced_by":"pocrmn_sp_crt_hdrsav","error_id":"PO/1025213","evidence":"...:439-447" },
                    { "path":"create_and_approve","enforced":true,"enforced_by":"pocrmn_sp_apr_hdrsav","error_id":"PO/1025213","evidence":"...:1289-1294" } ]
}
```

**`kind` enum (gold uses all of):** `required_slot` · `conditional_required` · `forbidden_combination` · `forbidden_value` · `existence_check` · `range_or_tolerance` · `temporal_validity` · `computed` · `default_value` · `status_guard` · `cross_field_consistency` · `uniqueness` · `format` · `other`.
**`finish_paths[].path`:** `create` · `create_and_approve` · `subscreen:<ilbo>` — adapt per activity (`edit`, `approve`, `return`, `delete`, `report`/`run`, status verbs).
A rule is `client_side:true` only when it's a cheap null/range/mutual-exclusion check; deep validation stays server-side at commit. Each rule is grounded in the SP + error_id; decode `error_id`→text from the `*_Design_Error[_ ]Message.xlsx`.

## 6. `status_determination` — the silent Draft/Fresh layer

This is the block error-keyed extraction misses, because the authority SP (`pocomn_sp_setstatus`) **raises no error** — it does `SELECT @postatus = 'DF'/'FR'/'AM' ... RETURN`. In this drop the authority SP file is **absent** (it is only EXEC'd from `pocrmn_sp_crt_hdrchk:1691`, whose result is written to `pomas_podocstatus`), so the checklist below is reconstructed from `Vizuara_CreatePO_Review_15Jun.docx §5` + the TCAL doc. Carry it verbatim into `required_for_fresh`.

```json
{
  "summary": "Draft-vs-Fresh: a second required-set distinct from allowed-to-save.",
  "authority": { "sp":"pocomn_sp_setstatus","header_comment":"To set the Status of PO to 'DRAFT' or 'FRESH'.",
                 "invoked_from":"crt/apr commit chain at *_hdrchk","carries_flag":"allowdraftcreation",
                 "amendment_branch":"@amendmentno>0 ⇒ same predicates assign 'AM'","silent":"sets status & RETURNs, no error",
                 "absent_in_drop": true, "evidence":["...pocrmn_sp_crt_hdrchk.sql:1691,1737"] },
  "outcomes": [ {"status":"FR","when":"all required_for_fresh satisfied"},
                {"status":"DF","when":"any required_for_fresh missing"},
                {"status":"AM","when":"amendment (@amendmentno>0)"} ],
  "why_invisible_to_rules": "no error code ⇒ not in rules[]; separate tier.",
  "agent_guidance": "Drive required_for_fresh before commit whenever an approvable PO is the goal. 'Saved' ≠ 'Fresh'; only Fresh can be approved.",
  "required_for_fresh": [ /* the ~40 conditions below, each as {id, level, condition, slots[], evidence} */ ],
  "counts": { "conditions_total": 43, "enforced_in_our_drop": "..." }
}
```

**The required-for-Fresh checklist (→ Draft if any is unmet, on a plain Create with @amendmentno=0):**

- *Header/document:* exchange rate blank · supplier code blank · disposition-planned item + GR-option 'N' + non-Dropship · no line items · Imports PO with (INCO term blank | transport mode blank | INCO not in {FOB,CIF,CFS,EXW,CPT} | invoice-before-GR≠'N' | auto-invoice≠'N' | any line inspection-type≠'NO' unless feature on) · no schedule details · no warehouse-allocation details.
- *Line (per line):* qty/cost/cost-per blank · account unit blank · budget id blank on non-capital when BUDCTRLNCAP='Y' · budget id blank on capital when BUDCTRLCAP='Y' · dropship id blank on Dropship (potype=3) · proposal id blank on Capital when PURFAINTEG='Y' · accounting unit blank · no line schedule · matching type blank (non-Dropship) · schedule qty blank · sum(schedule qty)≠line order qty · single-schedule type but >1 schedule row · staggered type but ≤1 schedule/sub-schedule · adhoc item UOM blank · non-adhoc item UOM blank & item-type≠SR.
- *Schedule:* adhoc item account-usage blank (potype∉{2,3}) · staggered + analysis-applicable param + analysis/sub-analysis missing on a mapped account · non-stockable item account-usage blank (potype≠2).
- *Sub-schedule (warehouse allocation):* Consignment (potype=4) warehouse blank · stockable item types (RM/IM/FP/CO/CN/CP/SP/TL/UT/SC/PK) both warehouse & cost-centre usage blank · serial/SR items both blank (when feature off) · service/adhoc line cost-centre usage blank (non-capital) · GR-option 'N' + 2P matching + account-usage blank + (service|adhoc) + non-capital.
- *Document terms:* no pay-term doc-level detail · pay-term code blank · insurance term≠NONE & insurance amount blank · INCO term≠NONE & INCO place blank · receipt tolerance +ve blank (Q/B) · receipt tolerance −ve blank (Q/B) · tolerance% +ve blank (V/B) · tolerance% −ve blank (V/B) · Consignment with consignment rule=3 · supplier present but pay-term blank.
- *Tax (decisive final gate):* workflow on + `pomas_tax_status='NA'` + company has tax params ⇒ Draft · workflow off (or POHDR_SER_SAV save) + tax_status≠'A' ⇒ Draft. (This is the `po_common_vat_sp`/TCAL outcome — see `05` Integration.)

## 7. `flow`

```json
{
  "strategy": "slot_filling_start_anywhere ... (lifecycle-aware: see classification)",
  "path_discriminator": { "decided_up_front": true, "slots": ["approval_intent","approval_decision"], "elicit": "...", "routing_rule": "intent -> which screen; decision -> which commit", "source": "..." },  // OPTIONAL — only when the activity has entry+main screens and multiple entry-paths
  "paths": [ { "path_id":"bulk_list_approve", "intent":"...", "persona":"...", "when":"<discriminator predicate>", "enters":"<which screen>", "algorithm":["ordered steps"], "commit_tool":"...", "result_state":"...", "review_depth":"none|full" }, ... ],  // each path = one deterministic algorithm the agent runs after resolving the discriminator
  "elicitation_order": [ {phase, slots/description}, ... ],   // genesis: discriminators→header→lines→variant sub-screens→terms→commit. lifecycle: fetch→delta only. inquiry: filters.
  "process_flow": [ ordered steps ... ],                      // includes Step 0 LOAD + 0b GUARD for lifecycle
  "data_flow": [ { "from":{screen,task,produces}, "to":{screen,task,consumes}, "mechanism":"..." }, ... ],  // entry→main doc-number hand-off; never []
  "subflows": [ { "trigger", "nav_tool", "screen", "commit_tool", "condition" }, ... ],                     // each "Specify…" with its OWN commit
  "validation_policy": "client_side mirrors only; server owns deep validation at commit."
}
```

## 8. `termination`

```json
{
  "readiness": "all must_fill + applicable conditional slots filled; required_for_fresh for an approvable PO",
  "commit_options": [ { "option":"Create","tool":"create_po_commit","result_state":"FR" }, ... ],  // EVERY commit (Approve+Return, Edit+Edit&Approve+Delete, ...)
  "output_options": [ { "option":"View/Print Register","tool":"...viewreTr","produces":"po_register_report" } ],  // for reports only
  "success_signal": "commit chain returns without raiserror; doc number minted; status set",
  "on_failure": "surface verbatim SP error (error text from xlsx) + map to rule+slot; loop",
  "incomplete_handling": "...",
  "draft_fresh_decision": "..."
}
```

## 9. `post_conditions`
```json
{ "document_state":"FR (amendment 0)", "tables_written":{ "<table>":"what" }, "output_variables":[...], "state_contracts_published":[...] }
```
For a **report**: `tables_written: {}` and `document_state: null` (never "FR").

## 10–12. `post_options[]`, `linked_journeys`, `provenance`
- `post_options[]`: next legal journeys (e.g. po_approve when status FR), each with `when` / `carries`.
- `linked_journeys`: `{ upstream[], sub_journeys[], alternatives[] }`.
- `provenance`: `{ sources[], extraction_date, coverage:{screens_inventoried, slots_total, by_requirement, tools_total, rules_total, by_obligation, by_fill_behaviour, gaps[]}, confidence }`. **Be honest in `gaps[]`** — list what was mechanically derived vs SME-verified, and every `external_dependency` (absent SP/component).

---

## Per-class schema adaptations

The blocks above are the genesis (Create) shape. Adapt by class (full detail in `04_activity_classification.md`):

- **lifecycle** (Edit/Approve/Amend/Hold/Short-close/Return): add `process_flow` Step 0 **LOAD** (fetch existing doc) + Step 0b **GUARD** (entry_precondition = legal-from-status set); add slot attr `locked_on_existing`; add activity attr `commit_semantics` ∈ {validate, consume, revise, reverse, toggle, none}; add a **changed_set/diff** notion for Amend/Edit; elicit the **delta** only. Discriminators are **locked & fetched**, not elicited.
- **inquiry / report**: NO `commit_options` → `output_options`; all filters `optional` (no mandatory); rules are **filter validations** (range/temporal), not "blocks save"; `tables_written:{}`, `document_state:null`; terminal tool is the `_rprt_spo` report. Drop the discriminator phase.
- **master-sequence** (item activation across screens): model as a **composite** parent journey: ordered `process_flow` across activities (Main→Basic→Planning→[Manuf]→[Purchase]→[Sales]→Accounting→Update Status=Active), `data_flow` carrying the **entity key** (item code) into each; **conditional subflows** gated on Source/Usage flags; a **terminal activation** step (the status-change activity); rules **scoped per activity**.
- **processing** (Generate Supplier Rating): few slots, heavy backend; model the **generate** commit as compute-and-persist with a freshness/re-run contract; status is **derived** (classification band), not transitioned.
- **hub** (Purchase Hub): mostly **navigation links** to many activities; model launch links + state guards on each edge; little/no own commit.

---

## Chia-resolver consumption contract (so an agent can actually drive the journey)

The journey is executed by the Chia runtime: **Agent 1 → Brain SDK** returns `journey_id + guard + termination` (never the algorithm); **Agent 2** has **Finder** (locate the JSON), **Resolver** (the only LLM — three resolutions), **Executioner** (deterministic; runs the body step-by-step from the DB). **The full file never enters the LLM context** — the Resolver loads only a *thin slot view*. To support this, every journey MUST carry:

- **`slots[].description`** — a one-line, NL-friendly description per slot (human label + how-it-fills + lookup/fetched context + SP param). Source the label from the screen's label/heading cell text; this is the Resolver's input for **resolution #1 (slots→values)**. Do not leave it null.
- **`slots[].lookup_service`** (+ `fill_behaviour: lookup`) — for any field backed by a help-lens / master lookup (supplier, item, warehouse, analysis, budget, …), name the service the Resolver fires to resolve a friendly name → code (e.g. "Vikram metals" → supplier code). Derive from the screen's Help tasks.
- **`flow.path_discriminator` + `flow.paths[]`** — **resolution #2 (algorithm selection)**: the up-front intent that selects which deterministic path/screen the agent drives (see `04`).
- **`authorization`** (top-level) — **resolution #3**: the user-access/role service to fire + which terminations/paths it gates (e.g. create-and-approve, inline approve). If the role service is a framework component not in the drop, name it and add an `external_dependency`.
- **`thin_slot_view`** (top-level) — emit the exact projection the Resolver loads: `[{slot_id, label, description, fill_behaviour, lookup_service, discriminator}]`. This is the only slot data that should ever reach the LLM context; the full `slots[]`/`tools[]`/`rules[]` body stays in the DB and is run by the Executioner.

For **composite journeys**, also emit the `handoff` per edge: `field_map` (deterministic copy), `guard_node` (deterministic rule, e.g. PR approved AND uncovered_qty>0), or `decision_agent` (LLM reasons over the prior journey's output to produce the next input).
