# rushy-claude-plugins

> Local checkout path: **`/Users/admin/Codes-2/Agentic-setup`**  
> Remote: https://github.com/RUSHYOP/rushy-claude-plugins (private)

Private **Claude Code marketplace** for RUSHYOP.

## Two kinds of plugins

| Kind | Where code lives | Updates |
|------|------------------|---------|
| **First-party** | `plugins/` in **this** repo | You push to this repo |
| **Upstream (catalog)** | **Their** git repo only | Claude pulls from upstream `source` (`ref: main`) |

Third-party plugins (e.g. **superpowers**) are **config-only here**: marketplace entries point at the real source (e.g. `https://github.com/obra/superpowers.git`). Nothing is copied into this repo for them.

See [UPSTREAM.md](./UPSTREAM.md) for the full catalog.

## First-party plugins

| Plugin | Contents |
|--------|----------|
| `r3f` | React Three Fiber skills + brain-viz-renderer |
| `better-ux-quality` | UX/design skill pack |
| `ramco-brain` | Journey/eval/reindex/sync + ramco-data-locator agent |
| `vizuara` | PDF/HTML reports + Wisprflow figures |
| `agent-tooling` | find-skills, git-commit, graphify, migrate-radix-to-base, project-sites, shadcn |

## Upstream examples

| Plugin | Install id | Source (updates from) |
|--------|------------|------------------------|
| superpowers | `superpowers@rushy` | https://github.com/obra/superpowers.git |
| figma | `figma@rushy` | https://github.com/figma/mcp-server-guide.git |
| playwright | `playwright@rushy` | anthropics/claude-plugins-official `external_plugins/playwright` |
| static-analysis | `static-analysis@rushy` | trailofbits/skills `plugins/static-analysis` |

## Use

```json
{
  "extraKnownMarketplaces": {
    "rushy": {
      "source": {
        "source": "github",
        "repo": "RUSHYOP/rushy-claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "r3f@rushy": true,
    "better-ux-quality@rushy": true,
    "superpowers@rushy": true,
    "figma@rushy": true
  }
}
```

```text
/plugin marketplace add RUSHYOP/rushy-claude-plugins
```

## Dev clone

```bash
git clone git@github.com:RUSHYOP/rushy-claude-plugins.git
# edit first-party plugins under plugins/
# edit upstream catalog in .claude-plugin/marketplace.json only
```

## License

Private first-party content. Upstream plugins retain their own licenses; this repo only redistributes **pointers**.


## Disaster recovery mirrors

Third-party plugins install from **private mirrors under RUSHYOP**, not the original owner’s repo.
If the source owner deletes their repo, your skills still install.

| Upstream | Private mirror |
|----------|----------------|
| obra/superpowers | RUSHYOP/mirror-superpowers |
| figma/mcp-server-guide | RUSHYOP/mirror-figma-mcp-server-guide |
| anthropics/claude-plugins-official | RUSHYOP/mirror-claude-plugins-official |
| trailofbits/skills | RUSHYOP/mirror-trailofbits-skills |
| thedotmack/claude-mem | RUSHYOP/mirror-claude-mem |
| mukul975/Anthropic-Cybersecurity-Skills | RUSHYOP/mirror-anthropic-cybersecurity-skills |
| nicobailon/visual-explainer | RUSHYOP/mirror-visual-explainer |
| dgreenheck/webgpu-claude-skill | RUSHYOP/mirror-webgpu-claude-skill |

Refresh mirrors (fetch upstream → push mirror):

```bash
./scripts/sync-mirrors.sh
./scripts/sync-mirrors.sh --only mirror-superpowers
```

Local bare clones live in `~/Codes-2/claude-plugin-mirrors/` (or `$MIRROR_ROOT`).

## Auto-register plugins

| Script | What it does |
|--------|----------------|
| `./scripts/rebuild-marketplace.sh` | Scan `plugins/*` → refresh first-party entries in `marketplace.json` |
| `./scripts/import-from-claude.sh` | Import plugins enabled/installed in `~/.claude` that are not yet in this catalog |
| `./scripts/sync-mirrors.sh` | Fetch upstream → push private `RUSHYOP/mirror-*` |

### Typical flow after you install something in Claude

```bash
cd /Users/admin/Codes-2/Agentic-setup
./scripts/import-from-claude.sh --sync --only-new --commit
git push
```

- `--sync --only-new` creates/refreshes mirrors only for newly imported remotes  
- `--commit` commits catalog + registry changes  

### After you add a first-party plugin under `plugins/foo/`

```bash
./scripts/rebuild-marketplace.sh --commit
git push
```

## Global Claude references this repo

Plugins **and** skills for your user-global Claude install are meant to come **only** from this marketplace (`*@rushy`).

```bash
# after git pull / catalog changes:
./scripts/apply-global.sh

# also refresh private upstream mirrors:
./scripts/apply-global.sh --sync-mirrors
```

What `apply-global.sh` does:

1. Generates `config/global-settings.json` from `marketplace.json` (every plugin → `name@rushy`)
2. Merges that into `~/.claude/settings.json`
3. Disables the same plugins under other marketplaces (no doubles)
4. Clones/pulls this repo into `~/.claude/plugins/marketplaces/rushy`
5. Archives old `~/.claude/skills/*` (skills ship inside plugins now)

Source of truth:

| Asset | Location |
|-------|----------|
| Catalog | `.claude-plugin/marketplace.json` |
| First-party skills | `plugins/*/skills/` |
| Upstream install | private `RUSHYOP/mirror-*` |
| Global enable list | `config/global-settings.json` → `~/.claude/settings.json` |

