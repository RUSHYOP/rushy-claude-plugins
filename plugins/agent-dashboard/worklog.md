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
