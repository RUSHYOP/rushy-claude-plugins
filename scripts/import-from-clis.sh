#!/usr/bin/env bash
# RECONCILE ONLY — not the primary way to add plugins.
# Prefer: ./scripts/add-plugin.sh (marketplace-first), then wire CLIs to this repo.
#
# Discover plugins already installed/enabled in Claude Code and/or Grok, and add any
# missing ones to THIS marketplace catalog (marketplace.json + mirrors/registry).
#
# Does NOT install plugins into CLIs. Add this repo as a marketplace in each CLI:
#   Claude: extraKnownMarketplaces.rushy → RUSHYOP/rushy-claude-plugins
#   Grok:   grok plugin marketplace add RUSHYOP/rushy-claude-plugins
#           (or: grok plugin marketplace add /Users/admin/Codes-2/Agentic-setup)
#
# New upstream remotes are registered in mirrors/registry.tsv. Optionally
# create/refresh those private mirrors with --sync (off by default).
#
# Usage:
#   ./scripts/import-from-clis.sh
#   ./scripts/import-from-clis.sh --dry-run
#   ./scripts/import-from-clis.sh --claude-only
#   ./scripts/import-from-clis.sh --grok-only
#   ./scripts/import-from-clis.sh --sync --only-new   # also run sync-mirrors for new remotes
#   ./scripts/import-from-clis.sh --commit
#   ./scripts/import-from-clis.sh --include-disabled  # Claude disabled enables too

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
SYNC=0
ONLY_NEW=0
INCLUDE_DISABLED=0
COMMIT=0
SOURCES="claude,grok"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --sync) SYNC=1 ;;
    --only-new) ONLY_NEW=1 ;;
    --include-disabled) INCLUDE_DISABLED=1 ;;
    --commit) COMMIT=1 ;;
    --claude-only) SOURCES="claude" ;;
    --grok-only) SOURCES="grok" ;;
    -h|--help)
      sed -n '2,22p' "$0"
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
export IMPORT_SOURCES="$SOURCES"

mapfile -t RESULT < <(python3 <<'PY'
import os
import sys
sys.path.insert(0, "scripts/lib")
from marketplace_io import import_missing_from_clis

dry = os.environ.get("IMPORT_DRY_RUN") == "1"
include = os.environ.get("IMPORT_INCLUDE_DISABLED") == "1"
sources = tuple(s.strip() for s in os.environ.get("IMPORT_SOURCES", "claude,grok").split(",") if s.strip())

added, skipped, failed, mirrors = import_missing_from_clis(
    dry_run=dry,
    include_disabled=include,
    sources=sources,
)

print(f"SOURCES:{','.join(sources)}")
print(f"ADDED:{len(added)}")
for a in added:
    print(f"  + {a}")
print(f"SKIPPED:{len(skipped)}")
if len(skipped) <= 40:
    for s in skipped:
        print(f"  = {s}")
else:
    print(f"  ({len(skipped)} already in marketplace)")
print(f"FAILED:{len(failed)}")
for f in failed:
    print(f"  ! {f}")
print(f"NEW_MIRRORS:{len(mirrors)}")
for m in mirrors:
    print(f"MIRROR:{m}")
if added and not dry:
    print("HINT: run ./scripts/sync-mirrors.sh to create/refresh private mirrors for new remotes")
    print("HINT: then enable in CLIs via marketplace (no forced install from this script)")
PY
)

NEW_MIRRORS=()
for line in "${RESULT[@]+"${RESULT[@]}"}"; do
  echo "$line"
  if [[ "$line" == MIRROR:* ]]; then
    NEW_MIRRORS+=("${line#MIRROR:}")
  fi
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo ""
  echo "Dry run — marketplace.json / registry not written."
  exit 0
fi

# Keep generated global enable lists in sync with catalog (for optional use)
if [[ -x ./scripts/generate-global-config.sh ]]; then
  ./scripts/generate-global-config.sh >/dev/null || true
fi

if [[ "$SYNC" -eq 1 ]]; then
  if [[ "$ONLY_NEW" -eq 1 ]]; then
    if [[ ${#NEW_MIRRORS[@]} -eq 0 ]]; then
      echo "No new mirrors to sync."
    else
      mapfile -t NEW_MIRRORS < <(printf '%s\n' "${NEW_MIRRORS[@]}" | sort -u)
      for m in "${NEW_MIRRORS[@]}"; do
        echo "Syncing new mirror: $m"
        ./scripts/sync-mirrors.sh --only "$m"
      done
    fi
  else
    ./scripts/sync-mirrors.sh
  fi
fi

if [[ "$COMMIT" -eq 1 ]]; then
  if git diff --quiet -- .claude-plugin/marketplace.json UPSTREAM.md mirrors/registry.tsv config/ 2>/dev/null; then
    echo "No catalog changes to commit."
  else
    git add .claude-plugin/marketplace.json UPSTREAM.md mirrors/registry.tsv config/ 2>/dev/null || true
    git commit -m "chore: import plugins from CLIs into rushy marketplace"
    echo "Committed. Push with: git push"
  fi
fi

echo ""
echo "Catalog is the source of truth. Point CLIs at this marketplace:"
echo "  Grok:   grok plugin marketplace add RUSHYOP/rushy-claude-plugins"
echo "          grok plugin marketplace add $ROOT   # live local checkout"
echo "  Claude: enable *@rushy after registering RUSHYOP/rushy-claude-plugins"
echo "Mirrors:  ./scripts/sync-mirrors.sh   # only when you want private DR copies refreshed"
