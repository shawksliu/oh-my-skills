#!/usr/bin/env node
/**
 * Render a self-contained HTML file to a PNG screenshot using headless Chromium.
 *
 * Usage:
 *   node render.js <input.html> <output.png> [width]
 *
 * width defaults to 1040. Height is not fixed — the full scrollable page
 * height is captured, so the HTML should size its canvas by width only and
 * let content determine height naturally.
 */

const path = require('path');
const { chromium } = require('playwright');

async function main() {
  const [, , inputPath, outputPath, widthArg] = process.argv;

  if (!inputPath || !outputPath) {
    console.error('Usage: node render.js <input.html> <output.png> [width]');
    process.exit(1);
  }

  const width = parseInt(widthArg || '1040', 10);
  const absInput = path.resolve(inputPath);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto('file://' + absInput);
    // Let web fonts and any layout settling finish before capture.
    await page.waitForTimeout(300);
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log('Saved screenshot to ' + outputPath);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Render failed:', err);
  process.exit(1);
});
