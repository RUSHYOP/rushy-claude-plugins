# r3f — Claude Code plugin

Local plugin pack of **React Three Fiber** skills.

## Structure

```
r3f/
  .claude-plugin/plugin.json   # plugin manifest
  skills/
    r3f-fundamentals/
    r3f-geometry/
    r3f-materials/
    r3f-lighting/
    r3f-textures/
    r3f-shaders/
    r3f-animation/
    r3f-interaction/
    r3f-loaders/
    r3f-physics/
    r3f-postprocessing/
    brain-viz-renderer/        # large-graph companion patterns
  README.md
```

Canonical location: `.claude/skills/r3f/`  
Portable install cache: `.claude/plugins/cache/local/r3f/1.0.0/`  
Top-level `.claude/skills/r3f-*` copies are **mirrors for discovery** — edit the pack, then re-sync mirrors if needed.

## Provenance

Most `r3f-*` skills are vendored from **[EnzeD/r3f-skills](https://github.com/EnzeD/r3f-skills)** (MIT).  
Verified upstream against R3F 8.x / drei 9.x / three r160+ / React 18+; treat version notes as guidance if you are on React 19.

`brain-viz-renderer` is project-specific (Brain Visualization large instanced-graph patterns).

## Re-sync from upstream

```bash
# from a clone of EnzeD/r3f-skills
cp -R /path/to/r3f-skills/skills/r3f-* .claude/skills/r3f/skills/
# refresh discovery mirrors
for d in .claude/skills/r3f/skills/*/; do
  name=$(basename "$d")
  rsync -a "$d" ".claude/skills/$name/"
done
# refresh plugin cache
rsync -a --delete .claude/skills/r3f/ .claude/plugins/cache/local/r3f/1.0.0/
```

In Claude Code, run `/reload-skills` after changes.
