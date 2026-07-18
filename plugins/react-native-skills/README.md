# react-native-skills (curated composite)

Started as a vendored copy of vercel-labs' react-native skill; expanded
2026-07-18 via `npx skills find "react native"|expo|...` into a curated set:

| Skill | Upstream | Installs |
|---|---|---|
| vercel-react-native-skills | vercel-labs/agent-skills | 168.3K |
| react-native-best-practices | callstackincubator/agent-skills (RN core contributors; ships reference screenshots) | 20.2K |
| react-native-design | wshobson/agents (plugins/ui-design) | 12K |
| react-native-architecture | wshobson/agents (plugins/frontend-mobile-development) | 11.6K |
| upgrading-react-native | callstackincubator/agent-skills | 6.9K |
| expo-react-native-performance | pproenca/dot-skills (skills/.experimental) | 1.1K |

Excluded: expo/skills family (a proper plugin of its own — add it whole via
add-plugin.sh --path plugins/expo rather than piecemeal here; expo-ui already
lives in swiftui-skills), argent-react-native-app-workflow (vendor tool),
sub-1K duplicates (alinaqi, secondsky, tristanmanchester, gigs-slc, han),
ruvnet agent-spec-mobile-react-native (agent spec, not RN dev).

Refresh: re-clone upstreams and re-copy each skill dir.
