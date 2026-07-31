#!/usr/bin/env bash
# Wire the rushy marketplace into Cursor (local plugins + Cursor marketplace manifest).
#
# Cursor does not use Claude's `*@rushy` enable list. It loads:
#   - Team marketplaces via Dashboard → Plugins → Import (GitHub repo)
#   - Local plugins from ~/.cursor/plugins/local/<name> (this script)
#
# Usage:
#   ./scripts/apply-cursor.sh              # generate manifests + link local plugins
#   ./scripts/apply-cursor.sh --dry-run    # print actions only
#   ./scripts/apply-cursor.sh --unlink     # remove rushy symlinks under local/
#   ./scripts/apply-cursor.sh --first-party-only   # skip Claude-cache upstream mirrors
#
# After linking: Developer: Reload Window (or restart Cursor).
# Team-wide: Dashboard → Plugins → Add Marketplace → import
#   https://github.com/RUSHYOP/rushy-claude-plugins

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY=0
UNLINK=0
FIRST_PARTY_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --unlink) UNLINK=1 ;;
    --first-party-only) FIRST_PARTY_ONLY=1 ;;
    -h|--help)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

export RUSHY_ROOT="$ROOT"
export RUSHY_DRY="$DRY"
export RUSHY_UNLINK="$UNLINK"
export RUSHY_FIRST_PARTY_ONLY="$FIRST_PARTY_ONLY"
export RUSHY_LOCAL_DIR="${HOME}/.cursor/plugins/local"
export RUSHY_CLAUDE_CACHE="${HOME}/.claude/plugins/cache/rushy"

python3 <<'PY'
import json
import os
import sys
from pathlib import Path

root = Path(os.environ["RUSHY_ROOT"]).resolve()
dry = os.environ.get("RUSHY_DRY") == "1"
unlink = os.environ.get("RUSHY_UNLINK") == "1"
first_party_only = os.environ.get("RUSHY_FIRST_PARTY_ONLY") == "1"
local_dir = Path(os.environ["RUSHY_LOCAL_DIR"]).expanduser()
claude_cache = Path(os.environ["RUSHY_CLAUDE_CACHE"]).expanduser()
marketplace_json = root / ".claude-plugin" / "marketplace.json"
cursor_marketplace = root / ".cursor-plugin" / "marketplace.json"

def log(msg: str) -> None:
    print(msg)


def run_msg(msg: str) -> None:
    if dry:
        print(f"DRY: {msg}")
    else:
        print(msg)


def latest_cache_dir(name: str) -> Path | None:
    base = claude_cache / name
    if not base.is_dir():
        return None
    versions = [p for p in base.iterdir() if p.is_dir()]
    if not versions:
        return None

    def version_key(p: Path):
        parts = []
        for part in p.name.replace("-", ".").split("."):
            if part.isdigit():
                parts.append((0, int(part)))
            else:
                parts.append((1, part))
        return parts

    versions.sort(key=version_key)
    return versions[-1]


def ensure_cursor_plugin_manifest(plugin_dir: Path, name: str) -> None:
    cursor_json = plugin_dir / ".cursor-plugin" / "plugin.json"
    if cursor_json.is_file():
        return
    claude_json = plugin_dir / ".claude-plugin" / "plugin.json"
    if dry:
        run_msg(f"write {cursor_json}")
        return
    cursor_json.parent.mkdir(parents=True, exist_ok=True)
    if claude_json.is_file():
        data = json.loads(claude_json.read_text())
        out = {
            "name": data.get("name") or name,
            "description": data.get("description") or f"{name} (from rushy marketplace)",
            "version": data.get("version") or "1.0.0",
        }
        if data.get("author"):
            out["author"] = data["author"]
        if data.get("skills"):
            out["skills"] = data["skills"]
        if data.get("hooks"):
            out["hooks"] = data["hooks"]
        if data.get("mcpServers") or data.get("mcp"):
            out["mcpServers"] = data.get("mcpServers") or data.get("mcp")
        cursor_json.write_text(json.dumps(out, indent=2) + "\n")
        log(f"  wrote Cursor manifest → {cursor_json}")
    else:
        out = {
            "name": name,
            "description": f"{name} from rushy marketplace",
            "version": "1.0.0",
            "skills": "./skills/",
        }
        cursor_json.write_text(json.dumps(out, indent=2) + "\n")
        log(f"  wrote minimal Cursor manifest → {cursor_json}")


def link_plugin(name: str, target: Path) -> None:
    target = target.resolve()
    link = local_dir / name
    if not target.is_dir():
        log(f"  skip {name}: target missing ({target})")
        return
    ensure_cursor_plugin_manifest(target, name)
    if link.is_symlink():
        cur = Path(os.readlink(link))
        if not cur.is_absolute():
            cur = (link.parent / cur).resolve()
        else:
            cur = cur.resolve()
        if cur == target:
            log(f"  ok   {name} → {target}")
            return
        log(f"  relink {name}: {cur} → {target}")
        if not dry:
            link.unlink()
    elif link.exists():
        log(f"  skip {name}: {link} exists and is not a symlink (manual install?)")
        return
    if dry:
        run_msg(f"ln -s {target} {link}")
    else:
        link.symlink_to(target, target_is_directory=True)
        log(f"  link {name} → {target}")


def unlink_rushy_locals() -> None:
    local_dir.mkdir(parents=True, exist_ok=True)
    removed = 0
    for link in local_dir.iterdir():
        if not link.is_symlink():
            continue
        cur = Path(os.readlink(link))
        if not cur.is_absolute():
            cur = (link.parent / cur).resolve()
        else:
            cur = cur.resolve()
        under_root = str(cur).startswith(str(root / "plugins") + os.sep) or cur == root / "plugins"
        under_cache = str(cur).startswith(str(claude_cache) + os.sep)
        if under_root or under_cache:
            log(f"  unlink {link.name} ({cur})")
            if not dry:
                link.unlink()
            removed += 1
    log(f"Removed {removed} rushy local plugin symlink(s).")


def generate_cursor_marketplace_json(mp: dict) -> None:
    plugins_out = []
    for p in mp.get("plugins", []):
        name = p.get("name")
        if not name:
            continue
        src = p.get("source")
        entry = {
            "name": name,
            "description": p.get("description") or name,
        }
        if p.get("version"):
            entry["version"] = p["version"]
        if isinstance(src, str) and src.startswith("./"):
            entry["source"] = src[2:]
        elif isinstance(src, dict):
            entry["source"] = src
            tags = list(p.get("tags") or [])
            if "upstream-mirror" not in tags:
                tags.append("upstream-mirror")
            entry["tags"] = tags
        else:
            entry["source"] = src
        if p.get("author"):
            entry["author"] = p["author"]
        if p.get("keywords"):
            entry["keywords"] = p["keywords"]
        plugins_out.append(entry)

    out = {
        "name": mp.get("name") or "rushy",
        "displayName": "RUSHYOP",
        "owner": mp.get("owner") or {"name": "RUSHYOP"},
        "metadata": {
            "description": (
                "RUSHYOP agent plugins/skills (Claude + Cursor). "
                "First-party under plugins/; upstream via public RUSHYOP mirrors. "
                "Local wire: ./scripts/apply-cursor.sh"
            ),
            "version": (mp.get("metadata") or {}).get("version", "1.0.0"),
            "pluginRoot": "plugins",
        },
        "plugins": plugins_out,
    }
    if dry:
        run_msg(f"write {cursor_marketplace}")
        return
    cursor_marketplace.parent.mkdir(parents=True, exist_ok=True)
    cursor_marketplace.write_text(json.dumps(out, indent=2) + "\n")
    log(f"Wrote {cursor_marketplace} ({len(plugins_out)} plugins)")


def main() -> int:
    if not marketplace_json.is_file():
        print(f"Missing {marketplace_json}", file=sys.stderr)
        return 1
    mp = json.loads(marketplace_json.read_text())

    if unlink:
        unlink_rushy_locals()
        return 0

    log("== rushy → Cursor ==")
    log(f"Marketplace: {root}")
    log(f"Local plugins: {local_dir}")
    log("")

    generate_cursor_marketplace_json(mp)
    if not dry:
        local_dir.mkdir(parents=True, exist_ok=True)

    log("First-party plugins (from plugins/):")
    for p in sorted(mp.get("plugins", []), key=lambda x: x.get("name") or ""):
        src = p.get("source")
        name = p.get("name")
        if not name:
            continue
        if isinstance(src, str) and src.startswith("./plugins/"):
            link_plugin(name, root / src[2:])

    if not first_party_only:
        log("")
        log(f"Upstream plugins (from Claude cache {claude_cache}):")
        if not claude_cache.is_dir():
            log("  (no Claude rushy cache yet — enable plugins in Claude or re-run after install)")
        else:
            for p in sorted(mp.get("plugins", []), key=lambda x: x.get("name") or ""):
                src = p.get("source")
                name = p.get("name")
                if not name:
                    continue
                if isinstance(src, str) and src.startswith("./plugins/"):
                    continue
                cache_dir = latest_cache_dir(name)
                if cache_dir is None:
                    log(f"  skip {name}: not in Claude cache")
                    continue
                link_plugin(name, cache_dir)

    log("")
    log("Done.")
    log("")
    log("Next steps:")
    log("  1. In Cursor: Developer: Reload Window (or restart)")
    log("  2. Open Customize → Plugins / Skills — local rushy plugins should appear")
    log("  3. Team-wide marketplace (Teams/Enterprise admin):")
    log("       Dashboard → Plugins → Add Marketplace")
    log("       Import: https://github.com/RUSHYOP/rushy-claude-plugins")
    log("       (public repo — no Cursor GitHub App access needed)")
    log(f"  4. Agent CLI one-shot: agent --plugin-dir {local_dir}/<name> ...")
    log("")
    log("Unlink later: ./scripts/apply-cursor.sh --unlink")
    return 0


if __name__ == "__main__":
    # fix log(..., file=) misuse above — keep simple
    try:
        raise SystemExit(main())
    except TypeError:
        raise
PY
