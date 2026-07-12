#!/usr/bin/env bash
# Sync private RUSHYOP mirrors from upstream remotes.
# Marketplace installs from mirrors; this job keeps mirrors fresh.
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

  if ! gh repo view "$gh_repo" &>/dev/null; then
    echo "Creating private $gh_repo..."
    gh repo create "$gh_repo" --private \
      --description "Private mirror of $upstream (DR for rushy marketplace)"
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
echo "All mirrors synced. Marketplace installs use RUSHYOP/mirror-* URLs."
