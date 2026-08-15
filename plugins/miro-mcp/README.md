# miro-mcp

Miro boards via official remote MCP.

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["miro-mcp@rushy"] = true

# Grok
grok plugin install miro-mcp --trust   # from rushy marketplace
# or: grok plugin enable miro-mcp

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `miro-mcp`

# Gemini CLI / Antigravity
gemini extensions link plugins/miro-mcp
# or: ./scripts/apply-gemini.sh --enable miro-mcp
```

## Notes

OAuth on first connect. Discovered from a Claude project config.

