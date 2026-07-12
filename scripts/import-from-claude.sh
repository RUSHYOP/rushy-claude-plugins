#!/usr/bin/env bash
# Import plugins Claude has enabled/installed into this rushy marketplace.
# - Resolves source from ~/.claude/plugins/marketplaces/*/marketplace.json
# - Points install at RUSHYOP/mirror-* (registers mirrors/registry.tsv)
# - Optionally syncs new mirrors and commits
#
# Usage:
#   ./scripts/import-from-claude.sh
#   ./scripts/import-from-claude.sh --dry-run
#   ./scripts/import-from-claude.sh --sync          # also run sync-mirrors for new/all
#   ./scripts/import-from-claude.sh --sync --only-new
#   ./scripts/import-from-claude.sh --include-disabled
#   ./scripts/import-from-claude.sh --commit
#   ./scripts/import-from-claude.sh --sync --commit

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
SYNC=0
ONLY_NEW=0
INCLUDE_DISABLED=0
COMMIT=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --sync) SYNC=1 ;;
    --only-new) ONLY_NEW=1 ;;
    --include-disabled) INCLUDE_DISABLED=1 ;;
    --commit) COMMIT=1 ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

export IMPORT_DRY_RUN="$DRY_RUN"
export IMPORT_INCLUDE_DISABLED="$INCLUDE_DISABLED"

# Print lists + write marketplace; capture NEW_MIRRORS for optional sync
mapfile -t RESULT < <(python3 <<'PY'
import os
import sys
sys.path.insert(0, "scripts/lib")
from marketplace_io import (
    import_missing_from_claude,
    load_registry,
    normalize_git_url,
    load_marketplace,
)

dry = os.environ.get("IMPORT_DRY_RUN") == "1"
include = os.environ.get("IMPORT_INCLUDE_DISABLED") == "1"
added, skipped, failed = import_missing_from_claude(dry_run=dry, include_disabled=include)

print(f"ADDED:{len(added)}")
for a in added:
    print(f"  + {a}")
print(f"SKIPPED:{len(skipped)}")
# only show count if many
if len(skipped) <= 30:
    for s in skipped:
        print(f"  = {s}")
else:
    print(f"  ({len(skipped)} already in marketplace)")
print(f"FAILED:{len(failed)}")
for f in failed:
    print(f"  ! {f}")

# Emit machine-readable mirror names that cover added plugins
if not dry and added:
    mp = load_marketplace()
    names = {a.split("@", 1)[0] for a in added}
    reg = load_registry()
    for p in mp.get("plugins", []):
        if p.get("name") not in names:
            continue
        up = (p.get("metadata") or {}).get("upstreamUrl")
        if not up:
            continue
        up = normalize_git_url(up)
        if up in reg:
            print(f"MIRROR:{reg[up][0]}")
PY
)

# Parse MIRROR: lines for --sync --only-new
NEW_MIRRORS=()
for line in "${RESULT[@]+"${RESULT[@]}"}"; do
  echo "$line"
  if [[ "$line" == MIRROR:* ]]; then
    NEW_MIRRORS+=("${line#MIRROR:}")
  fi
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo ""
  echo "Dry run — no files written."
  exit 0
fi

if [[ "$SYNC" -eq 1 ]]; then
  if [[ "$ONLY_NEW" -eq 1 ]]; then
    if [[ ${#NEW_MIRRORS[@]} -eq 0 ]]; then
      echo "No new mirrors to sync."
    else
      # unique
      mapfile -t NEW_MIRRORS < <(printf '%s\n' "${NEW_MIRRORS[@]}" | sort -u)
      for m in "${NEW_MIRRORS[@]}"; do
        echo "Syncing new mirror: $m"
        ./scripts/sync-mirrors.sh --only "$m"
      done
    fi
  else
    echo "Syncing all mirrors..."
    ./scripts/sync-mirrors.sh
  fi
fi

if [[ "$COMMIT" -eq 1 ]]; then
  if git diff --quiet -- .claude-plugin/marketplace.json UPSTREAM.md mirrors/registry.tsv 2>/dev/null; then
    echo "No catalog changes to commit."
  else
    git add .claude-plugin/marketplace.json UPSTREAM.md mirrors/registry.tsv
    git commit -m "chore: import plugins from Claude into rushy marketplace"
    echo "Committed. Push with: git push"
  fi
fi

echo ""
echo "Done. First-party rebuild: ./scripts/rebuild-marketplace.sh"
echo "Refresh mirrors:        ./scripts/sync-mirrors.sh"
