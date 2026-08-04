#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  loadCatalog,
  namePattern,
  parseArguments,
  parseSkillFrontmatter,
  saveCatalog,
  skillsDirectory,
  syncGeneratedFiles,
  titleFromName,
  versionPattern,
} from './lib.mjs';

const usage = `Usage:
  npm run skill:register -- <name> [options]

Options:
  --display-name <title>       Defaults to title-cased directory name
  --description <text>         Defaults to SKILL.md description
  --type <owned|collected>     Defaults to owned
  --version <semver>           Defaults to 0.1.0
  --license <id>               Defaults to MIT for owned skills
  --source <url>               Required for collected skills
  --category <name>            Marketplace category
  --tags <a,b,c>               Comma-separated tags`;

function fail(message) {
  console.error(`Error: ${message}\n\n${usage}`);
  process.exit(1);
}

const { positional, options } = parseArguments(process.argv.slice(2));
const name = positional[0];
const type = options.type ?? 'owned';
const version = options.version ?? '0.1.0';
const license = options.license ?? (type === 'owned' ? 'MIT' : undefined);

if (!name || !namePattern.test(name)) fail('name must use lowercase kebab-case');
if (!['owned', 'collected'].includes(type)) fail('--type must be owned or collected');
if (!versionPattern.test(version)) fail('--version must be semantic versioning, for example 0.1.0');
if (!license) fail('--license is required for collected skills');
if (type === 'collected' && !options.source) fail('--source is required for collected skills');

const skillDirectory = path.join(skillsDirectory, name);
const skillPath = path.join(skillDirectory, 'SKILL.md');
if (!fs.existsSync(skillPath)) fail(`skills/${name}/SKILL.md does not exist`);

let frontmatter;
try {
  frontmatter = parseSkillFrontmatter(skillPath).metadata;
} catch (error) {
  fail(`cannot parse skills/${name}/SKILL.md: ${error.message}`);
}
if (frontmatter.name !== name) fail(`SKILL.md name must be ${name}`);

const catalog = loadCatalog();
if (catalog.skills[name]) fail(`catalog entry ${name} already exists`);

const tags = typeof options.tags === 'string'
  ? options.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
  : undefined;
catalog.skills[name] = {
  type,
  displayName: options['display-name'] ?? titleFromName(name),
  description: options.description ?? frontmatter.description,
  version,
  license,
  ...(options.source ? { source: options.source } : {}),
  ...(options.category ? { category: options.category } : {}),
  ...(tags?.length ? { tags } : {}),
};

saveCatalog(catalog);
syncGeneratedFiles(catalog);
console.log(`Registered skills/${name} and refreshed marketplace manifests.`);
