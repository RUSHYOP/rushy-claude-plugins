# 03 · Extraction Pipeline — the operating manual

Exact, ordered procedure for generating one journey. `ROOT` = drop root (default `/Users/raj/Downloads/Vizuara`); `SK` = this skill dir. Pick the component module `<M>` (PO/GR/Pur_Qtn/Pur_Req/SIN) and the `activity_name` (e.g. `PoCrt`). Open the gold `po_create_direct (1).json` beside you as the worked example.

> The scripts produce the deterministic backbone and accelerate depth; **they do not replace reading the SPs and screens.** Depth (the 197 slots / 493 rules target) comes from mining every SP and screen, not from the scripts alone.

## Stage 0 — Classify

```
python3 $SK/scripts/build_skeleton.py --csv $ROOT/<M>/ModelInfo/Service_details_<M>.csv --list
```
Find your activity, read its `activitydesc`, then classify it with `references/04_activity_classification.md` (class A–F + node kind A–E). The class decides which schema blocks dominate. Write down: class, node kind, the expected commit shape, and which template adaptations apply.

## Stage 1 — Skeleton (deterministic)

```
python3 $SK/scripts/build_skeleton.py --csv $ROOT/<M>/ModelInfo/Service_details_<M>.csv \
        --activity <ACT> --out /tmp/skeleton.json
```
You now have ordered screens → tasks → service → (method, spname) chains, with `is_calls` (lvl>0 integration sub-chains) resolved. This is the spine of `journey.screens`, `tools[].binding`, and `flow.process_flow`. Cross-check the screen/task list against `<M>_Comp_Act_ILBO_Service_Info.xlsx`.

## Stage 2 — Classify tasks → tool purposes (deterministic + read)

```
python3 $SK/scripts/classify_sps.py --root $ROOT --skeleton /tmp/skeleton.json
```
This reads each SP body across ALL component folders and assigns each task a `purpose` by **write behaviour**, lists the **commits**, and lists **external_dependencies** (absent IS targets — the TCAL/VAT/workflow gap). Verify the commits by hand against `references/05_sp_parsing_playbook.md §B` (the script is a strong first pass; confirm the terminal `hdrchk`/`docsav` MAIN writes). Inspect any single SP with `--sp <name>`. **Enumerate every commit** into `termination.commit_options`.

## Stage 3 — Slots (per screen)

For each `ui_name` in the skeleton, find its `.htm` (`$ROOT/<M>/ScreenObjects/<M>/*<ilbo>*.htm`) and run:
```
python3 $SK/scripts/extract_slots.py --htm <path/to/Activity_ilbo.htm>
```
This yields candidate slots (kind/obligation/fill_behaviour from CSS class), nav_links, and action_buttons. **Then read the `.htm` to refine** per `references/06_screen_extraction.md`: set the exact `control.kind` enum, confirm `display_only` for every `*displayonly*` control, confirm `screen_mandatory` for `*mandatory*` controls, set `scope` (header/line/subscreen), pull `maps_to.sp_parameter` from the matching SP params and `maps_to.db_column` from `Table/`. Add `associated_slots` for slots a discriminator gates.

## Stage 4 — Cross-screen flow

From the nav_links/action_buttons: map `forwardlink`s → `flow.subflows` (each "Specify…" with its child ilbo AND that sub-screen's own commit task from the skeleton); map the entry screen's **Search** action + grid **linkcolumn** + header **forwardlink** → `flow.data_flow` edges carrying the doc number into the main fetch. Add the main-screen doc-No slot as `mandatory`+`display_only`. (Gate checks 3.x, 6.x.)

## Stage 5 — Rules (mine every SP)

For each SP in the activity (especially every `hdrchk`, `grdsav`, `crtgrd`, validation SP):
```
grep -niE "raiserror|fin_german_raiserror|@m_errorid|RETURN" <sp>.sql
```
Emit one `rules[]` entry per live error-raise per `references/05_sp_parsing_playbook.md §C`: condition, error_id, kind, bucket, finish_paths (record the same check across `crt_*`/`apr_*`), client_side. Decode error text from `$ROOT/<M>/ModelInfo/<M>_Design_Error[_ ]Message.xlsx` (match `spname`+`Sp_Errorid`). Exclude commented-out (dead) raises and note them. **This stage is where most of the depth lives** — do not stop early.

## Stage 6 — Discriminators & variants

Identify discriminators by SP-layer branching (`§D`): mark `discriminator: true`, fill `associated_slots`, and build one `variants[]` entry per branch with `when`/`effect`. For lifecycle activities mark discriminators `locked_on_existing`.

## Stage 7 — Integration / external dependencies

For each commit, take its lvl>0 IS calls from the skeleton and follow `references/05_sp_parsing_playbook.md §E`: resolve across all folders, recurse into `po_common_vat_sp` (VAT/TCAL) and `po_common_wf_sp` (workflow), and **emit `external_dependency`** for every absent callee (TCAL `tcal_*`, WFMTASKBAS `wfm_*`, `pocomn_sp_setstatus`, budget). Record the VAT→TCAL tax dependency explicitly. Note the budget validate→consume shift on approve paths. (`classify_sps.py` already lists these — confirm and write them into the journey.)

## Stage 8 — Status, flow, termination, metadata

- `status_determination` + `required_for_fresh`: mine status assignment (`§F`); for PO carry the ~40-condition checklist from `02_journey_schema.md` (reconstructed because `pocomn_sp_setstatus` is absent in the drop).
- `flow`: assemble `strategy` (lifecycle-aware), `elicitation_order` (class-appropriate), `process_flow` (with Step 0 LOAD + 0b GUARD for lifecycle), `validation_policy`.
- `termination`: `commit_options` (all commits) / `output_options` (reports), `readiness`, `success_signal`, `on_failure`, `draft_fresh_decision`.
- `prerequisites`, `post_conditions` (`tables_written` from the MAIN writes found in Stage 2; `{}` for reports), `post_options`, `linked_journeys`, `intent`, `persona`, `variants`.
- `provenance.coverage`: real counts + honest `gaps[]` (mechanically-derived vs verified, all external deps).

## Stage 9 — Validate (mandatory gate)

```
python3 $SK/scripts/validate_journey.py --journey <journey>.json --class <genesis|lifecycle|inquiry|report|master-sequence|processing|hub>
```
Fix every `FAIL`. Then walk `references/07_blindspots_gate.md` by hand for the judgement checks (lifecycle correctness, discriminator grounding, conditional routing, node kind, state guards). **Ship only when both pass.**

## Master-sequence note (Item activation etc.)

When the activity is a master-activation set spanning multiple activities (class D), run Stages 1–9 for **each member activity**, then stitch a **composite parent journey** per `04_activity_classification.md §D`: ordered `process_flow` across members, `data_flow` carrying the entity key, conditional subflows on Source/Usage flags, and the terminal status-change activity. Order from `Documents/Master_Data_Sequence/Master Data Sequence.pdf`. (Those component sources — ITEMADMN etc. — are not in this 5-component drop; add them and run the same pipeline.)
