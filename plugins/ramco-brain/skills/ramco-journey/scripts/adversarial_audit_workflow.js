// Adversarial Journey Audit — the final, source-grounded gate (see references/08_adversarial_audit.md).
// Run AFTER scripts/validate_journey.py passes 0 FAIL. A fleet of agents tries to PROVE the journey
// wrong against the raw Ramco source; every verdict is re-checked by a second skeptic.
//
// Run it:
//   Workflow({ scriptPath: '.claude/skills/ramco-journey/scripts/adversarial_audit_workflow.js',
//              args: { files: ['journeys/po_edit.json','journeys/po_approve.json'],
//                      component: 'PO', repo: '/Users/raj/Downloads/Vizuara' } })
//
// args.files     : journey JSONs to audit (repo-relative or absolute)
// args.component : source component dir (PO | GR | Pur_Req | Pur_Qtn | SIN)
// args.repo      : absolute repo root (defaults below)

export const meta = {
  name: 'adversarial-journey-audit',
  description: 'Adversarial source-grounded audit of generated journeys: prove each wrong, then re-check',
  phases: [
    { title: 'Audit',   detail: 'one agent per probe-group per file — refute by default' },
    { title: 'Skeptic', detail: 'second agent re-checks every flagged finding for holes/new mistakes' },
  ],
};

const REPO = (args && args.repo) || '/Users/raj/Downloads/Vizuara';
const COMP = (args && args.component) || 'PO';
const FILES = (args && args.files) || ['journeys/po_edit.json', 'journeys/po_approve.json'];
const SRC = `${REPO}/${COMP}`;

// The probe catalogue — full detail in references/08_adversarial_audit.md
const GROUPS = [
  { key: 'A', name: 'Fabrication & binding integrity', probes: [
    'A1 every task/tool id referenced (tools.binding.task, commit_options.tool, subscreen_commits.save/approve, subflows.*_tool, data_flow tasks) resolves to a real task_name row in Service_details_<comp>.csv (case-insensitive) — zero matches = fabricated [S1]',
    'A2 every sp in every sp_chain is a real *.sql in the drop OR is declared in external_dependencies [S1/S2]',
    'A3 SP family matches the tool role: *_apr*=approve, *_edt*=edit, *_ret*=return, *_del*=delete, *_spfy*/*_hdrsav*=save, *_hdrchk*=validate, povwmn/*_rprt*=report — flag approve bound to a save/grid SP [S2]',
    'A4 every bridge in a tool is_calls is literally exec`d by the bound SP (grep "exec <bridge>"); flag is_calls arrays repeated verbatim across many tools = template [S2/S3]',
    'A5 binding.service_name + method resolve in the CSV / API specs [S2]',
    'A6 maps_to.db_column resolves to a real TABLE.column in the Table DDL [S3]',
  ]},
  { key: 'B', name: 'Source-fidelity of authored semantics', probes: [
    'B1 every user_entry slot maps to a real INPUT control in the .htm; every displayonly/label control is display_only — flag display marked user_entry [S2]',
    'B2 every mandatory slot has the *mandatory* CSS class on its OWN screen (or is a real finish-path guard); no invented mandatory on a search/entry screen the source leaves optional [S2]',
    'B3 each commit result_state / post_conditions.document_state matches the status the persisting SP SETs (grep "pomas_*status = `XX`") — flag e.g. "Returned->Draft" when SP sets `RT` [S2]',
    'B4 purpose by what the SP WRITES: MAIN(non-_tmp) write=commit; _tmp-only/povwmn=report; Default/Get-All/def_=ui_assist; search=fetch — flag commit demoted to validate, report/helper mislabeled [S1/S2]',
    'B5 every discriminator is an EDITABLE control (not a dsp*/display label) AND its sp_parameter appears in a real IF/CASE branch in an SP — flag display-label discriminators and the real combo being missing [S2/S3]',
    'B6 the document key (PO No) is display_only on the main screen, typed/optional on the entry screen [S3]',
    'NOTE: "mandatory + display_only" on a carried document key is the CORRECT SME pattern — do NOT flag it; only "mandatory + user_entry" on a display field is the B1 defect',
  ]},
  { key: 'C', name: 'Completeness vs source (blind-spots)', probes: [
    'C1 every transtask on every screen appears as a tool [S2]',
    'C2 every persisting action is in commit_options — main + entry-screen + each sub-screen save/approve [S1/S2]',
    'C3 every forwardlink/link to a child screen is a subflow — flag any "Specify..." sub-screen the main screen exposes but the journey omits [S2]',
    'C4 every input/select/displayonly control in each screen .htm has a slot — flag missing editable combos [S2]',
    'C5 data_flow carries the doc key entry->main and represents BOTH nav links (header + grid hyperlink) [S2]',
    'C6 conditions that force a sub-flow visit (e.g. staggered/multi-schedule => Specify Schedule) are modeled and cross-linked to the sub-flow [S3]',
    'C7 every absent-but-exec`d SP (TCAL tcal_*, workflow WFM*, budget, pocomn_sp_setstatus) is an external_dependency [S2]',
  ]},
  { key: 'D', name: 'Internal consistency', probes: [
    'D1 commit_options.tool, thin_slot_view[].id, rule.slots[], slot.rules[] all resolve within the file [S2]',
    'D2 subflows <-> subscreen_commits parity [S3]',
    'D3 every result_state/status is in the documented PO status set (DF/FR/OP/RT/LI/SC/...) [S3]',
    'D4 flow.path_discriminator slots exist and are genuine discriminators [S3]',
  ]},
  { key: 'E', name: 'Lifecycle correctness', probes: [
    'E1 lifecycle (Edit/Approve/Amend/Hold/Short-close): fetch tool is first process_flow step; header/discriminator slots auto_fetched not must_fill; elicit only the delta; no "discriminators first" [S2]',
    'E2 genesis (Create/from-source): blank-start, default->discriminator->mandatory order is correct',
  ]},
];

const FINDINGS = {
  type: 'object', additionalProperties: false,
  properties: { findings: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: {
      probe_id: { type: 'string' },
      verdict: { enum: ['ok', 'defect'] },
      correct_vs_source: { enum: ['yes', 'no', 'uncertain'] },
      evidence_journey: { type: 'string' },
      evidence_source: { type: 'string' },
      issue: { type: 'string', description: 'the defect, or empty string if ok' },
      severity: { enum: ['S1', 'S2', 'S3', 'none'] },
      scope: { enum: ['file-local', 'generator-systemic', 'n/a'] },
      confidence: { enum: ['low', 'medium', 'high'] },
    },
    required: ['probe_id','verdict','correct_vs_source','evidence_journey','evidence_source','issue','severity','scope','confidence'],
  }}},
  required: ['findings'],
};

const SKEPTIC = {
  type: 'object', additionalProperties: false,
  properties: { reviews: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: {
      probe_id: { type: 'string' },
      holds_up: { type: 'boolean' },
      hole_or_correction: { type: 'string' },
      final_status: { enum: ['confirmed-ok', 'confirmed-defect', 'understated', 'overstated', 'new-mistake'] },
      note: { type: 'string' },
    },
    required: ['probe_id','holds_up','hole_or_correction','final_status','note'],
  }}},
  required: ['reviews'],
};

const SRCNOTE = `SOURCE (${COMP}): screens ${SRC}/ScreenObjects/${COMP}/*.htm + *_user.js + *_State.xml `
  + `(OLD .htm: mandatory=CSS class *mandatory*; display=class displayonly/numericdisplayonly or type="displayonly"; `
  + `nav=forwardlink/hdrdbforwardlink; grid link=linkcolumn ctrlhref/mldbforwardlink; action=transtask; field=btsynonym). `
  + `SPs ${SRC}/SPS/*.sql (or Sps/SPS). Spine ${SRC}/ModelInfo/Service_details_${COMP}.csv. Table DDL under ${SRC}/Table.`;

// Build the work list: (file × group) audit units, plus a fresh-eyes critic per file.
const units = [];
for (const f of FILES) for (const g of GROUPS) units.push({ file: f, group: g, kind: 'group' });
for (const f of FILES) units.push({ file: f, group: { key: 'X', name: 'Fresh-eyes critic' }, kind: 'critic' });

phase('Audit');
const results = await pipeline(
  units,
  (u) => {
    const path = u.file.startsWith('/') ? u.file : `${REPO}/${u.file}`;
    if (u.kind === 'critic') {
      return agent(
`You are a fresh-eyes adversary auditing the Ramco journey ${path}. You have NO checklist. Read the file (use grep/python on slices — do not read the whole 1-2MB file) and the real source. ${SRCNOTE}
Hunt for mistakes a checklist would MISS: fabricated/templated content, internal contradictions, semantics that read plausibly but contradict the SP, wrong status/result_states, mis-scoped slots, broken evidence. For each, return a finding (use probe_id "X-<short>"). Refute-by-default: assume the authored semantic layer is wrong until source proves otherwise. Return ONLY the structured object.`,
        { label: `critic:${u.file.split('/').pop()}`, phase: 'Audit', schema: FINDINGS }
      ).then(r => ({ u, r }));
    }
    return agent(
`You are an adversarial auditor. PROVE the Ramco journey ${path} wrong on Group ${u.group.key} (${u.group.name}). Refute-by-default; ground every claim INDEPENDENTLY in the raw source (ignore the journey's own evidence[]); existence before semantics.
${SRCNOTE}
Read references/08_adversarial_audit.md if present for full detail. Run each probe in this group and return one finding per probe (verdict ok|defect):
${u.group.probes.map(p => '  - ' + p).join('\n')}
Use grep/python to pull only the slices you need. Cite a JSON path/slot_id/tool_id AND a source filename + exact token/line for every finding. Mark scope file-local (patch the journey) vs generator-systemic (fix the script + all journeys). Return ONLY the structured object.`,
      { label: `audit:${u.file.split('/').pop()}:${u.group.key}`, phase: 'Audit', schema: FINDINGS }
    ).then(r => ({ u, r }));
  },
  ({ u, r }) => {
    const defects = (r.findings || []).filter(f => f.verdict === 'defect' || f.correct_vs_source === 'no');
    if (!defects.length) return { file: u.file, group: u.group.key, kind: u.kind, findings: r.findings || [], reviews: [] };
    const path = u.file.startsWith('/') ? u.file : `${REPO}/${u.file}`;
    return agent(
`You are a second, skeptical auditor re-checking another agent's findings on ${path} (Group ${u.group.key}). ${SRCNOTE}
For each finding below, independently verify against the raw source and try to REFUTE it — is it real? understated? overstated? did the first agent miss an adjacent mistake (a "new-mistake")?
FINDINGS:
${JSON.stringify(defects, null, 1)}
Return ONLY the structured reviews object (one review per probe_id).`,
      { label: `skeptic:${u.file.split('/').pop()}:${u.group.key}`, phase: 'Skeptic', schema: SKEPTIC }
    ).then(s => ({ file: u.file, group: u.group.key, kind: u.kind, findings: r.findings || [], reviews: s.reviews || [] }));
  }
);

// Synthesis: surface confirmed defects, sorted by severity, split file-local vs systemic.
const all = results.filter(Boolean);
const confirmed = [];
for (const block of all) {
  const revById = Object.fromEntries((block.reviews || []).map(rv => [rv.probe_id, rv]));
  for (const f of block.findings) {
    if (f.verdict !== 'defect' && f.correct_vs_source !== 'no') continue;
    const rv = revById[f.probe_id];
    if (rv && (rv.final_status === 'overstated' || (rv.holds_up === false && rv.final_status === 'confirmed-ok'))) continue;
    confirmed.push({ file: block.file, group: block.group, ...f, skeptic: rv ? rv.final_status : 'unreviewed', skeptic_note: rv ? rv.hole_or_correction : '' });
  }
}
const rank = { S1: 0, S2: 1, S3: 2, none: 3 };
confirmed.sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));
const counts = confirmed.reduce((m, f) => ((m[f.severity] = (m[f.severity] || 0) + 1), m), {});
log(`Adversarial audit: ${confirmed.length} confirmed defects — ${JSON.stringify(counts)}`);
return { component: COMP, files: FILES, summary: counts,
         blockers_S1: confirmed.filter(f => f.severity === 'S1'),
         fix_before_share_S2: confirmed.filter(f => f.severity === 'S2'),
         generator_backlog_S3: confirmed.filter(f => f.severity === 'S3'),
         all_confirmed: confirmed };
