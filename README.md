# rushy-claude-plugins

Private **Claude Code marketplace** for RUSHYOP-owned plugins.

This is the **source of truth** for local plugins. Do **not** vendor them into project `.claude/plugins/cache/`. Install from this marketplace instead.

## Plugins

| Plugin | Contents |
|--------|----------|
| `r3f` | React Three Fiber skills + brain-viz-renderer |
| `better-ux-quality` | UX/design skill pack (14 skills) |
| `ramco-brain` | Journey/eval/reindex/sync + ramco-data-locator agent |
| `vizuara` | PDF/HTML reports + Wisprflow figures |
| `agent-tooling` | find-skills, git-commit, graphify, migrate-radix-to-base, project-sites, shadcn |

## Use in a project

### 1. Register the marketplace

In project or user `settings.json`:

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
    "ramco-brain@rushy": true,
    "vizuara@rushy": true,
    "agent-tooling@rushy": true
  }
}
```

### 2. Install marketplace (Claude Code)

```text
/plugin marketplace add RUSHYOP/rushy-claude-plugins
```

Or let Claude pull via `extraKnownMarketplaces` on next start.

Claude will clone into `~/.claude/plugins/marketplaces/rushy` and install enabled plugins into the normal cache from **this repo**, not from random project copies.

## Local development (optional)

```bash
# clone once
git clone git@github.com:RUSHYOP/rushy-claude-plugins.git ~/Codes-2/rushy-claude-plugins

# point marketplace installLocation at the clone (known_marketplaces.json)
# or use a file source if your Claude version supports local path marketplaces
```

## License

Private. All rights reserved unless noted inside a skill (e.g. vendored MIT r3f content).
