#!/usr/bin/env bash
# Generate config/global-settings.json from marketplace.json (all plugins → *@rushy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 <<'PY'
import json
from pathlib import Path

root = Path(".")
mp = json.loads((root / ".claude-plugin" / "marketplace.json").read_text())
enabled = {f"{p['name']}@rushy": True for p in mp.get("plugins", []) if p.get("name")}

out = {
    "$comment": (
        "Generated from marketplace.json. Apply with ./scripts/apply-global.sh. "
        "All plugins/skills for global Claude resolve via *@rushy from this repo."
    ),
    "extraKnownMarketplaces": {
        "rushy": {
            "source": {
                "source": "github",
                "repo": "RUSHYOP/rushy-claude-plugins",
            }
        }
    },
    "enabledPlugins": dict(sorted(enabled.items())),
}

path = root / "config" / "global-settings.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(out, indent=2) + "\n")
print(f"Wrote {path} ({len(enabled)} plugins @rushy)")
for k in sorted(enabled):
    print(f"  {k}")
PY
