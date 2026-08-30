# knowledge.md — rushy marketplace

Public plugin marketplace for RUSHYOP AI tooling. Local checkout:
`/Users/admin/Codes-2/Agentic-setup`. Remote:
https://github.com/RUSHYOP/rushy-claude-plugins

## What this repo is

The **only** catalog Claude, Grok, Cursor, and Gemini should install from.
First-party plugins live under `plugins/`. Upstream plugins install from public
`RUSHYOP/mirror-*` repos. Nothing this marketplace serves may require
credentials to clone.

## Catalog

- Source of truth: `.claude-plugin/marketplace.json` (name `rushy`, v1.2.0+)
- Grok index: `.grok-plugin/marketplace.json` (generated, local `type: local`)
- Cursor index: `.cursor-plugin/marketplace.json` (`./scripts/apply-cursor.sh`)
- Upstream remotes: `mirrors/registry.tsv` + `UPSTREAM.md`
- Enable lists: `config/global-settings.json`, `config/grok-config.toml`
  (`./scripts/generate-global-config.sh`)
- `metadata.defaultEnabled: false` = opt-in (not auto-enabled)

## skill-doctor

First-party plugin `plugins/skill-doctor` (vendored from
`warpdotdev/common-skills`). Grades local conversations; reports go in a temp
dir, never this repo. Enable `skill-doctor@rushy`. Refresh by re-copying the
upstream skill directory.

## How to add a plugin

```bash
./scripts/add-plugin.sh <name> <owner/repo|url> [--path subdir] --sync --commit --push
./scripts/add-plugin.sh <name> --first-party --commit --push
```

Reconcile accidental CLI installs: `./hooks/check-cli-drift.sh` then
`./hooks/reconcile.sh --sync --only-new --commit --push`.

Brain: `scripts/lib/marketplace_io.py`.

## MCP servers

Source of truth: `config/mcp-servers.json`.

Each server has runtime fields (what clients consume) plus `_rushy` metadata
(description, env, `defaultEnabled`, optional `skipPlugin`).
`scripts/lib/mcp_catalog.py` generates one first-party plugin per server:

```
plugins/<name>/
  .claude-plugin/plugin.json   # mcpServers + defaultEnabled: false
  .cursor-plugin/plugin.json
  .mcp.json                    # Grok + Claude plugin MCP
  gemini-extension.json
  README.md
```

`playwright` is `skipPlugin` because `playwright@rushy` already ships it.

Apply (still off): `./scripts/apply-mcp.sh`
Enable one: `--enable <name>` or `enabledPlugins["<name>@rushy"]=true`

Secrets stay `${ENV_VAR}`. Never copy live tokens from `~/.claude.json`.

## This repo on each harness

| Tool | Register |
|---|---|
| Claude | `extraKnownMarketplaces.rushy` → `RUSHYOP/rushy-claude-plugins` |
| Grok | marketplace source `rushy` (local path) + `rushy-git` |
| Cursor | `./scripts/apply-cursor.sh` → `~/.cursor/plugins/local` |
| Gemini | `./scripts/apply-gemini.sh` (no marketplace.json; per-plugin extensions) |

One-shot: `./scripts/apply-global.sh --all`

## Visibility

Mirrors are published install URLs. They must be public.
`scripts/lib/mirror-visibility.sh` + `sync-mirrors.sh` + `audit-mirror-visibility.sh`.

## Scripts map

See `AGENTS.md`. Primary: `add-plugin.sh`. MCP: `generate-mcp-plugins.sh`,
`apply-mcp.sh`, `apply-gemini.sh`.
