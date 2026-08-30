# Marketplace skill audit — 2026-08-30

Follow-up to `docs/plugin-skill-audit.md` (2026-07-25). That pass made the right cuts.
**They never reached the running agent.** This pass finds out why and fixes it.

## TL;DR

| Claim | Measured |
|---|---|
| "1,129 duplicate skills" | 1,255 `SKILL.md` in the Claude cache; **171** in this repo |
| "shadcn ×9" | **×2** in the Claude cache (`agent-tooling`, `vercel`) |
| "frontend-design ×11" | **×3** (`frontend-design@rushy`, `better-ux-quality` ghost, one project-scoped official install) |
| "repo is bloated" | Repo has **zero** internal skill-name collisions. All 171 names are unique |
| "remove skills to cut tokens" | Only the **enabled** set costs tokens: 13 plugins → 87 skills → **~6.9k tokens**. The other ~140 repo skills cost **0** |

The higher counts almost certainly come from summing the Grok/Cursor caches and
per-version cache directories alongside Claude's. Those are copies of the same
files, not competing skills.

## Root cause: version-pinned cache never invalidated

The plugin cache is keyed by **version**: `~/.claude/plugins/cache/rushy/<plugin>/<version>/`.
Every local plugin still carries the version it shipped with, so **no content change since
the first install has ever been fetched** — including the July skill audit's deletions.

```
plugin                repo version   installed version   files changed since installed sha
better-ux-quality     0.1.0          0.1.0                5
react-native-skills   1.1.0          1.1.0               44
agent-tooling         1.0.0          1.0.0                2
android-skills        1.0.0          1.0.0                2
...                   (13 of 13 local plugins pinned to a stale tree)
```

HEAD is **36 commits** ahead of the sha most plugins were installed from.

### The one live collision is a ghost

`better-ux-quality:frontend-design` shows up in the current session's skill list and
collides with `frontend-design@rushy`. It was **deleted from the repo on 2026-07-25**
(commit `85c9c4f`). The cache still serves it, along with `company-logos` and
`solar-duotone-bold`, because `better-ux-quality` is still pinned at `0.1.0`.

```
better-ux-quality ghosts: company-logos, frontend-design, solar-duotone-bold
```

No other enabled plugin has cache/repo drift.

**Fix applied:** version bumps on every local plugin whose tree changed since its
installed sha, so the next `/plugin update` actually refetches.

## Collisions from the report, re-checked against reality

| Reported | Status |
|---|---|
| `frontend-design` ×11 | **Real but already fixed** — stale-cache ghost. Resolved by version bump + refresh |
| `shadcn` ×9 | **×2, not live.** `agent-tooling:shadcn` (enabled skill) vs `vercel:shadcn` (plugin disabled). `plugins/shadcn` is MCP-only — no skill, no collision |
| `pdf` / `docx` / `pptx` / `xlsx` | **Not in this repo.** Zero matches under `plugins/`. Lives in ccm / Grok bundles — out of this marketplace's control |
| `verification` vs `verification-before-completion` | `vercel@rushy` is **disabled**. Not live. No action |
| ToB `testing-handbook` nested in unrelated plugins | **Not in this repo.** Those are upstream Trail of Bits plugin layouts, reached via mirrors. Cannot be fixed here without forking upstream |
| `cybersecurity-core` vs `mirror-anthropic-cybersecurity-skills` | **Real duplication in the catalog.** Both are disabled, so no live cost — but two trees, same skill names. See below |
| `upstream` ×21, `access`/`configure` ×18 | **Not in this repo.** All inside mirrored Vercel/Discord/iMessage plugins |

Net: of seven reported collisions, **one was live** (and already fixed in git),
one is a catalog-hygiene issue, and five are outside this repo entirely.

## Enabled-set cost (the only thing that spends tokens)

After the cache refresh lands:

| Plugin | Source | Skills | ~tokens |
|---|---|---:|---:|
| `figma` | mirror | 14 | 1,907 |
| `claude-mem` | mirror | 17 | 1,080 |
| `better-ux-quality` | repo | 11 | 971 |
| `agent-tooling` | repo | 6 | 812 |
| `web-quality` | mirror | 12 | 690 |
| `superpowers` | mirror | 14 | 563 |
| `chrome-devtools-mcp` | mirror | 6 | 392 |
| `i-have-adhd` | mirror | 1 | 113 |
| `claude-md-management` | mirror | 1 | 89 |
| `skill-creator` | mirror | 1 | 83 |
| `frontend-design` | mirror | 1 | 62 |
| `playwright` | mirror | 0 | 0 |
| **Total** | | **84** | **~6,765** |

Down from ~6,903 / 87 skills. The refresh removes 3 ghost skills; the rest of any
saving has to come from turning plugins off.

### Overlap inside the enabled set

Real routing competition among things that are on **right now**:

| Domain | Competing skills | Note |
|---|---|---|
| SEO | `web-quality:seo` vs `better-ux-quality:seo-audit` | Same job, two bars |
| Accessibility | `web-quality:accessibility` vs `chrome-devtools-mcp:a11y-debugging` | Guidelines vs live-browser audit |
| Perf / vitals | `web-quality:core-web-vitals`, `web-quality:performance`, `chrome-devtools-mcp:debug-optimize-lcp`, `better-ux-quality:optimize-web-animations` | Four entries, heavily overlapping |
| Frontend aesthetics | `frontend-design`, `better-ux-quality:design-taste-frontend` | Intentional per July audit — keep both |

`web-quality` (12 skills, 690 tok) is the densest overlap: its perf/a11y/SEO skills
are each covered by a more specific enabled skill. **Highest-value single toggle.**

## Recommendations (not applied — user's call)

### Catalog hygiene
- **Drop `cybersecurity-core` from the repo.** It is a 3.6 MB, 81-skill subset of
  `mirror-anthropic-cybersecurity-skills`, which is already a catalog entry. Two trees
  with identical skill names is exactly the "agents can load either" problem. Keep the
  mirror as the single source of truth. Saves 3.6 MB and removes 81 duplicate names.

### Enabled-set pruning, ranked by tokens-saved-per-regret
1. `web-quality` — ~690 tok, fully covered by `chrome-devtools-mcp` + `better-ux-quality`
2. `i-have-adhd` — ~113 tok, output-shaping preference; belongs in CLAUDE.md, not a skill
3. `figma` — ~1,907 tok, the single largest line. Only worth it on Figma days; toggle per project
4. `claude-mem` — ~1,080 tok. Keep if persistent memory is in use; it is the second largest line

Turning off `web-quality` + `i-have-adhd` → **~5,960 tok** (−12%).
Also dropping `figma` when not in a design project → **~4,055 tok** (−40%).

### Dangling settings entry
`mirror-kotlin-kotlin-agent-skills-75d3ff0b@rushy: true` is still in
`~/.claude/settings.json`, but the catalog entry was removed on 2026-07-25.
It resolves to nothing. Safe to delete.

## What was actually wrong

The repo was not bloated. The July audit was correct and complete. The failure was
**operational**: content changes shipped without version bumps, so a version-pinned
cache kept serving a July 12th tree into an August 30th session. The visible symptom —
duplicate skills — was a cache artifact, not a catalog defect.

**Process fix:** `scripts/add-plugin.sh` and any skill edit must bump the plugin's
`version` in both `plugins/<name>/.claude-plugin/plugin.json` and
`.claude-plugin/marketplace.json`. Without it, edits are invisible to installed clients.
