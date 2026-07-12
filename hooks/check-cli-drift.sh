#!/usr/bin/env bash
# Dry-run: discover plugins installed in Claude/Grok that are missing from the
# rushy marketplace catalog. Safe for SessionStart (no writes, no commit).
#
# Exit 0 always (fail-open for hooks). Writes a short status file and stderr summary.
#
# Env:
#   RUSHY_MARKETPLACE_ROOT  — override checkout path
#   RUSHY_DRIFT_LOG         — status file (default: <root>/logs/cli-drift-status.txt)

set -uo pipefail

ROOT="$("$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/find-root.sh")" || exit 0
cd "$ROOT"

mkdir -p "$ROOT/logs"
STATUS="${RUSHY_DRIFT_LOG:-$ROOT/logs/cli-drift-status.txt}"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

OUT="$(./scripts/import-from-clis.sh --dry-run 2>&1)" || true
ADDED="$(printf '%s\n' "$OUT" | sed -n 's/^ADDED://p' | head -1)"
ADDED="${ADDED:-0}"
MIRRORS="$(printf '%s\n' "$OUT" | sed -n 's/^NEW_MIRRORS://p' | head -1)"
MIRRORS="${MIRRORS:-0}"

{
  echo "timestamp=$TS"
  echo "marketplace_root=$ROOT"
  echo "added=$ADDED"
  echo "new_mirrors=$MIRRORS"
  echo "---"
  printf '%s\n' "$OUT"
} >"$STATUS"

if [[ "$ADDED" != "0" ]]; then
  echo "rushy marketplace drift: $ADDED plugin(s) in CLIs not in catalog" >&2
  printf '%s\n' "$OUT" | sed -n 's/^  + /  missing: /p' >&2
  echo "Fix: cd \"$ROOT\" && ./hooks/reconcile.sh --commit" >&2
  echo "Or:  /reconcile-marketplace  (with marketplace-ops plugin)" >&2
else
  echo "rushy marketplace: catalog matches Claude/Grok installs (no drift)" >&2
fi

exit 0
