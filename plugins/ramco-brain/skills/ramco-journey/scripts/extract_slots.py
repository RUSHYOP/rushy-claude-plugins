#!/usr/bin/env python3
"""
extract_slots.py — Stage 3/4 of the Ramco journey pipeline.

Parse a screen .htm (older Ramco format) and emit candidate slots + navigation
(forwardlink -> subflow) + action buttons (transtask), with control.kind /
obligation / fill_behaviour derived from the CSS class. Encodes the two fixes:
  * *displayonly* (or a label without a *mandatory* class) -> display_only/optional
  * *mandatory* class -> screen_mandatory obligation

This is a pragmatic extractor; ALWAYS spot-check against the .htm and refine
control.kind to the schema enum (see references/06_screen_extraction.md). It is a
depth accelerator, not a replacement for reading the screen.

Usage:
  python3 extract_slots.py --htm <path to Activity_ilbo.htm>
  python3 extract_slots.py --htm <...> --out slots.json
"""
import re, json, argparse, os, html

CLASS_RE = re.compile(r'class\s*=\s*"([^"]*)"', re.I)
SYN_RE = re.compile(r'btsynonym\s*=\s*"([^"]*)"', re.I)
TYPE_RE = re.compile(r'type\s*=\s*"([^"]*)"', re.I)
TDCLASS_RE = re.compile(r'tdclass\s*=\s*"([^"]*)"', re.I)  # grid columns carry the cell's display/input style here, not in class=
ID_RE = re.compile(r'\bid\s*=\s*"([^"]*)"', re.I)
DATATYPE_RE = re.compile(r'datatype\s*=\s*"([^"]*)"', re.I)
HREF_RE = re.compile(r'ctrlhref\s*=\s*"([^"]*)"', re.I)
# CallSubmitPage("X") — quotes may be &quot;-escaped in the raw .htm
TASK_RE = re.compile(r'CallSubmitPage\(\s*["\']?([A-Z0-9_]+)["\']?\s*\)', re.I)

MANDATORY = ("labelsmandatoryleft", "gridheadingmandatory")
DISPLAYONLY = ("displayonly", "numericdisplayonly", "griddisplayonly", "gridnumericdisplayonly")
INPUT_CLASSES = ("characterfield", "numericfield", "gridcelltextfield", "gridcellnumericfield")
NAV_CLASSES = ("forwardlink", "hdrdbforwardlink", "mldbforwardlink")


def classify(classes):
    cl = classes.lower()
    if any(d in cl for d in DISPLAYONLY):
        return dict(kind="display", obligation="optional", fill="display_only", basis="screen")
    if any(m in cl for m in MANDATORY):
        return dict(kind="typed", obligation="mandatory", fill="user_entry", basis="screen_mandatory")
    if "combofield" in cl:
        return dict(kind="enum_dropdown", obligation="optional", fill="user_entry", basis="screen")
    if any(i in cl for i in INPUT_CLASSES):
        return dict(kind="typed", obligation="optional", fill="user_entry", basis="screen")
    if "gridheading" in cl:
        return dict(kind="typed", obligation="optional", fill="user_entry", basis="screen")
    if any(n in cl for n in NAV_CLASSES):
        return dict(kind="nav_link", obligation="optional", fill="navigation", basis="screen")
    if "transtask" in cl:
        return dict(kind="action_button", obligation="optional", fill="action", basis="screen")
    if cl.strip() in ("labelsleft", "labels", "labelscenter"):
        return dict(kind="display", obligation="optional", fill="label_only", basis="screen")
    return None


def tags(markup):
    # crude tag splitter; good enough for class/synonym extraction on these screens
    return re.findall(r"<[^>]+>", markup)


def extract(path):
    raw = open(path, encoding="utf-8", errors="ignore").read()
    doc = html.unescape(raw)  # turn &quot; into " so CallSubmitPage ids parse
    ilbo = os.path.basename(path).rsplit(".", 1)[0]
    m = re.search(r'ilboname\s*=\s*"?([a-z0-9_]+)"?', doc, re.I)
    if m:
        ilbo = m.group(1)
    # human label text per field: label/heading cells share the control's btsynonym
    # (or carry an id like lbl<field>); the visible text follows the cell's '>'.
    labelmap = {}
    for m in re.finditer(r"<t[dh][^>]*>", doc):
        tg = m.group(0)
        cls = CLASS_RE.search(tg)
        if not cls or not re.search(r"labels|gridheading", cls.group(1), re.I):
            continue
        key = None
        s = SYN_RE.search(tg)
        if s:
            key = s.group(1).lower()
        else:
            idm2 = ID_RE.search(tg)
            if idm2 and idm2.group(1).lower().startswith("lbl"):
                key = idm2.group(1).lower()[3:]
        if not key:
            continue
        nxt = re.match(r"\s*([A-Za-z][^<]{0,40})", doc[m.end():m.end() + 80])
        if nxt:
            labelmap.setdefault(key, nxt.group(1).strip())

    slots, navs, actions = [], [], []
    seen = set()
    for tag in tags(doc):
        cm = CLASS_RE.search(tag)
        tm = TYPE_RE.search(tag)
        dm = TDCLASS_RE.search(tag)
        # the styling token may live in class= OR type= OR tdclass= (grid columns put
        # the cell's display/input style in tdclass, while class= is just the heading);
        # DISPLAYONLY is matched before gridheading in classify(), so display wins.
        token = " ".join(x.group(1) for x in (cm, tm, dm) if x)
        if not token:
            continue
        info = classify(token)
        if not info:
            continue
        syn = SYN_RE.search(tag)
        idm = ID_RE.search(tag)
        href = HREF_RE.search(tag)
        task = TASK_RE.search(tag)
        # field name: prefer btsynonym, fall back to id/name
        field = syn.group(1) if syn else (idm.group(1) if idm else None)
        if info["kind"] == "nav_link":
            link = (task.group(1) if task else (href.group(1) if href else field))
            if link:
                navs.append({"link_id": link, "class": token.strip()})
            continue
        if info["kind"] == "action_button":
            act = task.group(1) if task else (href.group(1) if href else field)
            if act:
                actions.append({"task": act, "class": token.strip()})
            continue
        if not field or field in seen:
            continue
        # drop layout fillers and grid-coordinate pseudo-controls (section/hord/vord
        # cell ids that are not real named fields — keep only btsynonym-named slots)
        fl = field.lower()
        if fl.startswith(("filler", "dspfiller")):
            continue
        if re.search(r"section\d|_?hord_?\d|_?vord_?\d|h?ord_\d+_v?ord_\d+", fl):
            continue
        if re.fullmatch(r"[a-f0-9]{6,}", fl):  # anonymous hex ids
            continue
        seen.add(field)
        dt = DATATYPE_RE.search(tag)
        # scope from the control's CSS class: grid cells/headings are line-level,
        # everything else is header-level (caller overrides to subscreen:<ilbo>).
        scope = "line" if re.search(r"grid", token, re.I) else "header"
        slots.append({
            "slot_id": field,
            "label": labelmap.get(field.lower(), field),
            "control": {"field": field, "kind": info["kind"], "screen": ilbo},
            "scope": scope,
            "obligation": info["obligation"],
            "fill_behaviour": info["fill"],
            "obligation_basis": info["basis"],
            "data_type": dt.group(1) if dt else None,
            "evidence": [os.path.relpath(path)],
        })
    return {"ilbo": ilbo, "slots": slots, "nav_links": navs, "action_buttons": actions,
            "counts": {"slots": len(slots), "nav_links": len(navs), "actions": len(actions),
                       "mandatory": sum(1 for s in slots if s["obligation"] == "mandatory"),
                       "display_only": sum(1 for s in slots if s["fill_behaviour"] == "display_only")}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--htm", required=True)
    ap.add_argument("--out")
    a = ap.parse_args()
    res = extract(a.htm)
    text = json.dumps(res, indent=2)
    if a.out:
        open(a.out, "w").write(text)
        print(f"wrote {a.out}: {res['counts']}")
    else:
        print(text)


if __name__ == "__main__":
    main()
