"""Verify every local plugin's version is newer than its content. See check-plugin-versions.sh."""
import json, os, subprocess, sys

# Only these paths affect what the Claude plugin cache serves. Changes to .copilot-plugin/,
# .grok-plugin/, or README must NOT require a Claude-side version bump.
RELEVANT = (".claude-plugin", "skills", "commands", "agents", "hooks")


def git(*args):
    return subprocess.run(("git",) + args, capture_output=True, text=True).stdout.strip()


def version_at(rev, path):
    """Version recorded in `path` at `rev`, or None if the file is absent/unparseable there."""
    blob = subprocess.run(["git", "show", f"{rev}:{path}"], capture_output=True, text=True)
    if blob.returncode != 0:
        return None
    try:
        return json.loads(blob.stdout).get("version")
    except json.JSONDecodeError:
        return None


def last_bump(manifest):
    """Newest commit that actually changed the version value.

    `git log -S'"version"'` cannot be used: the pickaxe counts *occurrences* of a string, and
    editing a version's value leaves the count unchanged — so it reports the commit that first
    added the line, not the last bump.
    """
    for sha in git("log", "--format=%H", "--", manifest).splitlines():
        parents = git("rev-parse", f"{sha}^@").split()
        before = version_at(parents[0], manifest) if parents else None
        if version_at(sha, manifest) != before:
            return sha
    return None


def main():
    problems = []
    marketplace = json.load(open(".claude-plugin/marketplace.json"))
    declared = {p["name"]: p.get("version") for p in marketplace["plugins"]}

    for name in sorted(os.listdir("plugins")):
        manifest = f"plugins/{name}/.claude-plugin/plugin.json"
        if not os.path.isfile(manifest):
            continue

        local = json.load(open(manifest)).get("version")
        if name in declared and declared[name] != local:
            problems.append(
                f"MISMATCH  {name} — plugin.json={local} marketplace.json={declared[name]}"
            )

        # An uncommitted bump in the working tree counts: the fix is staged, just not
        # committed yet. Without this the check keeps firing on the very commit that fixes it.
        if local != version_at("HEAD", manifest):
            continue

        bump = last_bump(manifest)
        if not bump:
            continue
        paths = [f"plugins/{name}/{p}" for p in RELEVANT]
        newer = git("rev-list", "--count", f"{bump}..HEAD", "--", *paths)
        if newer and int(newer) > 0:
            problems.append(
                f"STALE     {name} — {newer} commit(s) to skills/manifest since "
                f"version {local} was set ({bump[:7]}). Bump the version or the cache "
                f"will keep serving the old tree."
            )

    for p in problems:
        print(p)
    if problems:
        return 1
    print("OK — all local plugin versions current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
