# android-skills (vendored)

Vendored from https://github.com/android/skills (mirrored at
RUSHYOP/mirror-android-skills). Upstream follows the agentskills.io layout
(SKILL.md files nested under domain dirs, no .claude-plugin manifest), which
Claude Code plugins cannot consume directly — so the leaf skill directories
are copied here under skills/<frontmatter-name>/ with a generated
plugin.json.

Refresh: re-run scripts/sync-mirrors.sh, then re-copy each `**/SKILL.md`
leaf dir from the mirror into skills/ (same flattening).
