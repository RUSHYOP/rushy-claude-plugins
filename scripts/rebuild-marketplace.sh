#!/usr/bin/env bash
# Rebuild marketplace.json first-party plugin list from plugins/* on disk.
# Preserves upstream (mirrored) catalog entries.
#
# Usage:
#   ./scripts/rebuild-marketplace.sh
#   ./scripts/rebuild-marketplace.sh --commit

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMMIT=0
for arg in "$@"; do
  case "$arg" in
    --commit) COMMIT=1 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

python3 <<'PY'
import sys
sys.path.insert(0, "scripts/lib")
from marketplace_io import rebuild_marketplace, PLUGINS_DIR

mp = rebuild_marketplace()
first = [p["name"] for p in mp["plugins"] if (p.get("metadata") or {}).get("ownership") == "RUSHYOP"]
up = [p["name"] for p in mp["plugins"] if (p.get("metadata") or {}).get("ownership") != "RUSHYOP"]
print(f"Rebuilt marketplace: {len(first)} first-party, {len(up)} upstream")
print("  first-party:", ", ".join(first) or "(none)")
print("  plugins dir:", PLUGINS_DIR)
PY

if [[ "$COMMIT" -eq 1 ]]; then
  if git diff --quiet -- .claude-plugin/marketplace.json UPSTREAM.md 2>/dev/null; then
    echo "No marketplace changes to commit."
  else
    git add .claude-plugin/marketplace.json UPSTREAM.md
    git commit -m "chore: rebuild marketplace first-party plugins from plugins/"
    echo "Committed. Push with: git push"
  fi
fi
