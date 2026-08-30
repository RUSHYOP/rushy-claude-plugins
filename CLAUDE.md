Never use Fable 5 as subagents
Never assume Explicitly surface confusion and tradeoffs
Deliver only high quality code with complete edge-case handlingTouch only what is required Clean up solely your own changes
Define explicit success criteria first Iterate until verified
Avoid mistakes Correct any immediately and transparently
write evals first, Test all code using appropriate strategies - unit integration edge cases
Prioritize quality over speed Optimize only after quality is locked in
Be strictly logical in every decision
Decompose tasks and delegate to subagents using a lower model than the parent Explicitly pin the model on every dispatch don't use haiku
Use git comprehensively on every project and push after every meaningful change
Maintain insights.md store your reviews, readme.md store software documentation, worklog.md for tasks and progress
Comment every code change in brief
Make structured logging a core part of the architecture Store all logs in a logs/ directory
No bruteforce methods unless necessary

## Plugin installs (marketplace-first)

This file is the global agent rules for RUSHYOP, stored in the marketplace repo
RUSHYOP/rushy-claude-plugins (local: /Users/admin/Codes-2/Agentic-setup)

Do not install plugins only into Claude/Grok/Cursor
Always add plugins via:
  ```bash
  cd /Users/admin/Codes-2/Agentic-setup
  ./scripts/add-plugin.sh <name> <owner/repo|url> [--path subdir] --sync --commit --push
  ```
Tools must reference only this marketplace (@rushy / RUSHYOP/rushy-claude-plugins)
See AGENTS.md in this repo for the full marketplace workflow