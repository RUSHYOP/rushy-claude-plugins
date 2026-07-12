# Case study — impact / blast-radius queries (the column-edge frontier)

A worked reindex case that clarifies **data gap vs surfacing gap**, drawn from a real
chatbot session. Source evidence: `info_data/reindex_cases/Cross_index_issue.md`
(the raw diagnostic + Ramco reviewer's correction).

## The question the Brain could not fully answer

> "If I increase the datatype length of the `bodit_bpono` field in the
> `BPO_BODIT_DOCITEMTCD` table, where all does it get affected?"
> *(Purchase · C14 Schema & Data Dictionary · Blanket Purchase Order / `Bl_PO`)*

`bodit_bpono` is the BPO document-number column, `varchar(18)`, resolved from the shared
UDD `udd_documentno`, and a member of PK `bpo_bodit_pk`. A correct impact answer must span
**four directions**: sibling tables, SPs, cross-component consumers, and screens/services.

## What the chatbot got RIGHT (and why it's PARTIAL, not a hallucination)

It correctly enumerated the ~17 sibling `*_bpono` columns inside `Bl_PO` (the intra-component
blast radius), the PK/index rebuild, and the two views that project the column. That layer
works because **column→column FK inference is cross-indexed — but only within a component**
(`Bl_PO-columns.md` "inferred relationships (shared composite key)"). It was appropriately
cautious (flagged what it hadn't read, invented nothing) → grade **PARTIAL**, per the
`eval-brain` rubric. Extra correct detail is a superset, not a fabrication.

## The four misses, root-caused against the real pages

| Missing piece | Root cause | Evidence |
|---|---|---|
| **Which SPs** are impacted (not the count) | Cross-index **data gap** | No column→SP or table→SP(read/write) edge anywhere. The brain has SP→SP EXEC edges, per-SP rules keyed by `sp+error_id+condition` (no column key), and a component-level count (873 SPs) + an aggregate write map that names **no** SPs. `873 / 10 rule sites` is the ceiling of what the brain can express — not laziness. |
| **Cross-component tables** (e.g. Release Slip) | Cross-index **data gap** (deepest) | `Pur_Rel_Slip.prs_mn` actually stores `prs_mn_bpono` + `prs_mn_bpoamendno` + `prs_mn_bpoou` — the full BPO composite reference (also copied in `DCUBE_SCM`, `TMS_LOG`, `ALRT_CON`). But FK inference is **component-scoped by construction**, so `prs_mn_bpono` links only to `prs_mn_rshdr`, never to `bpo_bpoh.bpoh_bpono`. The only cross-boundary edges are CIM pub/sub and xcomp service calls — neither is a document-number reference. The fact exists as raw column data on both sides but as an **edge nowhere**. |
| **Screens** impacted | Cross-index **data gap** | a2ui screen JSONs bind controls by UI `itemId` (`txtbpono`) with grid `dataIndex = null`; the DB column `bodit_bpono` appears in zero screen files. No column→control edge exists. |
| **Services** impacted | Cross-index **data gap** | Services are cataloged at component/service granularity only (`integration.md` = 377 services, no column dimension). No column→service edge. |
| Didn't read `Bl_PO-reverse.md`; stopped at counts | **Prompt/traversal gap** (secondary) | `prompt.js` rule 3 ("read 1–4 pages") + rule 7 ("stop at 2–6 tool calls") bias against fan-out; there is no impact/blast-radius rule and no impact tool. `trace_sp_validations` goes forward (SP→children), not reverse (column→consumers). |

**One correction to the chatbot's own advice:** it told the user to read `Bl_PO-reverse.md`
for cross-component consumers — but `reverse.md` is *service-call lineage* ("one component's
activity invokes a service of another"), explicitly **not** document-number references. A more
diligent agent still would not have found Release Slip's `prs_mn_bpono` → Bl_PO link. This
reinforces the diagnosis: **a missing-edge problem, not a missing-effort problem.**

## The verdict (the reusable lesson)

- **"Is cross-indexing not done in depth?" — Yes, the primary cause.** The brain cross-indexes
  table↔table (intra-component FK), SP→SP (call graph), and component↔component (CIM/service),
  but does **not** build the edges an impact query needs: column→SP, column→screen,
  column→service, and cross-component document-number references.
- **"Or a prompt-engineering issue?" — Also yes, but secondary.** An impact rule + fan-out tool
  makes the chatbot exhaustive over whatever edges *exist* — but it still cannot name the SPs,
  Release Slip, or the screens/services **until the edges are built**.

> You cannot traverse an edge that isn't in the graph. When the missing answer is *a name that
> lives on an edge nobody built*, it is a **data gap (§A/§B)** — not a surfacing gap (§C).

## Remediation roadmap (maps to this skill's sections; tracked as gaps G-43…G-47)

1. **§A/§B — column|table → SP read/write index** (gap **G-43**). Add an SP-body static-analysis
   pass; the data is in the SP text and P-SP-SKEL already captured write targets (collapsed to
   counts). Emit `sp_writes_column` / `sp_reads_column` edges into `kb`. → answers "which SPs
   touch `bodit_bpono`."
2. **§B — cross-component document-number linkage** (gap **G-44**). Match `udd_documentno`
   `*_bpono` columns across all component schemas, using the **composite** `bpono + amendno + ou`
   as the reliable signal (same-UDD alone is too noisy). → surfaces `Pur_Rel_Slip`, `DCUBE_SCM`,
   `TMS_LOG`, `ALRT_CON` as consumers of the BPO number.
3. **§A/§B — column→screen (control `dataIndex`→column)** (gap **G-45**) and **column→service**
   (gap **G-46**) reverse indexes. Enhance the screen parser to capture control→column bindings,
   then project column→screen and column→service.
4. **§C — impact/blast-radius prompt rule + `impact_of_change(column)` tool** (gap **G-47**) that
   fans out over the new edges; exempt impact questions from the 1–4-page / 2–6-call caps.

Do all of it as a **positive delta** (accepted-pointer discipline) and gate with the
**Regression Gate** — re-run the eval, confirm no previously-FULL question regresses. Per the
`eval-brain` rubric, this exact question scores **PARTIAL / MISSING** (the edges are genuinely
absent), **not** a hallucination.

## Outcome (2026-07-03 — the roadmap was executed)

Items 1, 2 and 4 are BUILT and the gaps closed (G-43, G-44, G-47 in `status.json`; G-45/G-46
screens/services remain open): register family **P-COLSP** (199,128 SP files scanned) +
`kb/_column_sp_map.json` (113,144 columns → named SPs, op-verified writer pinning) +
`kb/_crosscomp_docnum.json` (105 tiered doc-number links) + the extended `impact_of`.
The build itself re-proved this case study's core lesson at the next level down: the first
version's *plausible* heuristics — mention-count ranking, global name-keyed join evidence,
suffix-only tiering — all failed adversarial refutation (commit writers ranked 424/1030;
~35% of gold links rested on third-party name collisions), and every fix was again
**a better edge, not a better prompt**: writer pinning from the P-SP-SKEL write-target
register, join-context + component-local evidence admissibility, generic-key refusal.
