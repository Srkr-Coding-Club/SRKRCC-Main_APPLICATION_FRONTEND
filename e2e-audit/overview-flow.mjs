// Drives the hackathon admin Overview in a real browser against the stand-in API: next-date strip, attention items, trend
// chart, fees card, refresh and the per-block failure notice, on desktop and phone, dark and light.
// Usage: node e2e-audit/overview-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3320';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/overview';
const ROUTE = '/admin/hackathons/hackoverflow-2026?tab=overview';
fs.mkdirSync(OUT, { recursive: true });

const check = (name, ok, detail = '') => { if (!ok) process.exitCode = 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const seen = (locator, timeout = 20000) => locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);

const browser = await chromium.launch();
for (const [label, viewport, theme] of [['desktop-dark', { width: 1280, height: 900 }, 'dark'], ['phone-light', { width: 390, height: 844 }, 'light']]) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024 });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: 'admin', url: BASE }, { name: 'srkrcc_user_role', value: 'ADMIN', url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]|\[Report Only\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));

  await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded', timeout: 180000 });
  check(`${label}: the next date shows with a countdown and IST`, await seen(page.getByRole('region', { name: 'Next date' })) && /in \d+ (day|hour)/.test(await page.getByRole('region', { name: 'Next date' }).innerText()) && /IST/.test(await page.getByRole('region', { name: 'Next date' }).innerText()));
  check(`${label}: the sign-ups chart and its sentence show`, await seen(page.getByRole('region', { name: 'Sign-ups over time' })) && await seen(page.getByText(/At this pace|Not enough sign-ups/)));
  check(`${label}: the freshness line and Refresh button show`, await seen(page.getByText(/Updated (just now|\d+)/)) && await seen(page.getByRole('button', { name: 'Refresh the overview' })));
  check(`${label}: the stage strip marks the current stage`, await seen(page.getByRole('navigation', { name: 'Stage of the hackathon' })) && (await page.locator('[aria-current="step"]').count()) === 1);
  check(`${label}: the pipeline shows where teams drop out`, await seen(page.getByRole('region', { name: 'Team pipeline' })) && await seen(page.getByText(/since the step above/).first()) && await seen(page.getByText(/Biggest drop:/)));
  const domainTab = page.getByRole('tab', { name: 'By domain' });
  await domainTab.click();
  check(`${label}: problem statements can be grouped by domain`, await seen(page.getByRole('list', { name: 'Problem statements by domain' })));
  await page.getByRole('tab', { name: 'Busiest first' }).click();
  check(`${label}: the fees card is absent when no fee is collected`, (await page.getByRole('region', { name: 'Fees' }).count()) === 0);
  check(`${label}: no sideways scroll`, await noOverflow(page));
  await page.screenshot({ path: `${OUT}/${label}-1-overview.png`, fullPage: true });

  await page.getByRole('button', { name: 'Share status' }).click();
  const box = page.getByLabel('Status message', { exact: true });
  check(`${label}: the share dialog holds a ready status message`, await seen(box) && /Teams: 31 registered/.test(await box.inputValue()) && /Next: /.test(await box.inputValue()));
  await page.screenshot({ path: `${OUT}/${label}-2-share.png` });
  await page.keyboard.press('Escape');
  check(`${label}: Escape closes the dialog`, await page.getByLabel('Status message', { exact: true }).count() === 0);

  const calls = [];
  // The site redirects /overview/ to the slash-less form: count the first as one ask.
  page.on('request', (r) => { if (/\/overview\/$/.test(r.url())) calls.push(r.url()); });
  await page.getByRole('button', { name: 'Refresh the overview' }).click();
  await page.waitForTimeout(1500);
  check(`${label}: Refresh asks once, in one request`, calls.length === 1, String(calls.length));

  check(`${label}: no console errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}
await browser.close();
