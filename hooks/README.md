# Marketplace hooks (rushy) — AUTO-ADD

These hooks **auto-add** plugins that were installed only into Claude/Grok into the **rushy marketplace catalog**.

## What runs automatically

| Hook | When | Action |
|------|------|--------|
| **SessionStart** | Every Grok/Claude session | If catalog is behind CLIs → `import-from-clis --sync --only-new --commit` |
| **PostToolUse** | After shell `plugin install` / marketplace add | Same auto-add immediately |

Default: **commit yes**, **push no**. Use `--push` on install to also push to GitHub.

## Install (once per machine)

```bash
cd /path/to/Agentic-setup   # or rushy-claude-plugins clone

./hooks/install-user-hooks.sh              # auto-add + commit
./hooks/install-user-hooks.sh --push       # also git push
./hooks/install-user-hooks.sh --check-only # detect only (no writes)
./hooks/install-user-hooks.sh --claude     # also wire Claude settings
./hooks/install-user-hooks.sh --uninstall
```

Creates:

- `~/.grok/hooks/rushy-session-auto-add.json`
- `~/.grok/hooks/rushy-post-plugin-auto-add.json`

Restart Grok or open `/hooks` to load.

## Manual / same script as the hook

```bash
./hooks/auto-add-from-clis.sh              # what the hook runs
./hooks/reconcile.sh --commit --push       # explicit CLI
./hooks/check-cli-drift.sh                 # dry-run only
```

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `RUSHY_MARKETPLACE_ROOT` | auto | Checkout path |
| `RUSHY_AUTO_COMMIT` | `1` | Commit catalog |
| `RUSHY_AUTO_PUSH` | `0` | `git push` after commit |
| `RUSHY_AUTO_SYNC` | `1` | `--sync --only-new` mirrors |
| `RUSHY_SESSION_AUTO_ADD` | `1` | SessionStart writes catalog |
| `RUSHY_AUTO_SOURCES` | both | `grok` or `claude` only |
| `RUSHY_AUTO_DRY_RUN` | `0` | Force dry-run |

Log: `logs/auto-add.log`

## Plugin

Same hooks ship as **`marketplace-ops@rushy`** (`/reconcile-marketplace`, skill). Global install above works even without enabling the plugin.
