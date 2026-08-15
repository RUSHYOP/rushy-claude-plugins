#!/usr/bin/env bash
# Wire this marketplace's MCP plugins into Gemini CLI / Antigravity.
#
# Gemini has no marketplace.json. Each plugin is a gemini-extension.json.
# Default: merge every catalog server into ~/.gemini/config/mcp_config.json
# as disabled=true. --enable NAME turns that one on. --link uses
# `gemini extensions link` when the CLI is installed.
#
# Usage:
#   ./scripts/apply-gemini.sh
#   ./scripts/apply-gemini.sh --enable pdf-reader
#   ./scripts/apply-gemini.sh --link            # gemini extensions link each plugin
#   ./scripts/apply-gemini.sh --dry-run
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY=0
LINK=0
ENABLE=()
EXPECT_ENABLE=0
for arg in "$@"; do
  if [[ "$EXPECT_ENABLE" -eq 1 ]]; then ENABLE+=("$arg"); EXPECT_ENABLE=0; continue; fi
  case "$arg" in
    --dry-run) DRY=1 ;;
    --link) LINK=1 ;;
    --enable) EXPECT_ENABLE=1 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

ARGS=(--target gemini)
[[ "$DRY" -eq 1 ]] && ARGS+=(--dry-run)
for e in "${ENABLE[@]+"${ENABLE[@]}"}"; do
  ARGS+=(--enable "$e")
done
./scripts/apply-mcp.sh "${ARGS[@]}"

if [[ "$LINK" -eq 1 ]]; then
  if ! command -v gemini >/dev/null 2>&1; then
    echo "gemini CLI not on PATH — wrote mcp_config.json only. Install Gemini CLI to --link." >&2
    exit 0
  fi
  python3 - <<'PY'
import os, subprocess, sys
sys.path.insert(0, "scripts/lib")
from mcp_catalog import iter_servers, PLUGINS_DIR, generate_mcp_plugins
generate_mcp_plugins()
dry = os.environ.get("RUSHY_DRY") == "1"
for name, _cfg, meta in iter_servers():
    if meta.get("skipPlugin"):
        continue
    path = PLUGINS_DIR / name
    cmd = ["gemini", "extensions", "link", str(path)]
    print(" ".join(cmd))
    if not dry:
        subprocess.run(cmd, check=False)
PY
fi
