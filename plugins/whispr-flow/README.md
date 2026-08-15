# whispr-flow

Wispr Flow voice-to-text MCP (HTTP). OAuth on first connect.

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["whispr-flow@rushy"] = true

# Grok
grok plugin install whispr-flow --trust   # from rushy marketplace
# or: grok plugin enable whispr-flow

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `whispr-flow`

# Gemini CLI / Antigravity
gemini extensions link plugins/whispr-flow
# or: ./scripts/apply-gemini.sh --enable whispr-flow
```

## Notes

Claude listed this as 'whispr flow' (space). Plugin/server name is hyphenated so Grok/Cursor accept it.

