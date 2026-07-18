# ios-dev-skills (curated composite)

Assembled 2026-07-18 via `npx skills find ios|xcode|swift` + source sweeps.
Non-repeating against the swiftui-skills plugin (SwiftUI UI skills live there).

| Skill | Upstream | Installs |
|---|---|---|
| xcode-project-setup | firebase/agent-skills | 67.1K |
| mobile-ios-design | wshobson/agents (plugins/ui-design) | 18.8K |
| swift-concurrency | avdlee/swift-concurrency-agent-skill | 13.7K |
| xcode-build-{orchestrator,fixer,project-analyzer,compilation-analyzer,benchmark} | avdlee/xcode-build-optimization-agent-skill | ~2.8K each |
| ios-{accessibility,networking,localization} | dpearson2699/swift-ios-skills | ~3K each |
| ios-debugger-agent (needs XcodeBuildMCP), app-store-changelog | dimillian/skills | — |

Excluded: wondelai ios-hig-design (overlaps mobile-ios-design, lower installs),
dpearson2699 swift-concurrency (name/domain repeat of avdlee's higher-install one),
clerk-swift + argent-ios-simulator-setup + rivetkit (vendor-tool SDKs),
swift-mcp-server-generator (not iOS app dev), dimillian macos-* (macOS).
