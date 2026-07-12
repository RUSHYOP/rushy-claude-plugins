# Marketplace hooks (rushy)

Runnable automation that keeps the **rushy marketplace catalog** in sync with plugins that accidentally landed only in Claude/Grok.

These live **in the marketplace repo** so every machine that clones `RUSHYOP/rushy-claude-plugins` gets the same scripts.

## Commands (run anytime)

```bash
cd /path/to/Agentic-setup   # or rushy-claude-plugins clone

# Dry-run: what would be added?
./hooks/check-cli-drift.sh

# Write catalog entries for missing CLI plugins
./hooks/reconcile.sh

# Commit (and optionally push) catalog changes
./hooks/reconcile.sh --commit
./hooks/reconcile.sh --sync --only-new --commit --push

# Grok-only / Claude-only
./hooks/reconcile.sh --grok-only --commit
```

## Install global hooks (auto-check on session)

```bash
./hooks/install-user-hooks.sh           # ~/.grok/hooks/*
./hooks/install-user-hooks.sh --claude  # also SessionStart in ~/.claude/settings.json
./hooks/install-user-hooks.sh --uninstall
```

After install:

| Hook | When | What |
|------|------|------|
| `rushy-session-check` | SessionStart | Dry-run drift check → `logs/cli-drift-status.txt` + stderr hint |
| `rushy-post-plugin-install` | PostToolUse (shell) | If command looks like `plugin install`, re-check + print reconcile recipe |

**Does not auto-commit.** You (or `/reconcile-marketplace`) apply changes deliberately.

## Plugin package

Same logic is also shipped as first-party plugin **`marketplace-ops@rushy`** (hooks + slash commands + skill). Enable it from the rushy marketplace; or use global install above so hooks work without enabling the plugin.

## Env

| Variable | Purpose |
|----------|---------|
| `RUSHY_MARKETPLACE_ROOT` | Force checkout path if auto-detect fails |

## Layout

```
hooks/
  find-root.sh
  check-cli-drift.sh
  reconcile.sh
  post-tool-plugin-install-hint.sh
  install-user-hooks.sh
  README.md
plugins/marketplace-ops/   # plugin wrapper (hooks.json, commands, skill)
```
