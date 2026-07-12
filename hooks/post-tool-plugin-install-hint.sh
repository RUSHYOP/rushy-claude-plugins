#!/usr/bin/env bash
# PostToolUse: if the shell command looks like a CLI plugin install, re-check
# marketplace drift and print how to reconcile into rushy.
# Fail-open (always exit 0).

set -uo pipefail

INPUT="$(cat || true)"

# Extract command string from common hook payload shapes
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

# Only react to plugin/marketplace install-ish commands
if ! printf '%s' "$CMD" | grep -Eiq \
  'plugin[[:space:]]+install|plugins?[[:space:]]+add|marketplace[[:space:]]+add|plugin-marketplace|grok[[:space:]].*install|claude[[:space:]].*plugin'; then
  exit 0
fi

ROOT="$("$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/find-root.sh" 2>/dev/null)" || exit 0

echo "rushy: detected CLI plugin/marketplace install activity" >&2
echo "rushy: CLI installs do NOT auto-update the marketplace catalog" >&2
echo "rushy: reconcile with:" >&2
echo "  cd \"$ROOT\" && ./hooks/reconcile.sh --commit --push" >&2
echo "  or enable marketplace-ops and run /reconcile-marketplace" >&2

# Refresh drift status (non-blocking-ish; keep short)
if [[ -x "$ROOT/hooks/check-cli-drift.sh" ]]; then
  "$ROOT/hooks/check-cli-drift.sh" 2>&1 | tail -n 20 >&2 || true
fi

exit 0
