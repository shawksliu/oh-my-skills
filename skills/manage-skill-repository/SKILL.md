---
name: manage-skill-repository
description: Create, import, update, validate, and publish Agent Skills in a shared GitHub repository compatible with npx skills add, Claude Code marketplaces, and Codex. Use when adding an owned skill, registering a collected third-party skill, editing catalog metadata, regenerating plugin manifests, checking repository structure, or preparing a skills release.
---

# Manage Skill Repository

Manage this repository through its checked-in scripts and metadata instead of editing generated marketplace manifests by hand.

## Workflow

1. Read the root `AGENTS.md`, `catalog.json`, and relevant existing skill files.
2. Decide whether the skill is `owned` or `collected`.
3. For an owned skill, run `npm run skill:create -- <name> --description "..."` and replace all scaffold placeholder content.
4. For a collected skill, copy the licensed upstream skill into `skills/<name>/`, then run `npm run skill:register -- <name> --type collected --source <url> --license <id>`.
5. Keep each installable skill directly under `skills/` and keep its frontmatter `name` equal to the directory name.
6. Run `npm run marketplace:sync` after metadata changes.
7. Run `npm run check`; fix every error before publishing.
8. Review `git diff` to ensure generated files, provenance, and unrelated content are correct.

## Rules

- Treat `catalog.json` as the source of truth for marketplace metadata.
- Do not manually edit generated `.claude-plugin/marketplace.json` or per-skill `.claude-plugin/plugin.json` files.
- Require an explicit source URL and license for every collected skill.
- Do not redistribute content without a compatible license or permission.
- Keep `SKILL.md` concise and move detailed guidance to `references/`.
- Preserve upstream content when collecting a skill unless a compatibility fix is necessary.

Read [references/repository-layout.md](references/repository-layout.md) when changing layout, metadata fields, or release behavior.

