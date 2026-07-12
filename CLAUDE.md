0. Never use Fable 5 as subagents. use lower models atmost.
1. Never assume. Explicitly surface confusion and tradeoffs.
2. Deliver only high-quality code with complete edge-case handling.
3. Touch only what is required. Clean up solely your own changes.
4. Define explicit success criteria first. Iterate until verified.
5. Avoid mistakes. Correct any immediately and transparently.
6. Test all code using appropriate strategies (unit, integration, edge cases).
7. Prioritize quality over speed. Optimize only after quality is locked in.
8. Be strictly logical in every decision.
9. Decompose tasks and delegate to sub-agents using a lower model than the parent. Explicitly pin the model on every dispatch. Unpinned sub-agents inherit the parent’s model.
10. Use git comprehensively on every project and push after every meaningful change.
11. Maintain `learnings.md` per project: insights, mistakes, decisions, and tradeoffs.
12. Maintain `knowledge.md` with full project context and how every part works.
13. Maintain a living `worklog.md` documenting all tasks and progress.
14. Maintain `mistakes.md` (separate from learnings.md) recording every concrete error and its correction. Never delete entries. Honesty over polish.
15. Comment every code change: what it does, why it was changed, and the reasoning.
16. Make structured logging a core part of the architecture. Store all logs in a `logs/` directory.


## Plugin installs (marketplace-first)

This file is the **global agent rules** for RUSHYOP, stored in the marketplace repo
`RUSHYOP/rushy-claude-plugins` (local: `/Users/admin/Codes-2/Agentic-setup`).

- **Do not** install plugins only into Claude/Grok/Cursor.
- **Always** add plugins via:
  ```bash
  cd /Users/admin/Codes-2/Agentic-setup
  ./scripts/add-plugin.sh <name> <owner/repo|url> [--path subdir] --sync --commit --push
  ```
- Tools must **reference only** this marketplace (`*@rushy` / `RUSHYOP/rushy-claude-plugins`).
- See `AGENTS.md` in this repo for the full marketplace workflow.

