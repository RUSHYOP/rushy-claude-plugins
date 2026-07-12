# marketplace-ops

First-party rushy plugin for **marketplace maintenance hooks** and slash commands.

## What you get

| Piece | Role |
|-------|------|
| SessionStart hook | **AUTO-ADD** missing CLI plugins into catalog (+ commit) |
| PostToolUse hook | After shell `plugin install`, **AUTO-ADD** into catalog |
| `/reconcile-marketplace` | Explicit import → commit/push |
| `/marketplace-status` | Status only |
| Skill `reconcile-marketplace` | Agent playbook |

Scripts live at the **marketplace root** (`hooks/*.sh`) so they work with or without this plugin enabled.

## Enable

From rushy marketplace:

- Claude: `marketplace-ops@rushy`
- Grok: install/enable `marketplace-ops` from rushy

## Or install global hooks (no plugin required)

```bash
cd /path/to/Agentic-setup
./hooks/install-user-hooks.sh
./hooks/install-user-hooks.sh --claude   # optional
```

## Manual run

```bash
./hooks/check-cli-drift.sh
./hooks/reconcile.sh --commit --push
```
