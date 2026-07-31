#!/usr/bin/env bash
# Shared mirror-visibility helpers for the rushy marketplace.
#
# WHY THIS FILE EXISTS
# ---------------------
# The marketplace publishes `RUSHYOP/mirror-*` as the *install URL* for every
# upstream plugin (see .claude-plugin/marketplace.json → plugins[].source.url).
# Consumers clone that URL with THEIR OWN credentials, so a private mirror is
# unreachable for everyone except the RUSHYOP account and surfaces as GitHub's
# generic `Repository not found` 404. Mirrors must therefore be PUBLIC.
#
# Sourced by scripts/sync-mirrors.sh (create + self-heal on every sync) and
# scripts/audit-mirror-visibility.sh (standalone audit/repair) so the policy is
# implemented in exactly one place.
#
# Not executable on its own — `source` it.

# mirror_visibility REPO
# Prints PUBLIC | PRIVATE | INTERNAL, or nothing when the repo does not exist or
# is invisible to the active `gh` account. Never fails the caller (safe under
# `set -e`), so callers must branch on the printed value.
mirror_visibility() {
  gh repo view "$1" --json visibility --jq '.visibility' 2>/dev/null || true
}

# ensure_mirror_public REPO [--dry-run]
# Makes REPO public when it is not already. Idempotent — safe to re-run on every
# sync. Indents its output two spaces so it nests under a caller's repo heading.
#
# Returns 0 when REPO is (or has just become) public.
# Returns 1 when a change was needed but was not applied — i.e. the repo is
# unreadable, the flip failed, or --dry-run suppressed it. Callers under
# `set -e` must therefore guard the call (`|| failed+=("$repo")`).
ensure_mirror_public() {
  local repo="$1" mode="${2:-}" vis
  vis="$(mirror_visibility "$repo")"

  case "$vis" in
    PUBLIC)
      echo "  visibility: PUBLIC (ok)"
      return 0
      ;;
    "")
      echo "  visibility: UNKNOWN — $repo missing, or not visible to the active gh account" >&2
      return 1
      ;;
  esac

  if [[ "$mode" == "--dry-run" ]]; then
    echo "  visibility: $vis → would flip to PUBLIC (dry-run)"
    return 1
  fi

  echo "  visibility: $vis → flipping to PUBLIC..."
  # --accept-visibility-change-consequences is mandatory for --visibility in
  # gh >= 2.60; without it gh refuses the edit outright.
  if gh repo edit "$repo" --visibility public \
       --accept-visibility-change-consequences >/dev/null; then
    echo "  visibility: PUBLIC (changed)"
    return 0
  fi

  echo "  ERROR: failed to make $repo public" >&2
  return 1
}
