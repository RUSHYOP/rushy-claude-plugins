#!/usr/bin/env bash
# Project config/mcp-servers.json into first-party plugins (off by default)
# plus Grok's .grok-plugin/marketplace.json.
#
# Usage:
#   ./scripts/generate-mcp-plugins.sh
#   ./scripts/generate-mcp-plugins.sh --rebuild   # also rebuild marketplace + global-settings
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --rebuild) REBUILD=1 ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

python3 <<'PY'
import sys
sys.path.insert(0, "scripts/lib")
from mcp_catalog import generate_mcp_plugins, write_grok_marketplace

names = generate_mcp_plugins()
print(f"Generated {len(names)} MCP plugins (defaultEnabled=false):")
for n in names:
    print(f"  - {n}")
write_grok_marketplace()
print("Wrote .grok-plugin/marketplace.json")
PY

if [[ "$REBUILD" -eq 1 ]]; then
  ./scripts/rebuild-marketplace.sh
fi
