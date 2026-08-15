# nebulastudio-mcp

Ramco Nebula Studio (UAT) MCP.

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["nebulastudio-mcp@rushy"] = true

# Grok
grok plugin install nebulastudio-mcp --trust   # from rushy marketplace
# or: grok plugin enable nebulastudio-mcp

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `nebulastudio-mcp`

# Gemini CLI / Antigravity
gemini extensions link plugins/nebulastudio-mcp
# or: ./scripts/apply-gemini.sh --enable nebulastudio-mcp
```

## Notes

Requires Ramco network access.

