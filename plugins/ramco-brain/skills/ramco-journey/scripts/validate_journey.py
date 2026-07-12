#!/usr/bin/env python3
"""
validate_journey.py — Stage 9 of the Ramco journey pipeline.

Run the MECHANICAL subset of the blind-spots gate (references/07_blindspots_gate.md)
against a generated journey JSON. Judgement checks (lifecycle correctness,
discriminator grounding, conditional routing) still require a human/LLM read of the
gate — this catches the structural regressions that recurred in every reviewed journey.

Usage:
  python3 validate_journey.py --journey my_journey.json
  python3 validate_journey.py --journey my_journey.json --class lifecycle
"""
import json, argparse, sys

FAIL, WARN, OK = "FAIL", "WARN", "OK"


def get(d, *path, default=None):
    for p in path:
        if isinstance(d, dict):
            d = d.get(p)
        else:
            return default
    return d if d is not None else default


def check(results, level, code, msg):
    results.append((level, code, msg))


def validate(j, klass):
    r = []
    slots = j.get("slots", []) or []
    tools = j.get("tools", []) or []
    rules = j.get("rules", []) or []
    flow = j.get("flow", {}) or {}
    term = j.get("termination", {}) or {}

    # 1. Commit classification
    commits = [t for t in tools if t.get("purpose") == "commit"]
    commit_opts = term.get("commit_options", []) or []
    if klass not in ("inquiry", "report") and not commits:
        check(r, FAIL, "1.1", "No tool has purpose 'commit' (transaction activity must have >=1). "
              "Check the SP write-behaviour — real commits get mislabeled 'validate'.")
    # A non-report transaction MUST surface at least one terminal commit option.
    if klass not in ("inquiry", "report") and commits and not commit_opts:
        check(r, FAIL, "1.2", "commit tools exist but termination.commit_options is empty "
              "— the real commit(s) are hidden. Enumerate ALL (Create/Create&Approve; Approve+Return; Edit+Edit&Approve+Delete).")
    # Each commit tool should be reachable as a finish-path (top-level option) or a
    # sub-screen save (subflow commit_tool). Un-surfaced commits are flagged (soft).
    referenced = json.dumps(commit_opts) + json.dumps(flow.get("subflows", []))
    hidden = [t.get("tool_id") for t in commits
              if t.get("tool_id") and t.get("tool_id") not in referenced
              and (get(t, "binding", "task") or "_") not in referenced]
    if hidden:
        check(r, WARN, "1.2", f"{len(hidden)} commit tool(s) not surfaced in commit_options or any subflow "
              f"— confirm each is reachable (sub-screen Approve variants are OK if intentional): {hidden[:6]}")
    reports = [t for t in tools if t.get("purpose") == "report"]
    for t in tools:
        b = (t.get("binding") or {})
        chain = " ".join(str(c.get("sp", "")) for c in (b.get("sp_chain") or []))
        if "_rprt_sp" in chain.lower() and t.get("purpose") != "report":
            check(r, FAIL, "1.3", f"Tool {t.get('tool_id')} runs a _rprt_spO SP but purpose != 'report'.")

    # 2. Display-only fill behaviour. A display/system field must NOT be user-entered
    #    or required-to-fill; system-filled values (auto_fetched/computed/display_only/
    #    prefilled_default) are all fine — the USER just never types them.
    USER_FILLED = ("user_entry",)
    for s in slots:
        kind = get(s, "control", "kind", default="")
        fb = s.get("fill_behaviour")
        ob = s.get("obligation")
        req = s.get("requirement")
        if kind == "display" and fb in USER_FILLED:
            check(r, FAIL, "2.1", f"Slot {s.get('slot_id')} is display kind but fill_behaviour={fb} "
                  "— display fields are never user_entry (use display_only/auto_fetched/computed).")
        if kind == "display" and req == "must_fill":
            check(r, FAIL, "2.3", f"Display slot {s.get('slot_id')} marked must_fill "
                  "— display fields are never elicited (mandatory+auto_fetched is fine; must_fill is not).")

    # 3. Cross-screen flow
    screens = j.get("journey", {}).get("screens", []) or []
    if len(screens) >= 2 and not (flow.get("data_flow")):
        check(r, FAIL, "3.1", "Multi-screen activity but flow.data_flow is empty (entry->main hand-off missing).")

    # 4/6. Sub-screens
    subscreen_slots = [s for s in slots if str(s.get("scope", "")).startswith("subscreen:")]
    if subscreen_slots and not flow.get("subflows"):
        check(r, FAIL, "6.1", "Sub-screen slots exist but flow.subflows is empty (Specify… nav + own commits missing).")

    # 5. Discriminators grounded: a real discriminator gates other slots/rules. Accept
    #    sp_parameter/db_column grounding OR associated_slots OR being referenced by a
    #    variant's `when` OR by a flow.paths entry (an entry-path/intent discriminator
    #    that selects which deterministic algorithm the agent drives).
    variant_text = json.dumps(j.get("journey", {}).get("variants", [])) \
        + json.dumps(flow.get("paths", [])) + json.dumps(flow.get("path_discriminator", {}))
    for s in slots:
        if s.get("discriminator"):
            mp = s.get("maps_to") or {}
            grounded = (mp.get("sp_parameter") or mp.get("db_column")
                        or s.get("associated_slots") or s.get("valid_values")
                        or s.get("discriminator_basis")
                        or (s.get("slot_id", "_") in variant_text))
            if not grounded:
                check(r, WARN, "5.1", f"Discriminator {s.get('slot_id')} not grounded — needs an sp_parameter/db_column, "
                      "associated_slots, or a variant that branches on it (not just 'it's a combo').")

    # 7. Report shape
    if klass in ("inquiry", "report"):
        if commit_opts:
            check(r, FAIL, "7.2", "Report has commit_options — reports produce output, not a Create commit.")
        if get(j, "post_conditions", "document_state") not in (None, "null", "n/a"):
            check(r, FAIL, "7.2", "Report sets a document_state — should be null.")
        mand = [s for s in slots if s.get("obligation") == "mandatory"]
        if mand:
            check(r, FAIL, "7.2", f"Report has {len(mand)} mandatory filter(s) — report filters must be optional.")

    # 9. Integration / external deps
    has_extdep = bool(j.get("external_dependencies")) or bool(get(j, "provenance", "coverage", "gaps"))
    if klass not in ("inquiry", "report") and commits and not has_extdep:
        check(r, WARN, "9.3", "No external_dependencies recorded — a transaction commit usually depends on "
              "VAT/TCAL + workflow; surface absent SPs (the tax dependency that was previously missed).")

    # 10. Status determination
    if klass in ("genesis", "lifecycle"):
        sd = j.get("status_determination") or {}
        if not sd.get("required_for_fresh"):
            check(r, WARN, "10.1", "No status_determination.required_for_fresh tier (the silent Draft/Fresh checklist).")

    # 12. Depth + evidence
    for name, coll in (("slots", slots), ("tools", tools), ("rules", rules)):
        missing = [x for x in coll if not x.get("evidence")]
        if missing:
            check(r, WARN, "12.1", f"{len(missing)}/{len(coll)} {name} lack evidence[].")
    if klass in ("genesis", "lifecycle"):
        if len(slots) < 20:
            check(r, WARN, "12.4", f"Only {len(slots)} slots — transaction journeys are typically dozens+ (depth check).")
        if len(rules) < 20:
            check(r, WARN, "12.4", f"Only {len(rules)} rules — mine EVERY SP for validations (depth check).")

    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--journey", required=True)
    ap.add_argument("--class", dest="klass", default="genesis",
                    choices=["genesis", "lifecycle", "inquiry", "report", "master-sequence", "processing", "hub"])
    a = ap.parse_args()
    j = json.load(open(a.journey))
    res = validate(j, a.klass)
    fails = [x for x in res if x[0] == FAIL]
    warns = [x for x in res if x[0] == WARN]
    for lvl, code, msg in res:
        print(f"[{lvl}] {code}: {msg}")
    print(f"\n{len(fails)} FAIL, {len(warns)} WARN")
    print("Mechanical checks only — also walk references/07_blindspots_gate.md for the judgement checks.")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
