# Plugin skill audit (non-cyber)

Generated: 2026-07-25 UTC

Companion to Option B cut of `cybersecurity-skills` → `cybersecurity-core`.

## Summary

Unlike the 817-skill cyber catalog, **most other plugins are already lean** (1–30 skills)
with low pairwise content overlap. The bigger problems are:

1. **Always-on specialist packs** competing for skill routing
2. **Duplicate catalog entries** from CLI imports
3. A few **within-plugin** near-duplicates / micro-skills

## Catalog-level decisions (applied)

| Plugin | Action | Why |
|--------|--------|-----|
| `mirror-kotlin-kotlin-agent-skills-75d3ff0b` | **Removed** | Duplicate of `kotlin-agent-skills` (whole-repo vs `plugins/kotlin-agent-skills` path) |
| `testing-handbook-skills` | **Opt-in** | 15 fuzzing/ASan tools — only for harness work |
| `webgpu-threejs-tsl` | **Opt-in** | Niche WebGPU |
| `i-have-adhd` | **Opt-in** | Personal productivity, not default engineering |
| `visual-explainer` | **Opt-in** | Diagrams/slides when requested |
| `cybersecurity-skills` | Opt-in (already) | Use `cybersecurity-core` |

## First-party skill drops (applied)

| Plugin | Dropped | Why |
|--------|---------|-----|
| `react-native-skills` | `vercel-react-native-skills` | Overlaps `expo-react-native-performance` + `react-native-best-practices` |
| `better-ux-quality` | `frontend-design` | Prefer standalone `frontend-design@rushy` (more complete) |
| `better-ux-quality` | `company-logos`, `solar-duotone-bold` | Micro icon-style prefs; low routing value |

## Per-plugin recommendations (no further cuts applied)

### Keep as-is (tight, distinct)

| Plugin | Skills | Notes |
|--------|-------:|-------|
| `ramco-brain` | 5 | Journey pipeline; `reindex`/`sync` related but different ops — keep both |
| `vizuara` | 3 | Report stack; `vizuara-report` orchestrates the other two |
| `agent-tooling` | 6 | Orthogonal tools; **shadcn** overlaps Vercel plugin shadcn (J≈0.28) — prefer agent-tooling for components, Vercel for platform |
| `android-dev-skills` | 4 | Architecture/Kotlin patterns — distinct from `android-skills` product APIs |
| `android-skills` | 20 | Product/API skills (CameraX, Wear, Perfetto…) — **do not merge**; each is a different surface |
| `r3f` | 12 | Topic modules + `brain-viz-renderer` project skill — modular by design |
| `static-analysis` | 3 | Semgrep/CodeQL/SARIF — keep |
| ToB singles | 1 each | `sharp-edges`, `differential-review`, etc. — fine-grained routing is good |

### Merge candidates (optional later)

| Plugin | Merge idea | Priority |
|--------|------------|----------|
| `better-ux-quality` | `landing-page` + `pricing-page` + parts of `copywriting` → `marketing-pages` | Medium — J≈0.30–0.33 but different page types |
| `better-ux-quality` | `design-taste-frontend` + `redesign-existing-projects` | Low — related, different trigger |
| `ios-dev-skills` | Xcode build suite (`benchmark`/`fixer`/`orchestrator`/`compilation-analyzer`/`project-analyzer`) | Low — orchestrator already fans out; keep separate for triggers |
| `swiftui-skills` | `swiftui-expert-skill` + `swiftui-pro` | Low — review vs expert guidance; J low |
| `react-native-skills` | `expo-react-native-performance` + `react-native-best-practices` | Low–medium — overlapping performance guidance |
| `vercel` (30) | Platform surface area is large; consider opt-in for whole plugin if not on Vercel daily | Medium at **plugin** level |

### Cross-plugin domain collisions

| Domain | Plugins | Prefer |
|--------|---------|--------|
| Frontend aesthetics | `better-ux-quality`, `frontend-design` | Both: better-ux for systems/marketing; frontend-design for one-shot UI |
| shadcn | `agent-tooling`, `vercel` | `agent-tooling` for components; Vercel for deploy/env |
| RN performance | (was 3, now 2 after drop) | `react-native-best-practices` + `expo-react-native-performance` |
| Planning/execution | `superpowers`, `claude-mem` | superpowers = TDD/debug/subagents; claude-mem = memory/plans/search — keep both |
| AppSec code | ToB plugins + `cybersecurity-core` | ToB for code; cyber-core for SOC/IR |
| Kotlin | `kotlin-agent-skills`, `android-dev-skills` | JetBrains tooling vs Android arch patterns — keep both |
| 3D web | `r3f`, `webgpu-threejs-tsl` | r3f default; WebGPU opt-in |

### Vercel plugin (30 skills)

Not skill-merged here. Skills are mostly distinct platform areas (CLI, env, firewall, AI SDK…).
If you do not use Vercel daily → set `vercel@rushy` **opt-in** as well (not applied by default).

### Claude-mem (17) / Superpowers (14)

Process plugins with different jobs. Do **not** merge. Optional: disable `claude-mem` if you do not use persistent memory.

### Figma (12)

MCP-oriented skills with required load order (`figma-use` before tools). Keep full set when using Figma.

### Chrome DevTools MCP

Real skills under `skills/` (~6): a11y, LCP, memory-leak, chrome-devtools, cli, troubleshooting.
Ignore accidental skills pulled from `node_modules/chrome-devtools-frontend` — those are Chromium contributor skills, not yours.

## Estimated routing load (enabled skill descriptions)

Rough order of magnitude after this pass (excluding ramco-ai-native-sdlc):

- cyber-core ~81 + first-party ~90 + ToB ~10 + process ~30 + platform (vercel/figma if on) ~40
- Full cyber 817 remains off

## Actions log this run

- OPT-IN (defaultEnabled=false): i-have-adhd
- REMOVE catalog entry: mirror-kotlin-kotlin-agent-skills-75d3ff0b
- OPT-IN (defaultEnabled=false): testing-handbook-skills
- OPT-IN (defaultEnabled=false): visual-explainer
- OPT-IN (defaultEnabled=false): webgpu-threejs-tsl
- DROP skill dir: plugins/react-native-skills/skills/vercel-react-native-skills
- DROP skill dir: plugins/better-ux-quality/skills/company-logos
- DROP skill dir: plugins/better-ux-quality/skills/solar-duotone-bold
- DROP skill dir: plugins/better-ux-quality/skills/frontend-design
