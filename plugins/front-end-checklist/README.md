# front-end-checklist (vendored skills)

Installable skill pack from [`thedaviddias/Front-End-Checklist`](https://github.com/thedaviddias/Front-End-Checklist)
(`npx skills add thedaviddias/front-end-checklist`).

This is the **skills** plugin. The hosted MCP lives separately as
`frontend-checklist@rushy` (`https://mcp.frontendchecklist.io`). The global
skill (`frontend-checklist-global`) tells agents to retrieve rules via that
MCP instead of recalling all 390 from memory.

**Default: OFF** (`defaultEnabled: false`). Enabling this plugin registers
hundreds of per-rule skills and will crowd skill routing. Prefer the MCP for
day-to-day review; turn this plugin on when you want the Skills.sh pack
available as `front-end-checklist@rushy`.

## Enable

```bash
# Claude — after rushy marketplace is registered
# enabledPlugins["front-end-checklist@rushy"] = true

# Grok
grok plugin install front-end-checklist --trust

# Cursor
./scripts/apply-cursor.sh
```

## Refresh from upstream

```bash
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/thedaviddias/Front-End-Checklist.git /tmp/fec
git -C /tmp/fec sparse-checkout set skills
rm -rf plugins/front-end-checklist/skills
cp -R /tmp/fec/skills plugins/front-end-checklist/skills
```
