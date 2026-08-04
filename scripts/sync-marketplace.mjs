#!/usr/bin/env node
import { loadCatalog, syncGeneratedFiles } from './lib.mjs';

try {
  const catalog = loadCatalog();
  syncGeneratedFiles(catalog);
  console.log(`Synced ${Object.keys(catalog.skills).length} skill(s) to Claude Code marketplace manifests.`);
} catch (error) {
  console.error(`Sync failed: ${error.message}`);
  process.exitCode = 1;
}
