#!/usr/bin/env bash
# Resolve the rushy marketplace checkout root (has scripts/import-from-clis.sh).
# Used by plugin hooks and global ~/.grok hooks so paths work from any CWD.
#
# Order:
#   1. RUSHY_MARKETPLACE_ROOT
#   2. Walk up from CLAUDE_PLUGIN_ROOT / GROK_PLUGIN_ROOT / this file
#   3. Common local path (developer default)
#   4. Claude marketplace clone of rushy

set -euo pipefail

_is_root() {
  [[ -x "${1}/scripts/import-from-clis.sh" && -f "${1}/.claude-plugin/marketplace.json" ]]
}

_try() {
  local d="${1:-}"
  [[ -n "$d" ]] || return 1
  d="$(cd "$d" 2>/dev/null && pwd)" || return 1
  if _is_root "$d"; then
    printf '%s\n' "$d"
    return 0
  fi
  return 1
}

_walk_up() {
  local d="${1:-}"
  local i
  [[ -n "$d" ]] || return 1
  d="$(cd "$d" 2>/dev/null && pwd)" || return 1
  for i in 1 2 3 4 5 6 7 8; do
    if _is_root "$d"; then
      printf '%s\n' "$d"
      return 0
    fi
    [[ "$d" == "/" ]] && break
    d="$(dirname "$d")"
  done
  return 1
}

if [[ -n "${RUSHY_MARKETPLACE_ROOT:-}" ]]; then
  _try "$RUSHY_MARKETPLACE_ROOT" && exit 0
fi

_walk_up "${CLAUDE_PLUGIN_ROOT:-}" && exit 0
_walk_up "${GROK_PLUGIN_ROOT:-}" && exit 0

# This file lives at <marketplace>/hooks/find-root.sh
_SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_walk_up "$_SELF" && exit 0

_try "${HOME}/Codes-2/Agentic-setup" && exit 0
_try "${HOME}/.claude/plugins/marketplaces/rushy" && exit 0
_try "${HOME}/.grok/plugins/marketplaces/rushy" && exit 0

echo "rushy: could not locate marketplace root (set RUSHY_MARKETPLACE_ROOT)" >&2
exit 1
