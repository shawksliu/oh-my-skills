# Repository layout and metadata

## Canonical locations

- Installable skills: `skills/<name>/SKILL.md`
- Catalog source: `catalog.json`
- Generated marketplace: `.claude-plugin/marketplace.json`
- Generated plugin manifest: `skills/<name>/.claude-plugin/plugin.json`

Keep skill directories flat. Nested category directories can reduce compatibility with clients that only scan known one-level skill paths.

## Catalog entries

Every skill entry includes:

- `type`: `owned` or `collected`
- `displayName`: human-readable title
- `description`: marketplace summary
- `version`: semantic version
- `license`: SPDX identifier or precise upstream license label
- `category`: optional marketplace category
- `tags`: optional discovery terms
- `source`: required for collected skills

The catalog key, directory name, `SKILL.md` name, and plugin name must match.

## Generated files

`npm run marketplace:sync` derives Claude Code manifests from the catalog. Commit generated files so GitHub consumers can install the repository without a build step.

`npm run check` compares checked-in manifests with freshly generated data, validates frontmatter and names, rejects unfinished `TODO` markers, and verifies collected-skill provenance.
