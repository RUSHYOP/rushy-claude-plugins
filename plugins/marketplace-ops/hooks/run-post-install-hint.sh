#!/usr/bin/env bash
# Plugin wrapper → marketplace hooks/post-tool-plugin-install-hint.sh
set -uo pipefail

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT="$(cat || true)"

run_hint() {
  local script="$1"
  printf '%s' "$INPUT" | bash "$script"
  exit 0
}

if [[ -x "${SELF}/../../../hooks/post-tool-plugin-install-hint.sh" ]]; then
  run_hint "${SELF}/../../../hooks/post-tool-plugin-install-hint.sh"
fi

for candidate in \
  "${RUSHY_MARKETPLACE_ROOT:-}" \
  "${HOME}/Codes-2/Agentic-setup" \
  "${HOME}/.claude/plugins/marketplaces/rushy"
do
  if [[ -n "$candidate" && -x "$candidate/hooks/post-tool-plugin-install-hint.sh" ]]; then
    export RUSHY_MARKETPLACE_ROOT="$candidate"
    run_hint "$candidate/hooks/post-tool-plugin-install-hint.sh"
  fi
done

exit 0
