# Insights (review notes)

- Plugins cannot add CLI flags; `claude "/cmd"` as the startup prompt runs the slash command, so a shell function gives `claude --dashboard`.
- `$.agent.list()` rejects when called from a `$.clock` timer ("no session is bound in this process"); anything polled must tolerate it.
- `$` may only be passed to functions declared at the top level of the hooks file (validator rule).
- Test hooks answering `$` calls must return `{ value }` / `{ deny }`, not bare values; `ProcessRunResult` needs both `is*Truncated` flags.
- Transcripts exceed `$.fs.read`'s 4 MiB cap (one was 11.8 MB): read tails via `tail -c`.
- No transcript on this machine uses TodoWrite/TaskCreate, so "tasks left" has no data source; progress uses subagents finished ÷ started.
- `~/.claude/sessions/<pid>.json` is the cross-session registry (status busy/idle, cwd, sessionId); verify pids with `ps -o comm=` against reuse.
- Open risk: other sessions only receive *messages*; Stop there is a request, not an interrupt.
