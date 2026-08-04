#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  catalogPath,
  expectedMarketplace,
  expectedPluginManifest,
  listSkillNames,
  loadCatalog,
  marketplacePath,
  namePattern,
  parseSkillFrontmatter,
  readJson,
  skillsDirectory,
  versionPattern,
} from './lib.mjs';

const errors = [];
const warnings = [];
const error = (message) => errors.push(message);
const warning = (message) => warnings.push(message);
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

let catalog;
try {
  catalog = loadCatalog();
} catch (cause) {
  console.error(`ERROR ${path.relative(process.cwd(), catalogPath)}: ${cause.message}`);
  process.exit(1);
}

if (!catalog.marketplace || typeof catalog.marketplace !== 'object') {
  error('catalog.marketplace must be an object');
} else {
  if (!namePattern.test(catalog.marketplace.name ?? '')) error('marketplace name must use lowercase kebab-case');
  if (!catalog.marketplace.owner?.name) error('marketplace owner.name is required');
  if (!catalog.marketplace.description) error('marketplace description is required');
  if (!versionPattern.test(catalog.marketplace.version ?? '')) error('marketplace version must use semantic versioning');
}

if (!catalog.skills || typeof catalog.skills !== 'object' || Array.isArray(catalog.skills)) {
  error('catalog.skills must be an object');
  catalog.skills = {};
}

const directoryNames = listSkillNames();
const catalogNames = Object.keys(catalog.skills).sort();
for (const name of directoryNames.filter((item) => !catalog.skills[item])) {
  error(`skills/${name} is missing from catalog.json`);
}
for (const name of catalogNames.filter((item) => !directoryNames.includes(item))) {
  error(`catalog entry ${name} has no skills/${name} directory`);
}

for (const name of directoryNames) {
  if (!namePattern.test(name) || name.length > 64) {
    error(`skills/${name}: directory name must be lowercase kebab-case and at most 64 characters`);
  }

  const skillPath = path.join(skillsDirectory, name, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    error(`skills/${name}/SKILL.md is missing`);
    continue;
  }

  let parsed;
  try {
    parsed = parseSkillFrontmatter(skillPath);
  } catch (cause) {
    error(`skills/${name}/SKILL.md: ${cause.message}`);
    continue;
  }

  if (!parsed.metadata.name || !parsed.metadata.description) {
    error(`skills/${name}/SKILL.md: frontmatter must contain name and description`);
  }
  if (parsed.metadata.name !== name) {
    error(`skills/${name}/SKILL.md: frontmatter name must match the directory`);
  }
  if (!parsed.metadata.description || parsed.metadata.description.length < 20) {
    error(`skills/${name}/SKILL.md: description must clearly explain the skill and trigger context`);
  }
  if (/\bTODO\b/i.test(parsed.content)) {
    error(`skills/${name}/SKILL.md: remove all TODO markers before publishing`);
  }
  if (parsed.content.split(/\r?\n/).length > 500) {
    warning(`skills/${name}/SKILL.md exceeds 500 lines; consider progressive disclosure`);
  }

  const entry = catalog.skills[name];
  if (!entry) continue;
  if (!['owned', 'collected'].includes(entry.type)) error(`catalog ${name}: type must be owned or collected`);
  if (!entry.displayName) error(`catalog ${name}: displayName is required`);
  if (!entry.description) error(`catalog ${name}: description is required`);
  if (!versionPattern.test(entry.version ?? '')) error(`catalog ${name}: version must use semantic versioning`);
  if (!entry.license) error(`catalog ${name}: license is required`);
  if (entry.type === 'collected' && !entry.source) error(`catalog ${name}: collected skills require source`);
  if (entry.description !== parsed.metadata.description) {
    warning(`catalog ${name}: marketplace description differs from SKILL.md description`);
  }

  const pluginPath = path.join(skillsDirectory, name, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(pluginPath)) {
    error(`skills/${name}/.claude-plugin/plugin.json is missing; run npm run marketplace:sync`);
  } else {
    try {
      const actual = readJson(pluginPath);
      const expected = expectedPluginManifest(name, entry, catalog);
      if (!sameJson(actual, expected)) error(`skills/${name}/.claude-plugin/plugin.json is stale; run npm run marketplace:sync`);
    } catch (cause) {
      error(`skills/${name}/.claude-plugin/plugin.json: ${cause.message}`);
    }
  }

  const openAiPath = path.join(skillsDirectory, name, 'agents', 'openai.yaml');
  if (fs.existsSync(openAiPath)) {
    const openAi = fs.readFileSync(openAiPath, 'utf8');
    if (!openAi.includes(`$${name}`)) warning(`skills/${name}/agents/openai.yaml: default_prompt should mention $${name}`);
  }
}

if (!fs.existsSync(marketplacePath)) {
  error('.claude-plugin/marketplace.json is missing; run npm run marketplace:sync');
} else {
  try {
    const actual = readJson(marketplacePath);
    const expected = expectedMarketplace(catalog);
    if (!sameJson(actual, expected)) error('.claude-plugin/marketplace.json is stale; run npm run marketplace:sync');
  } catch (cause) {
    error(`.claude-plugin/marketplace.json: ${cause.message}`);
  }
}

for (const message of warnings) console.warn(`WARN  ${message}`);
for (const message of errors) console.error(`ERROR ${message}`);

if (errors.length) {
  console.error(`\nValidation failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`Validated ${directoryNames.length} skill(s) with ${warnings.length} warning(s).`);
