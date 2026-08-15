# obsidian

Read/search a local Obsidian vault.

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["obsidian@rushy"] = true

# Grok
grok plugin install obsidian --trust   # from rushy marketplace
# or: grok plugin enable obsidian

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `obsidian`

# Gemini CLI / Antigravity
gemini extensions link plugins/obsidian
# or: ./scripts/apply-gemini.sh --enable obsidian
```

## Required env

`OBSIDIAN_VAULT_PATH`

Set in `~/.claude/settings.json` `env`, your shell, or the Gemini extension settings prompt.

## Notes

Set OBSIDIAN_VAULT_PATH to the absolute vault directory.

