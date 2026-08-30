# Upstream plugin catalog (mirrored)

Install **source** = **public** `RUSHYOP/mirror-*` repo (always available,
clonable by anyone without credentials).
Refresh from real upstream with `./scripts/sync-mirrors.sh`.
Verify every mirror is public with `./scripts/audit-mirror-visibility.sh`.
Import newly enabled Claude plugins with `./scripts/import-from-claude.sh`.
Rebuild first-party list from `plugins/` with `./scripts/rebuild-marketplace.sh`.

| Plugin | Install from (mirror) | Upstream (sync from) |
|--------|----------------------|----------------------|
| `agentic-actions-auditor` | https://github.com/RUSHYOP/mirror-trailofbits-skills.git → `plugins/agentic-actions-auditor` @main | https://github.com/trailofbits/skills.git |
| `chrome-devtools-mcp` | https://github.com/RUSHYOP/mirror-chromedevtools-chrome-devtools-mcp.git @main | https://github.com/ChromeDevTools/chrome-devtools-mcp.git |
| `claude-md-management` | https://github.com/RUSHYOP/mirror-claude-plugins-official.git → `plugins/claude-md-management` @main | https://github.com/anthropics/claude-plugins-official.git |
| `claude-mem` | https://github.com/RUSHYOP/mirror-claude-mem.git → `plugin` @main | https://github.com/thedotmack/claude-mem.git |
| `cybersecurity-skills` | https://github.com/RUSHYOP/mirror-anthropic-cybersecurity-skills.git @main | https://github.com/mukul975/Anthropic-Cybersecurity-Skills.git |
| `differential-review` | https://github.com/RUSHYOP/mirror-trailofbits-skills.git → `plugins/differential-review` @main | https://github.com/trailofbits/skills.git |
| `figma` | https://github.com/RUSHYOP/mirror-figma-mcp-server-guide.git @main | https://github.com/figma/mcp-server-guide.git |
| `frontend-design` | https://github.com/RUSHYOP/mirror-claude-plugins-official.git → `plugins/frontend-design` @main | https://github.com/anthropics/claude-plugins-official.git |
| `greptile` | https://github.com/RUSHYOP/mirror-claude-plugins-official.git → `external_plugins/greptile` @main | https://github.com/anthropics/claude-plugins-official.git |
| `i-have-adhd` | https://github.com/RUSHYOP/mirror-ayghri-i-have-adhd.git → `skills/i-have-adhd` @main | https://github.com/ayghri/i-have-adhd.git |
| `insecure-defaults` | https://github.com/RUSHYOP/mirror-trailofbits-skills.git → `plugins/insecure-defaults` @main | https://github.com/trailofbits/skills.git |
| `kotlin-agent-skills` | https://github.com/RUSHYOP/mirror-kotlin-kotlin-agent-skills.git → `plugins/kotlin-agent-skills` @main | https://github.com/Kotlin/kotlin-agent-skills.git |
| `playwright` | https://github.com/RUSHYOP/mirror-claude-plugins-official.git → `external_plugins/playwright` @main | https://github.com/anthropics/claude-plugins-official.git |
| `python-development` | https://github.com/RUSHYOP/mirror-wshobson-agents.git → `plugins/python-development` @main | https://github.com/wshobson/agents.git |
| `semgrep-rule-creator` | https://github.com/RUSHYOP/mirror-trailofbits-skills.git → `plugins/semgrep-rule-creator` @main | https://github.com/trailofbits/skills.git |
| `sharp-edges` | https://github.com/RUSHYOP/mirror-trailofbits-skills.git → `plugins/sharp-edges` @main | https://github.com/trailofbits/skills.git |
| `skill-creator` | https://github.com/RUSHYOP/mirror-claude-plugins-official.git → `plugins/skill-creator` @main | https://github.com/anthropics/claude-plugins-official.git |
| `static-analysis` | https://github.com/RUSHYOP/mirror-trailofbits-skills.git → `plugins/static-analysis` @main | https://github.com/trailofbits/skills.git |
| `superpowers` | https://github.com/RUSHYOP/mirror-superpowers.git @main | https://github.com/obra/superpowers.git |
| `supply-chain-risk-auditor` | https://github.com/RUSHYOP/mirror-trailofbits-skills.git → `plugins/supply-chain-risk-auditor` @main | https://github.com/trailofbits/skills.git |
| `testing-handbook-skills` | https://github.com/RUSHYOP/mirror-trailofbits-skills.git → `plugins/testing-handbook-skills` @main | https://github.com/trailofbits/skills.git |
| `vercel` | https://github.com/RUSHYOP/mirror-vercel-vercel-plugin.git @main | https://github.com/vercel/vercel-plugin.git |
| `visual-explainer` | https://github.com/RUSHYOP/mirror-visual-explainer.git → `plugins/visual-explainer` @main | https://github.com/nicobailon/visual-explainer.git |
| `web-quality` | https://github.com/RUSHYOP/mirror-addyosmani-web-quality-skills.git @main | https://github.com/addyosmani/web-quality-skills.git |
| `webgpu-threejs-tsl` | https://github.com/RUSHYOP/mirror-webgpu-claude-skill.git @main | https://github.com/dgreenheck/webgpu-claude-skill.git |

## First-party

- `agent-tooling` → `./plugins/agent-tooling`
- `android-skills` → `./plugins/android-skills`
- `atlassian-confluence` → `./plugins/atlassian-confluence`
- `better-ux-quality` → `./plugins/better-ux-quality`
- `cybersecurity-core` → `./plugins/cybersecurity-core`
- `design-collections` → `./plugins/design-collections`
- `excalidraw` → `./plugins/excalidraw`
- `excalidraw-pages` → `./plugins/excalidraw-pages`
- `ios-dev-skills` → `./plugins/ios-dev-skills`
- `marketplace-ops` → `./plugins/marketplace-ops`
- `mcp-uds-server` → `./plugins/mcp-uds-server`
- `miro-mcp` → `./plugins/miro-mcp`
- `nebulastudio-mcp` → `./plugins/nebulastudio-mcp`
- `obsidian` → `./plugins/obsidian`
- `pdf-reader` → `./plugins/pdf-reader`
- `r3f` → `./plugins/r3f`
- `ramco-brain` → `./plugins/ramco-brain`
- `rapids-mcp` → `./plugins/rapids-mcp`
- `react-native-skills` → `./plugins/react-native-skills`
- `rxds-figma-mcp` → `./plugins/rxds-figma-mcp`
- `shadcn` → `./plugins/shadcn`
- `skill-doctor` → `./plugins/skill-doctor`
- `swiftui-skills` → `./plugins/swiftui-skills`
- `vizuara` → `./plugins/vizuara`
- `whispr-flow` → `./plugins/whispr-flow`
