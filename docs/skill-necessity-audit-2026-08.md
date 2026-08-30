# Skill necessity audit — 2026-08-30

**Method (user's test):** for each of the 171 skills, ask — *if this skill did not
exist and I were prompted to handle that aspect, would I do it confidently and
currently-correctly?* If **yes**, the skill is redundant with the base model and is
**deleted**. A skill is **kept** only when it clears one of three bars:

1. **Org/project-specific** — encodes this repo's or Ramco's own systems/pipelines.
2. **Exact contract I can't reproduce** — precise value stacks, CLI flags, mapping
   tables, or command cheat-sheets I would otherwise guess at.
3. **Post-cutoff / churning API** — where my confidence outruns my accuracy
   (Android product APIs, Swift 6 / iOS 26, drei/three specifics).

**Result: 106 deleted, 65 kept.** One revert restores everything (single commit).

## Deleted (106) — redundant with the base model

### agent-tooling — 2 deleted
_Conventional commits and skill discovery are things I do unaided._

- `find-skills`
- `git-commit`

### android-dev-skills — 4 deleted
_Clean architecture, coroutines/Flow, Kotlin idioms and Material basics are stable knowledge I apply confidently — this plugin is now empty and is a whole-plugin removal candidate._

- `android-clean-architecture`
- `kotlin-coroutines-flows`
- `kotlin-patterns`
- `mobile-android-design`

### android-skills — 2 deleted
_XML→Compose migration and test setup are standard tasks; the version-specific product APIs in this plugin were kept._

- `migrate-xml-views-to-jetpack-compose`
- `testing-setup`

### better-ux-quality — 9 deleted
_Copywriting, landing/pricing page structure, SEO, GSAP, motion principles and redesign are general craft I have. (Kept only the two exact-value skills: beautiful-shadows, css-border-gradient.) Supersedes the July audit's 'keep' on the marketing-page skills under the stricter test._

- `animation-systems`
- `copywriting`
- `design-taste-frontend`
- `gsap-scrolltrigger-storytelling`
- `landing-page`
- `optimize-web-animations`
- `pricing-page`
- `redesign-existing-projects`
- `seo-audit`

### cybersecurity-core — 71 deleted
_Bulk-generated methodology (81/81 identical boilerplate, single author): detection logic, IR playbooks and web/AD attack techniques are knowledge I have. Kept only the 10 skills whose reference file is a real, non-obvious tool command cheat-sheet._

- `abusing-dpapi-for-credential-access`
- `abusing-shadow-credentials-for-privesc`
- `analyzing-active-directory-acl-abuse`
- `analyzing-azure-activity-logs-for-threats`
- `analyzing-indicators-of-compromise`
- `auditing-azure-active-directory-configuration`
- `auditing-kubernetes-cluster-rbac`
- `building-ransomware-playbook-with-cisa-framework`
- `collecting-open-source-intelligence`
- `conducting-api-security-testing`
- `conducting-cloud-incident-response`
- `conducting-cyber-risk-assessment-with-nist-800-30`
- `conducting-network-penetration-test`
- `conducting-phishing-incident-response`
- `configuring-windows-event-logging-for-detection`
- `containing-active-breach`
- `defending-llms-with-guardrails`
- `detecting-ai-model-prompt-injection-attacks`
- `detecting-anomalous-authentication-patterns`
- `detecting-aws-cloudtrail-anomalies`
- `detecting-aws-iam-privilege-escalation`
- `detecting-azure-service-principal-abuse`
- `detecting-beaconing-patterns-with-zeek`
- `detecting-business-email-compromise`
- `detecting-cloud-threats-with-guardduty`
- `detecting-command-and-control-over-dns`
- `detecting-container-escape-attempts`
- `detecting-credential-dumping-techniques`
- `detecting-dcsync-attack-in-active-directory`
- `detecting-golden-ticket-attacks-in-kerberos-logs`
- `detecting-indirect-prompt-injection`
- `detecting-kerberoasting-attacks`
- `detecting-lateral-movement-in-network`
- `detecting-living-off-the-land-attacks`
- `detecting-ntlm-relay-with-event-correlation`
- `detecting-oauth-token-theft`
- `detecting-pass-the-hash-attacks`
- `detecting-pass-the-ticket-attacks`
- `detecting-ransomware-encryption-behavior`
- `detecting-supply-chain-attacks-in-ci-cd`
- `detecting-suspicious-powershell-execution`
- `detecting-typosquatting-packages`
- `executing-red-team-engagement-planning`
- `exploiting-server-side-request-forgery`
- `exploiting-sql-injection-vulnerabilities`
- `extracting-iocs-from-malware-samples`
- `hunting-advanced-persistent-threats`
- `hunting-for-persistence-mechanisms-in-windows`
- `implementing-aws-security-hub-compliance`
- `implementing-devsecops-security-scanning`
- `implementing-dmarc-dkim-spf-email-security`
- `implementing-network-policies-for-kubernetes`
- `implementing-passwordless-authentication-with-fido2`
- `implementing-secrets-management-with-vault`
- `implementing-siem-use-cases-for-detection`
- `implementing-stix-taxii-feed-integration`
- `implementing-threat-modeling-with-mitre-attack`
- `implementing-zero-trust-network-access`
- `performing-active-directory-penetration-test`
- `performing-cloud-forensics-with-aws-cloudtrail`
- `performing-disk-forensics-investigation`
- `performing-ransomware-response`
- `performing-web-application-penetration-test`
- `remediating-s3-bucket-misconfiguration`
- `securing-github-actions-workflows`
- `testing-api-for-broken-object-level-authorization`
- `testing-for-broken-access-control`
- `testing-for-xss-vulnerabilities`
- `testing-jwt-token-security`
- `testing-oauth2-implementation-flaws`
- `triaging-security-incident-with-ir-playbook`

### ios-dev-skills — 8 deleted
_App Store changelogs, VoiceOver a11y, URLSession networking, string-catalog localization, HIG design and generic project setup/analysis are standard iOS work. Kept the Xcode build suite and Swift-6 concurrency (exact flags / post-cutoff)._

- `app-store-changelog`
- `ios-accessibility`
- `ios-debugger-agent`
- `ios-localization`
- `ios-networking`
- `mobile-ios-design`
- `xcode-project-analyzer`
- `xcode-project-setup`

### r3f — 1 deleted
_Fundamentals (Canvas, useFrame, hooks) are stable React-Three-Fiber basics; the API-specific modules (postprocessing, shaders, materials, physics, …) were kept._

- `r3f-fundamentals`

### react-native-skills — 4 deleted
_RN performance, architecture, best-practices and design are knowledge I apply confidently. Kept upgrading-react-native (version-specific breaking changes)._

- `expo-react-native-performance`
- `react-native-architecture`
- `react-native-best-practices`
- `react-native-design`

### swiftui-skills — 5 deleted
_Generic SwiftUI expertise, perf audit, refactor and UI patterns are core competence. Kept swiftui-liquid-glass (iOS 26) and expo-ui (niche)._

- `swiftui-expert-skill`
- `swiftui-performance-audit`
- `swiftui-pro`
- `swiftui-ui-patterns`
- `swiftui-view-refactor`
## Kept (65) — clears one of the three bars

### agent-tooling — 4 kept
_exact CLI/output contracts & this marketplace's design system (graphify, project-sites, shadcn, migrate-radix-to-base)._

- `graphify`
- `migrate-radix-to-base`
- `project-sites`
- `shadcn`

### android-skills — 18 kept
_Google's product APIs that churn or post-date my cutoff (CameraX, Nav3, AGP 9, edge-to-edge, Perfetto, R8, Wear, XR glasses, Play policy/billing, AppFunctions, verified-email, adaptive, styles, intent-security, android CLI flags)._

- `adaptive`
- `agp-9-upgrade`
- `android-cli`
- `android-intent-security`
- `appfunctions`
- `camerax`
- `display-glasses-with-jetpack-compose-glimmer`
- `edge-to-edge`
- `engage-sdk-integration`
- `navigation-3`
- `perfetto-sql`
- `perfetto-trace-analysis`
- `play-billing-library-version-upgrade`
- `play-policy-insights`
- `r8-analyzer`
- `styles`
- `verified-email`
- `wear-compose-m3`

### better-ux-quality — 2 kept
_exact value stacks I'd otherwise guess (beautiful-shadows, css-border-gradient)._

- `beautiful-shadows`
- `css-border-gradient`

### cybersecurity-core — 10 kept
_reference file is a real, non-obvious tool command cheat-sheet._

- `analyzing-network-traffic-with-wireshark`
- `detecting-container-runtime-threats-with-falco`
- `exploiting-adcs-with-certipy`
- `mapping-attack-paths-with-bloodhound-ce`
- `performing-malware-triage-with-yara`
- `performing-memory-forensics-with-volatility3`
- `performing-network-traffic-analysis-with-zeek`
- `performing-timeline-reconstruction-with-plaso`
- `reverse-engineering-malware-with-ghidra`
- `scanning-containers-with-trivy-in-cicd`

### design-collections — 1 kept
_this repo's warp-factory design language._

- `design-collections`

### excalidraw-pages — 1 kept
_specific Excalidraw page/scene JSON format._

- `excalidraw-page`

### ios-dev-skills — 5 kept
_exact xcodebuild flags & post-cutoff Swift 6 / Xcode 26 concurrency settings._

- `swift-concurrency`
- `xcode-build-benchmark`
- `xcode-build-fixer`
- `xcode-build-orchestrator`
- `xcode-compilation-analyzer`

### marketplace-ops — 1 kept
_this repo's own marketplace reconciliation tooling._

- `reconcile-marketplace`

### r3f — 11 kept
_drei / three / @react-three APIs I get wrong from memory._

- `brain-viz-renderer`
- `r3f-animation`
- `r3f-geometry`
- `r3f-interaction`
- `r3f-lighting`
- `r3f-loaders`
- `r3f-materials`
- `r3f-physics`
- `r3f-postprocessing`
- `r3f-shaders`
- `r3f-textures`

### ramco-brain — 5 kept
_Ramco 'brain' pipeline — entirely project-specific._

- `add-journey`
- `eval-brain`
- `ramco-journey`
- `reindex-brain`
- `sync-brain-source`

### react-native-skills — 1 kept
_post-cutoff RN version breaking changes._

- `upgrading-react-native`

### skill-doctor — 1 kept
_this repo's own plugin/skill diagnostics tooling._

- `skill-doctor`

### swiftui-skills — 2 kept
_iOS 26 Liquid Glass (post-cutoff) & niche Expo-UI._

- `expo-ui`
- `swiftui-liquid-glass`

### vizuara — 3 kept
_Vizuara/Ramco report + figure generation — project-specific._

- `vizuara-ramco-pdf`
- `vizuara-report`
- `wisprflow-figure`

## Not applied — left for your decision

- **`android-dev-skills` is now empty.** All four skills were generic. The plugin can be
  dropped from `marketplace.json` + `UPSTREAM.md` entirely, but that is a catalog change
  beyond 'delete unnecessary skills', so it is flagged, not done.
- **The `cybersecurity-core` vs `mirror-anthropic-cybersecurity-skills` catalog overlap
  is untouched.** That decision was never confirmed; this pass only trimmed cyber-core's
  own generated filler down to its verified-tool core.
- **No `enabledPlugins` / `settings.json` changes** — per your explicit instruction.
