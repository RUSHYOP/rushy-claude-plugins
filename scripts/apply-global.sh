#!/usr/bin/env bash
# Optional helpers for global Claude wiring from this marketplace.
#
# Usage:
#   ./scripts/apply-global.sh              # regen config/*
#   ./scripts/apply-global.sh --claude     # merge *@rushy + install CLAUDE.md → ~/.claude/
#   ./scripts/apply-global.sh --claude-md  # only install CLAUDE.md to ~/.claude/CLAUDE.md
#   ./scripts/apply-global.sh --cursor     # symlink first-party plugins into Cursor
#   ./scripts/apply-global.sh --grok       # ensure rushy marketplace sources in Grok
#   ./scripts/apply-global.sh --gemini     # merge MCP catalog OFF into Gemini
#   ./scripts/apply-global.sh --all        # claude + cursor + grok + gemini + mcp-off

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_CLAUDE=0
DO_CLAUDE_MD=0
DO_CURSOR=0
DO_GROK=0
DO_GEMINI=0
for arg in "$@"; do
  case "$arg" in
    --claude) DO_CLAUDE=1; DO_CLAUDE_MD=1 ;;
    --claude-md) DO_CLAUDE_MD=1 ;;
    --cursor) DO_CURSOR=1 ;;
    --grok) DO_GROK=1 ;;
    --gemini) DO_GEMINI=1 ;;
    --all) DO_CLAUDE=1; DO_CLAUDE_MD=1; DO_CURSOR=1; DO_GROK=1; DO_GEMINI=1 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

# Keep MCP plugin trees, marketplace.json, and enable lists in lockstep.
# rebuild-marketplace.sh generates MCP plugins then scans plugins/*.
./scripts/rebuild-marketplace.sh

if [[ "$DO_CLAUDE_MD" -eq 1 ]]; then
  if [[ ! -f "$ROOT/CLAUDE.md" ]]; then
    echo "Missing $ROOT/CLAUDE.md" >&2
    exit 1
  fi
  mkdir -p "${HOME}/.claude"
  # Keep Claude.md + CLAUDE.md in sync (some tools use either casing)
  cp "$ROOT/CLAUDE.md" "${HOME}/.claude/CLAUDE.md"
  cp "$ROOT/CLAUDE.md" "${HOME}/.claude/Claude.md"
  echo "Installed global rules → ~/.claude/CLAUDE.md (from marketplace CLAUDE.md)"
fi

if [[ "$DO_CLAUDE" -eq 1 ]]; then
  python3 <<'PY'
import json
from pathlib import Path
from datetime import datetime, timezone

root = Path(".").resolve()
cfg = json.loads((root / "config/global-settings.json").read_text())
sp = Path.home() / ".claude" / "settings.json"
settings = json.loads(sp.read_text()) if sp.exists() else {}
settings.setdefault("extraKnownMarketplaces", {})["rushy"] = cfg["extraKnownMarketplaces"]["rushy"]
en = settings.setdefault("enabledPlugins", {})
for k, v in cfg.get("enabledPlugins", {}).items():
    en[k] = v
names = {k.split("@")[0] for k in cfg.get("enabledPlugins", {})}
for k in list(en):
    if "@" in k:
        n, m = k.rsplit("@", 1)
        if m != "rushy" and n in names:
            en[k] = False
settings["enabledPlugins"] = en
sp.write_text(json.dumps(settings, indent=2) + "\n")
km = Path.home() / ".claude" / "plugins" / "known_marketplaces.json"
data = json.loads(km.read_text()) if km.exists() else {}
data["rushy"] = {
    "source": {"source": "github", "repo": "RUSHYOP/rushy-claude-plugins"},
    "installLocation": str(Path.home() / ".claude/plugins/marketplaces/rushy"),
    "lastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
}
km.parent.mkdir(parents=True, exist_ok=True)
km.write_text(json.dumps(data, indent=2) + "\n")
print("Merged *@rushy into", sp)
PY
fi

if [[ "$DO_CURSOR" -eq 1 ]]; then
  ./scripts/apply-cursor.sh
fi

# Write disabled MCP adapter entries (Cursor/Gemini/Grok fragment) once.
if [[ "$DO_CURSOR" -eq 1 || "$DO_GEMINI" -eq 1 || "$DO_GROK" -eq 1 ]]; then
  ./scripts/apply-mcp.sh
fi

if [[ "$DO_GEMINI" -eq 1 ]]; then
  # apply-mcp already merged Gemini mcp_config; --link only if CLI exists.
  if command -v gemini >/dev/null 2>&1; then
    ./scripts/apply-gemini.sh --link
  fi
fi

if [[ "$DO_GROK" -eq 1 ]]; then
  # Grok already has rushy path + git sources when clean-global-configs was used.
  # Re-assert them without rewriting models/ui.
  python3 <<'PY'
from pathlib import Path
import re
root = Path(".").resolve()
cfg = Path.home() / ".grok" / "config.toml"
text = cfg.read_text() if cfg.exists() else ""
need_path = str(root)
need_git = "https://github.com/RUSHYOP/rushy-claude-plugins.git"
changed = False
if "name = \"rushy\"" not in text or need_path not in text:
    text += (
        "\n[[marketplace.sources]]\n"
        'name = "rushy"\n'
        f'path = "{need_path}"\n'
    )
    changed = True
if "name = \"rushy-git\"" not in text or need_git not in text:
    text += (
        "\n[[marketplace.sources]]\n"
        'name = "rushy-git"\n'
        f'git = "{need_git}"\n'
    )
    changed = True
if changed:
    cfg.parent.mkdir(parents=True, exist_ok=True)
    cfg.write_text(text)
    print("Ensured Grok marketplace sources rushy + rushy-git →", cfg)
else:
    print("Grok marketplace already lists rushy / rushy-git")
PY
fi

echo ""
echo "Marketplace catalog: $ROOT"
echo "  Global rules: CLAUDE.md (apply with: ./scripts/apply-global.sh --claude-md)"
echo "  Add plugins:  ./scripts/add-plugin.sh … --sync --commit --push"
echo "  Wire all:     ./scripts/apply-global.sh --all"
echo "  MCP (off):    ./scripts/apply-mcp.sh"
echo "  Wire CLIs to RUSHYOP/rushy-claude-plugins only (*@rushy)."
