# Worklog

## 2026-10-08 — v0.1.0

Success criteria:
1. `/dashboard` opens a full-height pane listing every live Claude session, grouped by codebase. ✅ (live: 10 sessions, 297 agents, first refresh 243 ms)
2. Each session lists its subagents with status. ✅
3. Each row: progress bar (finished ÷ total subagents), one Stop/Resume toggle, a Parallelise button. ✅ (tests)
4. `/dashboard window` opens it in a new terminal window. ⚠️ built, not exercised live
5. `claude --dashboard` shell shortcut. ✅ `claude /dashboard` verified to open the pane at startup
6. Structured logs under `logs/`. ✅
7. validate + tsc + tests pass. ✅ 28/28

Done:
- Pure model + 26 unit tests; 2 integration tests drawing the pane over a fake `~/.claude`.
- Fixed: `$.agent.list` is refused from timer callbacks ("no session is bound"); falls back to the transcript folder.
- Renamed from `claude-dashboard` (the `claude-` prefix is reserved).

## 2026-10-08 — v0.1.1 (review fixes)

- `/dashboard window`: new window opened in $HOME and stopped at the folder-trust prompt; now `cd`s into the
  current session's (trusted) folder and runs through the shell via iTerm `write text`. Verified live.
- Independent review (Sonnet subagent); fixed and tested:
  - live sessions run from `…/claude/versions/<v>` or retitled `claude bg-spare` were dropped (verified with real `ps`);
    one `ps -axo` call (a single bad pid blanked `ps -p`); spare workers skipped; duplicate session ids deduped
  - TaskStop `{deny}`/`isError` was reported as success → now falls back to asking the agent
  - `prompt.submit` drop and unplaced pane now reported, not "queued"/"opened"
  - polling could restart after close (render race) → `isClosed` guard; close handled after `next`
  - meta read failures no longer cached; labels stripped of control chars; 199/200 shows 99%; agents in tree order
  - this session's Stop/Resume follows the real turn; per-session log files; `.catch` on command/close hooks
- Not fixed (documented): >64 KiB final transcript row; long-cwd slug truncation (unverified).
- 40/40 tests, tsc clean, validate clean.
