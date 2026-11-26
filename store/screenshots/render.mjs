#!/usr/bin/env node
/**
 * Render frames.html to App Store PNGs (1320x2868, iPhone 6.9").
 *   node store/screenshots/render.mjs
 * Writes store/screenshots/en-US/<id>.png, one per <section class="frame">.
 * Needs `npm ci` first (fonts load from node_modules).
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const DIR = path.dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1320, height: 2868 }, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(DIR, 'frames.html')}`);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
for (const frame of await page.$$('section.frame')) {
  const id = await frame.getAttribute('id');
  await frame.screenshot({ path: path.join(DIR, 'en-US', `${id}.png`) });
  console.log('wrote', `en-US/${id}.png`);
}
await browser.close();
