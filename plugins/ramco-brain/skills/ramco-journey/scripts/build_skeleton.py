#!/usr/bin/env python3
"""
build_skeleton.py — Stage 1 of the Ramco journey pipeline.

Parse a component's Service_details_<MODULE>.csv and emit the deterministic
skeleton of ONE activity: ordered screens -> tasks -> service -> ordered
(method, spname) call chain, with lvl>0 integration-service (IS) sub-chains
resolved via parent_service_name/parent_method_name.

CSV facts this handles correctly:
  * embedded commas inside quoted fields (parent_* are comma-joined lists)
    -> use csv.DictReader, never split on ','
  * IS rows have activity_name == 'NULL' and lvl >= 1; they link to a caller
    when the caller's (service_name, method_name) appears (as a substring) in
    the IS row's (parent_service_name, parent_method_name)
  * order calls by (ps_sequenceno, sequenceno)

Usage:
  python3 build_skeleton.py --csv <path to Service_details_X.csv> --activity PoCrt
  python3 build_skeleton.py --csv <...> --list           # list all activities
  python3 build_skeleton.py --csv <...> --activity PoCrt --out skeleton.json
"""
import csv, json, argparse, sys
from collections import OrderedDict, defaultdict


def num(s):
    try:
        return int(s)
    except (TypeError, ValueError):
        return 0


def load(path):
    # utf-8-sig strips a BOM if present; DictReader respects quoted commas
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def list_activities(rows):
    acts = OrderedDict()
    for r in rows:
        a = (r.get("activity_name") or "").strip()
        if a and a != "NULL":
            acts.setdefault(a, {"activitydesc": r.get("activitydesc", ""),
                                "screens": set(), "tasks": set()})
            acts[a]["screens"].add(r.get("ui_name", ""))
            acts[a]["tasks"].add(r.get("task_name", ""))
    out = []
    for a, d in acts.items():
        out.append({"activity_name": a, "activitydesc": d["activitydesc"],
                    "screens": len(d["screens"]), "tasks": len(d["tasks"])})
    return out


def build_is_index(rows):
    """Index IS rows (activity_name == NULL) by every (parent_service, parent_method)
    token pair, splitting the comma-joined parent lists."""
    idx = defaultdict(list)
    for r in rows:
        if (r.get("activity_name") or "").strip() != "NULL":
            continue
        psv = [x.strip() for x in (r.get("parent_service_name") or "").split(",")]
        pmt = [x.strip() for x in (r.get("parent_method_name") or "").split(",")]
        # pair them up positionally; fall back to cross-pairing if lengths differ
        pairs = set()
        if len(psv) == len(pmt):
            pairs.update(zip(psv, pmt))
        else:
            for s in psv:
                for m in pmt:
                    pairs.add((s, m))
        for key in pairs:
            idx[key].append(r)
    return idx


def is_children(idx, svc, mth, seen):
    out = []
    for c in sorted(idx.get((svc, mth), []),
                    key=lambda x: (num(x["ps_sequenceno"]), num(x["sequenceno"]))):
        key = (c["service_name"], c["method_name"], c["spname"])
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "service_name": c["service_name"],
            "method_name": c["method_name"],
            "spname": c["spname"],
            "component_name": c.get("component_name", ""),
            "lvl": num(c["lvl"]),
            "is_lvl_gt0": num(c["lvl"]) > 0,
            "children": is_children(idx, c["service_name"], c["method_name"], seen),
        })
    return out


def build_skeleton(rows, activity):
    real = [r for r in rows if (r.get("activity_name") or "").strip() == activity]
    if not real:
        raise SystemExit(f"No rows for activity '{activity}'. Try --list.")
    idx = build_is_index(rows)

    screens = OrderedDict()
    for r in real:
        screens.setdefault((r["ui_name"], r.get("description", "")), []).append(r)

    skel = {
        "activity_name": activity,
        "activitydesc": real[0].get("activitydesc", ""),
        "component": real[0].get("component_name", ""),
        "process": real[0].get("process_name", ""),
        "screens": [],
    }
    for (ui, desc), srows in screens.items():
        tasks = OrderedDict()
        for r in srows:
            tasks.setdefault((r["task_name"], r.get("taskdesc", "")), []).append(r)
        scr = {"ui_name": ui, "description": desc, "tasks": []}
        for (tn, td), trows in tasks.items():
            trows = sorted(trows, key=lambda x: (num(x["ps_sequenceno"]), num(x["sequenceno"])))
            calls = []
            for r in trows:
                seen = set()
                calls.append({
                    "method_name": r["method_name"],
                    "spname": r["spname"],
                    "ps_sequenceno": num(r["ps_sequenceno"]),
                    "sequenceno": num(r["sequenceno"]),
                    "is_calls": is_children(idx, r["service_name"], r["method_name"], seen),
                })
            scr["tasks"].append({
                "task_name": tn,
                "taskdesc": td,
                "service_name": trows[0]["service_name"],
                "calls": calls,
                "has_is_lvl_gt0": any(c["is_calls"] for c in calls),
            })
        skel["screens"].append(scr)
    skel["counts"] = {
        "screens": len(skel["screens"]),
        "tasks": sum(len(s["tasks"]) for s in skel["screens"]),
    }
    return skel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--activity")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--out")
    a = ap.parse_args()
    rows = load(a.csv)
    if a.list or not a.activity:
        for x in list_activities(rows):
            print(f"{x['activity_name']:20s} | {x['activitydesc']:45.45s} | "
                  f"{x['screens']:2d} screens | {x['tasks']:3d} tasks")
        return
    skel = build_skeleton(rows, a.activity)
    text = json.dumps(skel, indent=2)
    if a.out:
        open(a.out, "w").write(text)
        print(f"wrote {a.out}: {skel['counts']}")
    else:
        print(text)


if __name__ == "__main__":
    main()
