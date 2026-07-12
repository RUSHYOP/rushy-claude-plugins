# rushy-claude-plugins

Private marketplace: **single source of truth** for RUSHYOP plugins/skills.

- **Local:** `/Users/admin/Codes-2/Agentic-setup`
- **Remote:** https://github.com/RUSHYOP/rushy-claude-plugins (private)

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
4. Optional `--sync` creates/updates the private mirror
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
```

Optional helper to regenerate enable lists / merge Claude `*@rushy`:

```bash
./scripts/generate-global-config.sh
./scripts/apply-global.sh --claude
```

## Agents

See **[AGENTS.md](./AGENTS.md)** — any AI working on plugin setup must use `add-plugin.sh`, not CLI-only installs.

## Reconcile (if something was installed in a CLI by mistake)

```bash
./scripts/import-from-clis.sh --commit   # pull discovery into catalog
./scripts/sync-mirrors.sh                # if new remotes
git push
# then turn off non-@rushy enables in the CLI
```

## Scripts

| Script | Role |
|--------|------|
| **`add-plugin.sh`** | **Canonical** add to marketplace |
| `sync-mirrors.sh` | Private DR mirrors |
| `rebuild-marketplace.sh` | First-party scan of `plugins/*` |
| `import-from-clis.sh` | Reconcile CLI → catalog only |
| `generate-global-config.sh` | Build `config/*` from catalog |
| `apply-global.sh` | Optional Claude `*@rushy` merge |
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
plugins/                 # first-party only
mirrors/registry.tsv
scripts/add-plugin.sh    # start here for new plugins
```
