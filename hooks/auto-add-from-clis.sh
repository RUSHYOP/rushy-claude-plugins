#!/usr/bin/env bash
# AUTO-ADD hook body: import plugins present in Claude/Grok but missing from the
# rushy marketplace catalog. Safe to call from SessionStart / PostToolUse.
#
# Always exit 0 (fail-open for hooks).
#
# Env (all optional):
#   RUSHY_MARKETPLACE_ROOT  — marketplace checkout
#   RUSHY_AUTO_COMMIT=1     — git commit catalog changes (default: 1)
#   RUSHY_AUTO_PUSH=0       — git push after commit (default: 0)
#   RUSHY_AUTO_SYNC=1       — sync new private mirrors only (default: 1)
#   RUSHY_AUTO_SOURCES      — claude,grok | grok | claude (default: both)
#   RUSHY_AUTO_DRY_RUN=0    — if 1, only dry-run (default: 0)

set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$("$HOOKS_DIR/find-root.sh" 2>/dev/null)" || {
  echo "rushy auto-add: marketplace root not found" >&2
  exit 0
}
cd "$ROOT" || exit 0

mkdir -p "$ROOT/logs"
LOG="$ROOT/logs/auto-add.log"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

COMMIT="${RUSHY_AUTO_COMMIT:-1}"
PUSH="${RUSHY_AUTO_PUSH:-0}"
SYNC="${RUSHY_AUTO_SYNC:-1}"
DRY="${RUSHY_AUTO_DRY_RUN:-0}"
SOURCES="${RUSHY_AUTO_SOURCES:-}"

ARGS=()
if [[ "$DRY" == "1" ]]; then
  ARGS+=(--dry-run)
fi
if [[ "$COMMIT" == "1" && "$DRY" != "1" ]]; then
  ARGS+=(--commit)
fi
if [[ "$SYNC" == "1" ]]; then
  ARGS+=(--sync --only-new)
fi
case "$SOURCES" in
  grok|grok-only) ARGS+=(--grok-only) ;;
  claude|claude-only) ARGS+=(--claude-only) ;;
esac

{
  echo "==== $TS auto-add start root=$ROOT args=${ARGS[*]:-} ===="
} >>"$LOG"

echo "rushy auto-add: importing missing CLI plugins into marketplace..." >&2
echo "rushy auto-add: root=$ROOT ${ARGS[*]:-}" >&2

OUT="$(./scripts/import-from-clis.sh "${ARGS[@]+"${ARGS[@]}"}" 2>&1)" || true
printf '%s\n' "$OUT" | tee -a "$LOG" >&2

ADDED="$(printf '%s\n' "$OUT" | sed -n 's/^ADDED://p' | head -1)"
ADDED="${ADDED:-0}"

if [[ "$PUSH" == "1" && "$DRY" != "1" && "$COMMIT" == "1" ]]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if git rev-parse --verify "@{u}" >/dev/null 2>&1; then
      AHEAD="$(git rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)"
      if [[ "${AHEAD:-0}" -gt 0 ]]; then
        echo "rushy auto-add: pushing $AHEAD commit(s)" >&2
        git push >>"$LOG" 2>&1 || echo "rushy auto-add: push failed (see $LOG)" >&2
      fi
    fi
  fi
fi

if [[ "$ADDED" != "0" ]]; then
  echo "rushy auto-add: catalog updated (+$ADDED). log: $LOG" >&2
else
  echo "rushy auto-add: nothing new to add" >&2
fi

echo "==== $TS auto-add done added=$ADDED ====" >>"$LOG"
exit 0
