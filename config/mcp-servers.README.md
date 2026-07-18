# MCP servers (single maintained config)

`config/mcp-servers.json` is the one place RUSHYOP's MCP servers are defined.
It is **not** a plugin — it's a plain `mcpServers` block you apply to a machine
or drop into a project.

## Apply

```bash
# Merge every server into ~/.claude.json (user scope, all projects):
./scripts/apply-mcp.sh

# ...or into a specific project's .mcp.json:
./scripts/apply-mcp.sh --project /path/to/repo
```

Re-running is idempotent (keys are overwritten, not duplicated). To use in a
project by hand, copy the `mcpServers` object into that repo's `.mcp.json`.

## Servers & required env

Machine/org-specific and secret values are `${ENV_VAR}` placeholders, resolved
by the MCP client at launch. Set them in `~/.claude/settings.json`'s `env`
block (or your shell). **No secrets are committed here.**

| Server | Transport | Required env | Notes |
|---|---|---|---|
| `obsidian` | stdio | `OBSIDIAN_VAULT_PATH` | Absolute path to your Obsidian vault. |
| `atlassian-confluence` | stdio | `ATLASSIAN_SITE` | e.g. `https://yourorg.atlassian.net`. OAuth is interactive on first use. |
| `pdf-reader` | stdio | — | PDF read/search/OCR. |
| `nebulastudio-mcp` | http | — | Ramco NebulaStudio (UAT). Ramco network. |
| `playwright` | stdio | — | Browser automation. NB: the `playwright@rushy` plugin also ships this — don't run both. |
| `rapids-mcp` | http | `RAPIDS_MCP_TOKEN` | Ramco RAPIDS. Internal (`pearl.com`) network. |
| `mcp-uds-server` | http | — | Ramco UDS. Internal (`pearl.com`) network. |

## Maintain

Edit `config/mcp-servers.json` — that's the source of truth. Add a server there,
document its env in the table above, commit. The old approach (one plugin per
server under `plugins/mcp-*`) was removed in favor of this single file.
