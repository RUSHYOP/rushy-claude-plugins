# rxds-figma-mcp

Local RXDS Figma MCP (Ramco design-system components).

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["rxds-figma-mcp@rushy"] = true

# Grok
grok plugin install rxds-figma-mcp --trust   # from rushy marketplace
# or: grok plugin enable rxds-figma-mcp

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `rxds-figma-mcp`

# Gemini CLI / Antigravity
gemini extensions link plugins/rxds-figma-mcp
# or: ./scripts/apply-gemini.sh --enable rxds-figma-mcp
```

## Required env

`RXDS_FIGMA_MCP_ENTRY`, `FIGMA_ACCESS_TOKEN`, `RXDS_COMPONENTS_PATH`, `RXDS_FIGMA_MCP_CONFIG`

Set in `~/.claude/settings.json` `env`, your shell, or the Gemini extension settings prompt.

## Notes

Machine-local server. RXDS_FIGMA_MCP_ENTRY is the compiled entry (e.g. /path/to/rxds-figma-mcp/dist/mcp/index.js). Not useful to consumers without that checkout.

