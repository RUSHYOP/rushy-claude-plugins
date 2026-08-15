# shadcn

shadcn/ui registry MCP.

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["shadcn@rushy"] = true

# Grok
grok plugin install shadcn --trust   # from rushy marketplace
# or: grok plugin enable shadcn

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `shadcn`

# Gemini CLI / Antigravity
gemini extensions link plugins/shadcn
# or: ./scripts/apply-gemini.sh --enable shadcn
```

## Notes

From ~/.mcp.json. Complements agent-tooling's shadcn skill; this plugin is the MCP server only.

