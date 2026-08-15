# mcp-uds-server

Ramco UDS GraphQL MCP.

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["mcp-uds-server@rushy"] = true

# Grok
grok plugin install mcp-uds-server --trust   # from rushy marketplace
# or: grok plugin enable mcp-uds-server

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `mcp-uds-server`

# Gemini CLI / Antigravity
gemini extensions link plugins/mcp-uds-server
# or: ./scripts/apply-gemini.sh --enable mcp-uds-server
```

## Notes

Internal pearl.com network.

