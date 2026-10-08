# agent-dashboard

A full-terminal dashboard of every Claude Code session, agent and subagent running on this machine.

```
Agent dashboard                        10 sessions · 4 busy · 2 agents running · 12:23:32
▸ ~/Codes/auto-test
  ● auto-test-e7  busy · pid 27340        ████████░░  160/162 98%  [ Stop ] [ Parallelise ]
      ● AI runner phase 3+4  general-purpose · sonnet · running    [ Stop ] [ Parallelise ]
    ▾ 160 finished
```

## Install

```
/plugin install agent-dashboard@rushy
```

## Use

| How | What |
| --- | --- |
| `/dashboard` | Opens the dashboard as a full-height pane in the current session |
| `/dashboard window` | Opens a new iTerm (or Terminal) window running a dedicated dashboard session |
| `claude --dashboard` | Shell shortcut (see below): this terminal becomes the dashboard |

Claude Code plugins cannot add CLI flags, so `claude --dashboard` is a shell function that runs `claude /dashboard`:

```bash
# claude --dashboard → start a session that opens the agent dashboard
claude() {
  if [ "$1" = "--dashboard" ]; then shift; command claude "$@" /dashboard; else command claude "$@"; fi
}
```

## What it shows

- **Codebase** (session working directory) → **session** → **subagents**, refreshed every 3 s while open.
- Sessions come from `~/.claude/sessions/<pid>.json`, kept only when the pid is a live `claude` process.
- Subagents of other sessions come from `~/.claude/projects/<slug>/<sessionId>/subagents/` (only those written since the session started); status is read from each transcript's tail: `end_turn` → done, otherwise running, or **stalled** after 10 min without writes.
- This session's own agents come from the engine (`$.agent.list()`), with exact status and nesting.
- **Progress bar** = finished subagents ÷ subagents started in that session. This is a stand-in: no session on this machine uses Claude's task tools, so there is no real "tasks left" count.

## Controls

| Target | Stop / Resume (one toggle) | Parallelise |
| --- | --- | --- |
| This session | aborts the running turn / submits "continue" | submits a fan-out request |
| This session's agent | `TaskStop` / message resumes it | message asking it to fan out |
| Another session | message: "stop after your current step" / "continue" | message asking it to fan out |
| Another session's subagent | message to its session naming the agent | same |

Messages to other sessions are requests: the receiving session decides when to act. There is no clean way to pause another process, so the dashboard does not send signals.

## Logs

Structured JSONL in `logs/dashboard-YYYY-MM-DD.jsonl` (pane open/close, first refresh with timing, refresh errors, every button action and its outcome). Bounded at 2 MB per file.

## Develop

```
claude plugin validate .
claude plugin test .
tsc -p .            # after the engine has loaded the plugin once
```

Pure logic lives in `hooks/model.ts` (unit-tested in `tests/model.test.ts`); `hooks/register.tsx` holds the hooks and drawing (integration-tested in `tests/dashboard.test.tsx` against a fake `~/.claude`).
