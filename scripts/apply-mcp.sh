#!/usr/bin/env bash
# Apply the MCP catalog (config/mcp-servers.json) to a machine — OFF by default.
#
# Why default-off: these servers were imported from a personal Claude config.
# Shipping them enabled would start Ramco/internal/OAuth servers on every
# consumer machine. Plugins stay in the marketplace as name@rushy with
# defaultEnabled=false; this script only writes *disabled* client entries
# unless you pass --enable NAME.
#
# Usage:
#   ./scripts/apply-mcp.sh                      # regen plugins; merge OFF into cursor+gemini
#   ./scripts/apply-mcp.sh --dry-run
#   ./scripts/apply-mcp.sh --enable obsidian    # turn one server on in cursor+gemini
#   ./scripts/apply-mcp.sh --target cursor
#   ./scripts/apply-mcp.sh --target gemini
#   ./scripts/apply-mcp.sh --target grok        # write config/grok-mcp.toml fragment
#   ./scripts/apply-mcp.sh --target claude --enable pdf-reader
#       # Claude: does NOT dump the whole catalog into ~/.claude.json.
#       # --enable NAME@claude writes only that one server (placeholders intact).
#   ./scripts/apply-mcp.sh --project /path      # merge OFF into <path>/.mcp.json
#
# Never expands ${ENV_VAR}. Never copies tokens from ~/.claude.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY=0
PROJECT=""
TARGET="adapters"   # adapters = cursor+gemini+grok-fragment; not live Claude
ENABLE=()
EXPECT_PROJECT=0
EXPECT_ENABLE=0
EXPECT_TARGET=0

for arg in "$@"; do
  if [[ "$EXPECT_PROJECT" -eq 1 ]]; then PROJECT="$arg"; EXPECT_PROJECT=0; continue; fi
  if [[ "$EXPECT_ENABLE" -eq 1 ]]; then ENABLE+=("$arg"); EXPECT_ENABLE=0; continue; fi
  if [[ "$EXPECT_TARGET" -eq 1 ]]; then TARGET="$arg"; EXPECT_TARGET=0; continue; fi
  case "$arg" in
    --dry-run) DRY=1 ;;
    --project) EXPECT_PROJECT=1 ;;
    --enable) EXPECT_ENABLE=1 ;;
    --target) EXPECT_TARGET=1 ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done
if [[ "$EXPECT_PROJECT" -eq 1 ]]; then echo "--project needs a path" >&2; exit 1; fi
if [[ "$EXPECT_ENABLE" -eq 1 ]]; then echo "--enable needs a server name" >&2; exit 1; fi
if [[ "$EXPECT_TARGET" -eq 1 ]]; then echo "--target needs claude|grok|cursor|gemini|adapters" >&2; exit 1; fi

export RUSHY_DRY="$DRY"
export RUSHY_PROJECT="$PROJECT"
export RUSHY_TARGET="$TARGET"
export RUSHY_ENABLE="${ENABLE[*]:-}"

python3 <<'PY'
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, "scripts/lib")
from mcp_catalog import (
    generate_mcp_plugins,
    grok_mcp_toml_fragment,
    iter_servers,
    merge_disabled_mcp_json,
    write_grok_marketplace,
    client_server_block,
    ROOT,
)

dry = os.environ.get("RUSHY_DRY") == "1"
project = os.environ.get("RUSHY_PROJECT") or ""
target = os.environ.get("RUSHY_TARGET") or "adapters"
enable = {x for x in os.environ.get("RUSHY_ENABLE", "").split() if x}

if not dry:
    names = generate_mcp_plugins()
    print(f"Generated {len(names)} MCP plugins (off by default)")
    write_grok_marketplace()
else:
    print("DRY: skip plugin generation")

def do_merge(path: Path, label: str) -> None:
    changed = merge_disabled_mcp_json(path, enable=enable, dry_run=dry)
    verb = "would merge" if dry else "merged"
    print(f"{verb} {len(changed)} servers → {path} ({label}): {', '.join(changed) or '(none)'}")

if project:
    do_merge(Path(project) / ".mcp.json", "project")

if target in ("adapters", "cursor", "all"):
    do_merge(Path.home() / ".cursor" / "mcp.json", "cursor")

if target in ("adapters", "gemini", "all"):
    gemini = Path.home() / ".gemini" / "config" / "mcp_config.json"
    do_merge(gemini, "gemini")

if target in ("adapters", "grok", "all"):
    fragment = grok_mcp_toml_fragment(enable=enable)
    out = ROOT / "config" / "grok-mcp.toml"
    if dry:
        print(f"DRY: would write {out} ({fragment.count('[mcp_servers.')} servers)")
    else:
        out.write_text(fragment)
        print(f"Wrote {out} — merge into ~/.grok/config.toml or enable plugins instead")

if target in ("claude", "all") and enable:
    # Only write explicitly enabled servers into ~/.claude.json — never the full set.
    claude = Path.home() / ".claude.json"
    data = json.loads(claude.read_text()) if claude.exists() else {}
    servers = data.setdefault("mcpServers", {})
    catalog = {n: cfg for n, cfg, _ in [(a, b, c) for a, b, c in iter_servers()]}
    for name in sorted(enable):
        if name not in catalog:
            print(f"WARNING: {name} not in catalog", file=sys.stderr)
            continue
        servers[name] = client_server_block(catalog[name])
        print(f"{'would write' if dry else 'wrote'} {name} → {claude} (placeholders only)")
    if not dry:
        claude.write_text(json.dumps(data, indent=2) + "\n")
elif target == "claude" and not enable:
    print("Claude target: catalog stays plugin-only (off). Pass --enable NAME to write one server.")

print("")
print("MCP plugins are in the rushy marketplace with defaultEnabled=false.")
print("Enable one: Claude enabledPlugins[\"<name>@rushy\"]=true  |  grok plugin enable <name>")
print("Required env: see config/mcp-servers.README.md")
PY
