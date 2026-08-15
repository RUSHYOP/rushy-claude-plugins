# rapids-mcp

Ramco RAPIDS MCP.

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["rapids-mcp@rushy"] = true

# Grok
grok plugin install rapids-mcp --trust   # from rushy marketplace
# or: grok plugin enable rapids-mcp

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `rapids-mcp`

# Gemini CLI / Antigravity
gemini extensions link plugins/rapids-mcp
# or: ./scripts/apply-gemini.sh --enable rapids-mcp
```

## Required env

`RAPIDS_MCP_TOKEN`

Set in `~/.claude/settings.json` `env`, your shell, or the Gemini extension settings prompt.

## Notes

Internal pearl.com network. Token from RAPIDS_MCP_TOKEN — never commit the real value.

