#!/usr/bin/env bash
# Audit — and optionally repair — the visibility of every RUSHYOP/mirror-* repo
# the marketplace installs from.
#
# Mirrors are the *published* install URL for upstream plugins, so a private
# mirror is a 404 for every marketplace consumer. Full rationale:
# scripts/lib/mirror-visibility.sh
#
# The repo list is the UNION of:
#   - mirrors/registry.tsv                        (sync source of truth)
#   - .claude-plugin/marketplace.json metadata.mirrorRepo  (what consumers clone)
# so drift in either file is still caught.
#
# Usage:
#   ./scripts/audit-mirror-visibility.sh         # report only; exit 1 if any non-public
#   ./scripts/audit-mirror-visibility.sh --fix   # flip every non-public mirror to public

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/mirror-visibility.sh
source "${ROOT}/scripts/lib/mirror-visibility.sh"

MODE="--dry-run"
case "${1:-}" in
  --fix) MODE="" ;;
  ""|--dry-run|--check) MODE="--dry-run" ;;
  -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
  *) echo "Unknown option: $1 (use --fix)" >&2; exit 1 ;;
esac

# Collect every mirror repo referenced anywhere in the catalog.
# Newline-delimited string + counters rather than arrays: under `set -u`, bash 3.2
# (the system bash on macOS) errors on ${#empty_array[@]}, and `mapfile` is bash 4+.
REPOS="$(python3 - <<'PY'
import json, re
from pathlib import Path

repos = set()

reg = Path("mirrors/registry.tsv")
if reg.exists():
    for line in reg.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) >= 2 and parts[1]:
            repos.add(f"RUSHYOP/{parts[1]}")

mp = Path(".claude-plugin/marketplace.json")
if mp.exists():
    for p in json.loads(mp.read_text()).get("plugins", []):
        meta = p.get("metadata") or {}
        # Prefer the explicit mirrorRepo field; fall back to parsing the install URL.
        repo = meta.get("mirrorRepo")
        if not repo:
            src = p.get("source")
            url = src.get("url", "") if isinstance(src, dict) else ""
            m = re.match(r"https://github\.com/(RUSHYOP/mirror-[^/]+?)(?:\.git)?$", url)
            repo = m.group(1) if m else None
        if repo and repo.startswith("RUSHYOP/mirror-"):
            repos.add(repo)

for r in sorted(repos):
    print(r)
PY
)"

if [[ -z "$REPOS" ]]; then
  echo "No mirror repos found in mirrors/registry.tsv or .claude-plugin/marketplace.json" >&2
  exit 1
fi

TOTAL="$(printf '%s\n' "$REPOS" | grep -c .)"
echo "Auditing ${TOTAL} mirror repos (policy: PUBLIC)"
[[ -n "$MODE" ]] || echo "Mode: --fix (non-public mirrors will be made public)"

FAILED=""
FAILED_COUNT=0
while IFS= read -r repo; do
  [[ -z "$repo" ]] && continue
  echo ""
  echo "-- $repo"
  if ! ensure_mirror_public "$repo" ${MODE:+"$MODE"}; then
    FAILED="${FAILED}${repo}"$'\n'
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
done <<< "$REPOS"

echo ""
if [[ "$FAILED_COUNT" -eq 0 ]]; then
  echo "OK — all ${TOTAL} mirrors are public."
  exit 0
fi

echo "NOT PUBLIC (${FAILED_COUNT}/${TOTAL}):"
printf '%s' "$FAILED" | sed 's/^/  /'
if [[ -n "$MODE" ]]; then
  echo ""
  echo "Run './scripts/audit-mirror-visibility.sh --fix' to make them public."
fi
exit 1
