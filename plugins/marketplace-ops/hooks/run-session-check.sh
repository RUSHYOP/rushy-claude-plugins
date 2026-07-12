#!/usr/bin/env bash
# Plugin wrapper → marketplace hooks/check-cli-drift.sh
set -uo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-${GROK_PLUGIN_ROOT:-}}"
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Prefer marketplace root adjacent to plugins/marketplace-ops (live checkout)
if [[ -x "${SELF}/../../../hooks/check-cli-drift.sh" ]]; then
  exec bash "${SELF}/../../../hooks/check-cli-drift.sh"
fi

# Or walk from plugin root
if [[ -n "$PLUGIN_ROOT" && -x "${PLUGIN_ROOT}/../../hooks/check-cli-drift.sh" ]]; then
  exec bash "${PLUGIN_ROOT}/../../hooks/check-cli-drift.sh"
fi

# Shared finder (copied path when only plugin is installed elsewhere)
if [[ -x "${SELF}/../../../hooks/find-root.sh" ]]; then
  ROOT="$("${SELF}/../../../hooks/find-root.sh")" && exec bash "$ROOT/hooks/check-cli-drift.sh"
fi

# Last resort: env / defaults via find-root if present next to us
for candidate in \
  "${RUSHY_MARKETPLACE_ROOT:-}" \
  "${HOME}/Codes-2/Agentic-setup" \
  "${HOME}/.claude/plugins/marketplaces/rushy"
do
  if [[ -n "$candidate" && -x "$candidate/hooks/check-cli-drift.sh" ]]; then
    export RUSHY_MARKETPLACE_ROOT="$candidate"
    exec bash "$candidate/hooks/check-cli-drift.sh"
  fi
done

echo "marketplace-ops: could not find rushy hooks/check-cli-drift.sh (set RUSHY_MARKETPLACE_ROOT)" >&2
exit 0
