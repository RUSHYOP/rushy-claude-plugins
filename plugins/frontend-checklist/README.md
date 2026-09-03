# frontend-checklist

Front-End Checklist rules MCP (HTML/CSS/JS/React/a11y/perf/SEO).

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["frontend-checklist@rushy"] = true

# Grok
grok plugin install frontend-checklist --trust   # from rushy marketplace
# or: grok plugin enable frontend-checklist

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `frontend-checklist`

# Gemini CLI / Antigravity
gemini extensions link plugins/frontend-checklist
# or: ./scripts/apply-gemini.sh --enable frontend-checklist
```

## Notes

Remote HTTP MCP. Use for frontend review, accessibility, performance, SEO, and launch-readiness. Docs: https://frontendchecklist.io/en/mcp

