# Worklog — rushy marketplace

## 2026-08-01 — Make all mirrors public (marketplace consumable by anyone)

**Problem reported:** people could not access the marketplace's mirror
repositories, because mirrors were created as private repos under RUSHYOP.

**Diagnosis (measured, not assumed):**

| Target | Unauthenticated check | Result |
|--------|----------------------|--------|
| `RUSHYOP/rushy-claude-plugins` | `GET /repos/...` | **200 — already public** |
| all 16 `RUSHYOP/mirror-*` | `GET /repos/...` | **404 — private** |

So first-party ("personal") plugins were already publicly reachable: all 13 live
in `plugins/` in this repo, are committed, and are served as `./plugins/<name>`
from a public repo. Only the upstream mirrors were broken. The README claiming
the marketplace was private was stale and part of what made this confusing.

**Changes:**

1. Flipped all 16 `RUSHYOP/mirror-*` repos from private to public.
2. `scripts/lib/mirror-visibility.sh` (new) — single implementation of the
   public-mirror policy: `mirror_visibility()` + idempotent
   `ensure_mirror_public()`.
3. `scripts/audit-mirror-visibility.sh` (new) — audits every mirror referenced by
   `mirrors/registry.tsv` ∪ `marketplace.json`; `--fix` repairs. Non-zero exit
   when any mirror is not public.
4. `scripts/sync-mirrors.sh` — creates new mirrors with `--public` (was
   `--private`), and self-heals pre-existing non-public mirrors on every sync.
   Exits non-zero if any mirror could not be made public.
5. Rewrote every "private mirror" claim in `marketplace.json` (26 strings),
   `marketplace_io.py` (so future `add-plugin.sh` runs emit correct wording),
   `UPSTREAM.md`, `README.md`, `AGENTS.md`, `.cursor-plugin/marketplace.json`,
   `apply-cursor.sh`, `import-from-clis.sh`, `add-plugin.sh`,
   `hooks/auto-add-from-clis.sh`.
6. Replaced the obsolete README troubleshooting step (`gh auth switch --user
   RUSHYOP` to clone mirrors) with the audit/repair commands. Consumers no
   longer need to authenticate at all; only *changing* visibility needs the owner.

**Verified:**

- All 16 mirrors return unauthenticated HTTP 200.
- `git ls-remote` succeeds against mirrors with the credential helper fully
  disabled (`GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
  GIT_TERMINAL_PROMPT=0`) — the true consumer path.
- `audit-mirror-visibility.sh` exits 0, "all 16 mirrors are public".
- `sync-mirrors.sh --only mirror-ayghri-i-have-adhd` ran green end-to-end
  (fetch → `visibility: PUBLIC (ok)` → push).
- All touched shell scripts pass `bash -n`; both marketplace JSONs parse.
- `entry_from_git()` output contains no "private" wording.

**Not verified (flagged):** the `gh repo create --public` new-mirror branch is
inspection-only. Creating a throwaway repo to test it would leave a stray repo
behind, since the RUSHYOP token lacks the `delete_repo` scope. Mitigated by two
independent backstops: the `else` self-heal in `sync_one`, and the audit script.
