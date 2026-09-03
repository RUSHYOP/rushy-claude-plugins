# Worklog — rushy marketplace

## 2026-09-03 — Add frontend-checklist MCP

Cataloged remote HTTP MCP `https://mcp.frontendchecklist.io` as first-party
plugin `frontend-checklist` (opt-in). Enabled locally in Cursor (`mcp.json`)
and Claude (`frontend-checklist@rushy`).

## 2026-08-30 — Add skill-doctor first-party plugin

Vendored Warp's skill-doctor (`warpdotdev/common-skills` `.agents/skills/skill-doctor`,
MIT) as `plugins/skill-doctor` so it installs from rushy (`skill-doctor@rushy`).
Collector/render unit tests passed locally. Not run as a grade from Grok: the
skill's harness gate only supports Warp, Claude Code, and Codex.

## 2026-08-15 — Claude MCPs → opt-in marketplace plugins + multi-harness wire

**Ask:** take every MCP in Claude and add it to this marketplace off by default;
resolve this repo as a plugin source for Claude, Grok, Cursor, Gemini.

**Discovered in Claude `~/.claude.json` + `~/.mcp.json` (user + projects):**
whispr-flow, obsidian, atlassian-confluence, pdf-reader, nebulastudio-mcp,
playwright, mcp-uds-server, rapids-mcp, excalidraw, miro-mcp, shadcn,
rxds-figma-mcp.

**Changes:**

1. Expanded `config/mcp-servers.json` (v2) with `_rushy` metadata, placeholders only.
2. `scripts/lib/mcp_catalog.py` generates one first-party plugin per server
   (Claude / Cursor / `.mcp.json` / `gemini-extension.json`), all
   `defaultEnabled: false`.
3. `playwright` is `skipPlugin` (already `playwright@rushy`).
4. `apply-mcp.sh` default-off; `--enable NAME` to turn one on.
5. `.grok-plugin/marketplace.json` generated so Grok has a native index.
6. `apply-global.sh --all` / `apply-gemini.sh` wire the four harnesses.
7. `clean-global-configs.sh` no longer auto-enables opt-in plugins.

**Success criteria:** catalog lists MCP plugins with `defaultEnabled: false`;
no live tokens in git; apply-global --all registers rushy; Gemini/Cursor get
disabled server entries; Claude live `mcpServers` left as the user had them.

## 2026-08-01 — Make all mirrors public (marketplace consumable by anyone)

**Problem reported:** people could not access the marketplace's mirror
repositories, because mirrors were created as private repos under RUSHYOP.

**Diagnosis (measured, not assumed):**

| Target | Unauthenticated check | Result |
|--------|----------------------|--------|
| `RUSHYOP/rushy-claude-plugins` | `GET /repos/...` | **200 — already public** |
| all 16 `RUSHYOP/mirror-*` | `GET /repos/...` | **404 — private** |

So first-party ("personal") plugins were already publicly reachable: all 13 live
in `plugins/` in this repo, are committed, and are served as `./plugins/<name>`
from a public repo. Only the upstream mirrors were broken. The README claiming
the marketplace was private was stale and part of what made this confusing.

**Changes:**

1. Flipped all 16 `RUSHYOP/mirror-*` repos from private to public.
2. `scripts/lib/mirror-visibility.sh` (new) — single implementation of the
   public-mirror policy: `mirror_visibility()` + idempotent
   `ensure_mirror_public()`.
3. `scripts/audit-mirror-visibility.sh` (new) — audits every mirror referenced by
   `mirrors/registry.tsv` ∪ `marketplace.json`; `--fix` repairs. Non-zero exit
   when any mirror is not public.
4. `scripts/sync-mirrors.sh` — creates new mirrors with `--public` (was
   `--private`), and self-heals pre-existing non-public mirrors on every sync.
   Exits non-zero if any mirror could not be made public.
5. Rewrote every "private mirror" claim in `marketplace.json` (26 strings),
   `marketplace_io.py` (so future `add-plugin.sh` runs emit correct wording),
   `UPSTREAM.md`, `README.md`, `AGENTS.md`, `.cursor-plugin/marketplace.json`,
   `apply-cursor.sh`, `import-from-clis.sh`, `add-plugin.sh`,
   `hooks/auto-add-from-clis.sh`.
6. Replaced the obsolete README troubleshooting step (`gh auth switch --user
   RUSHYOP` to clone mirrors) with the audit/repair commands. Consumers no
   longer need to authenticate at all; only *changing* visibility needs the owner.

**Verified:**

- All 16 mirrors return unauthenticated HTTP 200.
- `git ls-remote` succeeds against mirrors with the credential helper fully
  disabled (`GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
  GIT_TERMINAL_PROMPT=0`) — the true consumer path.
- `audit-mirror-visibility.sh` exits 0, "all 16 mirrors are public".
- `sync-mirrors.sh --only mirror-ayghri-i-have-adhd` ran green end-to-end
  (fetch → `visibility: PUBLIC (ok)` → push).
- All touched shell scripts pass `bash -n`; both marketplace JSONs parse.
- `entry_from_git()` output contains no "private" wording.

**Not verified (flagged):** the `gh repo create --public` new-mirror branch is
inspection-only. Creating a throwaway repo to test it would leave a stray repo
behind, since the RUSHYOP token lacks the `delete_repo` scope. Mitigated by two
independent backstops: the `else` self-heal in `sync_one`, and the audit script.

## 2026-08-30 — design-collections plugin (warp-factory)
- Created first-party plugin `design-collections`: a router skill holding reusable design languages extracted from real sites.
- First entry `warp-factory`, extracted from warp.dev/skill-doctor: `warp-factory.css` (285 lines, scoped to `.wf`) + `warp-factory.md` spec covering palette, typography, spacing, shape, icons, motion, components.
- Verified by building a demo page from the shipped CSS only, screenshotting it, and diffing against a live screenshot of the source page.
- Registered via `rebuild-marketplace.sh` (51 plugins, 26 first-party).

## 2026-08-30 (cont.) — warp-factory: generative, not a skeleton
- Feedback: the entry was a transcript of one page rather than a reusable language.
- Expanded `warp-factory.css` 286 -> 522 lines: nav/subnav/dropdown, footer, ASCII status markers, stats band, accordion, tabs, tables, forms, code block, edge labels, inverted dark band, notices, empty state, logo row, utilities. All derived from the source site's real rules; no new colours, radii or shadows.
- Added `variations.md` (load-bearing vs. free dimensions, three registers, "avoiding the clone") and `patterns.md` (5 hero variants, 10 body sections, 6 page compositions).
- Added `example.html`: a changelog in the editorial register, sharing no layout with the source page. Rendered and screenshot-verified.
- Fixed a real defect found by rendering: `::first-letter` silently no-ops on a `display:flex` summary, so accordion labels stayed lowercase. Summary is now `block` with a positioned marker.

## 2026-08-30 — Skill collision audit + cache-staleness fix

**Task:** Investigate reported skill collisions / marketplace bloat; recommend removals.

**Finding:** The repo has 171 skills with **zero** internal name collisions. The reported
duplicate counts (shadcn ×9, frontend-design ×11, 1,129 dups) did not reproduce — the
Claude cache shows ×2 and ×3. Root cause of the one live collision was **cache staleness**,
not catalog content: the plugin cache is version-keyed, no local plugin had been version-
bumped since first install, so 36 commits of changes (including the 2026-07-25 skill audit
that deleted `better-ux-quality/frontend-design`) never reached the running agent.

**Done:**
- `docs/skill-audit-2026-08.md` — measured audit, claim-vs-reality table, enabled-set token
  costs (~6.9k → ~6.8k after refresh), pruning recommendations.
- Version-bumped 12 local plugins (minor where skills were removed, patch otherwise) in both
  `plugin.json` and `marketplace.json` so the cache invalidates.
- `scripts/check-plugin-versions.sh` — CI guard: fails when a plugin's Claude-relevant paths
  changed after its last version bump, or when the two manifests disagree.

**Not done (needs user decision):** dropping `cybersecurity-core` (81-skill local subset that
duplicates `mirror-anthropic-cybersecurity-skills`), and pruning `enabledPlugins`.

## 2026-08-30 (2) — Skill necessity cull

**Task:** Delete skills that are redundant with base-model capability; keep only what teaches
something I'd otherwise get wrong. Explicitly NOT touching enabledPlugins.

**Test applied:** per skill — "if this skill didn't exist and I were prompted to handle that
aspect, would I do it confidently AND currently-correctly?" Yes => delete. Keep only for
(a) org/project-specific, (b) exact contract I can't reproduce, (c) post-cutoff/churning API.

**Result: 106 deleted, 65 kept** (docs/skill-necessity-audit-2026-08.md).
- cybersecurity-core 81->10 (kept only real tool cheat-sheets: volatility3, plaso, certipy,
  bloodhound-ce, ghidra, yara, zeek, falco, trivy, wireshark; dropped 71 generated methodology)
- android-dev-skills 4->0 (all generic; plugin now empty — flagged as removal candidate)
- better-ux-quality 11->2, ios-dev-skills 13->5, swiftui-skills 7->2, react-native-skills 5->1,
  agent-tooling 6->4, android-skills 20->18, r3f 12->11
- Kept intact: ramco-brain, vizuara, design-collections, excalidraw-pages, skill-doctor,
  marketplace-ops (all project-specific)

**Housekeeping:** minor-bumped all 9 touched plugins (plugin.json + marketplace.json), updated
agent-tooling description (dropped git-commit/find-skills from the enumerated list),
check-plugin-versions.sh passes. Pre-existing warp-factory.css change was already committed
(cfa70d2) — not mine to touch.

**Open (not done):** empty android-dev-skills removal; cyber-core-vs-mirror catalog overlap.

## 2026-08-30 (3) — Remove empty plugin android-dev-skills

After the necessity cull left android-dev-skills with 0 skills and no MCP/commands/agents/hooks,
removed the whole plugin. Regenerated .claude-plugin + .grok-plugin marketplaces, config/global-settings,
config/grok-* via scripts/rebuild-marketplace.sh (auto-updated UPSTREAM.md too); hand-removed the entry
from .cursor-plugin/marketplace.json and .copilot-plugin/plugin.json (no generator covers those).
All other skills=0 plugins are MCP servers — legitimately kept. First-party now 24 (was 25).

## 2026-08-30 (4) — Local duplication + MCP defaults cleanup

**Task:** local skill/plugin duplication; all MCPs off by default; no MCP duplication.

**Root cause of "all MCPs on":** 11 MCP servers were configured as *direct* entries in
~/.claude.json (top-level + per-project) — always-on — while every one also exists as an
opt-in (defaultEnabled=false) plugin in the marketplace. That double-definition also caused
the same MCP to load twice (e.g. mcp__playwright__* AND mcp__plugin_playwright_playwright__*).

**Done (all on local ~/.claude, backed up first — repo unchanged):**
- Removed all direct mcpServers from ~/.claude.json (9 top-level + 6 per-project) and cleared
  stale enabled/disabledMcpjsonServers. MCPs are now off by default, available only via their
  single opt-in plugin. Backup: ~/.claude/backups-claude-json-<ts>.bak
- Removed 5 redundant marketplaces via `claude plugin marketplace remove` (nothing enabled
  from any): ccm, claude-plugins-official, trailofbits, visual-explainer-marketplace,
  webgpu-threejs-tsl — all mirrored in rushy or collision sources. Kept rushy + the two
  unique Ramco work marketplaces. Eliminated 4 cross-marketplace plugin dupes
  (claude-md-management, frontend-design, playwright, skill-creator).
- Removed 1 dangling dead enable entry (mirror-kotlin-...-75d3ff0b@rushy, plugin deleted
  2026-07-25). Backups: known_marketplaces/installed_plugins/settings .bak-<ts>
- Updated all installed rushy plugins to the bumped versions, then pruned 44 stale cache
  version dirs + 4 removed-marketplace cache dirs (~31 MB).

**Left as-is (user's explicit boundary "don't configure my enablements"):** figma, playwright,
chrome-devtools-mcp plugins remain enabled — deliberate dev-tool choices, now single-sourced.
Flagged for the user: `claude plugin disable <name>@rushy` to reach zero MCPs.
