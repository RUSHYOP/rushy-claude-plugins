# rushy-claude-plugins

Private **Claude / Grok marketplace** for RUSHYOP.

Local checkout: `/Users/admin/Codes-2/Agentic-setup`  
Remote: https://github.com/RUSHYOP/rushy-claude-plugins

## Idea

| Layer | Role |
|-------|------|
| **This repo** | Catalog + first-party plugins + mirror registry |
| **CLIs** | Add this marketplace themselves (`grok plugin marketplace add …`, Claude `@rushy`) |
| **Private mirrors** | `RUSHYOP/mirror-*` so upstream deletes do not wipe skills |
| **import-from-clis** | When you install a plugin in Claude **or** Grok, pull it into this catalog |

This repo does **not** force-install plugins into CLIs. You add the marketplace in each product.

## Add marketplace in a CLI

```bash
# Grok
grok plugin marketplace add RUSHYOP/rushy-claude-plugins
grok plugin marketplace add /Users/admin/Codes-2/Agentic-setup   # live checkout

# Claude Code
# settings: extraKnownMarketplaces.rushy → RUSHYOP/rushy-claude-plugins
# enable plugins as name@rushy
```

## When you install a new plugin in any CLI

```bash
cd /Users/admin/Codes-2/Agentic-setup
./scripts/import-from-clis.sh              # Claude + Grok → marketplace.json + registry
./scripts/import-from-clis.sh --dry-run    # preview
./scripts/import-from-clis.sh --claude-only
./scripts/import-from-clis.sh --grok-only
./scripts/import-from-clis.sh --commit

# Optional: create/refresh private DR mirrors for new remotes
./scripts/sync-mirrors.sh                  # all
./scripts/sync-mirrors.sh --only mirror-foo

git push
```

## First-party plugins (yours)

```bash
# add plugins/my-plugin/ with .claude-plugin/plugin.json + skills/
./scripts/rebuild-marketplace.sh --commit
git push
```

## Scripts

| Script | Purpose |
|--------|---------|
| `import-from-clis.sh` | Import new plugins from Claude + Grok into this catalog |
| `rebuild-marketplace.sh` | Refresh first-party entries from `plugins/*` |
| `sync-mirrors.sh` | Fetch upstream → push `RUSHYOP/mirror-*` (DR) |
| `generate-global-config.sh` | Regenerate `config/*` enable lists from catalog |
| `apply-global.sh` | Optional: regen config; `--claude` merges `*@rushy` into Claude settings |

## Layout

```
.claude-plugin/marketplace.json   # catalog
plugins/                          # first-party only
mirrors/registry.tsv              # upstream URL → mirror repo name
scripts/
config/                           # generated enable lists (optional)
```

## Upstream vs first-party

- **First-party:** code in `plugins/`, owned by you.
- **Upstream:** entry in `marketplace.json` points at **your** `RUSHYOP/mirror-*`; `metadata.upstreamUrl` is the real origin for `sync-mirrors.sh`.
