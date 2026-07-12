---
description: Show rushy marketplace drift status (CLI installs missing from catalog).
---

# Marketplace status

Report whether Claude/Grok have plugins that are not yet in the rushy catalog.

## Commands

```bash
ROOT="${RUSHY_MARKETPLACE_ROOT:-/Users/admin/Codes-2/Agentic-setup}"
cd "$ROOT"
./hooks/check-cli-drift.sh
echo "---"
test -f logs/cli-drift-status.txt && cat logs/cli-drift-status.txt || true
```

Summarize:

- How many plugins would be **ADDED**
- Their names (lines with `+ name@cli`)
- New mirrors that would be registered
- Exact next command to reconcile (`./hooks/reconcile.sh --commit --push`)

Do not write the catalog unless the user asks to reconcile.
