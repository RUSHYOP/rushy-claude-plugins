#!/usr/bin/env bash
# Optional: regenerate enable-list config files from marketplace.json.
# Does NOT install or sync plugins into CLIs — add this marketplace in each CLI yourself.
#
# Usage:
#   ./scripts/apply-global.sh           # regenerate config/*
#   ./scripts/apply-global.sh --claude  # also merge *@rushy into ~/.claude/settings.json

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_CLAUDE=0
for arg in "$@"; do
  case "$arg" in
    --claude) DO_CLAUDE=1 ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

./scripts/generate-global-config.sh

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
echo "This repo is a marketplace catalog. Wire CLIs yourself:"
echo "  grok plugin marketplace add RUSHYOP/rushy-claude-plugins"
echo "  grok plugin marketplace add $ROOT"
echo "  Claude: register RUSHYOP/rushy-claude-plugins as marketplace rushy"
echo ""
echo "When you install a new plugin in any CLI, capture it here:"
echo "  ./scripts/import-from-clis.sh --commit"
echo "  ./scripts/sync-mirrors.sh --only <new-mirror>   # optional DR"
echo "  git push"
