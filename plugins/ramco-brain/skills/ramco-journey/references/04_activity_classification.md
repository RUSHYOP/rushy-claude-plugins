# 04 · Activity Classification — pick the right journey shape

**Do this first (pipeline Stage 0).** The single biggest past failure was applying one "create-a-new-document" template to every activity. Classify the activity, then use the matching template. Two orthogonal axes: the **activity class** (what shape the journey takes) and the **node kind** (what kind of business object it acts on).

## Axis 1 — Activity class (6)

Decide from the `Service_details` rows + the commit SP's write behaviour (see `05`):

| Class | How to detect | Shape |
|---|---|---|
| **A · Genesis** (Create from blank/source) | activity builds a new doc; commit SP INSERTs a new MAIN header & mints a doc number (`*_crt_hdrchk` + `dnm_gen_tranno`); starts from an empty form | The gold Create shape: discriminators→header→lines→variant sub-screens→terms→commit; status FR/DF |
| **B · Lifecycle** (Edit/Approve/Amend/Hold/Short-close/Return on an existing doc) | has an **entry/search screen** + a **main screen**; commit SP **UPDATEs** an existing MAIN header / writes a status-history row; status-guarded | Fetch-first: LOAD existing doc → GUARD legal-from-status → elicit delta/decision → commit. Multiple commits common |
| **C · Inquiry / Report** (View / Print / Register) | no MAIN write anywhere; terminal SP is `*_rprt_spo` (read-only) or fetch/search only; filters optional | Filter→run→output. NO commit, NO Fresh; `output_options`, filter-validation rules |
| **D · Master-sequence** (multi-screen activation of a master) | several distinct activities that must be visited **in order**, carrying one entity key, some **conditional** on earlier choices; ends by flipping the entity to Active | Composite parent journey: ordered process_flow + entity-key data_flow + conditional subflows + terminal status step |
| **E · Processing** (compute-and-persist, few slots) | very few slots, one "Generate/Process" commit that runs a long backend compute and persists a derived record | Generate semantics: inputs (period/flags) → compute chain → persist; derived status; freshness/re-run contract |
| **F · Hub** (launchpad across many transactions) | a screen that is mostly **navigation links** to many other activities; little/no own commit | Map launch links as edges with per-edge state guards; minimal slots; no terminal commit |

### A · Genesis template (gold = PoCrt)
- Variants from discriminators (`po_type`, `imports_flag`, numbering series).
- `elicitation_order`: discriminators FIRST → mandatory header → lines → variant sub-screens → terms → commit.
- Two finish-paths: `create` (→ FR/DF) and `create_and_approve` (→ OP, available only with approval authority; bind to the create-side approval SP set `*_apr_hdrsav`, do NOT fire create then approve as two journeys).
- From-source genesis (PoCrtQtn/PoCrtSo/PoCrtTen/PoCopy): the source reference becomes mandatory; copied fields are read-only-from-source; add a coverage **write-back** dependency (e.g. `prq_sys_pocovdqty_sp`).
- Carry the full `status_determination` / `required_for_fresh` tier (`02`).

### B · Lifecycle template (Edit / Approve / Amend / Hold / Short-close)
Add what genesis lacks:
1. **Step 0 LOAD** — the fetch task (`*_fet_hdrfet` → `*_fetgrd`) that re-hydrates the existing doc. Put it first in `process_flow`; mark header/discriminator slots **pre-filled from fetch**.
2. **Step 0b GUARD** — `entry_precondition`: the legal-from-status set (Approve refuses an already-Open PO; Short-close has a block-list; Hold needs a reason). Surface the SP's own precondition message.
3. **Entry→main `data_flow`** — the entry screen's **Search** (`transtask`) populates a grid; the grid **PO-No linkcolumn** (`ctrlhref="…LNK2"`, `ctrlclass="mldbforwardlink"`) AND the header **forwardlink** carry the doc number into the main fetch. Model BOTH nav paths as tools. The main-screen PO No is `mandatory` + `display_only` (carried), not `user_entry`.
4. **`locked_on_existing`** slot attr — discriminators (type/series/classification) are fixed & fetched; never elicit them.
5. **`commit_semantics`** activity attr: Edit=`revise`/`validate`, Approve=`consume` (budget consume `pb_sys_budget_update_Is`, FR→OP), Amend=`revise` (increments revision, re-workflow), Short-close=`reverse` (reverses balance), Hold=`toggle` (status+reason).
6. **changed_set / diff** (Edit/Amend) — which changed fields force re-approval & re-cascade.
7. **Enumerate ALL commits.** Approve screen = Approve **and** Return (both screens). Edit = Edit + Edit&Approve + Delete. Plus each visited sub-screen's own Save/Approve.
8. Elicit only the **delta** (Edit) or just the **decision + date/reason** (Approve) — not the whole header.
9. **Entry-path / intent selection — multiple deterministic algorithms in one journey.** When an activity has an *entry/list* screen AND a *main/detail* screen, the agent must know **which screen to drive**. Model an **up-front path discriminator** (an `agent_context` slot, `discriminator:true`, e.g. `approval_intent ∈ {bulk_list, detailed_review}` + `approval_decision ∈ {approve, return}`) plus a **`flow.paths[]`** block where each path is a self-contained deterministic algorithm: `{path_id, intent, persona, when (discriminator predicate), enters (which screen), algorithm[ordered steps], commit_tool, result_state, review_depth}`. The underlying function is still ONE (same commit SP); the paths differ only in entry screen + review depth. Distinguish this from pure-usability duplication (the ~11 sub-screen "Approve" buttons) — those collapse into the single function and are modelled as the **subflows' own commits**, NOT as paths. Grounding for PO: the Type-B approval intents in `Vizuara_Journey_review.docx` (list-approve / list-return / approve-after-full-detail-review). This is what lets a Chia-style agent pick bulk-clear vs full-review from the user's stated intent.

### C · Inquiry/Report template (View / Print PO Register)
- Terminal tool: the `_rprt_spo` task → `purpose: report`, placed in `termination.output_options` (NOT `commit_options`). A fetch task is never the "create".
- **No mandatory filters.** Every selection field `optional`. No discriminator phase.
- Rules = **filter validations** (range `from ≤ to`, temporal validity), framed as filter checks, not "blocks save". No `create` finish-path; use `report`/`run`.
- `post_conditions`: `tables_written:{}`, `document_state:null`, populate `output_variables` with the rendered report handle.
- Intent: "print/show …", never "raise/create a …".
- A View screen may also be a **navigation hub** (launch Amend etc.) — capture those launch links.

### D · Master-sequence template (Item activation set)
Model the whole sequence as **one composite journey** (or a parent with sub-journeys), because the value is the sequence, not the screens:
1. **Ordered `process_flow`** across the member activities (e.g. Item: Main → Basic → Planning → [Manufacturing] → [Purchase] → [Sales] → Accounting → **Update Status = Active**). Source the order from `Documents/Master_Data_Sequence/Master Data Sequence.pdf`.
2. **`data_flow` carries the entity key** (item code created in step 1) into every later activity's fetch.
3. **Conditional subflows**: a downstream screen is a **required visit-and-commit** gated on an earlier flag — e.g. Manufacturing iff `chkmanufactured`, Purchase iff `chkpurchased OR chksubcontracted`, Sales iff `chkusagesales`. These are journey-level routing conditions, not per-field `required_slot` rules.
4. **Terminal activation**: the entity becomes Active via a **status-change activity** (e.g. `itmedtstatus` "Update Item Status"); the Accounting mapping is its **precondition**. Never report "state unchanged".
5. **Bind each commit to the real save task** (`IsDataSavingTask=true` / writes MAIN) — not a "Get Details" read or a help-lookup.
6. **Scope rules per activity** — do not copy one global rule block into every member; lift genuine cross-screen routing rules to the composite level.
7. Each member activity is itself generated with the genesis/lifecycle template; the composite stitches them.

### E · Processing template (Generate Supplier Rating)
- Few slots (e.g. *rating-upto date*, *re-run flag*); the depth is in the **backend compute chain**, so enumerate the full SP fan-out of the generate commit (the scoring orchestrator and its index SPs) even though the UI is thin.
- `commit_semantics: generate` (compute-and-persist). Model it as a **fan-in** edge: many source docs over a period → one record.
- Status is **derived** (a classification band from the computed score), set at generation — NOT a user transition. No "approve" edge.
- Add a **freshness / re-run contract**: who fires it, over what period, idempotency/re-run semantics.

### F · Hub template (Purchase Hub)
- Inventory the launch links (tasks that navigate to other activities) as the primary content; each becomes an edge to another journey with a **state guard** (only show/enable when the target transition is legal).
- Minimal own slots; usually no terminal commit. Optionally a search/filter to pick the working set.

## Axis 2 — Node kind (what object the activity acts on)

Tag the journey with the kind of the entity it operates on; it governs status semantics and which guards are legitimate:

| Kind | Object | Identity | Status semantics |
|---|---|---|---|
| **A · Transaction document** | PO, PR, GR, Invoice, Quotation | yes | **user-driven lifecycle**, gates transitions (DF→FR→OP→…) |
| **B · Lifecycle master** | Supplier, Item | yes | real but **small** status (Active/Inactive/Hold) — status-change is its own edge |
| **C · Setup / reference master** | TCD, Pay Terms, UOM | yes | **degenerate / near-static** status; create/edit/view only |
| **D · Pure processing / derivation** | availability check, reorder calc | **no** | none — reads inputs, emits a transient value → **NOT a node**: an algorithm hosted on its subject |
| **E · Derived / periodic record** | Supplier Rating scorecard | yes | **derived** classification band, set at generation; **no approve** |

Implications:
- A **transition guard** ("is the PO Fresh, so Approve is legal?") and a **classification predicate** ("is the supplier's rating ≥ SA?") look alike but differ — one gates an edge on the same node, the other reads a derived attribute of another node. Keep them distinct.
- **State guards belong on edges.** Inter-document links carry source-state preconditions (create-PO-from-PR requires PR Approved + uncovered qty). Intra-document transitions are guarded by current status (Approve requires Fresh). Filter the source list up front rather than failing silently.
- **One function, many entry points.** Approve is a single function regardless of which screen launches it; "bulk approve" is a loop/wrapper over the single Approve guarded per-document; "Create & Approve" is create then approve **chained** (bound to the create-side approval SP set), not a nested third function. Do not model these as separate algorithms.
- Edges are frequently **n:m / fan-in** (club many PRs → one PO; many docs → one rating). Model cardinality explicitly; PR→PO is a **composite edge** onto the conversion subsystem, not a thin 1:1 link.
