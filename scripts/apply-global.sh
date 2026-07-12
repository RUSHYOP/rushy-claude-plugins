#!/usr/bin/env bash
# Point global Claude Code (~/.claude) at this marketplace for all plugins/skills.
#
# - Registers marketplace rushy → RUSHYOP/rushy-claude-plugins
# - Enables every catalog plugin as *@rushy (from config/global-settings.json)
# - Disables the same plugins under other marketplace ids (avoid doubles)
# - Clones/pulls marketplace into ~/.claude/plugins/marketplaces/rushy
# - Archives legacy ~/.claude/skills (skills live inside plugins now)
#
# Usage:
#   ./scripts/apply-global.sh
#   ./scripts/apply-global.sh --no-archive-skills
#   ./scripts/apply-global.sh --sync-mirrors
#   ./scripts/apply-global.sh --dry-run

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
ARCHIVE_SKILLS=1
SYNC_MIRRORS=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-archive-skills) ARCHIVE_SKILLS=0 ;;
    --sync-mirrors) SYNC_MIRRORS=1 ;;
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

# Refresh generated config from marketplace
./scripts/generate-global-config.sh

DEST="${HOME}/.claude"
SETTINGS="${DEST}/settings.json"
CONFIG="${ROOT}/config/global-settings.json"
MP_DEST="${DEST}/plugins/marketplaces/rushy"
REPO_URL="https://github.com/RUSHYOP/rushy-claude-plugins.git"

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

echo "==> Marketplace clone → $MP_DEST"
mkdir -p "${DEST}/plugins/marketplaces"
if [[ -d "$MP_DEST/.git" ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] git -C $MP_DEST pull --ff-only"
  else
    # Prefer this working tree if it's the same remote (optional fast path)
    git -C "$MP_DEST" remote set-url origin "$REPO_URL" 2>/dev/null || true
    git -C "$MP_DEST" pull --ff-only || {
      echo "Pull failed; re-cloning..."
      rm -rf "$MP_DEST"
      git clone "$REPO_URL" "$MP_DEST"
    }
  fi
else
  run rm -rf "$MP_DEST"
  run git clone "$REPO_URL" "$MP_DEST"
fi

# If this checkout is Agentic-setup and matches remote, also allow using it as installLocation
# (known_marketplaces still points at standard path)
echo "==> Merge settings from config/global-settings.json"
python3 - "$CONFIG" "$SETTINGS" "$DRY_RUN" <<'PY'
import json, sys
from pathlib import Path
from datetime import datetime, timezone

config_path, settings_path, dry = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3] == "1"
cfg = json.loads(config_path.read_text())
settings = json.loads(settings_path.read_text()) if settings_path.exists() else {}

# Marketplace registration
settings.setdefault("extraKnownMarketplaces", {})
settings["extraKnownMarketplaces"]["rushy"] = cfg["extraKnownMarketplaces"]["rushy"]

# Enable all @rushy from config
enabled = settings.setdefault("enabledPlugins", {})
for k, v in cfg.get("enabledPlugins", {}).items():
    enabled[k] = v

# Disable same plugin names under other marketplaces (global source of truth = rushy)
rushy_names = {k.split("@", 1)[0] for k in cfg.get("enabledPlugins", {}) if "@rushy" in k}
for k in list(enabled.keys()):
    if "@" not in k:
        continue
    name, market = k.rsplit("@", 1)
    if market != "rushy" and name in rushy_names:
        enabled[k] = False

settings["enabledPlugins"] = enabled

# known_marketplaces
km_path = Path.home() / ".claude" / "plugins" / "known_marketplaces.json"
km = json.loads(km_path.read_text()) if km_path.exists() else {}
km["rushy"] = {
    "source": {"source": "github", "repo": "RUSHYOP/rushy-claude-plugins"},
    "installLocation": str(Path.home() / ".claude" / "plugins" / "marketplaces" / "rushy"),
    "lastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
}

if dry:
    print("[dry-run] would write", settings_path)
    print("[dry-run] would write", km_path)
    print("[dry-run] enabled @rushy:", sum(1 for k, v in enabled.items() if v and k.endswith("@rushy")))
    print("[dry-run] disabled other markets for same names:",
          sum(1 for k, v in enabled.items() if not v and not k.endswith("@rushy") and k.split("@")[0] in rushy_names))
else:
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(json.dumps(settings, indent=2) + "\n")
    km_path.parent.mkdir(parents=True, exist_ok=True)
    km_path.write_text(json.dumps(km, indent=2) + "\n")
    print("Wrote", settings_path)
    print("Wrote", km_path)
    print("enabled @rushy:", sum(1 for k, v in enabled.items() if v and k.endswith("@rushy")))
PY

if [[ "$ARCHIVE_SKILLS" -eq 1 ]]; then
  SKILLS="${DEST}/skills"
  if [[ -d "$SKILLS" ]] && [[ -n "$(find "$SKILLS" -mindepth 1 -maxdepth 1 ! -name 'README.md' ! -name '.DS_Store' 2>/dev/null | head -1)" ]]; then
    stamp=$(date +%Y%m%d-%H%M%S)
    bak="${DEST}/skills.archived-${stamp}"
    echo "==> Archive legacy global skills → $bak"
    echo "    (skills now come from *@rushy plugins, not ~/.claude/skills)"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "[dry-run] mv $SKILLS $bak && mkdir skills + README"
    else
      mv "$SKILLS" "$bak"
      mkdir -p "$SKILLS"
      cat > "$SKILLS/README.md" << EOF
# Global skills live in the rushy marketplace

Do **not** install skills here. They are packaged as plugins in:

- Marketplace: \`rushy\` → https://github.com/RUSHYOP/rushy-claude-plugins
- Local working tree: ${ROOT}
- Applied via: \`${ROOT}/scripts/apply-global.sh\`

Enable plugins as \`name@rushy\` in ~/.claude/settings.json (managed by apply-global).

Archived previous contents: ${bak}
EOF
    fi
  else
    mkdir -p "$SKILLS"
    if [[ ! -f "$SKILLS/README.md" ]]; then
      if [[ "$DRY_RUN" -eq 0 ]]; then
        cat > "$SKILLS/README.md" << EOF
# Global skills live in the rushy marketplace

Plugins/skills: https://github.com/RUSHYOP/rushy-claude-plugins  
Apply: ${ROOT}/scripts/apply-global.sh
EOF
      fi
    fi
  fi
fi

if [[ "$SYNC_MIRRORS" -eq 1 ]]; then
  echo "==> Sync private mirrors"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] ./scripts/sync-mirrors.sh"
  else
    ./scripts/sync-mirrors.sh
  fi
fi

echo ""
echo "Global Claude now references this repo for plugins/skills (*@rushy)."
echo "Restart Claude Code or run /reload-plugins if needed."
echo "Working tree: $ROOT"
echo "Marketplace:  $MP_DEST"
