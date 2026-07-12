#!/usr/bin/env bash
# Back-compat wrapper → import-from-clis.sh --claude-only
exec "$(cd "$(dirname "$0")" && pwd)/import-from-clis.sh" --claude-only "$@"
