# skill-doctor

First-party wrap of Warp's **skill-doctor**: score recent local agent
conversations against efficiency and code-quality rubrics, draft skill edits,
and render a shareable HTML report. Transcripts never leave the machine.

## Enable

- Claude: `skill-doctor@rushy`
- Grok: install/enable `skill-doctor` from the rushy marketplace
- Cursor: `./scripts/apply-cursor.sh` then enable the local plugin

## Run

Ask the agent to grade skills / run skill-doctor. It will ask which
conversations and which skill set, then write a report under a temp
`REPORT_DIR` (never into the repo).

Supported scoring harnesses (see `skills/skill-doctor/references/supported-harnesses.md`):
Warp, Claude Code, Codex. Grok can *install* the skill; running a grade from
Grok currently stops at the startup gate.

## Provenance

Vendored from [warpdotdev/common-skills](https://github.com/warpdotdev/common-skills)
(`.agents/skills/skill-doctor`, MIT). License copy: `LICENSE`.

Refresh: re-copy that directory, keep `plugin.json` / this README.
