# rushy-claude-plugins

Public marketplace: **single source of truth** for RUSHYOP plugins/skills.

- **Local:** `/Users/admin/Codes-2/Agentic-setup`
- **Remote:** https://github.com/RUSHYOP/rushy-claude-plugins (public)

Everything this marketplace serves is installable by anyone, with no credentials:

- **First-party plugins** live in this repo under `plugins/` and are served as
  `./plugins/<name>` — public because this repo is public.
- **Upstream plugins** install from `RUSHYOP/mirror-*`, which are **public** by
  policy. A private mirror would 404 for every consumer, so `sync-mirrors.sh`
  creates mirrors public and repairs any that are not. Audit anytime with
  `./scripts/audit-mirror-visibility.sh`.

## Rule

| Do | Don’t |
|----|--------|
| Add plugins **here** with `./scripts/add-plugin.sh` | Install plugins only into Claude/Grok/Cursor |
| Commit + push catalog (and mirrors) | Leave a tool pointing at random upstream URLs |
| Point every AI tool at **this marketplace** | Duplicate skills under `~/.claude/skills` / `~/.grok/skills` |

```
add plugin → marketplace.json + mirror registry → commit/push
     ↓
Claude / Grok / other tools only reference this marketplace
```

## Add a new plugin (primary path)

```bash
cd /Users/admin/Codes-2/Agentic-setup

# Upstream project
./scripts/add-plugin.sh superpowers obra/superpowers --sync --commit --push

# Monorepo subfolder
./scripts/add-plugin.sh static-analysis trailofbits/skills \
  --path plugins/static-analysis --sync --commit --push

# Already known marketplace (clone under ~/.claude/plugins/marketplaces)
./scripts/add-plugin.sh frontend-design --marketplace claude-plugins-official \
  --sync --commit --push

# Your own plugin under plugins/my-thing/
./scripts/add-plugin.sh my-thing --first-party --commit --push
```

What that does:

1. Writes an entry in `.claude-plugin/marketplace.json`
2. For upstream: install URL = **your** `RUSHYOP/mirror-*` (not the owner’s raw URL as the long-term source)
3. Registers `mirrors/registry.tsv`
4. Optional `--sync` creates/updates the **public** mirror
5. Optional `--commit` / `--push`

## Wire tools (reference only)

```bash
# Grok — marketplace only
grok plugin marketplace add RUSHYOP/rushy-claude-plugins
# live checkout (optional):
grok plugin marketplace add /Users/admin/Codes-2/Agentic-setup
# then install/enable plugins from that marketplace UI/CLI — not from random git URLs

# Claude — marketplace rushy + enable name@rushy
# extraKnownMarketplaces.rushy → RUSHYOP/rushy-claude-plugins

# Cursor — local plugins + dual-format marketplace manifest
./scripts/apply-cursor.sh
# Reload Cursor window. Plugins land in ~/.cursor/plugins/local (symlinks).
# Team/Enterprise org-wide: Dashboard → Plugins → Add Marketplace →
#   import https://github.com/RUSHYOP/rushy-claude-plugins
```

Optional helper to regenerate enable lists / merge Claude `*@rushy`:

```bash
./scripts/generate-global-config.sh
./scripts/apply-global.sh --claude
```

## This repo as a plugin marketplace (Claude / Grok / Cursor / Gemini)

```bash
# Register on every local harness. MCP plugins stay OFF.
./scripts/apply-global.sh --all
```

| Tool | Manifest | Command |
|---|---|---|
| Claude | `.claude-plugin/marketplace.json` | already `extraKnownMarketplaces.rushy` |
| Grok | `.grok-plugin/marketplace.json` | `grok plugin marketplace add RUSHYOP/rushy-claude-plugins` |
| Cursor | `.cursor-plugin/marketplace.json` | `./scripts/apply-cursor.sh` |
| Gemini | `plugins/<name>/gemini-extension.json` | `./scripts/apply-gemini.sh` |

MCP servers from Claude live in `config/mcp-servers.json` and are generated as
opt-in plugins (`defaultEnabled: false`). Enable one at a time — see
`config/mcp-servers.README.md`.

## Agents

See **[AGENTS.md](./AGENTS.md)** — any AI working on plugin setup must use `add-plugin.sh`, not CLI-only installs.

## Reconcile (if something was installed in a CLI by mistake)

```bash
# Preferred runners (hooks package)
./hooks/check-cli-drift.sh                 # dry-run status
./hooks/reconcile.sh --sync --only-new --commit --push

# Equivalent low-level script
./scripts/import-from-clis.sh --commit
./scripts/sync-mirrors.sh                  # if new remotes
git push
# then turn off non-@rushy enables in the CLI
```

### AUTO-ADD hooks (stored in this repo)

```bash
# Install global Grok hooks — SessionStart + post-plugin-install AUTO-ADD into catalog
./hooks/install-user-hooks.sh              # commit catalog changes
./hooks/install-user-hooks.sh --push       # also git push
./hooks/install-user-hooks.sh --claude     # optional Claude SessionStart

# Same body as the hook (manual):
./hooks/auto-add-from-clis.sh

# Or enable marketplace-ops@rushy:
#   /marketplace-status
#   /reconcile-marketplace
```

After you install a plugin in Grok/Claude, the **PostToolUse** hook runs `import-from-clis` and commits into this marketplace. SessionStart does the same if anything is still missing.

See **[hooks/README.md](./hooks/README.md)**.

## Scripts

| Script | Role |
|--------|------|
| **`add-plugin.sh`** | **Canonical** add to marketplace |
| **`hooks/reconcile.sh`** | Runnable CLI→catalog reconcile |
| **`hooks/check-cli-drift.sh`** | Dry-run drift check |
| **`hooks/install-user-hooks.sh`** | Install global Grok/Claude hooks |
| `sync-mirrors.sh` | Public DR mirrors (creates public, repairs non-public) |
| `audit-mirror-visibility.sh` | Audit mirrors are public; `--fix` to repair |
| `rebuild-marketplace.sh` | First-party scan of `plugins/*` |
| `import-from-clis.sh` | Reconcile CLI → catalog only |
| `generate-global-config.sh` | Build `config/*` from catalog |
| `apply-global.sh` | Wire Claude / Grok / Cursor / Gemini (`--all`) |
| `apply-cursor.sh` | Link rushy plugins into `~/.cursor/plugins/local` + write `.cursor-plugin/marketplace.json` |
| `apply-mcp.sh` | MCP catalog → opt-in plugins; merge **disabled** servers into Cursor/Gemini |
| `generate-mcp-plugins.sh` | Build `plugins/<mcp>/` + `.grok-plugin/marketplace.json` |
| `apply-gemini.sh` | Gemini / Antigravity MCP adapters |
| `clean-global-configs.sh` | Reset Claude + Grok globals to **only** this marketplace |

## Global agent rules (`CLAUDE.md`)

Canonical copy of your **global** Claude rules lives in this repo as `CLAUDE.md`.

```bash
# Install into Claude user global:
./scripts/apply-global.sh --claude-md
# or full Claude wire (*@rushy + CLAUDE.md):
./scripts/apply-global.sh --claude
```

Edit `CLAUDE.md` here → commit/push → re-run apply on machines that need it.

## Layout

```
.claude-plugin/marketplace.json
CLAUDE.md                # global agent rules (source of truth)
AGENTS.md                # marketplace workflow for AI tools
hooks/                   # drift check + reconcile runners + user hook installer
plugins/                 # first-party only (includes marketplace-ops)
mirrors/registry.tsv
scripts/add-plugin.sh    # start here for new plugins
```

## Troubleshooting (Claude plugin errors)

### `Failed to clone … RUSHYOP/mirror-… Repository not found`

Mirrors are **public**, so this should not happen for anyone. GitHub returns its
generic 404 (`Repository not found`) for a private repo you cannot see — so this
error now means a mirror has drifted back to private, or was created outside
`sync-mirrors.sh`. Check and repair:

```bash
./scripts/audit-mirror-visibility.sh         # report visibility of every mirror
./scripts/audit-mirror-visibility.sh --fix   # make any non-public mirror public
```

`--fix` requires the **RUSHYOP** account to be active (`gh auth switch --user
RUSHYOP`), since only the owner can change visibility. *Consumers* never need to
authenticate — verify that with:

```bash
GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null GIT_TERMINAL_PROMPT=0 \
  git ls-remote https://github.com/RUSHYOP/mirror-superpowers.git HEAD
```

Then restart Claude Code and re-enable / refresh plugins.

### `Duplicate hooks file detected: ./hooks/hooks.json`

Claude auto-loads `hooks/hooks.json` for every plugin. Do **not** also set
`"hooks": "./hooks/hooks.json"` in `plugin.json` (marketplace-ops ≥1.0.1 fixed this).

