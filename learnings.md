# Learnings — rushy marketplace

## A mirror is a published URL, not a backup

The original design treated `RUSHYOP/mirror-*` as private disaster-recovery
copies. That is incoherent with how they are actually used: `marketplace.json`
publishes the mirror URL as `plugins[].source.url`, so **every consumer clones it
with their own credentials**. A private mirror is therefore not "a backup only I
can see" — it is a hard 404 for everyone else, while looking perfectly fine to
the owner.

**Rule:** any repo whose URL appears in `marketplace.json` must be public. DR and
access control are separate concerns; the mirror gives DR (survives upstream
deletion) regardless of visibility.

## GitHub's 404 hides the real cause

A private repo you cannot see returns `Repository not found`, identical to a repo
that does not exist. That is why this presented as "people can't access my
mirrors" rather than "permission denied", and why the old README reached for
`gh auth switch --user RUSHYOP` as the fix — a workaround that only ever worked
for the owner and could never work for a consumer.

**Practice:** diagnose access problems with a genuinely unauthenticated request,
not with `gh` (which is always authenticated and will happily report success):

```bash
curl -s -o /dev/null -w '%{http_code}' https://api.github.com/repos/OWNER/REPO
GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null GIT_TERMINAL_PROMPT=0 \
  git ls-remote https://github.com/OWNER/REPO.git HEAD
```

## Enforce policy at the point of creation *and* repair

Changing `gh repo create --private` → `--public` only fixes mirrors created after
the change. Existing mirrors, and any created by an older checkout of the script,
stay broken and silently so. `sync-mirrors.sh` therefore also repairs visibility
on every run, and `audit-mirror-visibility.sh` exits non-zero on drift so it can
gate CI. Create-time defaults alone are not a guarantee.

## Trade-off accepted: docs said "private" in 10 places

The stale wording was itself part of the bug — it taught users (and agents
reading `AGENTS.md`) that mirrors were meant to be private. Fixing visibility
without fixing the wording would have invited the next mirror to be created
private again. Hence the wording sweep, and the explicit visibility policy at the
top of `AGENTS.md`.

## MCP as opt-in plugins, not a forced blob

Applying `config/mcp-servers.json` into `~/.claude.json` as a merge-all turned
every personal/internal server on for anyone who ran `apply-mcp.sh`. The catalog
is now the source of truth, and each server is a marketplace plugin with
`defaultEnabled: false`. Clients get disabled adapter entries unless `--enable`
is passed. `playwright` is not duplicated as a first-party plugin because
`playwright@rushy` already ships that MCP.

## Gemini has no marketplace.json

Claude/Grok/Cursor all have a catalog file. Gemini CLI / Antigravity consume
per-directory `gemini-extension.json`. Resolving this repo for Gemini means
linking (or merging) each `plugins/<mcp>/` extension, not adding one marketplace
URL.

## Portability: don't assume bash 4+

These scripts run on any machine that clones the marketplace, and macOS ships
bash 3.2, where `mapfile` does not exist and `${#empty_array[@]}` errors under
`set -u`. New scripts use newline-delimited strings and counters instead of
arrays. (The pre-existing `import-from-clis.sh` still uses `mapfile` — untouched
here, but it is bash 4+ only.)

## 2026-08-30 — Extracting a design language from a production site
- **Flattening CSS custom properties across files produces a chimera.** A `grep`-all + `sort -u` over warp.dev's four stylesheets yielded contradictory tokens (`--radius` as both `.125rem` and `.625rem`, three different `--color-border`). Production sites ship a Tailwind/utility bundle *plus* a small brand file; only the latter is the design language.
- **Find the brand layer by grepping each file for the brand-token names, not by size.** Here the 242KB file was utilities and the identity lived in a single `.factories-landing{...}` block of 30 declarations inside the 58KB file.
- **Icons are never in the CSS.** Identify from SVG `viewBox`: `0 0 256 256` = Phosphor, `0 0 24 24` + `stroke-width=2` = Lucide/Feather, `0 0 20 20` solid = Heroicons.
- **For font substitution, use the site's own declared fallback** rather than picking a lookalike — it is the substitution the original designers already accepted (Warp's `matterMono` falls back to Azeret Mono, which is free on Google Fonts).
- **Verify by rebuild, not by reading.** Building a demo page from only the shipped CSS and screenshot-diffing it against the live page caught a real semantic error: the 30px diff gutter holds a single `+`/`-` marker, not a line number.
