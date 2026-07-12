#!/usr/bin/env bash
# Reset global Claude + Grok configs to reference ONLY this marketplace.
# Does not delete installed plugin caches under ~/.grok/installed-plugins
# (safe leftover); configs no longer point at third-party marketplaces.
#
# Usage: ./scripts/clean-global-configs.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

./scripts/generate-global-config.sh >/dev/null

python3 <<'PY'
import json
from pathlib import Path
from datetime import datetime, timezone

root = Path(".").resolve()
mp = json.loads((root / ".claude-plugin" / "marketplace.json").read_text())
names = sorted({p["name"] for p in mp.get("plugins", []) if p.get("name")})

# ── Claude ──
home = Path.home() / ".claude"
settings_path = home / "settings.json"
settings = json.loads(settings_path.read_text()) if settings_path.exists() else {}
settings["extraKnownMarketplaces"] = {
    "rushy": {
        "source": {"source": "github", "repo": "RUSHYOP/rushy-claude-plugins"}
    }
}
settings["enabledPlugins"] = {f"{n}@rushy": True for n in names}
settings_path.parent.mkdir(parents=True, exist_ok=True)
settings_path.write_text(json.dumps(settings, indent=2) + "\n")

km_path = home / "plugins" / "known_marketplaces.json"
km_path.parent.mkdir(parents=True, exist_ok=True)
km_path.write_text(
    json.dumps(
        {
            "rushy": {
                "source": {"source": "github", "repo": "RUSHYOP/rushy-claude-plugins"},
                "installLocation": str(home / "plugins" / "marketplaces" / "rushy"),
                "lastUpdated": datetime.now(timezone.utc).strftime(
                    "%Y-%m-%dT%H:%M:%S.%f"
                )[:-3]
                + "Z",
            }
        },
        indent=2,
    )
    + "\n"
)

# CLAUDE.md
if (root / "CLAUDE.md").exists():
    (home / "CLAUDE.md").write_text((root / "CLAUDE.md").read_text())
    (home / "Claude.md").write_text((root / "CLAUDE.md").read_text())

skills = home / "skills"
skills.mkdir(parents=True, exist_ok=True)
(skills / "README.md").write_text(
    f"""# Skills come from the rushy marketplace only

Marketplace: https://github.com/RUSHYOP/rushy-claude-plugins
Local: {root}
Enable: name@rushy
"""
)

# ── Grok ──
gs = Path.home() / ".grok" / "settings.json"
gs.parent.mkdir(parents=True, exist_ok=True)
gs.write_text(
    json.dumps(
        {
            "extraKnownMarketplaces": {
                "rushy": {
                    "source": {
                        "source": "github",
                        "repo": "RUSHYOP/rushy-claude-plugins",
                    }
                }
            },
            "enabledPlugins": {f"{n}@rushy": True for n in names},
        },
        indent=2,
    )
    + "\n"
)

enabled_toml = "\n".join(f'  "{n}",' for n in names)
paths_skills = "\n".join(
    f'  "{root}/plugins/{d.name}/skills",'
    for d in sorted((root / "plugins").iterdir())
    if d.is_dir() and (d / "skills").is_dir()
)
paths_plugins = "\n".join(
    f'  "{root}/plugins/{d.name}",'
    for d in sorted((root / "plugins").iterdir())
    if d.is_dir() and (d / ".claude-plugin" / "plugin.json").exists()
)

cfg = Path.home() / ".grok" / "config.toml"
# Preserve models/ui if present
import re

old = cfg.read_text() if cfg.exists() else ""
models = "grok-composer-2.5-fast"
m = re.search(r'default\s*=\s*"([^"]+)"', old)
if m:
    models = m.group(1)

cfg.write_text(
    f"""[cli]
installer = "internal"

[models]
default = "{models}"

[ui]
max_thoughts_width = 120
fork_secondary_model = "grok-build"
yolo = false
compact_mode = false
permission_mode = "always-approve"

[marketplace]
official_marketplace_auto_installed = true

[[marketplace.sources]]
name = "xAI Official"
git = "https://github.com/xai-org/plugin-marketplace.git"

[[marketplace.sources]]
name = "rushy"
path = "{root}"

[[marketplace.sources]]
name = "rushy-git"
git = "https://github.com/RUSHYOP/rushy-claude-plugins.git"

[skills]
paths = [
{paths_skills}
]

[plugins]
paths = [
{paths_plugins}
]
enabled = [
{enabled_toml}
]
"""
)

print(f"Cleaned Claude + Grok for {len(names)} *@rushy plugins")
print(f"Marketplace root: {root}")
PY

# Drop non-rushy Claude marketplace clones
CL_MP="${HOME}/.claude/plugins/marketplaces"
if [[ -d "$CL_MP" ]]; then
  for d in "$CL_MP"/*; do
    [[ -e "$d" ]] || continue
    base=$(basename "$d")
    if [[ "$base" != "rushy" ]]; then
      rm -rf "$d"
      echo "Removed Claude marketplace clone: $base"
    fi
  done
fi

# Remove third-party Grok marketplace sources if CLI has them
if command -v grok >/dev/null 2>&1; then
  for url in \
    "https://github.com/thedotmack/claude-mem.git" \
    "https://github.com/nicobailon/visual-explainer.git" \
    "https://github.com/mukul975/Anthropic-Cybersecurity-Skills.git" \
    "https://github.com/dgreenheck/webgpu-claude-skill.git" \
    "https://github.com/trailofbits/skills.git" \
    "https://github.com/anthropics/claude-plugins-official.git"
  do
    grok plugin marketplace remove "$url" 2>/dev/null || true
  done
fi

echo "Done. Restart Claude Code / Grok to reload."
