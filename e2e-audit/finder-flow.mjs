// Drives the organizer's Team Finder tab in a real browser against the stand-in API: the three views, filters, search,
// removing a listing, stopping a team, closing a stuck request, placing a person, reminders and the exports.
// Usage: node e2e-audit/finder-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/finder';
const API = 'http://localhost:8100';
const ROUTE = '/admin/hackathons/hackoverflow-2026?tab=finder';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const seen = (locator, timeout = 15000) => locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
const gone = (locator, timeout = 15000) => locator.waitFor({ state: 'detached', timeout }).then(() => true).catch(() => false);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);
const posts = () => fetch(`${API}/__finlog`).then((r) => r.json());

const browser = await chromium.launch();

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024 });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), 'dark');
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: 'admin', url: BASE }, { name: 'srkrcc_user_role', value: 'ADMIN', url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]|\[Report Only\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = (name) => page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true });
  const panel = page.getByRole('region', { name: 'Team finder' });

  await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  check(`${label}: the Team Finder tab is there and selected`, await seen(page.getByRole('tab', { name: /Team Finder/ })) && (await page.getByRole('tab', { name: /Team Finder/ }).getAttribute('aria-selected')) === 'true');
  check(`${label}: the stats tiles show people, seats and waiting requests`, await seen(page.getByText('Looking for a team').first()) && await seen(page.getByText('Requests waiting')) && await seen(page.getByText('older than 48 hours')));
  check(`${label}: people who are looking are listed with skills, note and contact`, await seen(panel.getByText('Chandrasekhar Venkata Subrahmanyam')) && await seen(panel.getByText('React, Django, Figma, DevOps')) && await seen(panel.getByRole('link', { name: 'chandra@srkr.ac.in' })));
  check(`${label}: a matched person is hidden by the default filter`, (await panel.getByText('Ravi T').count()) === 0);
  await shot('1-people');

  await panel.getByRole('tab', { name: 'All' }).click();
  check(`${label}: "All" shows the matched person with their team`, await seen(panel.getByText('On Segmentation Faults')));
  await panel.getByRole('tab', { name: 'Looking' }).click();

  await panel.getByRole('searchbox', { name: 'Search the finder' }).fill('meena');
  check(`${label}: search narrows the people`, await seen(panel.getByText('Meena K')) && (await panel.getByText('Chandrasekhar Venkata Subrahmanyam').count()) === 0);
  await panel.getByRole('searchbox', { name: 'Search the finder' }).fill('');
  await panel.getByLabel(/Waiting 3\+ days/).check();
  check(`${label}: "Waiting 3+ days" keeps only the long waiters`, await seen(panel.getByText('Chandrasekhar Venkata Subrahmanyam')) && (await panel.getByText('Meena K').count()) === 0);
  await panel.getByLabel(/Waiting 3\+ days/).uncheck();

  // Remove a listing, with a reason
  await panel.getByRole('button', { name: 'Remove listing' }).nth(1).click();
  const reasonDialog = page.getByRole('dialog');
  check(`${label}: removing asks for an optional reason`, await seen(reasonDialog.getByLabel(/Reason/)));
  await reasonDialog.getByLabel(/Reason/).fill('Spam note');
  await shot('2-remove-dialog');
  await reasonDialog.getByRole('button', { name: 'Remove listing' }).click();
  check(`${label}: the removed person leaves the list and the server got the reason`, await gone(panel.getByText('Meena K')) && (await posts()).some((x) => x === 'remove 2 Spam note'));

  // Place a person on a team
  await panel.getByRole('button', { name: 'Place on a team' }).click();
  const place = page.getByRole('dialog');
  check(`${label}: the place dialog offers the recruiting team with its free seats`, await seen(place.getByLabel('Team')) && (await place.locator('option', { hasText: 'Segmentation Faults · 2/4' }).count()) === 1);
  check(`${label}: placing is disabled until a team is chosen`, await place.getByRole('button', { name: 'Place on team' }).isDisabled());
  await shot('3-place-dialog');
  await place.getByLabel('Team').selectOption({ label: 'Segmentation Faults · 2/4 · A designer and a backend developer' });
  await place.getByRole('button', { name: 'Place on team' }).click();
  check(`${label}: placing sends the right person and team and the list refreshes`, await gone(panel.getByText('Chandrasekhar Venkata Subrahmanyam')) && (await posts()).includes('place 1>12'));

  // Teams
  await panel.getByRole('tab', { name: /^Teams/ }).click();
  check(`${label}: recruiting teams show what they look for, seats and leader contact`, await seen(panel.getByText('A designer and a backend developer')) && await seen(panel.getByText('2 seats free')) && await seen(panel.getByRole('link', { name: 'ravik@srkr.ac.in' })));
  check(`${label}: a full team is listed as full`, await seen(panel.getByText('Full')));
  await panel.getByLabel('Only teams with a free seat').check();
  check(`${label}: "free seat" hides the full team`, (await panel.getByText('Null Pointers').count()) === 0);
  await shot('4-teams');

  // Requests
  await panel.getByRole('tab', { name: /^Requests/ }).click();
  check(`${label}: the stuck request is flagged`, await seen(panel.getByText('Stuck', { exact: true })));
  await shot('5-requests');
  await panel.getByRole('button', { name: 'Close request' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close request' }).click();
  check(`${label}: closing a request asks first, then it leaves the waiting list`, await gone(panel.getByRole('button', { name: 'Close request' })) && (await posts()).includes('cancel 1'));
  await panel.getByRole('tab', { name: 'All' }).click();
  check(`${label}: it stays in "All" as closed by the organizer`, await seen(panel.getByText(/Closed by Ada Min/)));

  // Stop recruiting
  await panel.getByRole('tab', { name: /^Teams/ }).click();
  await panel.getByRole('button', { name: 'Stop recruiting' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Stop recruiting' }).click();
  check(`${label}: stopping recruiting removes the team from the list`, await gone(panel.getByText('A designer and a backend developer')) && (await posts()).includes('stop 12'));

  // Reminders and export
  await panel.getByRole('tab', { name: /^People/ }).click();
  await panel.getByRole('button', { name: 'Remind people' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send reminders' }).click();
  check(`${label}: reminding asks first and sends the audience`, await seen(page.getByText('2 notified')) && (await posts()).includes('remind seekers'));
  check(`${label}: the export menu names what it exports`, await seen(panel.getByRole('button', { name: /Export unmatched people/ })));

  check(`${label}: nothing scrolls sideways`, await noOverflow(page));
  check(`${label}: no console errors`, errors.length === 0, errors.join(' | '));
  await shot('6-end');
  await ctx.close();
  await fetch(`${API}/__finreset`).catch(() => undefined);
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
