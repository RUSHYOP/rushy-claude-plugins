# MCP servers (catalog → opt-in plugins)

`config/mcp-servers.json` is the one place RUSHYOP's MCP servers are defined.

Each server is also projected into a **first-party marketplace plugin**
(`plugins/<name>/`) so Claude, Grok, Cursor, and Gemini can install it. Every
MCP plugin is **`defaultEnabled: false`** — off until you turn that one on.

`playwright` is catalog-only (`skipPlugin`): `playwright@rushy` already ships
the MCP. Do not run both.

## Apply (still off)

```bash
# Generate plugins + merge disabled servers into Cursor + Gemini configs
./scripts/apply-mcp.sh

# Wire this repo as a plugin source on every local harness
./scripts/apply-global.sh --all

# Turn ONE server on in Cursor/Gemini (placeholders only — no secrets written)
./scripts/apply-mcp.sh --enable pdf-reader

# Gemini CLI (if installed): link each extension directory
./scripts/apply-gemini.sh --link
```

Re-running is idempotent. `${ENV_VAR}` placeholders are never expanded.

## Enable a plugin (per tool)

| Tool | How |
|---|---|
| Claude | `enabledPlugins["<name>@rushy"] = true` after marketplace `rushy` is registered |
| Grok | `grok plugin marketplace add RUSHYOP/rushy-claude-plugins` then `grok plugin enable <name>` (or install `--trust`) |
| Cursor | `./scripts/apply-cursor.sh` then enable the local plugin |
| Gemini / Antigravity | `gemini extensions link plugins/<name>` or `./scripts/apply-gemini.sh --enable <name>` |

## Servers & required env

Machine/org-specific and secret values are `${ENV_VAR}` placeholders, resolved
at launch. Set them in `~/.claude/settings.json`'s `env` block (or your shell).
**No secrets are committed here.**

| Server / plugin | Transport | Required env | Default | Notes |
|---|---|---|---|---|
| `whispr-flow` | http | — | off | Claude named this `whispr flow`; hyphenated for Grok. OAuth on connect. |
| `obsidian` | stdio | `OBSIDIAN_VAULT_PATH` | off | Absolute vault path. |
| `atlassian-confluence` | stdio | `ATLASSIAN_SITE` | off | e.g. `https://yourorg.atlassian.net`. OAuth on first use. |
| `pdf-reader` | stdio | — | off | PDF read/search/OCR. |
| `nebulastudio-mcp` | http | — | off | Ramco NebulaStudio (UAT). Ramco network. |
| `playwright` | stdio | optional `PLAYWRIGHT_USER_DATA_DIR` | off | Catalog only — use `playwright@rushy`. |
| `mcp-uds-server` | http | — | off | Ramco UDS. Internal (`pearl.com`). |
| `rapids-mcp` | http | `RAPIDS_MCP_TOKEN` | off | Ramco RAPIDS. Internal. |
| `excalidraw` | http | `EXCALIDRAW_MCP_TOKEN` | off | Hosted Excalidraw MCP. Not `excalidraw-pages`. |
| `miro-mcp` | stdio | — | off | Official Miro remote MCP. OAuth. |
| `shadcn` | stdio | — | off | `npx shadcn@latest mcp`. |
| `frontend-checklist` | http | — | off | Remote `https://mcp.frontendchecklist.io`. Frontend review / a11y / perf / SEO. |
| `rxds-figma-mcp` | stdio | `RXDS_FIGMA_MCP_ENTRY`, `FIGMA_ACCESS_TOKEN`, `RXDS_COMPONENTS_PATH`, `RXDS_FIGMA_MCP_CONFIG` | off | Local RXDS server; not portable without that checkout. |

## This repo as a plugin marketplace

| Tool | Manifest | Register |
|---|---|---|
| Claude Code | `.claude-plugin/marketplace.json` | `extraKnownMarketplaces.rushy` → `RUSHYOP/rushy-claude-plugins` |
| Grok | `.grok-plugin/marketplace.json` (also accepts Claude path) | `grok plugin marketplace add RUSHYOP/rushy-claude-plugins` or local path |
| Cursor | `.cursor-plugin/marketplace.json` | `./scripts/apply-cursor.sh` or Dashboard import of this GitHub repo |
| Gemini CLI | per-plugin `gemini-extension.json` | `./scripts/apply-gemini.sh` / `gemini extensions link plugins/<name>` |

## Maintain

1. Edit `config/mcp-servers.json` (runtime fields + `_rushy` metadata).
2. `./scripts/generate-mcp-plugins.sh --rebuild`
3. Commit. Do not hand-edit `plugins/<mcp-name>/` — they are generated.

The old "MCP is not a plugin" rule is replaced by: **one catalog file,
generated opt-in plugins, never on by default.**
