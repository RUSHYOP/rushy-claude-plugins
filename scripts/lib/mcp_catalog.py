#!/usr/bin/env python3
"""MCP catalog: config/mcp-servers.json → first-party plugins + harness adapters.

Why this module exists
----------------------
MCP servers used to live only in config/mcp-servers.json and were applied as a
blob. That cannot be installed per-tool as a plugin, and apply-mcp used to turn
everything on. This module:

1. Treats config/mcp-servers.json as the single source of truth.
2. Generates one first-party plugin per server (Claude + Grok + Cursor + Gemini
   manifests) so the marketplace can ship them *off by default*.
3. Strips `_rushy` metadata before any client sees a server block.
4. Merges servers into Cursor/Gemini configs with disabled=true unless asked.

Never writes secrets; ${ENV_VAR} placeholders stay verbatim.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
MCP_CATALOG_PATH = ROOT / "config" / "mcp-servers.json"
PLUGINS_DIR = ROOT / "plugins"
GROK_MARKETPLACE_PATH = ROOT / ".grok-plugin" / "marketplace.json"
CLAUDE_MARKETPLACE_PATH = ROOT / ".claude-plugin" / "marketplace.json"

AUTHOR = {"name": "RUSHYOP", "email": "alwayspurav@gmail.com"}

# Keys that belong only in this repo's catalog, never in a client mcpServers block.
_CATALOG_ONLY = {"_rushy", "metadata", "disabled"}


def load_catalog() -> dict[str, Any]:
    if not MCP_CATALOG_PATH.exists():
        raise FileNotFoundError(f"missing {MCP_CATALOG_PATH}")
    return json.loads(MCP_CATALOG_PATH.read_text())


def rushy_meta(cfg: dict[str, Any]) -> dict[str, Any]:
    extra = cfg.get("_rushy") or cfg.get("metadata") or {}
    return extra if isinstance(extra, dict) else {}


def client_server_block(cfg: dict[str, Any]) -> dict[str, Any]:
    """Runtime MCP block: drop catalog-only keys. Keep type/command/args/url/…"""
    out: dict[str, Any] = {}
    for k, v in cfg.items():
        if k in _CATALOG_ONLY:
            continue
        out[k] = v
    return out


def iter_servers(
    catalog: dict[str, Any] | None = None,
) -> list[tuple[str, dict[str, Any], dict[str, Any]]]:
    data = catalog if catalog is not None else load_catalog()
    rows: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    for name, cfg in (data.get("mcpServers") or {}).items():
        if not isinstance(cfg, dict):
            continue
        rows.append((name, cfg, rushy_meta(cfg)))
    return rows


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")


def generate_mcp_plugins() -> list[str]:
    """Write plugins/<name>/ manifests from the catalog. Returns plugin names."""
    written: list[str] = []
    for name, cfg, meta in iter_servers():
        if meta.get("skipPlugin"):
            # Already shipped by another marketplace plugin (e.g. playwright@rushy).
            continue
        plugin_dir = PLUGINS_DIR / name
        runtime = client_server_block(cfg)
        desc = meta.get("description") or f"MCP server {name} (opt-in)."
        env_needed = list(meta.get("env") or [])
        notes = (meta.get("notes") or "").strip()

        plugin_json = {
            "$schema": "https://anthropic.com/claude-code/plugin.schema.json",
            "name": name,
            "version": "1.0.0",
            "description": desc,
            "author": AUTHOR,
            # Off unless the user explicitly enables name@rushy / grok plugin enable.
            "defaultEnabled": False,
            "keywords": ["mcp", "opt-in"],
            "mcpServers": {name: runtime},
        }
        _write_json(plugin_dir / ".claude-plugin" / "plugin.json", plugin_json)
        _write_json(
            plugin_dir / ".cursor-plugin" / "plugin.json",
            {
                "name": name,
                "description": desc,
                "version": "1.0.0",
                "author": AUTHOR,
                "mcpServers": {name: runtime},
            },
        )
        # Grok + Claude both load plugin-local .mcp.json when the plugin is trusted.
        _write_json(plugin_dir / ".mcp.json", {"mcpServers": {name: runtime}})
        # Gemini CLI / Antigravity extension manifest.
        gemini: dict[str, Any] = {
            "name": name,
            "version": "1.0.0",
            "mcpServers": {name: runtime},
        }
        if env_needed:
            gemini["settings"] = [
                {
                    "name": var,
                    "description": f"Required env for {name}",
                    "envVar": var,
                    "sensitive": any(
                        tok in var.upper()
                        for tok in ("TOKEN", "SECRET", "KEY", "PASSWORD", "AUTH")
                    ),
                }
                for var in env_needed
            ]
        _write_json(plugin_dir / "gemini-extension.json", gemini)

        readme_lines = [
            f"# {name}",
            "",
            desc,
            "",
            "Generated from `config/mcp-servers.json`. Do not edit by hand —",
            "re-run `./scripts/generate-mcp-plugins.sh`.",
            "",
            "**Default: OFF.** Enable only the servers you need.",
            "",
            "## Enable",
            "",
            "```bash",
            f"# Claude — after rushy marketplace is registered",
            f'# enabledPlugins["{name}@rushy"] = true',
            "",
            f"# Grok",
            f"grok plugin install {name} --trust   # from rushy marketplace",
            f"# or: grok plugin enable {name}",
            "",
            f"# Cursor",
            "./scripts/apply-cursor.sh",
            f"# then enable the local plugin `{name}`",
            "",
            f"# Gemini CLI / Antigravity",
            f"gemini extensions link plugins/{name}",
            "# or: ./scripts/apply-gemini.sh --enable " + name,
            "```",
            "",
        ]
        if env_needed:
            readme_lines += [
                "## Required env",
                "",
                ", ".join(f"`{e}`" for e in env_needed),
                "",
                "Set in `~/.claude/settings.json` `env`, your shell, or the Gemini extension settings prompt.",
                "",
            ]
        if notes:
            readme_lines += ["## Notes", "", notes, ""]
        (plugin_dir / "README.md").write_text("\n".join(readme_lines) + "\n")
        # Marker so humans/agents know this tree is generated.
        (plugin_dir / ".generated-from-mcp-catalog").write_text(
            "generated by scripts/lib/mcp_catalog.py from config/mcp-servers.json\n"
        )
        written.append(name)
    return written


def write_grok_marketplace() -> None:
    """Grok reads .grok-plugin/marketplace.json; also accepts .claude-plugin/.

    We emit a native copy so `grok plugin marketplace add` against this repo
    does not depend on Claude-only paths.
    """
    if not CLAUDE_MARKETPLACE_PATH.exists():
        return
    mp = json.loads(CLAUDE_MARKETPLACE_PATH.read_text())
    plugins_out = []
    for p in mp.get("plugins", []):
        src = p.get("source")
        entry = {
            "name": p.get("name"),
            "description": p.get("description") or "",
            "version": p.get("version") or "latest",
        }
        if p.get("author"):
            entry["author"] = p["author"]
        if p.get("homepage"):
            entry["homepage"] = p["homepage"]
        if p.get("tags"):
            entry["tags"] = p["tags"]
        if p.get("keywords"):
            entry["keywords"] = p["keywords"]
        # Grok local plugins: {type: local, path}. Remote: keep Claude-style url dict.
        if isinstance(src, str) and src.startswith("./"):
            entry["source"] = {"type": "local", "path": src}
        else:
            entry["source"] = src
        plugins_out.append(entry)
    out = {
        "name": mp.get("name") or "rushy",
        "description": (
            "RUSHYOP marketplace for Grok: first-party plugins + upstream "
            "from public RUSHYOP/mirror-* repos. MCP plugins are opt-in."
        ),
        "owner": mp.get("owner") or AUTHOR,
        "plugins": plugins_out,
    }
    _write_json(GROK_MARKETPLACE_PATH, out)


def merge_disabled_mcp_json(
    target: Path,
    *,
    only: set[str] | None = None,
    enable: set[str] | None = None,
    dry_run: bool = False,
) -> list[str]:
    """Merge catalog servers into a Cursor/Gemini-style {mcpServers:{}} file.

    New/updated servers default to disabled=true unless listed in `enable`.
    Existing servers the user already turned on are not flipped off.
    """
    enable = enable or set()
    servers: dict[str, Any] = {}
    if target.exists():
        try:
            existing = json.loads(target.read_text())
            if isinstance(existing, dict) and isinstance(existing.get("mcpServers"), dict):
                servers = existing["mcpServers"]
        except json.JSONDecodeError:
            servers = {}

    changed: list[str] = []
    for name, cfg, meta in iter_servers():
        if only is not None and name not in only:
            continue
        if meta.get("skipPlugin") and name not in enable and name not in (only or set()):
            # Still allow --enable playwright to write the catalog form.
            if name not in enable:
                continue
        block = client_server_block(cfg)
        prev = servers.get(name) if isinstance(servers.get(name), dict) else None
        # Missing `disabled` means the user already had it on (Cursor style).
        # Only treat explicit disabled=true as off.
        already_on = bool(prev) and prev.get("disabled") is not True
        want_on = name in enable or already_on
        block["disabled"] = not want_on
        servers[name] = block
        changed.append(f"{name}={'on' if want_on else 'off'}")

    payload = {"mcpServers": servers}
    if dry_run:
        return changed
    _write_json(target, payload)
    return changed


def grok_mcp_toml_fragment(
    *,
    only: set[str] | None = None,
    enable: set[str] | None = None,
) -> str:
    """TOML fragment for ~/.grok/config.toml [mcp_servers.<name>] — all off unless enable."""
    enable = enable or set()
    lines = [
        "# Generated from config/mcp-servers.json — MCP servers default OFF.",
        "# Merge into ~/.grok/config.toml or enable the matching rushy plugin instead.",
        "",
    ]
    for name, cfg, meta in iter_servers():
        if only is not None and name not in only:
            continue
        if not re.fullmatch(r"[A-Za-z0-9_-]+", name):
            continue
        runtime = client_server_block(cfg)
        enabled = "true" if name in enable else "false"
        lines.append(f"[mcp_servers.{name}]")
        lines.append(f"enabled = {enabled}")
        if runtime.get("url"):
            lines.append(f'url = {_toml_str(runtime["url"])}')
        if runtime.get("command"):
            lines.append(f'command = {_toml_str(runtime["command"])}')
        if runtime.get("args"):
            args = ", ".join(_toml_str(a) for a in runtime["args"])
            lines.append(f"args = [{args}]")
        headers = runtime.get("headers") or {}
        if headers:
            lines.append(f"[mcp_servers.{name}.headers]")
            for hk, hv in headers.items():
                lines.append(f"{_toml_key(hk)} = {_toml_str(str(hv))}")
        env = runtime.get("env") or {}
        if env:
            lines.append(f"[mcp_servers.{name}.env]")
            for ek, ev in env.items():
                lines.append(f"{_toml_key(ek)} = {_toml_str(str(ev))}")
        lines.append("")
    return "\n".join(lines)


def _toml_str(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _toml_key(key: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_-]+", key):
        return key
    return _toml_str(key)
