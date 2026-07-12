# 06 · Screen Extraction — slots, navigation, action buttons

This drop ships the **older screen format**: `<Activity>_<ilbo>.htm` + `<Activity>_<ilbo>_user.js` + `<Activity>_<Ilbo>.js` + `<Activity>_<Ilbo>_State.xml`. (The review docs cite EXTJS6 `.json`, which is NOT in this drop — extract from the `.htm` instead.) Each control's **CSS class** encodes its kind and obligation; the `btsynonym` attribute is its stable logical name.

## A. Class → slot attributes

Header-form controls live in a `type="label"` table: a label `<td class="...">` (obligation) plus a sibling input/select cell (kind). Grid columns use a `<th class="...">` (column obligation) plus a `tdclass="..."` (cell kind). Map both layers.

| Class (where) | `control.kind` | `obligation` | `fill_behaviour` | basis |
|---|---|---|---|---|
| `labelsleft`, `labels`, `labelscenter` (label td) | display/typed* | optional | (from input cell) | screen |
| `labelsmandatoryleft` (label td) | typed/lookup/enum* | **mandatory** | (from input cell) | **screen_mandatory** |
| `gridheading` (th) | (defer to tdclass) | optional | (defer to tdclass) | screen |
| `gridheadingmandatory` (th) | (defer to tdclass) | **mandatory** | (defer to tdclass) | **screen_mandatory** |
| `displayonly`, `DisplayOnly`, `numericdisplayonly` (cell) | **display** | **optional** | **display_only** | screen |
| `griddisplayonly`, `gridnumericdisplayonly` (tdclass) | **display** | **optional** | **display_only** | screen |
| `CharacterField` (`<input>`) | typed | per label | user_entry | screen |
| `NumericField` (`<input>`) | typed | per label | user_entry | screen |
| `gridcelltextfield[1]` (tdclass) | typed | per th | user_entry | screen |
| `gridcellnumericfield[1]` (tdclass) | typed | per th | user_entry | screen |
| `comboField` / `<select>` | enum_dropdown / masterdata_dropdown | per label | user_entry / lookup | combo → **discriminator only if value gates other slots** |
| `filler` | — | — | — (drop it) | — |
| `forwardlink`, `hdrdbforwardlink`, `mldbforwardlink` (`ctrlclass`) | nav_link | optional | navigation | — |
| `transtask` | action_button | optional | action | — |
| `title` | section/layout | — | — (drop) | — |

\* Refine `control.kind` to the schema enum (`02`): a combo backed by master data → `masterdata_dropdown`; an enumerated combo → `enum_dropdown`; a field with a lens/help → `lookup`; a checkbox → `boolean`; a hidden carrier → `hidden`; the framework OU/context → `system_context`; a plain typed field → `typed`; a display label → `display`.

**The two critical fixes (these are why Edit/Approve/Report journeys failed review):**
1. **`*displayonly*` (and any label without a `*mandatory*` class) ⇒ `fill_behaviour: display_only`, `obligation: optional`. NEVER `user_entry`, NEVER `must_fill`, never in an elicitation `must_fill` phase.** Real examples in the drop: `dspcreatewfstatus` (`type="displayonly"`), `dspfolderdescriptioncrt`, grid `Basic Value`/`Total Value` (`tdclass="gridnumericdisplayonly"`). Computed totals, audit stamps (created-by/date), and lookup descriptions (`dsp…`) are all display-only.
2. **Mandatory is grounded in the SCREEN** (`*mandatory*` class) — `basis: screen_mandatory`. Prefer this over importing a commit-time validation SP's null-check as if it were an entry-screen requirement. (A slot can be `screen_mandatory` AND also validated at commit; cite the screen for the obligation, the SP for the rule.)

## B. `btsynonym` → control name → slot

- The attribute carrying the logical field name is **`btsynonym`**. On a `type="label"` table it names the field the label is for (`btsynonym="podate"`, `="supplier_code"`, `="num_series"`); on the actual `<input>/<select>` and on grid `<th>` it repeats the synonym. The DOM `id` (`txtpodate`, `cbopotype`, `mlt`) is the runtime handle; **key the slot on `btsynonym`** (stable), not the id.
- Build each slot as `{ control:{ field:<btsynonym>, kind:<from class>, screen:<ilboName from _user.js> }, label:<td text>, data_type:<datatype attr>, ... }`.
- Pair label↔control by `btsynonym` match (label `lbltxtsuppliercode` ↔ input `txtsuppliercode` with `associatedlabel="lbltxtsuppliercode"`) or by adjacency in the same `<tr>`. For grids, **each `<th>` is one slot** (synonym from `btsynonym`, kind from `tdclass`, obligation from the th class).
- `scope`: header table → `header`; grid → `line`; a sub-screen ilbo → `subscreen:<ilbo>`.
- Pull optional `description`/help text from the matching OLH topic if useful.

## C. Navigation & action buttons → `subflows`, `data_flow`, action tools

All call `javascript:CallSubmitPage("<linkid>")`; the `<linkid>` is the routing key, resolved in the `.js`/`_user.js` `case "<LINKID>":` switch.

- **`forwardlink`** = a "Specify…" nav row → a **sub-screen**. e.g. `pocrtmainlnk2`→"Specify Schedule and Distribution", `pocrtmainlnk3`→"Specify Terms and Conditions", `pocrtmainlnk7`→"Specify Budget Details". The target ilbo is the sibling screen file whose `_user.js ilboName` matches (e.g. `lnk2 → Pocrt_pocrtsch.htm` ilbo `pocrtsch`). **Each becomes a `subflows[]` entry — and each sub-screen is itself transactional with its OWN commit task** (e.g. `pocrtschtran4` "Specify Schedule" → `pocrshd_ser_spfy`; `pocrtschtrn3` "Approve" → `pocrshd_ser_apr`). Model the nav tool **and** the sub-screen's commit tool. This is the "sub-screens with Save buttons" Ramco said was missing.
- **`hdrdbforwardlink` / grid `mldbforwardlink`** = an inline drill-down on a *displayed* value; read **`ctrlhref`** for the target task (e.g. the grid PO-No column `ctrlhref="POMAICREITEM_DLK"`).
- **`transtask`** = an **action button** → a task in the CSV: `pocrtmainsbt`→"Create PO", `pocrtmaintrn4`→"Create and Approve PO", `pomaicrepocrtitr`→"Print Order Doc.", entry `poedtenttrn1`→"Search". Classify each by its SP write behaviour (`05.B`).

**Entry→main hand-off (`data_flow`) — model BOTH paths:**
On a lifecycle activity the entry/search screen carries the doc number into the main screen two ways:
1. **Grid linkcolumn** — the result grid's doc-No column (`btsynonym="ponomlt"`, `tdclass="griddisplayonly"`, `htmldomctrl="a"`, `ctrlhref="POEDTENTLNK2"`, `ctrlclass="mldbforwardlink"`): user clicks **Search** (`transtask`), then clicks the PO-No cell → lands on the main fetch with that PO. (The common path.)
2. **Header forwardlink** — `poedtentlnk1` "Edit Purchase Order" beside the typed `ponohdr` field: type the PO No, click the link.

Both produce `selected_pono`, consumed by the main fetch (`*_fet_hdrfet`). Emit a `data_flow` edge for each, add both nav tools, and give the main screen a `ponohdr` slot that is `mandatory` + `display_only` (carried), not `user_entry`. The entry screen's PO No is `conditional` (required only on the header-link path), never unconditionally mandatory — the search screen must be usable with all fields blank.

## D. `_State.xml` → `locked_on_existing`; `_user.js` → client rules

- **`_State.xml`** is the per-state visibility/enable machine: each `<state id="…">` lists `<section … visible= enable=>` and `<control … visible= enable=>` with per-grid-view `<vw n="N" visible=/>`. A control/view flipped `enable="n"` or `visible="n"` in an existing-record/edit state is editable on create but **locked once the doc exists** → set the slot's `locked_on_existing: true`. Service blocks (`<service taskname="…fth">`) tie states to the fetch task, making the entry-vs-main distinction observable.
- **`_user.js`** holds client-side hooks: `preTaskSubmit(sTaskName)` (returns true/false to gate a submit) and `postTaskResultProcess` (success messages, `CheckError()`). In this drop most bodies are pass-through stubs (validation is server/SP-side), but extract any non-trivial `preTaskSubmit`/`CheckError`/`onVisibleDataSetChanged` as `client_side: true` rules, and read the `associatedtask`/`uievent` attributes (e.g. `associatedtask="POCRTMAINSUPPUI"`, grid `uievent="pocrtmainitemui"`) to know which field-change task fires which UI cascade.
- **File pairing:** read both JS files (`_user.js` for hooks; the capitalized `.js` for `ilboName` + the link/task switch). The `_2.htm`/`_user_2.js` siblings are alternate wide layouts of the same ilbo — merge or skip.
