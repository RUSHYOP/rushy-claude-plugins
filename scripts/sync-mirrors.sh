#!/usr/bin/env bash
# Sync public RUSHYOP mirrors from upstream remotes.
# Marketplace installs from mirrors; this job keeps mirrors fresh.
#
# Mirrors are PUBLIC by policy: the marketplace publishes the mirror URL as the
# install source, so consumers clone it with their own credentials and a private
# mirror is a `Repository not found` 404 for everyone but RUSHYOP. Every sync
# creates new mirrors public and repairs any that are not — see
# scripts/lib/mirror-visibility.sh.
#
# Usage:
#   ./scripts/sync-mirrors.sh
#   ./scripts/sync-mirrors.sh --only mirror-superpowers
#   MIRROR_ROOT=/path ./scripts/sync-mirrors.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGISTRY="${ROOT}/mirrors/registry.tsv"
MIRROR_ROOT="${MIRROR_ROOT:-${HOME}/Codes-2/claude-plugin-mirrors}"
ONLY=""

# shellcheck source=scripts/lib/mirror-visibility.sh
source "${ROOT}/scripts/lib/mirror-visibility.sh"

# Mirrors whose visibility could not be set to public — reported at the end and
# turned into a non-zero exit so a broken mirror never passes silently.
# Newline-delimited string rather than an array: under `set -u`, bash 3.2 (the
# system bash on macOS) errors on ${#empty_array[@]}.
VISIBILITY_FAILURES=""

if [[ "${1:-}" == "--only" ]]; then
  ONLY="${2:-}"
  if [[ -z "$ONLY" ]]; then
    echo "usage: $0 --only mirror-name" >&2
    exit 1
  fi
fi

mkdir -p "$MIRROR_ROOT"

sync_one() {
  local upstream="$1"
  local name="$2"
  local bare="$MIRROR_ROOT/${name}.git"
  local gh_repo="RUSHYOP/${name}"
  local push_url="https://github.com/${gh_repo}.git"

  echo ""
  echo "======== $name ========"
  echo "upstream: $upstream"

  if [[ ! -d "$bare" ]]; then
    mkdir -p "$bare"
    git init --bare "$bare"
    git -C "$bare" remote add origin "$upstream"
  else
    git -C "$bare" remote set-url origin "$upstream" 2>/dev/null \
      || git -C "$bare" remote add origin "$upstream"
  fi

  git -C "$bare" config --unset-all remote.origin.fetch 2>/dev/null || true
  git -C "$bare" config remote.origin.fetch "+refs/heads/*:refs/heads/*"
  git -C "$bare" config --add remote.origin.fetch "+refs/tags/*:refs/tags/*"

  git -C "$bare" for-each-ref --format='%(refname)' 'refs/pull' 2>/dev/null \
    | while read -r r; do git -C "$bare" update-ref -d "$r" 2>/dev/null || true; done

  echo "Fetching upstream..."
  git -C "$bare" fetch origin --prune

  # Create as public, and self-heal mirrors that predate the public-mirror policy
  # (or were created by an older sync-mirrors.sh) instead of leaving them broken.
  if ! gh repo view "$gh_repo" &>/dev/null; then
    echo "Creating public $gh_repo..."
    gh repo create "$gh_repo" --public \
      --description "Public mirror of $upstream (DR for rushy marketplace)"
  else
    ensure_mirror_public "$gh_repo" || VISIBILITY_FAILURES="${VISIBILITY_FAILURES}${gh_repo}"$'\n'
  fi

  if git -C "$bare" remote | grep -qx github; then
    git -C "$bare" remote set-url github "$push_url"
  else
    git -C "$bare" remote add github "$push_url"
  fi

  echo "Pushing heads+tags to $gh_repo..."
  git -C "$bare" push github --prune '+refs/heads/*:refs/heads/*' '+refs/tags/*:refs/tags/*'
  echo "OK $gh_repo"
}

if [[ ! -f "$REGISTRY" ]]; then
  echo "Missing $REGISTRY" >&2
  exit 1
fi

while IFS='|' read -r upstream name slug; do
  [[ -z "${upstream:-}" || "$upstream" =~ ^# ]] && continue
  if [[ -n "$ONLY" && "$name" != "$ONLY" ]]; then
    continue
  fi
  sync_one "$upstream" "$name"
done < "$REGISTRY"

echo ""
if [[ -n "$VISIBILITY_FAILURES" ]]; then
  echo "WARNING: these mirrors are NOT public and will 404 for marketplace consumers:" >&2
  printf '%s' "$VISIBILITY_FAILURES" | sed 's/^/  /' >&2
  echo "Fix with: ./scripts/audit-mirror-visibility.sh --fix" >&2
  exit 1
fi

echo "All mirrors synced and public. Marketplace installs use RUSHYOP/mirror-* URLs."
