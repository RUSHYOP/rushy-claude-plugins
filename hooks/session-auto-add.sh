#!/usr/bin/env bash
# SessionStart HOOK: if CLI installs are ahead of the catalog, auto-add them.
# Controlled by RUSHY_SESSION_AUTO_ADD (default 1 when installed via install-user-hooks).
# Fail-open (always exit 0).

set -uo pipefail

if [[ "${RUSHY_SESSION_AUTO_ADD:-1}" != "1" ]]; then
  # Fall back to dry-run status only
  exec bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/check-cli-drift.sh"
fi

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$("$HOOKS_DIR/find-root.sh" 2>/dev/null)" || exit 0
cd "$ROOT" || exit 0

# Cheap preview first — skip import if nothing to add
OUT="$(./scripts/import-from-clis.sh --dry-run 2>&1)" || true
ADDED="$(printf '%s\n' "$OUT" | sed -n 's/^ADDED://p' | head -1)"
ADDED="${ADDED:-0}"

if [[ "$ADDED" == "0" ]]; then
  echo "rushy session auto-add: catalog already in sync" >&2
  exit 0
fi

echo "rushy session auto-add: $ADDED missing plugin(s) — applying" >&2
exec bash "$HOOKS_DIR/auto-add-from-clis.sh"
