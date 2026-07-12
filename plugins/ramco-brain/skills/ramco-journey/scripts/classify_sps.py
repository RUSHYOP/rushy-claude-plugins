#!/usr/bin/env python3
"""
classify_sps.py — Stage 2/7 of the Ramco journey pipeline.

For a skeleton (from build_skeleton.py), resolve every SP across ALL component
SP folders, detect its write behaviour, and:
  * classify each TASK's tool purpose (commit / report / ui_assist / fetch /
    init / help_lookup / ui_cascade) from the EMPIRICAL writes of its chain
  * detect integration-service (lvl>0) SPs that are ABSENT from the drop and
    emit them as external_dependency records (this is the TCAL/tax gap)

Write-detection is by reading the SP body, NOT by the filename suffix.

Usage:
  python3 classify_sps.py --root /Users/raj/Downloads/Vizuara --skeleton skeleton.json
  python3 classify_sps.py --root <ROOT> --sp pocrmn_sp_crt_hdrchk   # inspect one SP
"""
import os, re, json, argparse, glob

WRITE_RE = re.compile(
    r"\b(insert\s+into|update|delete\s+from)\s+([a-z0-9_]+\.)?([@#a-z0-9_]+)", re.I)
# A target is scratch/temp if it contains _tmp/_temp anywhere, starts with tmp,
# or is a table variable/temp (@var, #temp). Suffix-only matching misses tmp_* names.
TMP_RE = re.compile(r"(_tmp|_temp|^tmp|^@|^#)", re.I)
# Terminal-commit SP name patterns: the downstream SP that migrates _tmp -> MAIN.
# def_* overrides (read-only helper), so it is excluded.
TERMINAL_RE = re.compile(r"(hdrchk|docsav|_sbt|apr_hdrsav|amnd_hdrchk|sav_hdrchk)", re.I)
DEF_RE = re.compile(r"def_", re.I)
# Task-name suffixes -> task type (only trans-type tasks can be commits).
TRANS_RE = re.compile(r"(sbt|submit|save|tran|trn|apr|approve|return|ret|del|delete|can|spfy|specify|hold|scl)", re.I)
INITTASK_RE = re.compile(r"(ini|init)$", re.I)
FETCHTASK_RE = re.compile(r"(fth|fetch|srch|search|view|vw)", re.I)
HELPTASK_RE = re.compile(r"(hp|hlp|help|href)", re.I)
UITASK_RE = re.compile(r"(ui|umgrd|uihdr|ma$|more)", re.I)
STATUS_RE = re.compile(r"(podocstatus|_status\s*=|setstatus|allowdraftcreation)", re.I)
EXEC_RE = re.compile(r"\bexec(?:ute)?\s+([a-z0-9_]+)", re.I)
ERR_RE = re.compile(r"(raiserror|fin_german_raiserror|@m_errorid\s*=\s*[1-9])", re.I)

# Common cross-component bridge SPs to recurse into.
BRIDGES = {"po_common_vat_sp", "po_common_wf_sp", "po_common_local_is"}
# Families known to be external (component not in this 5-component drop).
EXTERNAL_HINTS = {
    "tcal_": ("TCAL", "tax computation (GST/IGST)"),
    "wfm_": ("WFMTASKBAS", "approval routing / workflow"),
    "pb_": ("Pur_budget", "budget validate/consume"),
}


def index_sps(root):
    idx = {}
    for folder in glob.glob(os.path.join(root, "*", "[Ss][Pp][Ss]")):
        for f in glob.glob(os.path.join(folder, "*.sql")):
            idx.setdefault(os.path.basename(f)[:-4].lower(), f)
    return idx


def read(path):
    try:
        return open(path, encoding="utf-8", errors="ignore").read()
    except OSError:
        return ""


def analyse_sp(path):
    body = read(path)
    # strip line/block comments crudely so commented-out writes don't count
    body_nc = re.sub(r"--[^\n]*", "", body)
    body_nc = re.sub(r"/\*.*?\*/", "", body_nc, flags=re.S)
    main_writes, tmp_writes = set(), set()
    for m in WRITE_RE.finditer(body_nc):
        tbl = m.group(3)
        if TMP_RE.search(tbl):
            tmp_writes.add(tbl)
        elif len(tbl) < 4 and "_" not in tbl:
            continue  # CTE/derived-table alias (T, sup, tab, A) — not a real domain table
        else:
            main_writes.add(tbl)
    return {
        "main_writes": sorted(main_writes),
        "tmp_writes": sorted(tmp_writes),
        "writes_main": bool(main_writes),
        "sets_status": bool(STATUS_RE.search(body_nc)),
        "raises_errors": bool(ERR_RE.search(body_nc)),
        "exec_calls": sorted(set(x.lower() for x in EXEC_RE.findall(body_nc))),
    }


def purpose_for_sp(name, info):
    n = name.lower()
    if n.endswith("_rprt_spo") or "_rprt_sp" in n:
        return "report"
    if info["writes_main"]:
        return "commit"
    if re.search(r"def_", n):
        return "ui_assist"
    if re.search(r"(hdrfet|fetgrd|fet_|gridout|hdrref|_sch_|srch)", n):
        return "fetch"
    if re.search(r"(init|cbiuse)", n):
        return "init"
    if re.search(r"(hlp|href|help)", n):
        return "help_lookup"
    if re.search(r"(ui|umgrd|uihdr)", n):
        return "ui_cascade"
    if info["tmp_writes"]:
        return "validate"  # stager (hdrsav/grdsav)
    return "fetch"


def task_type(task):
    """Infer the task type from its name (init/fetch/help/ui/trans/other)."""
    n = (task.get("task_name") or "")
    if INITTASK_RE.search(n):
        return "init"
    if HELPTASK_RE.search(n):
        return "help"
    if FETCHTASK_RE.search(n):
        return "fetch"
    if TRANS_RE.search(n):
        return "trans"
    if UITASK_RE.search(n):
        return "ui"
    return "other"


def purpose_for_task(task, sp_index, cache):
    """Commit is decided by a TERMINAL commit SP (hdrchk/docsav/apr_hdrsav, not def_*)
    that writes a MAIN table — not by any incidental main-write in a combo/init SP.
    Non-trans tasks are never commits even if a shared SP touches a table."""
    ttype = task_type(task)
    chain = []
    for call in task["calls"]:
        sp = call["spname"].lower()
        path = sp_index.get(sp)
        info = cache.setdefault(sp, analyse_sp(path) if path else None)
        chain.append((sp, info))
    first = chain[0][0] if chain else None

    # Non-action task types resolve by type — a shared SP that happens to write or to
    # share a prefix (e.g. povwmn_sp_initlang in an Init task) must not reclassify them.
    if ttype == "init":
        return "init", first
    if ttype == "help":
        return "help_lookup", first
    if ttype == "fetch":
        return "fetch", first
    if ttype == "ui":
        return "ui_cascade", first

    # Action tasks (trans / other):
    desc = (task.get("taskdesc") or "").lower()
    # report: a _rprt_spo SP, a print/view-output SP (po_povwmn_sp_ft / _sv_ft), or a "Print" task
    for sp, info in chain:
        if "_rprt_sp" in sp or re.search(r"(povwmn_s|_rprt_)", sp):
            return "report", sp
    if "print" in desc:
        return "report", first
    # commit: ANY chain SP that writes a MAIN domain table (the MAIN write may live in a
    # *grd SP — e.g. entry/list-level approve writes the header from poapren_sp_aprgrd).
    main_writers = [(sp, info) for sp, info in chain
                    if info and info["writes_main"] and not DEF_RE.search(sp)]
    if main_writers:
        terminal = [(sp, info) for sp, info in main_writers if TERMINAL_RE.search(sp)]
        return "commit", (terminal[0][0] if terminal else main_writers[-1][0])
    # non-committing action: default helper, then tmp stager, else read
    for sp, info in chain:
        if DEF_RE.search(sp):
            return "ui_assist", sp
    for sp, info in chain:
        if info and info["tmp_writes"]:
            return "validate", sp
    return "fetch", first


def walk_is(calls, sp_index, cache, absent, present_bridges):
    """Recurse the IS tree; record absent SPs and recurse one level into bridges."""
    for c in calls:
        for is_call in c.get("is_calls", []):
            _record_is(is_call, sp_index, cache, absent, present_bridges)


def _record_is(node, sp_index, cache, absent, present_bridges):
    sp = node["spname"].lower()
    path = sp_index.get(sp)
    if not path:
        comp, purpose = _external_of(sp, node.get("component_name", ""))
        absent.append({"sp": node["spname"], "component": comp,
                       "purpose": purpose, "lvl": node["lvl"]})
    elif sp in BRIDGES and sp not in present_bridges:
        present_bridges.add(sp)
        info = cache.setdefault(sp, analyse_sp(path))
        for callee in info["exec_calls"]:
            if callee not in sp_index:
                comp, purpose = _external_of(callee, "")
                absent.append({"sp": callee, "component": comp, "purpose": purpose,
                               "via_bridge": node["spname"], "lvl": node["lvl"] + 1})
    for child in node.get("children", []):
        _record_is(child, sp_index, cache, absent, present_bridges)


def _external_of(sp, comp):
    for pref, (c, p) in EXTERNAL_HINTS.items():
        if sp.startswith(pref):
            return c, p
    return (comp or "UNKNOWN"), "external dependency (SP absent from drop)"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--skeleton")
    ap.add_argument("--sp")
    a = ap.parse_args()
    sp_index = index_sps(a.root)
    cache = {}

    if a.sp:
        path = sp_index.get(a.sp.lower())
        if not path:
            print(json.dumps({"sp": a.sp, "found": False,
                              "external": _external_of(a.sp.lower(), "")}, indent=2))
            return
        info = analyse_sp(path)
        info.update({"sp": a.sp, "path": path,
                     "purpose_if_terminal": purpose_for_sp(a.sp, info)})
        print(json.dumps(info, indent=2))
        return

    skel = json.load(open(a.skeleton))
    out = {"tasks": [], "commits": [], "external_dependencies": []}
    absent, present_bridges = [], set()
    for scr in skel["screens"]:
        for t in scr["tasks"]:
            purpose, sp = purpose_for_task(t, sp_index, cache)
            rec = {"screen": scr["ui_name"], "task": t["task_name"],
                   "taskdesc": t["taskdesc"], "service": t["service_name"],
                   "purpose": purpose, "decided_by_sp": sp}
            out["tasks"].append(rec)
            if purpose == "commit":
                out["commits"].append(rec)
            walk_is(t["calls"], sp_index, cache, absent, present_bridges)
    # dedupe external deps
    seen = set()
    for d in absent:
        k = (d["sp"], d.get("via_bridge"))
        if k not in seen:
            seen.add(k)
            out["external_dependencies"].append(d)
    out["summary"] = {"tasks": len(out["tasks"]), "commits": len(out["commits"]),
                      "external_dependencies": len(out["external_dependencies"])}
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
