#!/usr/bin/env bash
# Apply reconcile: import missing CLI-installed plugins into the rushy catalog.
# This is the runnable entrypoint for humans, slash commands, and optional hooks.
#
# Usage:
#   ./hooks/reconcile.sh                 # write catalog only
#   ./hooks/reconcile.sh --dry-run
#   ./hooks/reconcile.sh --grok-only
#   ./hooks/reconcile.sh --claude-only
#   ./hooks/reconcile.sh --commit
#   ./hooks/reconcile.sh --commit --push
#   ./hooks/reconcile.sh --sync --only-new --commit --push
#
# Env:
#   RUSHY_MARKETPLACE_ROOT — override checkout path

set -euo pipefail

ROOT="$("$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/find-root.sh")"
cd "$ROOT"

DRY=0
PUSH=0
ARGS=()

for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    --dry-run) DRY=1; ARGS+=(--dry-run) ;;
    *) ARGS+=("$arg") ;;
  esac
done

# Default: always pass through; recommend --commit for durable catalog updates
echo "rushy: marketplace root = $ROOT"
echo "rushy: running import-from-clis ${ARGS[*]:-}"

./scripts/import-from-clis.sh "${ARGS[@]+"${ARGS[@]}"}"

if [[ "$PUSH" -eq 1 && "$DRY" -eq 0 ]]; then
  # Only push if there is something to push (local ahead of origin)
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    BRANCH="$(git rev-parse --abbrev-ref HEAD)"
    # Push only if we have commits not on remote (or just created a commit)
    if ! git rev-parse --verify "@{u}" >/dev/null 2>&1; then
      echo "rushy: no upstream tracking branch; skip push (set upstream or push manually)"
    else
      AHEAD="$(git rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)"
      if [[ "${AHEAD:-0}" -gt 0 ]]; then
        echo "rushy: pushing $AHEAD commit(s) on $BRANCH"
        git push
      else
        echo "rushy: nothing to push"
      fi
    fi
  fi
fi

echo ""
echo "Done. Status log: $ROOT/logs/cli-drift-status.txt (re-run check with ./hooks/check-cli-drift.sh)"
