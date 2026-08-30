# mistakes.md — rushy marketplace

Append-only. Do not delete entries.

## 2026-08-15 — clean-global-configs enabled every catalog plugin

`scripts/clean-global-configs.sh` built `enabledPlugins` from every name in
`marketplace.json`, including entries with `metadata.defaultEnabled: false`
(full cyber pack, visual-explainer, MCP plugins, …). That defeated opt-in.

**Correction:** only default-on plugins are set `true`; opt-in names are written
`false` explicitly so apply/clean cannot silently turn them on.

## 2026-08-15 — merge treated a missing `disabled` key as off

Cursor's `~/.cursor/mcp.json` had `nebulastudio-mcp` with no `disabled` field
(meaning on). The first merge used `prev.get("disabled") is False`, so a missing
key looked off and flipped a working server off.

**Correction:** treat only explicit `disabled: true` as off
(`disabled is not True`). Restored Cursor's nebulastudio-mcp to on.

## 2026-08-15 — apply-mcp used to merge the whole catalog into ~/.claude.json

The previous `apply-mcp.sh` overwrote every key in `~/.claude.json` mcpServers
with the catalog. That is how internal URLs and (if someone had inlined them)
secrets could spread, and it forced servers on.

**Correction:** apply default is adapters-only (Cursor/Gemini disabled merge +
Grok TOML fragment). Claude live config is touched only with `--target claude
--enable NAME`, and only placeholders are written.

## 2026-08-30 — Shipped skill deletions without version bumps

**Error:** Commit `85c9c4f` (2026-07-25) deleted duplicate skills from `better-ux-quality`
and `react-native-skills` but did not bump either plugin's `version`. Same for 10 other local
plugins across 36 commits.

**Consequence:** The version-keyed plugin cache never refetched. `better-ux-quality:frontend-design`,
`company-logos`, and `solar-duotone-bold` kept loading in live sessions for 5 weeks after
deletion, colliding with `frontend-design@rushy`. The audit looked done but had zero effect.

**Correction:** Bumped all 12 affected plugins in `plugin.json` + `marketplace.json`, and added
`scripts/check-plugin-versions.sh` to fail the build when Claude-relevant plugin paths change
without a version bump.

**Also recorded (my error this session):** first version-bump attempt rewrote each `plugin.json`
via `json.dump`, reformatting inline `author` objects across 5 files — unrequested churn against
rule 3. Reverted and redid the edits as version-line-only substitutions.
