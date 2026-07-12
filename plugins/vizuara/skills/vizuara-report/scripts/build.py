#!/usr/bin/env python3
"""
build.py  -  build a Vizuara house-style report PDF from an HTML file.

It ties together the two dependency skills:
  * vizuara-ramco-pdf  -> report.css + the headless-Chrome render step
  * wisprflow-figure   -> the figure library (added to sys.path for you)

Usage:
    python3 build.py report.html [report.pdf]

Before running, generate your figures with wisprflow-figure and save the PNGs in the
same folder as report.html. This script copies report.css next to your HTML, makes
the figure library importable, then renders A4 with no browser header or footer.
"""
import os, sys, shutil, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))

# Candidate roots where the sibling skills live.
SKILL_ROOTS = [
    os.path.abspath(os.path.join(HERE, "..", "..")),           # ~/.claude/skills
    os.path.expanduser("~/.claude/skills"),
    os.environ.get("VIZUARA_SKILLS_DIR", ""),
]

def find_skill(name, *inner):
    for root in SKILL_ROOTS:
        if not root:
            continue
        p = os.path.join(root, name, *inner)
        if os.path.exists(p):
            return p
    return None

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    html = os.path.abspath(sys.argv[1])
    if not os.path.exists(html):
        sys.exit(f"ERROR: no such file: {html}")
    out = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.splitext(html)[0] + ".pdf"
    workdir = os.path.dirname(html)

    # 1. make report.css available next to the HTML
    css = find_skill("vizuara-ramco-pdf", "assets", "report.css")
    if not css:
        sys.exit("ERROR: could not find the vizuara-ramco-pdf skill. Install it in "
                 "~/.claude/skills/ (or set VIZUARA_SKILLS_DIR).")
    dest_css = os.path.join(workdir, "report.css")
    if os.path.abspath(css) != os.path.abspath(dest_css):
        shutil.copyfile(css, dest_css)

    # 2. confirm the figure library is reachable (import-time convenience)
    figlib = find_skill("wisprflow-figure", "scripts", "wisprflow_figures.py")
    if figlib:
        sys.path.insert(0, os.path.dirname(figlib))
    else:
        sys.stderr.write("WARNING: wisprflow-figure skill not found; make figures "
                         "there and drop the PNGs beside your HTML.\n")

    # 3. render via the vizuara-ramco-pdf render script
    render = find_skill("vizuara-ramco-pdf", "scripts", "render.py")
    spec = importlib.util.spec_from_file_location("render", render)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    sys.argv = ["render.py", html, out]
    mod.main()

if __name__ == "__main__":
    main()
