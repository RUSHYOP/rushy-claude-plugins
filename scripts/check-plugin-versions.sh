#!/usr/bin/env bash
# check-plugin-versions.sh
#
# WHAT: For every local plugin, fails if its tree has commits newer than the commit
#       that last changed its `version` field.
# WHY:  The Claude plugin cache is keyed by version
#       (~/.claude/plugins/cache/<mkt>/<plugin>/<version>/). If content ships without a
#       version bump, installed clients keep serving the old tree forever. On 2026-08-30
#       this silently reverted the 2026-07-25 skill audit — deleted skills kept appearing
#       in live sessions for 5 weeks. See docs/skill-audit-2026-08.md.
# HOW:  Run from repo root. Exits non-zero and lists offenders.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
for dir in plugins/*/; do
  name=$(basename "$dir")
  manifest="$dir.claude-plugin/plugin.json"
  [ -f "$manifest" ] || continue

  # Commit that last touched the version line in this plugin's manifest.
  bump=$(git log -1 --format=%H -S'"version"' -- "$manifest" 2>/dev/null || true)
  [ -n "$bump" ] || continue

  # Any commit to Claude-relevant paths after that bump means unshipped content.
  # Scoped deliberately: .copilot-plugin/ and .grok-plugin/ manifests and README changes
  # do not affect what the Claude cache serves, so they must not trip this check.
  newer=$(git rev-list --count "$bump"..HEAD -- \
    "$dir.claude-plugin" "${dir}skills" "${dir}commands" "${dir}agents" "${dir}hooks" \
    2>/dev/null || echo 0)
  if [ "$newer" -gt 0 ]; then
    echo "STALE  $name — $newer commit(s) since last version bump ($(git -C . show -s --format=%h "$bump"))"
    fail=1
  fi
done

# marketplace.json must agree with each plugin.json, or the cache key is wrong.
python3 - <<'PY' || fail=1
import json, os, sys
mp = json.load(open('.claude-plugin/marketplace.json'))
bad = []
for e in mp['plugins']:
    pj = f"plugins/{e['name']}/.claude-plugin/plugin.json"
    if os.path.exists(pj):
        v = json.load(open(pj)).get('version')
        if v != e.get('version'):
            bad.append(f"MISMATCH  {e['name']} — plugin.json={v} marketplace.json={e.get('version')}")
for b in bad:
    print(b)
sys.exit(1 if bad else 0)
PY

[ "$fail" -eq 0 ] && echo "OK — all local plugin versions current."
exit "$fail"
