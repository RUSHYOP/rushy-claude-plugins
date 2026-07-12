# Agent rules — rushy marketplace

This repository is the **only** place new plugins are added for RUSHYOP AI tooling (Claude Code, Grok, Cursor, etc.).

## Non-negotiable workflow

1. **Never** install a plugin only into a CLI (Claude/Grok/Cursor) as the primary step.
2. **Always** add the plugin to **this marketplace** first.
3. **Commit and push** the catalog (and run mirror sync for upstream).
4. **Then** wire tools to install/enable from **this marketplace only** (`*@rushy` / `RUSHYOP/rushy-claude-plugins`).

## How to add a plugin (agents must use this)

```bash
cd /Users/admin/Codes-2/Agentic-setup   # or clone of RUSHYOP/rushy-claude-plugins

# Upstream repo
./scripts/add-plugin.sh <name> <owner/repo|git-url> [--path subdir] --sync --commit --push

# From a known marketplace clone name
./scripts/add-plugin.sh <name> --marketplace claude-plugins-official --sync --commit --push

# First-party (code under plugins/<dir>/)
./scripts/add-plugin.sh <name> --first-party --commit --push
```

After that, tools only **reference** the marketplace:

- Claude: `enabledPlugins["<name>@rushy"] = true`
- Grok: marketplace source `RUSHYOP/rushy-claude-plugins` / local path; install from there

## Do not

- `grok plugin install https://github.com/someone/random.git` as the lasting setup
- Claude enable `foo@some-other-marketplace` as the lasting setup
- Copy skills into `~/.claude/skills` or `~/.grok/skills` for team plugins

## Optional reconcile

If something was installed into a CLI by mistake, capture it into the catalog:

```bash
./hooks/check-cli-drift.sh
./hooks/reconcile.sh --sync --only-new --commit --push
# low-level: ./scripts/import-from-clis.sh --commit && git push
```

Or enable **`marketplace-ops@rushy`** and run `/reconcile-marketplace`.

Install **AUTO-ADD** hooks (SessionStart + post-plugin-install → catalog + commit):

```bash
./hooks/install-user-hooks.sh            # auto-add + commit
./hooks/install-user-hooks.sh --push     # also push
./hooks/install-user-hooks.sh --claude   # optional
```

Then disable non-`@rushy` enables in CLIs so reference is only via this marketplace.

## Scripts map

| Script | Use |
|--------|-----|
| `add-plugin.sh` | **Primary** — add to catalog + registry |
| `hooks/reconcile.sh` | Runnable reconcile (CLI → catalog) |
| `hooks/check-cli-drift.sh` | Dry-run drift status |
| `hooks/install-user-hooks.sh` | Global SessionStart / PostToolUse hooks |
| `sync-mirrors.sh` | Private DR mirrors from upstream |
| `rebuild-marketplace.sh` | Refresh first-party from `plugins/*` |
| `import-from-clis.sh` | Reconcile accidental CLI installs into catalog |
| `generate-global-config.sh` | Regen enable lists from catalog |
