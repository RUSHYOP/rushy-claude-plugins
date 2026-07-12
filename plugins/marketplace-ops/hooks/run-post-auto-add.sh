#!/usr/bin/env bash
set -uo pipefail
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT="$(cat || true)"
run() {
  printf '%s' "$INPUT" | bash "$1"
  exit 0
}
for candidate in \
  "${SELF}/../../../hooks/post-tool-auto-add.sh" \
  "${RUSHY_MARKETPLACE_ROOT:-}/hooks/post-tool-auto-add.sh" \
  "${HOME}/Codes-2/Agentic-setup/hooks/post-tool-auto-add.sh" \
  "${HOME}/.claude/plugins/marketplaces/rushy/hooks/post-tool-auto-add.sh"
do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    export RUSHY_AUTO_COMMIT="${RUSHY_AUTO_COMMIT:-1}"
    export RUSHY_AUTO_PUSH="${RUSHY_AUTO_PUSH:-0}"
    export RUSHY_AUTO_SYNC="${RUSHY_AUTO_SYNC:-1}"
    run "$candidate"
  fi
done
exit 0
