#!/usr/bin/env bash
# Install rushy marketplace AUTO-ADD hooks into global Grok (and optional Claude).
#
# Installed:
#   ~/.grok/hooks/rushy-session-auto-add.json   — SessionStart: auto-add if drift
#   ~/.grok/hooks/rushy-post-plugin-auto-add.json — PostToolUse: auto-add after plugin install
#
# Env baked into hooks (override by editing the JSON or exporting before install):
#   RUSHY_AUTO_COMMIT=1   commit catalog changes
#   RUSHY_AUTO_PUSH=0     set to 1 at install: --push
#   RUSHY_AUTO_SYNC=1     sync new mirrors only
#   RUSHY_SESSION_AUTO_ADD=1
#
# Usage:
#   ./hooks/install-user-hooks.sh
#   ./hooks/install-user-hooks.sh --push          # also git push after commit
#   ./hooks/install-user-hooks.sh --check-only    # SessionStart dry-run only (no auto-add)
#   ./hooks/install-user-hooks.sh --claude
#   ./hooks/install-user-hooks.sh --uninstall

set -euo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$("$HOOKS_DIR/find-root.sh")"
MODE="install"
CLAUDE=0
PUSH="${RUSHY_AUTO_PUSH:-0}"
SESSION_AUTO=1

for arg in "$@"; do
  case "$arg" in
    --uninstall) MODE="uninstall" ;;
    --claude) CLAUDE=1 ;;
    --push) PUSH=1 ;;
    --check-only) SESSION_AUTO=0 ;;
    -h|--help)
      sed -n '2,24p' "$0"
      exit 0
      ;;
  esac
done

GROK_HOOKS="${HOME}/.grok/hooks"
SESSION_JSON="${GROK_HOOKS}/rushy-session-auto-add.json"
POST_JSON="${GROK_HOOKS}/rushy-post-plugin-auto-add.json"
# Remove legacy hint/check-only filenames from earlier install
LEGACY=(
  "${GROK_HOOKS}/rushy-session-check.json"
  "${GROK_HOOKS}/rushy-post-plugin-install.json"
)

uninstall() {
  rm -f "$SESSION_JSON" "$POST_JSON" "${LEGACY[@]}"
  echo "Removed global Grok rushy auto-add hooks"
}

install_grok() {
  mkdir -p "$GROK_HOOKS"
  rm -f "${LEGACY[@]}"

  if [[ "$SESSION_AUTO" -eq 1 ]]; then
    SESSION_CMD="${ROOT}/hooks/session-auto-add.sh"
    SESSION_DESC="rushy marketplace: SessionStart AUTO-ADD missing CLI plugins into catalog"
  else
    SESSION_CMD="${ROOT}/hooks/check-cli-drift.sh"
    SESSION_DESC="rushy marketplace: SessionStart dry-run drift check only"
  fi

  cat >"$SESSION_JSON" <<EOF
{
  "description": "${SESSION_DESC}",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${SESSION_CMD}",
            "timeout": 120,
            "env": {
              "RUSHY_MARKETPLACE_ROOT": "${ROOT}",
              "RUSHY_SESSION_AUTO_ADD": "${SESSION_AUTO}",
              "RUSHY_AUTO_COMMIT": "1",
              "RUSHY_AUTO_PUSH": "${PUSH}",
              "RUSHY_AUTO_SYNC": "1"
            }
          }
        ]
      }
    ]
  }
}
EOF

  cat >"$POST_JSON" <<EOF
{
  "description": "rushy marketplace: after shell plugin install, AUTO-ADD into catalog",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash|run_terminal_command",
        "hooks": [
          {
            "type": "command",
            "command": "${ROOT}/hooks/post-tool-auto-add.sh",
            "timeout": 180,
            "env": {
              "RUSHY_MARKETPLACE_ROOT": "${ROOT}",
              "RUSHY_AUTO_COMMIT": "1",
              "RUSHY_AUTO_PUSH": "${PUSH}",
              "RUSHY_AUTO_SYNC": "1"
            }
          }
        ]
      }
    ]
  }
}
EOF

  chmod +x \
    "$ROOT/hooks/find-root.sh" \
    "$ROOT/hooks/check-cli-drift.sh" \
    "$ROOT/hooks/reconcile.sh" \
    "$ROOT/hooks/auto-add-from-clis.sh" \
    "$ROOT/hooks/session-auto-add.sh" \
    "$ROOT/hooks/post-tool-auto-add.sh" \
    "$ROOT/hooks/post-tool-plugin-install-hint.sh" \
    "$ROOT/hooks/install-user-hooks.sh"

  echo "Installed Grok AUTO-ADD hooks:"
  echo "  $SESSION_JSON"
  echo "  $POST_JSON"
  echo "Marketplace root: $ROOT"
  echo "  auto-commit=1  auto-push=${PUSH}  session-auto-add=${SESSION_AUTO}"
  echo "Restart Grok (or open /hooks) to load them."
  echo ""
  echo "After you install a plugin in Grok/Claude, the hook writes it into the catalog."
  echo "Manual: $ROOT/hooks/auto-add-from-clis.sh"
  echo "Log:    $ROOT/logs/auto-add.log"
}

install_claude() {
  if [[ "$CLAUDE" -ne 1 ]]; then
    echo "Tip: re-run with --claude to register SessionStart auto-add in ~/.claude/settings.json"
    return 0
  fi
  RUSHY_MARKETPLACE_ROOT="$ROOT" RUSHY_AUTO_PUSH="$PUSH" RUSHY_SESSION_AUTO_ADD="$SESSION_AUTO" python3 <<'PY'
import json
import os
from pathlib import Path

settings_path = Path.home() / ".claude" / "settings.json"
root = os.environ["RUSHY_MARKETPLACE_ROOT"]
push = os.environ.get("RUSHY_AUTO_PUSH", "0")
session_auto = os.environ.get("RUSHY_SESSION_AUTO_ADD", "1")
cmd = f"{root}/hooks/session-auto-add.sh" if session_auto == "1" else f"{root}/hooks/check-cli-drift.sh"
hook_entry = {
    "matcher": "startup|resume|clear|compact",
    "hooks": [
        {
            "type": "command",
            "command": cmd,
            "timeout": 120,
        }
    ],
}

if settings_path.exists():
    data = json.loads(settings_path.read_text())
else:
    data = {}
    settings_path.parent.mkdir(parents=True, exist_ok=True)

hooks = data.setdefault("hooks", {})
ss = hooks.setdefault("SessionStart", [])

def is_ours(block):
    for h in block.get("hooks") or []:
        c = h.get("command") or ""
        if "session-auto-add.sh" in c or "check-cli-drift.sh" in c:
            return True
    return False

ss[:] = [b for b in ss if not is_ours(b)]
ss.append(hook_entry)
settings_path.write_text(json.dumps(data, indent=2) + "\n")
print(f"Merged SessionStart auto-add into {settings_path} (push={push})")
PY
}

if [[ "$MODE" == "uninstall" ]]; then
  uninstall
  exit 0
fi

install_grok
install_claude
