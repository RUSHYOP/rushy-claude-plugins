# cybersecurity-core

Curated **Option B** cut of the upstream [Anthropic Cybersecurity Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills) catalog (817 → ~70).

## Why this exists

The full `cybersecurity-skills` plugin is a breadth library. Many entries are the **same domain** split by verb (`detecting` / `hunting` / `performing`) or tool (`-with-splunk` / `-with-zeek`). Loading all 817 hurts skill routing.

This plugin keeps **one best skill per major cluster** plus core playbooks for:

- Active Directory / Kerberos / BloodHound
- Cloud IR (AWS + Azure)
- Containers / Kubernetes
- Web & API testing
- Network / C2 / lateral movement
- Malware RE & forensics
- Ransomware & incident response
- SOC hunting
- Threat intel (minimal)
- Zero trust (2 skills, not 17)
- DevSecOps / supply chain
- LLM app security
- Phishing / BEC
- Pentest methodology & risk

## Explicitly dropped

- OT / ICS / SCADA / power-grid / oil-gas
- Vendor-specific product deploys (Claroty, Dragos, Proofpoint, …) unless folded into a general skill
- Near-duplicate twins (e.g. 4 BloodHound skills → 1; 5 memory-forensics → 1; 20 ransomware → 3)
- Most compliance checklist micro-skills

## Relation to other @rushy plugins

For **code / PR / dependency security**, prefer:

- `static-analysis`, `semgrep-rule-creator`, `sharp-edges`, `differential-review`
- `supply-chain-risk-auditor`, `insecure-defaults`, `agentic-actions-auditor`

This pack is for **SOC / IR / AD / cloud ops / pentest playbooks**.

## Upstream

Skill bodies are copied from the mirrored catalog (Apache-2.0). Re-curate after major upstream bumps.

Do **not** also enable `cybersecurity-skills@rushy` — use this plugin instead.
