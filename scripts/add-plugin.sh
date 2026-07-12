#!/usr/bin/env bash
# PRIMARY way to add a plugin: into THIS marketplace, then commit.
# AI tools and humans must NOT install plugins only into a CLI.
# Flow: add here → mirror (optional) → commit/push → CLIs reference *@rushy / this marketplace.
#
# Usage:
#   # Upstream full repo
#   ./scripts/add-plugin.sh superpowers https://github.com/obra/superpowers.git
#   ./scripts/add-plugin.sh superpowers obra/superpowers
#
#   # Upstream monorepo subdir
#   ./scripts/add-plugin.sh static-analysis trailofbits/skills --path plugins/static-analysis
#   ./scripts/add-plugin.sh static-analysis https://github.com/trailofbits/skills.git --path plugins/static-analysis
#
#   # From a marketplace you already have cloned under ~/.claude/plugins/marketplaces
#   ./scripts/add-plugin.sh frontend-design --marketplace claude-plugins-official
#
#   # First-party (code already under plugins/<name>/)
#   ./scripts/add-plugin.sh my-plugin --first-party
#   ./scripts/add-plugin.sh my-plugin --first-party --dir my-plugin
#
#   ./scripts/add-plugin.sh NAME SOURCE [options]
#     --path SUBDIR       git-subdir inside the repo
#     --marketplace NAME  resolve from known marketplace clone
#     --first-party       register local plugins/NAME
#     --dir DIR           first-party directory name under plugins/
#     --description TEXT
#     --sync              run sync-mirrors for the new upstream only
#     --commit            git commit catalog changes
#     --push              git push after commit
#     --dry-run

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ $# -lt 1 ]]; then
  sed -n '2,30p' "$0"
  exit 1
fi

NAME=""
SOURCE=""
PATH_OPT=""
MARKET=""
FIRST=0
DIR=""
DESC=""
SYNC=0
COMMIT=0
PUSH=0
DRY=0

ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path) PATH_OPT="${2:-}"; shift 2 ;;
    --marketplace) MARKET="${2:-}"; shift 2 ;;
    --first-party) FIRST=1; shift ;;
    --dir) DIR="${2:-}"; shift 2 ;;
    --description) DESC="${2:-}"; shift 2 ;;
    --sync) SYNC=1; shift ;;
    --commit) COMMIT=1; shift ;;
    --push) PUSH=1; shift ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

NAME="${ARGS[0]:-}"
SOURCE="${ARGS[1]:-}"

if [[ -z "$NAME" ]]; then
  echo "Usage: $0 NAME [SOURCE] [options]" >&2
  exit 1
fi

# Parse SOURCE into git URL
GIT_URL=""
if [[ "$FIRST" -eq 1 ]]; then
  :
elif [[ -n "$MARKET" ]]; then
  :
elif [[ -n "$SOURCE" ]]; then
  if [[ "$SOURCE" == *#* ]]; then
    base="${SOURCE%%#*}"
    PATH_OPT="${PATH_OPT:-${SOURCE#*#}}"
    SOURCE="$base"
  fi
  if [[ "$SOURCE" =~ ^https?:// ]] || [[ "$SOURCE" == git@* ]]; then
    GIT_URL="$SOURCE"
  elif [[ "$SOURCE" =~ ^[^/]+/[^/]+$ ]]; then
    GIT_URL="https://github.com/${SOURCE}.git"
  else
    echo "Cannot parse SOURCE as git URL or owner/repo: $SOURCE" >&2
    exit 1
  fi
elif [[ "$FIRST" -eq 0 && -z "$MARKET" ]]; then
  echo "Provide SOURCE (git URL or owner/repo), --marketplace, or --first-party" >&2
  exit 1
fi

export ADD_NAME="$NAME"
export ADD_GIT="$GIT_URL"
export ADD_PATH="$PATH_OPT"
export ADD_MARKET="$MARKET"
export ADD_FIRST="$FIRST"
export ADD_DIR="${DIR:-$NAME}"
export ADD_DESC="$DESC"
export ADD_DRY="$DRY"

MIRROR_NAME=$(python3 <<'PY'
import os, sys
sys.path.insert(0, "scripts/lib")
from marketplace_io import add_plugin, is_upstream_entry

kwargs = dict(
    name=os.environ["ADD_NAME"],
    description=os.environ.get("ADD_DESC") or "",
    dry_run=os.environ.get("ADD_DRY") == "1",
)
if os.environ.get("ADD_FIRST") == "1":
    kwargs["first_party_dir"] = os.environ.get("ADD_DIR") or os.environ["ADD_NAME"]
elif os.environ.get("ADD_MARKET"):
    kwargs["marketplace"] = os.environ["ADD_MARKET"]
    if os.environ.get("ADD_PATH"):
        kwargs["subpath"] = os.environ["ADD_PATH"]
elif os.environ.get("ADD_GIT"):
    kwargs["git_url"] = os.environ["ADD_GIT"]
    if os.environ.get("ADD_PATH"):
        kwargs["subpath"] = os.environ["ADD_PATH"]
else:
    print("missing source", file=sys.stderr)
    sys.exit(1)

try:
    entry = add_plugin(**kwargs)
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)

print(f"OK plugin={entry['name']}")
print(f"  ownership={(entry.get('metadata') or {}).get('ownership')}")
src = entry.get("source")
if isinstance(src, str):
    print(f"  source={src}")
else:
    print(f"  install={src.get('url')} path={src.get('path', '')} ref={src.get('ref', 'main')}")
meta = entry.get("metadata") or {}
if meta.get("upstreamUrl"):
    print(f"  upstream={meta['upstreamUrl']}")
if meta.get("mirrorRepo"):
    print(f"  mirror={meta['mirrorRepo']}")
    print(f"MIRROR:{meta['mirrorRepo'].split('/')[-1]}")
if os.environ.get("ADD_DRY") == "1":
    print("dry-run: not written")
PY
)

# Extract mirror name for optional sync
MIRROR=""
while IFS= read -r line; do
  echo "$line"
  if [[ "$line" == MIRROR:* ]]; then
    MIRROR="${line#MIRROR:}"
  fi
done <<< "$MIRROR_NAME"

if [[ "$DRY" -eq 1 ]]; then
  exit 0
fi

./scripts/generate-global-config.sh >/dev/null 2>&1 || true

if [[ "$SYNC" -eq 1 && -n "$MIRROR" ]]; then
  echo "==> Creating/refreshing private mirror $MIRROR"
  ./scripts/sync-mirrors.sh --only "$MIRROR"
elif [[ -n "$MIRROR" ]]; then
  echo ""
  echo "Next (DR mirror): ./scripts/sync-mirrors.sh --only $MIRROR"
fi

if [[ "$COMMIT" -eq 1 ]]; then
  git add .claude-plugin/marketplace.json UPSTREAM.md mirrors/registry.tsv config/ 2>/dev/null || true
  if git diff --cached --quiet; then
    echo "No changes to commit."
  else
    git commit -m "feat(marketplace): add plugin ${NAME}"
    echo "Committed."
  fi
fi

if [[ "$PUSH" -eq 1 ]]; then
  git push origin HEAD
  echo "Pushed."
fi

echo ""
echo "Plugin is in the marketplace. CLIs must reference this marketplace only:"
echo "  Grok:   grok plugin marketplace add RUSHYOP/rushy-claude-plugins"
echo "          then install/enable from marketplace (not from random git URLs)"
echo "  Claude: enable ${NAME}@rushy after marketplace is registered"
echo "  Do not install this plugin from upstream URLs in tools."
