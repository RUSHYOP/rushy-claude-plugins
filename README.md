# rushy-claude-plugins

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
