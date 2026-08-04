#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  loadCatalog,
  namePattern,
  parseArguments,
  saveCatalog,
  skillsDirectory,
  syncGeneratedFiles,
  titleFromName,
  versionPattern,
  yamlDoubleQuote,
} from './lib.mjs';

const usage = `Usage:
  npm run skill:create -- <name> --description "What it does and when to use it" [options]

Options:
  --display-name <title>       Human-readable name
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
const description = options.description;
const type = options.type ?? 'owned';
const version = options.version ?? '0.1.0';
const license = options.license ?? (type === 'owned' ? 'MIT' : undefined);

if (!name || !namePattern.test(name)) fail('name must use lowercase kebab-case');
if (!description || typeof description !== 'string') fail('--description is required');
if (!['owned', 'collected'].includes(type)) fail('--type must be owned or collected');
if (!versionPattern.test(version)) fail('--version must be semantic versioning, for example 0.1.0');
if (!license) fail('--license is required for collected skills');
if (type === 'collected' && !options.source) fail('--source is required for collected skills');

const skillDirectory = path.join(skillsDirectory, name);
if (fs.existsSync(skillDirectory)) fail(`skills/${name} already exists`);

const displayName = options['display-name'] ?? titleFromName(name);
const shortDescription = description.length <= 64 ? description : `${description.slice(0, 61)}...`;
const tags = typeof options.tags === 'string'
  ? options.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
  : undefined;

fs.mkdirSync(path.join(skillDirectory, 'agents'), { recursive: true });
fs.writeFileSync(
  path.join(skillDirectory, 'SKILL.md'),
  `---\nname: ${name}\ndescription: ${yamlDoubleQuote(description)}\n---\n\n# ${displayName}\n\n## Workflow\n\n1. TODO: Describe the first required action.\n2. TODO: Describe the execution steps and decision points.\n3. TODO: Describe verification and expected output.\n\n## Constraints\n\n- TODO: Record important safety, quality, or compatibility constraints.\n`,
  'utf8',
);
fs.writeFileSync(
  path.join(skillDirectory, 'agents', 'openai.yaml'),
  `interface:\n  display_name: ${yamlDoubleQuote(displayName)}\n  short_description: ${yamlDoubleQuote(shortDescription)}\n  default_prompt: ${yamlDoubleQuote(`Use $${name} to complete this task.`)}\n`,
  'utf8',
);

const catalog = loadCatalog();
if (catalog.skills[name]) fail(`catalog entry ${name} already exists`);
catalog.skills[name] = {
  type,
  displayName,
  description,
  version,
  license,
  ...(options.source ? { source: options.source } : {}),
  ...(options.category ? { category: options.category } : {}),
  ...(tags?.length ? { tags } : {}),
};
saveCatalog(catalog);
syncGeneratedFiles(catalog);

console.log(`Created skills/${name}.`);
console.log('Replace every TODO in SKILL.md, then run npm run check.');
