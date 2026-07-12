#!/usr/bin/env python3
"""
render.py — turn a house-style HTML file into an A4 PDF, exactly the way the
reference document was produced (headless Chrome print-to-PDF, Skia/PDF).

Usage:
    python3 render.py input.html [output.pdf]

If output is omitted it is derived from the input name. The HTML must reference
report.css (relative link is fine — Chrome loads it from the file's own folder).
"""
import os, sys, subprocess, shutil, tempfile

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
    "microsoft-edge", "chrome",
]

def find_chrome():
    for c in CHROME_CANDIDATES:
        if os.path.isabs(c) and os.path.exists(c):
            return c
        w = shutil.which(c)
        if w:
            return w
    sys.exit("ERROR: could not find Chrome/Chromium/Edge. Install Google Chrome.")

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    html = os.path.abspath(sys.argv[1])
    if not os.path.exists(html):
        sys.exit(f"ERROR: no such file: {html}")
    out = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.splitext(html)[0] + ".pdf"

    chrome = find_chrome()
    with tempfile.TemporaryDirectory() as prof:
        cmd = [
            chrome, "--headless=new", "--disable-gpu", "--no-sandbox",
            f"--user-data-dir={prof}",
            "--no-pdf-header-footer",
            "--print-to-pdf-no-header",         # older-flag alias, harmless if unknown
            f"--print-to-pdf={out}",
            f"file://{html}",
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        # Chrome sometimes rejects the alias flag combo; retry without it.
        if not os.path.exists(out):
            cmd2 = [c for c in cmd if c != "--print-to-pdf-no-header"]
            r = subprocess.run(cmd2, capture_output=True, text=True)
    if not os.path.exists(out):
        sys.stderr.write(r.stderr or r.stdout)
        sys.exit("ERROR: PDF was not produced.")
    print(f"wrote {out}  ({os.path.getsize(out)//1024} KB)")

if __name__ == "__main__":
    main()
