# 01 · Data Map — the Ramco drop, file by file

Default drop root: `/Users/raj/Downloads/Vizuara`. Feedback set: `/Users/raj/Downloads/Vivek Feedback`.
If the data lives elsewhere, set `ROOT` accordingly; the structure is identical.

## Components (5)

`GR` Goods Receipt · `PO` Purchase Order · `Pur_Qtn` Purchase Quotation · `Pur_Req` Purchase Request/RFQ · `SIN` Supplier Invoice. Each follows the **same layout**, so a recipe proven on one works on all.

## Per-component layout

```
<COMPONENT>/
  ModelInfo/
    Service_details_<MODULE>.csv          # THE skeleton source (one row per service-method call)
    <MODULE>_Comp_Act_ILBO_Service_Info.xlsx   # component→activity→UI→task→service (cross-check)
    <MODULE>_Design_ErrorMessage.xlsx     # spname → Sp_Errorid → Error_Message (rule text)
        (Pur_Qtn/Pur_Req/SIN spell it <MODULE>_Design_Error_Message.xlsx — underscore variant)
    BPC_Comp_Act_ilbo.{xlsx|xlsm|csv}     # process→component→activity→UI human names (titles)
  SPs/  (folder is 'Sps' in GR/Pur_Qtn, 'SPs' in Pur_Req/SIN, 'SPS' in PO — treat identically)
    <name>.sql                            # stored procedures — rules, writes, status, IS calls
  ScreenObjects/<MODULE>/
    <Activity>_<ilbo>.htm                 # screen markup → slots, nav links, action buttons
    <Activity>_<ilbo>_user.js             # client-side hooks (preTaskSubmit/CheckError), ilbo metadata
    <Activity>_<Ilbo>.js                  # capitalized variant: ilboName + link/task routing switch
    <Activity>_<Ilbo>_State.xml           # per-state visibility/enable → locked_on_existing hints
    <..>_2.htm / <..>_user_2.js           # alternate (wider) layout of same ilbo — merge or skip
    Help/                                 # context-sensitive OLH mirror
  OLH/                                    # online help (RoboHelp/WebHelp) → optional slot help text
  Table/  dbo.<table>.sql                 # table DDL → db_column grounding, tables_written
  API/    <Op><ver>.json                  # OpenAPI specs (a SUBSET of services; use highest version)
```

## Service_details CSV — the spine (17 columns)

```
parent_service_name, parent_method_name, component_name, process_name,
activity_name, activitydesc, createddate, ui_name, description,
task_name, taskdesc, service_name, method_name, spname,
lvl, ps_sequenceno, sequenceno
```

- **A journey = all rows with one `activity_name`.** Real UI rows have `lvl=0`.
- **Integration-service (IS) rows have `activity_name = 'NULL'` and `lvl >= 1`**, and link back to their caller via `parent_service_name + parent_method_name` == the caller's `service_name + method_name`. One IS row is shared by many callers, so `parent_*` is a **comma-joined list** (e.g. `"po_common_wf_ser, po_common_wf_ser"`). **Match by substring/containment, and parse with `csv.DictReader` (never split on comma).**
- Order a task's calls by `(ps_sequenceno, sequenceno)`.
- Casing is inconsistent (`PO`/`Po`, `WFMTASKBAS`/`wfmtaskbas`). Resolve SPs by name across all folders, not by the `component_name` column.

## Activity inventory (verified counts)

| Module | #activities | Notable activities (activity_name) |
|---|---|---|
| **PO** | 17 | PoCrt(14 screens/222 tasks), PoEdt, PoApp, PoAmnd, PoHold, PoScl, PoCrtQtn, PoCrtSo, PoCrtTen, PoCopy, POMtn, PoViw(13 screens), PoViewDtls, PoHlp, PoAcCcUsgMod, POSetSysPar, POVwSysPar |
| **GR** | 36 | GRSCCrt (Create Receipt), GRESCCrt, GRNCrt (Create Return Note, 6 screens), GRGE (Gate Entry), GRInspn, GRMov, GRValues, GRVw*, BILLPA, MainCargoClear, … |
| **Pur_Qtn** | 11 | pqtnrcrt (Create RFQ), pqtnqcrt (Create Quotation, 10 screens), pqtnqapp, pqtnqedt, pqtnqvw, pqtnrmod, PQCopy, Function_param, … |
| **Pur_Req** | 10 | PRCrt (Create PR, 6 screens), PREdt, PRAuth (Authorize), PRCan (Short Close), PRHld, PRCopy, PRView, PRViewDtls, PRHlp, functparampurreq |
| **SIN** | 17 | SinAddInv (Create Invoice, 14 screens), SinAuInv (Authorize, 9 screens), SinMntInv, SinMthInv (Match), SinHRInv (Hold/Release), SinRevInv, SinRecoInvoice, SinVwInv, … |

> Activities Ramco specifically asked to be modelled next live in OTHER components **not shipped in this drop** (ITEMADMN item-master screens, SUPRAT Generate Supplier Rating, PRJREP Print PO Register, the Purchase Hub). For those, the **method is identical** but the source files are absent — generate from the same pipeline once their `Service_details`, SPs and ScreenObjects are added, and meanwhile model from the review reports + the master-data-sequence doc. See `Documents/Master_Data_Sequence/Master Data Sequence.pdf` for the item-master ordering.

## Feedback set (the rubric + the gold)

```
/Users/raj/Downloads/Vivek Feedback/
  po_create_direct (1).json            # GOLD reference journey (PoCrt) — the target shape & depth
  SP_interview.md                      # how SPs map to tasks (init/fet/uitask/hlp/trans), temp vs main, control expr, lvl
  TCAL_Execution_Flow_and_Errors_V1.0.docx   # the tax (po_common_vat_sp → TCAL) execution & failure flow that was missed
  Vizuara_CreatePO_Review_15Jun.docx   # §5 Draft/Fresh determination (the ~40-condition required_for_fresh checklist) + lifecycle generalization
  Vizuara_Journey_review.docx          # entity-as-node, single-approve-function, create-and-approve = chain, state guards
  PO_Edit_Review_Vizuara.md            # 9 findings: data_flow, display-only, multi-commit, subflows+sub-commits, fetch-first
  PO_Approve_Review_Vizuara.md         # same + Return PO path hidden; multiple commits on both screens
  Print_PO_Register_Review_Vizuara.md  # report mis-modelled as create; _rprt_spo convention; optional filters
  Item_Master_Set_Review_Vizuara.md    # composite multi-screen sequence, source/usage conditional routing, terminal activation
  Journey_Graph_Validation_Vizuara_v3.md  # 5-kind node taxonomy (A–E), two status semantics, n:m fan-in edges
```

Use the gold JSON as the **shape**; use the seven reviews as the **definition of done** (encoded in `07_blindspots_gate.md`).
