# excalidraw

Excalidraw hosted MCP (diagrams).

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["excalidraw@rushy"] = true

# Grok
grok plugin install excalidraw --trust   # from rushy marketplace
# or: grok plugin enable excalidraw

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `excalidraw`

# Gemini CLI / Antigravity
gemini extensions link plugins/excalidraw
# or: ./scripts/apply-gemini.sh --enable excalidraw
```

## Required env

`EXCALIDRAW_MCP_TOKEN`

Set in `~/.claude/settings.json` `env`, your shell, or the Gemini extension settings prompt.

## Notes

Distinct from first-party plugin excalidraw-pages (HTML pages). Token via EXCALIDRAW_MCP_TOKEN.

