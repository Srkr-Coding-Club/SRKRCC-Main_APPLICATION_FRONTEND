// Drives the "Create your team" modal at phone, tablet, laptop and ultra-wide sizes against the stand-in API.
// Usage: node e2e-audit/team-modal.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/team-modal';
fs.mkdirSync(OUT, { recursive: true });

const SIZES = [
  ['phone-small', 360, 740], ['phone', 390, 844], ['tablet', 768, 1024], ['laptop-small', 1024, 768],
  ['laptop', 1280, 800], ['desktop', 1920, 1080], ['ultrawide', 2560, 1440],
];
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const browser = await chromium.launch();

async function run(label, width, height, theme) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1024 });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: 'user-noteam', url: BASE }, { name: 'srkrcc_user_role', value: 'STUDENT', url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', last_name: 'R', role: 'STUDENT' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
  const tag = `[${label}/${theme}]`;

  await page.goto(`${BASE}/hackathons/hackoverflow-2026/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('button', { name: 'Create a team' }).first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Create a team' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Create your team' });
  await dialog.waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);

  const box = await dialog.boundingBox();
  check(`${tag} dialog fits the viewport width`, box.x >= -1 && box.x + box.width <= width + 1, `x=${Math.round(box.x)} w=${Math.round(box.width)}`);
  check(`${tag} dialog fits the viewport height`, box.y >= -1 && box.y + box.height <= height + 1, `h=${Math.round(box.height)} of ${height}`);
  const wide = width >= 1024;
  check(`${tag} modal grows on large screens`, wide ? box.width > 760 : box.width <= 580, `w=${Math.round(box.width)}`);

  const footerButton = dialog.getByRole('button', { name: 'Next' });
  const fb = await footerButton.boundingBox();
  check(`${tag} Next button is visible without scrolling`, fb && fb.y + fb.height <= height + 1 && fb.y >= 0);
  check(`${tag} no horizontal page scroll with the modal open`, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1));
  await page.screenshot({ path: `${OUT}/${label}-${theme}-1-open.png` });

  await dialog.getByLabel(/Team name/).fill('DevArchitect');

  if (wide) {
    check(`${tag} statements are listed inline beside the details`, (await dialog.getByRole('option').count()) >= 20);
    await dialog.getByLabel('Search problem statements').fill('twin');
    await page.waitForTimeout(200);
    const rows = await dialog.getByRole('option').count();
    check(`${tag} search narrows the inline list`, rows > 0 && rows < 10, `rows=${rows}`);
    await dialog.getByRole('option').first().click();
    await dialog.getByRole('heading', { level: 4 }).waitFor();
    check(`${tag} details panel shows the chosen statement`, (await dialog.getByRole('heading', { level: 4 }).innerText()).length > 10);
    const listBox = await dialog.getByRole('listbox').boundingBox();
    check(`${tag} list stays inside the dialog`, listBox.x >= box.x - 1 && listBox.x + listBox.width <= box.x + box.width + 1);
    await page.screenshot({ path: `${OUT}/${label}-${theme}-2-picked.png` });
  } else {
    await dialog.getByRole('button', { name: /Problem statement/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Choose a problem statement' });
    await sheet.waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    const sb = await sheet.boundingBox();
    check(`${tag} sheet fits the viewport`, sb.x >= -1 && sb.x + sb.width <= width + 1 && sb.y + sb.height <= height + 1, `h=${Math.round(sb.height)}`);
    check(`${tag} sheet lists the statements`, (await sheet.getByRole('option').count()) >= 20);
    const firstRow = await sheet.getByRole('option').first().boundingBox();
    check(`${tag} rows are tall enough to tap (44px)`, firstRow.height >= 44, `h=${Math.round(firstRow.height)}`);
    const chips = await sheet.getByRole('button', { name: /^(All|Smart City|IoT)/ }).first().boundingBox();
    check(`${tag} filter chips are tap sized`, chips.height >= 32, `h=${Math.round(chips.height)}`);
    await page.screenshot({ path: `${OUT}/${label}-${theme}-2-sheet.png` });
    await sheet.getByLabel('Search problem statements').fill('twin');
    await page.waitForTimeout(200);
    await sheet.getByRole('option').first().click();
    await sheet.waitFor({ state: 'hidden', timeout: 5000 });
    check(`${tag} choosing closes the sheet and fills the field`, await dialog.getByRole('button', { name: /Problem statement: PS/ }).isVisible());
    await page.screenshot({ path: `${OUT}/${label}-${theme}-3-picked.png` });
  }

  await dialog.getByRole('button', { name: 'Next' }).click();
  const accept = dialog.getByLabel(/read and accept the rules/);
  await accept.waitFor({ timeout: 5000 });
  check(`${tag} step 2 asks for the rules`, true);
  await dialog.getByRole('button', { name: 'Create team' }).click();
  check(`${tag} step 2 blocks without accepting`, await dialog.getByText('Please accept the rules to continue.').isVisible());
  await page.screenshot({ path: `${OUT}/${label}-${theme}-4-step2.png` });
  await dialog.getByRole('button', { name: 'Back' }).click();
  check(`${tag} Back keeps the team name`, (await dialog.getByLabel(/Team name/).inputValue()) === 'DevArchitect');
  check(`${tag} no horizontal page scroll at the end`, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1));
  check(`${tag} no console errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

for (const [label, w, h] of SIZES) await run(label, w, h, 'dark');
await run('phone', 390, 844, 'light');
await run('laptop', 1280, 800, 'light');

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
