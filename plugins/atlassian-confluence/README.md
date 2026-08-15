# atlassian-confluence

Atlassian Confluence / Jira via official remote MCP.

Generated from `config/mcp-servers.json`. Do not edit by hand —
re-run `./scripts/generate-mcp-plugins.sh`.

**Default: OFF.** Enable only the servers you need.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["atlassian-confluence@rushy"] = true

# Grok
grok plugin install atlassian-confluence --trust   # from rushy marketplace
# or: grok plugin enable atlassian-confluence

# Cursor
./scripts/apply-cursor.sh
# then enable the local plugin `atlassian-confluence`

# Gemini CLI / Antigravity
gemini extensions link plugins/atlassian-confluence
# or: ./scripts/apply-gemini.sh --enable atlassian-confluence
```

## Required env

`ATLASSIAN_SITE`

Set in `~/.claude/settings.json` `env`, your shell, or the Gemini extension settings prompt.

## Notes

ATLASSIAN_SITE is the site origin, e.g. https://yourorg.atlassian.net. OAuth is interactive on first use.

