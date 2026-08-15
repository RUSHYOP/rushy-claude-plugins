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
