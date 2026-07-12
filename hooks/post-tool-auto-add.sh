#!/usr/bin/env bash
# PostToolUse HOOK: when a shell command looks like a CLI plugin install,
# automatically add any missing plugins into the rushy marketplace catalog.
# Fail-open (always exit 0).

set -uo pipefail

INPUT="$(cat || true)"

CMD="$(
  printf '%s' "$INPUT" | python3 -c '
import json,sys
raw=sys.stdin.read()
try:
    d=json.loads(raw) if raw.strip() else {}
except Exception:
    d={}
ti=d.get("toolInput") or d.get("tool_input") or {}
cmd=ti.get("command") or ti.get("cmd") or ""
if isinstance(cmd, list):
    cmd=" ".join(str(x) for x in cmd)
print(cmd)
' 2>/dev/null || true
)"

# Only fire after plugin/marketplace install-ish shell commands
if ! printf '%s' "$CMD" | grep -Eiq \
  'plugin[[:space:]]+install|plugins?[[:space:]]+add|marketplace[[:space:]]+add|plugin-marketplace|grok[[:space:]].*install|claude[[:space:]].*plugin'; then
  exit 0
fi

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "rushy: detected CLI plugin install — auto-adding into marketplace catalog" >&2
echo "rushy: matched command: $CMD" >&2

# Prefer grok-only when the install command clearly came from Grok
if printf '%s' "$CMD" | grep -Eiq 'grok'; then
  export RUSHY_AUTO_SOURCES=grok
fi

exec bash "$HOOKS_DIR/auto-add-from-clis.sh"
