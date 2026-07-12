#!/usr/bin/env bash
# Install rushy marketplace reconcile hooks into the user global hook dirs so
# they run in every Grok (and optionally Claude) session — not only when the
# marketplace-ops plugin is enabled.
#
# What this installs:
#   ~/.grok/hooks/rushy-session-check.json
#   ~/.grok/hooks/rushy-post-plugin-install.json
#   (optional) Claude settings hook merge via --claude
#
# Scripts always execute from THIS marketplace checkout (absolute paths).
#
# Usage:
#   ./hooks/install-user-hooks.sh
#   ./hooks/install-user-hooks.sh --claude
#   ./hooks/install-user-hooks.sh --uninstall

set -euo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$("$HOOKS_DIR/find-root.sh")"
MODE="install"
CLAUDE=0

for arg in "$@"; do
  case "$arg" in
    --uninstall) MODE="uninstall" ;;
    --claude) CLAUDE=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

GROK_HOOKS="${HOME}/.grok/hooks"
SESSION_JSON="${GROK_HOOKS}/rushy-session-check.json"
POST_JSON="${GROK_HOOKS}/rushy-post-plugin-install.json"

uninstall() {
  rm -f "$SESSION_JSON" "$POST_JSON"
  echo "Removed global Grok hooks: rushy-session-check, rushy-post-plugin-install"
}

install_grok() {
  mkdir -p "$GROK_HOOKS"
  # Absolute paths so hooks work from any project CWD
  cat >"$SESSION_JSON" <<EOF
{
  "description": "rushy marketplace: SessionStart dry-run drift check (catalog vs Claude/Grok installs)",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${ROOT}/hooks/check-cli-drift.sh",
            "timeout": 60,
            "env": {
              "RUSHY_MARKETPLACE_ROOT": "${ROOT}"
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
  "description": "rushy marketplace: after shell plugin installs, hint to reconcile into catalog",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash|run_terminal_command",
        "hooks": [
          {
            "type": "command",
            "command": "${ROOT}/hooks/post-tool-plugin-install-hint.sh",
            "timeout": 90,
            "env": {
              "RUSHY_MARKETPLACE_ROOT": "${ROOT}"
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
    "$ROOT/hooks/post-tool-plugin-install-hint.sh"

  echo "Installed Grok global hooks:"
  echo "  $SESSION_JSON"
  echo "  $POST_JSON"
  echo "Marketplace root: $ROOT"
  echo "Restart Grok (or open /hooks) to load them."
  echo ""
  echo "Manual reconcile anytime:"
  echo "  $ROOT/hooks/reconcile.sh --commit --push"
}

install_claude_note() {
  # Claude global hooks live in settings.json; we document rather than rewrite
  # complex existing settings unless --claude is asked.
  local claude_settings="${HOME}/.claude/settings.json"
  if [[ "$CLAUDE" -ne 1 ]]; then
    echo "Tip: re-run with --claude to append SessionStart drift check into ~/.claude/settings.json"
    return 0
  fi
  RUSHY_MARKETPLACE_ROOT="$ROOT" python3 <<'PY'
import json
import os
from pathlib import Path

settings_path = Path.home() / ".claude" / "settings.json"
root = os.environ["RUSHY_MARKETPLACE_ROOT"]
cmd = f"{root}/hooks/check-cli-drift.sh"
hook_entry = {
    "matcher": "startup|resume|clear|compact",
    "hooks": [
        {
            "type": "command",
            "command": cmd,
            "timeout": 60,
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
        if "check-cli-drift.sh" in c:
            return True
    return False

ss[:] = [b for b in ss if not is_ours(b)]
ss.append(hook_entry)
settings_path.write_text(json.dumps(data, indent=2) + "\n")
print(f"Merged SessionStart drift check into {settings_path}")
PY
}

if [[ "$MODE" == "uninstall" ]]; then
  uninstall
  exit 0
fi

install_grok
install_claude_note
