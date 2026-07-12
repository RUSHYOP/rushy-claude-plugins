#!/usr/bin/env bash
# Optional helpers for global Claude wiring from this marketplace.
#
# Usage:
#   ./scripts/apply-global.sh              # regen config/*
#   ./scripts/apply-global.sh --claude     # merge *@rushy + install CLAUDE.md → ~/.claude/
#   ./scripts/apply-global.sh --claude-md  # only install CLAUDE.md to ~/.claude/CLAUDE.md

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_CLAUDE=0
DO_CLAUDE_MD=0
for arg in "$@"; do
  case "$arg" in
    --claude) DO_CLAUDE=1; DO_CLAUDE_MD=1 ;;
    --claude-md) DO_CLAUDE_MD=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

./scripts/generate-global-config.sh

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

echo ""
echo "Marketplace catalog: $ROOT"
echo "  Global rules: CLAUDE.md (apply with: ./scripts/apply-global.sh --claude-md)"
echo "  Add plugins:  ./scripts/add-plugin.sh … --sync --commit --push"
echo "  Wire CLIs to RUSHYOP/rushy-claude-plugins only (*@rushy)."
