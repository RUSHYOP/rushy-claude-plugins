#!/usr/bin/env bash
# check-plugin-versions.sh
#
# WHAT: Fails if a local plugin's Claude-relevant files changed after its last version bump,
#       or if plugin.json and marketplace.json disagree on a version.
# WHY:  The Claude plugin cache is keyed by version
#       (~/.claude/plugins/cache/<mkt>/<plugin>/<version>/). Content shipped without a version
#       bump is never refetched by installed clients. On 2026-08-30 this silently reverted the
#       2026-07-25 skill audit — deleted skills kept loading in live sessions for 5 weeks.
#       See docs/skill-audit-2026-08.md.
# HOW:  ./scripts/check-plugin-versions.sh   (exits non-zero and lists offenders)
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 scripts/lib/check_plugin_versions.py "$@"
