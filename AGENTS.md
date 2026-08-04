# Repository guidelines

- Keep installable skills directly under `skills/<skill-name>/`.
- Use lowercase kebab-case for directory names and the `name` in `SKILL.md`.
- Treat `catalog.json` as the source of truth for marketplace metadata and provenance.
- Run `npm run marketplace:sync` after changing `catalog.json` or skill metadata.
- Run `npm run check` before committing.
- Do not modify collected skill content beyond compatibility fixes without recording the upstream source and license in `catalog.json`.
- Keep `SKILL.md` concise; put detailed material in `references/`, deterministic helpers in `scripts/`, and output resources in `assets/`.
- Never commit credentials, tokens, private endpoints, or other secrets.
