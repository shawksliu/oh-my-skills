import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const rootDirectory = path.resolve(scriptDirectory, '..');
export const skillsDirectory = path.join(rootDirectory, 'skills');
export const catalogPath = path.join(rootDirectory, 'catalog.json');
export const marketplacePath = path.join(rootDirectory, '.claude-plugin', 'marketplace.json');

export const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const versionPattern = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export function readJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function loadCatalog() {
  return readJson(catalogPath);
}

export function saveCatalog(catalog) {
  writeJson(catalogPath, catalog);
}

export function listSkillNames() {
  if (!fs.existsSync(skillsDirectory)) return [];
  return fs
    .readdirSync(skillsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

export function parseSkillFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('missing YAML frontmatter');

  const metadata = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const separator = rawLine.indexOf(':');
    if (separator < 1) throw new Error(`invalid frontmatter line: ${rawLine}`);
    const key = rawLine.slice(0, separator).trim();
    let value = rawLine.slice(separator + 1).trim();
    if (!value) throw new Error(`empty frontmatter value: ${key}`);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      try {
        value = value.startsWith('"') ? JSON.parse(value) : value.slice(1, -1).replace(/''/g, "'");
      } catch {
        throw new Error(`invalid quoted frontmatter value: ${key}`);
      }
    }
    metadata[key] = value;
  }

  return { metadata, content };
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

export function expectedMarketplace(catalog = loadCatalog()) {
  const plugins = Object.entries(catalog.skills)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, entry]) => compactObject({
      name,
      source: `./skills/${name}`,
      description: entry.description,
      version: entry.version,
      author: compactObject({
        name: catalog.marketplace.owner.name,
        email: catalog.marketplace.owner.email,
      }),
      category: entry.category,
      tags: entry.tags?.length ? entry.tags : undefined,
    }));

  return {
    $schema: 'https://anthropic.com/claude-code/marketplace.schema.json',
    name: catalog.marketplace.name,
    owner: catalog.marketplace.owner,
    metadata: {
      description: catalog.marketplace.description,
      version: catalog.marketplace.version,
    },
    plugins,
  };
}

export function syncGeneratedFiles(catalog = loadCatalog()) {
  for (const name of listSkillNames()) {
    const legacyPluginDir = path.join(skillsDirectory, name, '.claude-plugin');
    if (fs.existsSync(legacyPluginDir)) {
      fs.rmSync(legacyPluginDir, { recursive: true, force: true });
    }
  }

  writeJson(marketplacePath, expectedMarketplace(catalog));
}

export function parseArguments(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) {
      positional.push(argument);
      continue;
    }

    const equals = argument.indexOf('=');
    if (equals > 2) {
      options[argument.slice(2, equals)] = argument.slice(equals + 1);
      continue;
    }

    const key = argument.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return { positional, options };
}

export function titleFromName(name) {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function yamlDoubleQuote(value) {
  return JSON.stringify(value);
}
