---
description: Import plugins installed only in Claude/Grok into the rushy marketplace catalog (commit + optional push).
---

# Reconcile marketplace (CLI → rushy catalog)

Capture plugins that were installed into Claude or Grok **without** going through the marketplace-first workflow, and write them into **this** repo’s catalog.

## Preflight

1. Resolve marketplace root (prefer live checkout):
   - `RUSHY_MARKETPLACE_ROOT` if set
   - `/Users/admin/Codes-2/Agentic-setup`
   - `~/.claude/plugins/marketplaces/rushy`
2. Confirm `./hooks/reconcile.sh` and `./scripts/import-from-clis.sh` exist and are executable.
3. Show `git status -sb` in that root. If dirty for unrelated work, **stop** and ask the user before committing.

## Plan (tell the user)

- Dry-run first, list `ADDED` plugins and new mirrors.
- Then apply with `--commit` (and `--push` only if user wants remote updated).
- Prefer `--sync --only-new` when new upstream remotes were registered.
- Never force-push. Never rewrite history.

## Commands

```bash
ROOT="${RUSHY_MARKETPLACE_ROOT:-/Users/admin/Codes-2/Agentic-setup}"
cd "$ROOT"

# 1) Preview
./hooks/check-cli-drift.sh
# or:
./hooks/reconcile.sh --dry-run

# 2) Apply (typical)
./hooks/reconcile.sh --sync --only-new --commit --push

# Scoped
./hooks/reconcile.sh --grok-only --commit
./hooks/reconcile.sh --claude-only --commit
```

If the user only said “add vercel” / “import what I installed”, run the apply path for the relevant CLI (`--grok-only` when they installed from xAI/Grok).

## Verification

1. Re-run `./hooks/check-cli-drift.sh` → `ADDED:0`.
2. `git log -1 --oneline` shows the import commit when changes were made.
3. Remind: enable/install from **`@rushy`** only; do not keep third-party marketplaces as the source of truth.

## Notes

- This is **reconcile-only**. Primary path for *new* plugins remains `./scripts/add-plugin.sh`.
- Hooks only **detect** drift; this command **applies** it.
