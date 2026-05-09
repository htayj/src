---
name: pi-skill-authoring
description: Use when creating or improving Pi/Agent Skills. Covers structure, frontmatter, progressive disclosure, references, scripts, and validation.
---
# Pi Skill Authoring

A skill is a directory with `SKILL.md` and optional scripts/references/assets.

Required frontmatter:
```yaml
---
name: my-skill
description: Specific trigger/use description under 1024 chars.
---
```

Guidelines:
- Put only trigger-worthy overview and core procedure in `SKILL.md`.
- Move long examples/API details into `references/` and link them.
- Include executable helpers in `scripts/` with clear setup/usage.
- Make descriptions specific enough for automatic activation.
- Avoid repo-private assumptions unless the skill is intentionally project-local.
