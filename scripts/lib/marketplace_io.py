#!/usr/bin/env python3
"""Shared helpers for rebuild-marketplace + import-from-claude."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
MARKETPLACE_PATH = ROOT / ".claude-plugin" / "marketplace.json"
PLUGINS_DIR = ROOT / "plugins"
REGISTRY_PATH = ROOT / "mirrors" / "registry.tsv"
UPSTREAM_MD = ROOT / "UPSTREAM.md"

# Known marketplace install dirs under ~/.claude/plugins/marketplaces → git clone URL
MARKETPLACE_GIT: dict[str, str] = {
    "claude-plugins-official": "https://github.com/anthropics/claude-plugins-official.git",
    "trailofbits": "https://github.com/trailofbits/skills.git",
    "thedotmack": "https://github.com/thedotmack/claude-mem.git",
    "visual-explainer-marketplace": "https://github.com/nicobailon/visual-explainer.git",
    "webgpu-threejs-tsl": "https://github.com/dgreenheck/webgpu-claude-skill.git",
    "anthropic-cybersecurity-skills": "https://github.com/mukul975/Anthropic-Cybersecurity-Skills.git",
    "rushy": "https://github.com/RUSHYOP/rushy-claude-plugins.git",
}

# upstream git URL → private mirror name (RUSHYOP/<name>)
# extended at runtime from registry.tsv
DEFAULT_MIRROR_NAMES: dict[str, str] = {
    "https://github.com/obra/superpowers.git": "mirror-superpowers",
    "https://github.com/figma/mcp-server-guide.git": "mirror-figma-mcp-server-guide",
    "https://github.com/anthropics/claude-plugins-official.git": "mirror-claude-plugins-official",
    "https://github.com/trailofbits/skills.git": "mirror-trailofbits-skills",
    "https://github.com/thedotmack/claude-mem.git": "mirror-claude-mem",
    "https://github.com/mukul975/Anthropic-Cybersecurity-Skills.git": "mirror-anthropic-cybersecurity-skills",
    "https://github.com/nicobailon/visual-explainer.git": "mirror-visual-explainer",
    "https://github.com/dgreenheck/webgpu-claude-skill.git": "mirror-webgpu-claude-skill",
}


def normalize_git_url(url: str) -> str:
    url = url.strip()
    if url.endswith("/"):
        url = url[:-1]
    if not url.endswith(".git") and "github.com" in url:
        url = url + ".git"
    # normalize git@ / https
    m = re.match(r"git@github\.com:([^/]+)/(.+?)(?:\.git)?$", url)
    if m:
        return f"https://github.com/{m.group(1)}/{m.group(2).removesuffix('.git')}.git"
    m = re.match(r"https://github\.com/([^/]+)/(.+?)(?:\.git)?/?$", url)
    if m:
        return f"https://github.com/{m.group(1)}/{m.group(2).removesuffix('.git')}.git"
    return url if url.endswith(".git") else url


def mirror_name_for_upstream(upstream: str) -> str:
    upstream = normalize_git_url(upstream)
    registry = load_registry()
    if upstream in registry:
        return registry[upstream][0]
    if upstream in DEFAULT_MIRROR_NAMES:
        return DEFAULT_MIRROR_NAMES[upstream]
    # derive from owner-repo
    m = re.match(r"https://github\.com/([^/]+)/([^/]+)\.git$", upstream)
    if m:
        owner, repo = m.group(1), m.group(2)
        slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", f"{owner}-{repo}").lower()
        return f"mirror-{slug}"
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", upstream.split("/")[-1].removesuffix(".git")).lower()
    return f"mirror-{slug}"


def mirror_url_for_upstream(upstream: str) -> str:
    name = mirror_name_for_upstream(upstream)
    return f"https://github.com/RUSHYOP/{name}.git"


def load_registry() -> dict[str, tuple[str, str]]:
    """upstream_url -> (mirror_name, slug)."""
    out: dict[str, tuple[str, str]] = {}
    if not REGISTRY_PATH.exists():
        return out
    for line in REGISTRY_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) < 2:
            continue
        upstream, name = parts[0], parts[1]
        slug = parts[2] if len(parts) > 2 else ""
        out[normalize_git_url(upstream)] = (name, slug)
    return out


def save_registry(entries: dict[str, tuple[str, str]]) -> None:
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    for upstream in sorted(entries.keys()):
        name, slug = entries[upstream]
        lines.append(f"{upstream}|{name}|{slug}")
    REGISTRY_PATH.write_text("\n".join(lines) + "\n")


def load_marketplace() -> dict[str, Any]:
    return json.loads(MARKETPLACE_PATH.read_text())


def save_marketplace(mp: dict[str, Any]) -> None:
    MARKETPLACE_PATH.parent.mkdir(parents=True, exist_ok=True)
    MARKETPLACE_PATH.write_text(json.dumps(mp, indent=2) + "\n")


def load_plugin_json(plugin_dir: Path) -> dict[str, Any]:
    pj = plugin_dir / ".claude-plugin" / "plugin.json"
    if pj.exists():
        return json.loads(pj.read_text())
    return {
        "name": plugin_dir.name,
        "version": "1.0.0",
        "description": f"Plugin {plugin_dir.name}",
        "author": {"name": "RUSHYOP", "email": "alwayspurav@gmail.com"},
    }


def first_party_entry(plugin_dir: Path) -> dict[str, Any]:
    meta = load_plugin_json(plugin_dir)
    name = meta.get("name") or plugin_dir.name
    return {
        "name": name,
        "version": meta.get("version") or "1.0.0",
        "description": meta.get("description") or f"Plugin {name}",
        "author": meta.get("author")
        or {"name": "RUSHYOP", "email": "alwayspurav@gmail.com"},
        "source": f"./plugins/{plugin_dir.name}",
        "keywords": meta.get("keywords") or [],
        "tags": ["first-party"],
        "metadata": {
            "ownership": "RUSHYOP",
            "updatePolicy": "this-repo",
        },
    }


def rebuild_first_party(existing: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    """Scan plugins/ and produce first-party marketplace entries (preserve order by name)."""
    existing_by_name = {
        p["name"]: p
        for p in (existing or [])
        if (p.get("metadata") or {}).get("ownership") == "RUSHYOP"
        or (isinstance(p.get("source"), str) and str(p.get("source")).startswith("./plugins/"))
    }
    entries: list[dict[str, Any]] = []
    if not PLUGINS_DIR.is_dir():
        return entries
    for d in sorted(PLUGINS_DIR.iterdir(), key=lambda p: p.name):
        if not d.is_dir() or d.name.startswith("."):
            continue
        if not (d / ".claude-plugin" / "plugin.json").exists() and not any(d.rglob("SKILL.md")):
            continue
        # Prefer regenerated from plugin.json; keep extra keywords if present
        entry = first_party_entry(d)
        old = existing_by_name.get(entry["name"])
        if old and old.get("keywords") and not entry.get("keywords"):
            entry["keywords"] = old["keywords"]
        entries.append(entry)
    return entries


def is_upstream_entry(p: dict[str, Any]) -> bool:
    meta = p.get("metadata") or {}
    if meta.get("ownership") == "RUSHYOP":
        return False
    src = p.get("source")
    if isinstance(src, str) and src.startswith("./"):
        return False
    return True


def write_upstream_md(mp: dict[str, Any]) -> None:
    lines = [
        "# Upstream plugin catalog (mirrored)",
        "",
        "Install **source** = private `RUSHYOP/mirror-*` repo (always available).",
        "Refresh from real upstream with `./scripts/sync-mirrors.sh`.",
        "Import newly enabled Claude plugins with `./scripts/import-from-claude.sh`.",
        "Rebuild first-party list from `plugins/` with `./scripts/rebuild-marketplace.sh`.",
        "",
        "| Plugin | Install from (mirror) | Upstream (sync from) |",
        "|--------|----------------------|----------------------|",
    ]
    for p in mp.get("plugins", []):
        if not is_upstream_entry(p):
            continue
        src = p.get("source") or {}
        if not isinstance(src, dict):
            continue
        loc = src.get("url", "")
        if src.get("path"):
            loc += f" → `{src['path']}`"
        loc += f" @{src.get('ref', 'main')}"
        up = (p.get("metadata") or {}).get("upstreamUrl", "")
        lines.append(f"| `{p['name']}` | {loc} | {up} |")
    lines += ["", "## First-party", ""]
    for p in mp.get("plugins", []):
        if (p.get("metadata") or {}).get("ownership") == "RUSHYOP":
            lines.append(f"- `{p['name']}` → `{p['source']}`")
    UPSTREAM_MD.write_text("\n".join(lines) + "\n")


def rebuild_marketplace() -> dict[str, Any]:
    mp = load_marketplace() if MARKETPLACE_PATH.exists() else {
        "name": "rushy",
        "owner": {
            "name": "RUSHYOP",
            "email": "alwayspurav@gmail.com",
            "url": "https://github.com/RUSHYOP",
        },
        "metadata": {
            "version": "1.2.0",
            "description": (
                "RUSHYOP Claude Code marketplace: first-party plugins + upstream "
                "plugins installed from private RUSHYOP mirrors (synced from upstream)."
            ),
            "pluginRoot": "./plugins",
        },
        "plugins": [],
    }
    upstream = [p for p in mp.get("plugins", []) if is_upstream_entry(p)]
    first = rebuild_first_party(mp.get("plugins", []))
    # sort: first-party then upstream by name
    first.sort(key=lambda p: p["name"])
    upstream.sort(key=lambda p: p["name"])
    mp["plugins"] = first + upstream
    save_marketplace(mp)
    write_upstream_md(mp)
    return mp


def resolve_source_from_marketplace(
    marketplace_name: str, plugin_name: str
) -> dict[str, Any] | None:
    """Look up plugin in a cloned marketplace's marketplace.json and return remote source."""
    home = Path.home() / ".claude" / "plugins" / "marketplaces" / marketplace_name
    mp_file = home / ".claude-plugin" / "marketplace.json"
    if not mp_file.exists():
        return None
    data = json.loads(mp_file.read_text())
    entry = next((p for p in data.get("plugins", []) if p.get("name") == plugin_name), None)
    if not entry:
        return None
    return convert_source_to_remote(marketplace_name, entry)


def convert_source_to_remote(
    marketplace_name: str, entry: dict[str, Any]
) -> dict[str, Any]:
    """Convert a marketplace plugin entry into rushy catalog shape (mirror install URL)."""
    source = entry.get("source")
    market_git = MARKETPLACE_GIT.get(marketplace_name)

    remote: dict[str, Any]
    if isinstance(source, str):
        path = source[2:] if source.startswith("./") else source
        if path in ("", "."):
            if not market_git:
                raise ValueError(f"No git URL for marketplace {marketplace_name}")
            remote = {"source": "url", "url": market_git, "ref": "main"}
        else:
            if not market_git:
                raise ValueError(f"No git URL for marketplace {marketplace_name}")
            remote = {
                "source": "git-subdir",
                "url": market_git,
                "path": path,
                "ref": "main",
            }
    elif isinstance(source, dict):
        st = source.get("source")
        if st == "url":
            remote = {
                "source": "url",
                "url": normalize_git_url(source["url"]),
                "ref": source.get("ref") or "main",
            }
        elif st == "git-subdir":
            remote = {
                "source": "git-subdir",
                "url": normalize_git_url(source["url"]),
                "path": source.get("path") or "",
                "ref": source.get("ref") or "main",
            }
        elif st == "github":
            remote = {
                "source": "url",
                "url": normalize_git_url(f"https://github.com/{source['repo']}.git"),
                "ref": source.get("ref") or "main",
            }
        else:
            raise ValueError(f"Unsupported source type: {source}")
    else:
        raise ValueError(f"Missing source for {entry.get('name')}")

    upstream_url = normalize_git_url(remote["url"])
    mirror = mirror_url_for_upstream(upstream_url)
    install_source = dict(remote)
    install_source["url"] = mirror

    out: dict[str, Any] = {
        "name": entry["name"],
        "description": entry.get("description") or "",
        "version": entry.get("version") or "latest",
        "author": entry.get("author") or {"name": "upstream"},
        "category": entry.get("category") or "third-party",
        "source": install_source,
        "homepage": entry.get("homepage") or upstream_url.removesuffix(".git"),
        "tags": sorted(set((entry.get("tags") or []) + ["upstream", "mirrored", f"via-{marketplace_name}"])),
        "metadata": {
            "ownership": "upstream",
            "upstreamMarketplace": marketplace_name,
            "upstreamUrl": upstream_url,
            "mirrorUrl": mirror,
            "mirrorRepo": mirror.replace("https://github.com/", "").replace(".git", ""),
            "updatePolicy": "mirror-tracks-upstream-via-sync-mirrors",
            "note": (
                "Install points at private RUSHYOP mirror. "
                "Run scripts/sync-mirrors.sh to refresh from upstreamUrl. "
                "Imported via import-from-clis.sh."
            ),
        },
    }
    if entry.get("keywords"):
        out["keywords"] = entry["keywords"]
    return out


def entry_from_git(
    plugin_name: str,
    git_url: str,
    *,
    subpath: str | None = None,
    via: str = "cli",
    description: str = "",
) -> dict[str, Any]:
    """Build a mirrored marketplace entry from a raw git URL (+ optional subdir)."""
    upstream_url = normalize_git_url(git_url)
    # Skip our own marketplace / local first-party
    if "RUSHYOP/rushy-claude-plugins" in upstream_url:
        raise ValueError("skip self marketplace")
    if "RUSHYOP/mirror-" in upstream_url:
        # Already a mirror URL — treat as install source but need original if known
        reg = load_registry()
        original = next((u for u, (n, _) in reg.items() if n in upstream_url or upstream_url.endswith(f"{n}.git")), None)
        if original:
            upstream_url = original
        # else keep mirror as both (still DR under our account)

    mirror = mirror_url_for_upstream(upstream_url)
    if subpath:
        source: dict[str, Any] = {
            "source": "git-subdir",
            "url": mirror,
            "path": subpath.strip("/"),
            "ref": "main",
        }
    else:
        source = {"source": "url", "url": mirror, "ref": "main"}

    return {
        "name": plugin_name,
        "description": description or f"Imported from {via}",
        "version": "latest",
        "author": {"name": "upstream"},
        "category": "third-party",
        "source": source,
        "homepage": upstream_url.removesuffix(".git"),
        "tags": ["upstream", "mirrored", f"via-{via}", "imported"],
        "metadata": {
            "ownership": "upstream",
            "upstreamUrl": upstream_url,
            "mirrorUrl": mirror,
            "mirrorRepo": mirror.replace("https://github.com/", "").replace(".git", ""),
            "updatePolicy": "mirror-tracks-upstream-via-sync-mirrors",
            "importedFrom": via,
            "note": (
                "Catalog only in rushy; install from private mirror. "
                "sync-mirrors.sh refreshes from upstreamUrl."
            ),
        },
    }


def ensure_registry_row(upstream_url: str) -> str:
    """Ensure mirrors/registry.tsv has upstream → mirror name. Returns mirror name."""
    upstream_url = normalize_git_url(upstream_url)
    # Don't register our own marketplace as an upstream to mirror
    if "RUSHYOP/rushy-claude-plugins" in upstream_url:
        return ""
    reg = load_registry()
    if upstream_url in reg:
        return reg[upstream_url][0]
    name = mirror_name_for_upstream(upstream_url)
    m = re.match(r"https://github\.com/([^/]+)/([^/]+)\.git$", upstream_url)
    slug = f"{m.group(1)}/{m.group(2)}" if m else ""
    reg[upstream_url] = (name, slug)
    save_registry(reg)
    return name


def collect_claude_plugins(
    include_disabled: bool = False,
) -> list[dict[str, Any]]:
    """Return plugin records from Claude user config / installs."""
    home = Path.home() / ".claude"
    found: dict[str, dict[str, Any]] = {}

    settings_path = home / "settings.json"
    if settings_path.exists():
        settings = json.loads(settings_path.read_text())
        for key, val in (settings.get("enabledPlugins") or {}).items():
            if not include_disabled and not val:
                continue
            if "@" not in key:
                continue
            name, market = key.rsplit("@", 1)
            if market in ("rushy", "rushy-git"):
                continue
            if name:
                found[name] = {"name": name, "marketplace": market, "via": "claude"}

    ip_path = home / "plugins" / "installed_plugins.json"
    if ip_path.exists():
        ip = json.loads(ip_path.read_text())
        for key in ip.get("plugins") or {}:
            if "@" not in key:
                continue
            name, market = key.rsplit("@", 1)
            if market in ("rushy", "rushy-git"):
                continue
            if name not in found:
                found[name] = {"name": name, "marketplace": market, "via": "claude"}

    return sorted(found.values(), key=lambda x: x["name"])


def collect_grok_plugins() -> list[dict[str, Any]]:
    """
    Return plugin records from Grok installs.
    Uses `grok plugin list --json` when available; falls back to
    ~/.grok/installed-plugins scan is not needed if CLI works.
    """
    import subprocess

    found: dict[str, dict[str, Any]] = {}
    try:
        r = subprocess.run(
            ["grok", "plugin", "list", "--json"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if r.returncode != 0 or not r.stdout.strip():
            return []
        data = json.loads(r.stdout)
    except (FileNotFoundError, json.JSONDecodeError, subprocess.TimeoutExpired):
        return []

    root = str(ROOT.resolve())
    for item in data:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if not name:
            continue
        source = item.get("source") or ""
        market = item.get("marketplace")
        # Skip live first-party paths in this repo
        if isinstance(source, str) and source.startswith(root):
            continue
        if isinstance(source, str) and "RUSHYOP/rushy-claude-plugins" in source and "#plugins/" in source:
            # Installed from our marketplace first-party subdir — already first-party
            continue

        rec: dict[str, Any] = {"name": name, "via": "grok"}
        if market and market not in ("rushy", "rushy-git", "xAI Official"):
            rec["marketplace"] = market

        if isinstance(source, str) and source:
            # git URL or local
            if source.startswith("http") or source.startswith("git@"):
                rec["git"] = source
            elif "github.com" in source:
                rec["git"] = source
            # path after install from RUSHYOP/mirror-foo#bar may only show git base
        found[name] = rec

    # Also pick enabled names from config.toml [plugins] enabled = [...]
    # that might not yet be installed (marketplace-only enable)
    cfg = Path.home() / ".grok" / "config.toml"
    if cfg.exists():
        text = cfg.read_text()
        # crude: enabled = [ "a", "b" ]
        m = re.search(r"\[plugins\][^\[]*?enabled\s*=\s*\[(.*?)\]", text, re.S)
        if m:
            first_party = {
            d.name for d in PLUGINS_DIR.iterdir() if d.is_dir()
        } if PLUGINS_DIR.is_dir() else set()
        for name in re.findall(r'"([^"]+)"', m.group(1)):
            if name not in found and name not in first_party:
                found.setdefault(name, {"name": name, "via": "grok-config"})

    return sorted(found.values(), key=lambda x: x["name"])


def resolve_plugin_record(rec: dict[str, Any]) -> dict[str, Any]:
    """Turn a CLI discovery record into a marketplace entry."""
    name = rec["name"]
    via = rec.get("via", "cli")

    if rec.get("git"):
        git = rec["git"]
        subpath = rec.get("path")
        # Parse owner/repo#subdir if stored that way
        if "#" in git and not git.startswith("http"):
            repo, sub = git.split("#", 1)
            if "/" in repo and not repo.startswith("git"):
                git = f"https://github.com/{repo}.git"
                subpath = sub
        return entry_from_git(name, git, subpath=subpath, via=via)

    market = rec.get("marketplace")
    if market:
        entry = resolve_source_from_marketplace(market, name)
        if entry:
            entry.setdefault("metadata", {})["importedFrom"] = via
            entry.setdefault("tags", [])
            if "imported" not in entry["tags"]:
                entry["tags"] = sorted(set(entry["tags"] + ["imported", f"via-{via}"]))
            return entry
        git = MARKETPLACE_GIT.get(market)
        if git:
            return entry_from_git(name, git, via=f"{via}/{market}", description=f"Imported from {via} ({market})")

    raise ValueError(f"cannot resolve source for {name} (via={via})")


def import_missing_from_clis(
    *,
    dry_run: bool = False,
    include_disabled: bool = False,
    sources: tuple[str, ...] = ("claude", "grok"),
) -> tuple[list[str], list[str], list[str], list[str]]:
    """
    Import plugins discovered in Claude and/or Grok into rushy marketplace.
    Returns (added, skipped, failed, new_mirror_names).
    """
    mp = load_marketplace()
    existing = {p["name"] for p in mp.get("plugins", [])}
    # first-party names on disk always skip as upstream
    if PLUGINS_DIR.is_dir():
        for d in PLUGINS_DIR.iterdir():
            if d.is_dir() and (d / ".claude-plugin" / "plugin.json").exists():
                meta = load_plugin_json(d)
                existing.add(meta.get("name") or d.name)

    added: list[str] = []
    skipped: list[str] = []
    failed: list[str] = []
    new_entries: list[dict[str, Any]] = []
    new_mirrors: list[str] = []

    records: list[dict[str, Any]] = []
    if "claude" in sources:
        records.extend(collect_claude_plugins(include_disabled=include_disabled))
    if "grok" in sources:
        records.extend(collect_grok_plugins())

    # de-dupe by plugin name (prefer record with marketplace or git)
    by_name: dict[str, dict[str, Any]] = {}
    for rec in records:
        n = rec["name"]
        prev = by_name.get(n)
        if prev is None or rec.get("git") or (rec.get("marketplace") and not prev.get("git")):
            by_name[n] = rec

    for name, rec in sorted(by_name.items()):
        label = f"{name}@{rec.get('marketplace') or rec.get('via', 'cli')}"
        if name in existing:
            skipped.append(label)
            continue
        try:
            entry = resolve_plugin_record(rec)
            new_entries.append(entry)
            added.append(label)
            existing.add(name)
        except Exception as e:  # noqa: BLE001
            failed.append(f"{label}: {e}")

    if dry_run:
        # Preview which mirrors would be registered
        for entry in new_entries:
            up = (entry.get("metadata") or {}).get("upstreamUrl")
            if up and "RUSHYOP/rushy-claude-plugins" not in up:
                new_mirrors.append(mirror_name_for_upstream(up))
        return added, skipped, failed, sorted(set(new_mirrors))

    if new_entries:
        for entry in new_entries:
            upstream = (entry.get("metadata") or {}).get("upstreamUrl")
            if upstream:
                mname = ensure_registry_row(upstream)
                if mname:
                    new_mirrors.append(mname)
        first = rebuild_first_party(mp.get("plugins", []))
        upstream_list = [p for p in mp.get("plugins", []) if is_upstream_entry(p)]
        by_up: dict[str, dict[str, Any]] = {p["name"]: p for p in upstream_list}
        for p in new_entries:
            by_up[p["name"]] = p
        first.sort(key=lambda p: p["name"])
        mp["plugins"] = first + sorted(by_up.values(), key=lambda p: p["name"])
        save_marketplace(mp)
        write_upstream_md(mp)

    return added, skipped, failed, sorted(set(new_mirrors))


# Back-compat alias
def import_missing_from_claude(
    *,
    dry_run: bool = False,
    include_disabled: bool = False,
) -> tuple[list[str], list[str], list[str]]:
    a, s, f, _m = import_missing_from_clis(
        dry_run=dry_run,
        include_disabled=include_disabled,
        sources=("claude",),
    )
    return a, s, f
