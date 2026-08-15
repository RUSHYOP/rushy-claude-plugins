# pdf-reader

PDF read / search / OCR.

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["pdf-reader@rushy"] = true

# Grok
grok plugin install pdf-reader --trust   # from rushy marketplace
# or: grok plugin enable pdf-reader

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `pdf-reader`

# Gemini CLI / Antigravity
gemini extensions link plugins/pdf-reader
# or: ./scripts/apply-gemini.sh --enable pdf-reader
```

