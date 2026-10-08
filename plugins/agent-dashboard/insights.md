# Insights (review notes)

- Plugins cannot add CLI flags; `claude "/cmd"` as the startup prompt runs the slash command, so a shell function gives `claude --dashboard`.
- `$.agent.list()` rejects when called from a `$.clock` timer ("no session is bound in this process"); anything polled must tolerate it.
- `$` may only be passed to functions declared at the top level of the hooks file (validator rule).
- Test hooks answering `$` calls must return `{ value }` / `{ deny }`, not bare values; `ProcessRunResult` needs both `is*Truncated` flags.
- Transcripts exceed `$.fs.read`'s 4 MiB cap (one was 11.8 MB): read tails via `tail -c`.
- No transcript on this machine uses TodoWrite/TaskCreate, so "tasks left" has no data source; progress uses subagents finished ÷ started.
- `~/.claude/sessions/<pid>.json` is the cross-session registry (status busy/idle, cwd, sessionId); verify pids with `ps -o comm=` against reuse.
- Open risk: other sessions only receive *messages*; Stop there is a request, not an interrupt.

## Review 2026-10-08 (Sonnet subagent, verified)

- macOS `ps -o comm=` is not always `claude`: retitled processes (`claude bg-spare`) and versioned binaries
  (`~/.local/share/claude/versions/2.1.294`) are real sessions. Test fixtures must use observed output, not idealized.
- `ps -p a,b,c` with one invalid pid prints only an error: never let one bad input blank the whole list.
- `$.tool.call` resolves `{deny}` / `isError` instead of throwing; `$.prompt.submit` resolves `{drop}`; `$.ui.open`
  resolves `{isPlaced:false}`. Check results, not just exceptions.
- A new iTerm window starts in $HOME, which may be untrusted: launch in a folder the user already trusts.
- Registry `status` lags the real turn; for this session use the turn id from `turn.start`.
- Lesson on my side: the first version shipped with test mocks that mirrored my assumptions, so they could not catch #1.
