#!/usr/bin/env bash
# Apply the single maintained MCP config (config/mcp-servers.json) to a machine.
#
# Usage:
#   ./scripts/apply-mcp.sh                     # merge into ~/.claude.json (user scope)
#   ./scripts/apply-mcp.sh --project /path     # merge into <path>/.mcp.json
#
# Idempotent: each server key is overwritten, never duplicated. Other keys in
# the target file are left untouched. ${ENV_VAR} placeholders are preserved
# verbatim (the MCP client resolves them at launch) — this script never expands
# or bakes in secrets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/config/mcp-servers.json"

TARGET=""
PROJECT=""
for arg in "$@"; do
  case "$arg" in
    --project) PROJECT="__next__" ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *)
      if [[ "$PROJECT" == "__next__" ]]; then PROJECT="$arg"
      else echo "Unknown arg: $arg" >&2; exit 1; fi
      ;;
  esac
done

if [[ -n "$PROJECT" && "$PROJECT" != "__next__" ]]; then
  TARGET="$PROJECT/.mcp.json"
elif [[ "$PROJECT" == "__next__" ]]; then
  echo "--project needs a path" >&2; exit 1
else
  TARGET="$HOME/.claude.json"
fi

SRC="$SRC" TARGET="$TARGET" python3 <<'PY'
import json, os
from pathlib import Path

src = json.loads(Path(os.environ["SRC"]).read_text())
servers = src["mcpServers"]
tp = Path(os.environ["TARGET"])
target = json.loads(tp.read_text()) if tp.exists() else {}
existing = target.setdefault("mcpServers", {})
for name, cfg in servers.items():
    existing[name] = cfg
tp.parent.mkdir(parents=True, exist_ok=True)
tp.write_text(json.dumps(target, indent=2) + "\n")
print(f"Merged {len(servers)} MCP servers into {tp}")
print("Set required env (~/.claude/settings.json 'env'): OBSIDIAN_VAULT_PATH, ATLASSIAN_SITE, RAPIDS_MCP_TOKEN — see config/mcp-servers.README.md")
PY
