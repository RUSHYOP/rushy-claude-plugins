#!/usr/bin/env bash
set -uo pipefail
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for candidate in \
  "${SELF}/../../../hooks/session-auto-add.sh" \
  "${RUSHY_MARKETPLACE_ROOT:-}/hooks/session-auto-add.sh" \
  "${HOME}/Codes-2/Agentic-setup/hooks/session-auto-add.sh" \
  "${HOME}/.claude/plugins/marketplaces/rushy/hooks/session-auto-add.sh"
do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    export RUSHY_SESSION_AUTO_ADD="${RUSHY_SESSION_AUTO_ADD:-1}"
    export RUSHY_AUTO_COMMIT="${RUSHY_AUTO_COMMIT:-1}"
    export RUSHY_AUTO_PUSH="${RUSHY_AUTO_PUSH:-0}"
    export RUSHY_AUTO_SYNC="${RUSHY_AUTO_SYNC:-1}"
    exec bash "$candidate"
  fi
done
echo "marketplace-ops: session-auto-add.sh not found" >&2
exit 0
