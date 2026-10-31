// Looks for any public page that still says how many teams have registered, and screenshots the places that used to.
// Usage: node e2e-audit/team-count-check.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3320';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/team-count';
fs.mkdirSync(OUT, { recursive: true });
const check = (name, ok, detail = '') => { if (!ok) process.exitCode = 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const browser = await chromium.launch();
for (const [label, width] of [['desktop', 1280], ['phone', 390]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 700 });
  await ctx.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const page = await ctx.newPage();
  for (const route of ['/', '/hackathons', '/hackathons/hackoverflow-2026']) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForTimeout(3500);
    const text = await page.evaluate(() => document.body.innerText);
    const found = text.match(/\b\d+\s+teams?\s+(registered|so far)|teams registered/i);
    check(`${label} ${route}: no count of registered teams`, !found, found ? found[0] : '');
    if (route === '/hackathons') {
      check(`${label} ${route}: the card says when registration closes`, /Registration (closes|opens|is open|closed)/.test(text));
      await page.screenshot({ path: `${OUT}/${label}-cards.png`, fullPage: false });
    }
    if (route.startsWith('/hackathons/')) {
      check(`${label} ${route}: the page shows the event dates tile`, /Event dates/.test(text));
      await page.screenshot({ path: `${OUT}/${label}-detail.png`, clip: { x: 0, y: 0, width, height: 900 } });
    }
  }
  await ctx.close();
}
await browser.close();
