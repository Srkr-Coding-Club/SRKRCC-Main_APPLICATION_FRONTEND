// Drives the admin Club ID control panel in a real browser against the stand-in API: look-up, assign, reserve and release, move,
// clear (typed confirmation), counters, history, and the read-only view a Club Lead gets.
// Usage: node e2e-audit/club-id-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/club-ids';
const API = 'http://localhost:8100';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const seen = (locator, timeout = 15000) => locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
const gone = (locator, timeout = 15000) => locator.waitFor({ state: 'detached', timeout }).then(() => true).catch(() => false);
const until = async (fn, timeout = 10000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);

const browser = await chromium.launch();

async function open(viewport, role) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024 });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), 'dark');
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: role === 'ADMIN' ? 'admin' : 'lead', url: BASE }, { name: 'srkrcc_user_role', value: role, url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role, is_staff: role === 'ADMIN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]|\[Report Only\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
  return { ctx, page, errors };
}

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  await fetch(`${API}/__idreset`);
  const { ctx, page, errors } = await open(viewport, 'ADMIN');
  const shot = (name) => page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true });
  const dialog = () => page.getByRole('dialog').last();

  await page.goto(`${BASE}/admin/club-ids`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  check(`${label}: the panel shows the totals and the next number`, await seen(page.getByRole('heading', { name: 'Club IDs' })) && await seen(page.getByText('Hold a Club ID')) && await seen(page.getByText(/26SCC\d{3}/).first()));
  check(`${label}: the registry lists holders ordered by id`, await seen(page.getByRole('region', { name: 'Registry' }).getByText('25SCC001')));
  await shot('1-registry');

  // Look up
  const lookup = page.getByRole('search').filter({ has: page.getByLabel(/Look up a Club ID/) });
  await page.getByLabel(/Look up a Club ID/).fill('25scc001');
  await lookup.getByRole('button', { name: 'Look up' }).click();
  check(`${label}: looking up a held id shows who holds it`, await seen(page.getByRole('region', { name: 'Look up' }).getByText('Held')) && await seen(page.getByRole('region', { name: 'Look up' }).getByText(/sita0@srkr\.ac\.in/)));
  await page.getByLabel(/Look up a Club ID/).fill('26SCC777');
  await lookup.getByRole('button', { name: 'Look up' }).click();
  check(`${label}: a free id says so and offers to assign it`, await seen(page.getByRole('region', { name: 'Look up' }).getByText('Free')) && await seen(page.getByRole('button', { name: 'Assign this id to someone' })));

  // Assign it
  await page.getByRole('button', { name: 'Assign this id to someone' }).click();
  check(`${label}: the assign dialog is prefilled with that id`, (await dialog().getByLabel('Club ID').inputValue()) === '26SCC777');
  check(`${label}: assigning is disabled until a person and a reason are given`, await dialog().getByRole('button', { name: 'Assign' }).isDisabled());
  await dialog().getByLabel('Who gets it').fill('meena');
  await dialog().getByRole('list', { name: 'Matching people' }).getByRole('button').first().click();
  await dialog().getByLabel(/Reason/).fill('Old record');
  await shot('2-assign-dialog');
  await dialog().getByRole('button', { name: 'Assign' }).click();
  check(`${label}: assigning works and the look-up refreshes to the new holder`, await seen(page.getByText(/now holds 26SCC777/)) && await until(async () => (await page.getByRole('region', { name: 'Look up' }).getByText('Held').count()) > 0));

  // A refusal stays in the dialog
  await page.getByRole('button', { name: 'Assign an id' }).click();
  await dialog().getByLabel('Who gets it').fill('asha');
  await dialog().getByRole('list', { name: 'Matching people' }).getByRole('button').first().click();
  await dialog().getByLabel('Club ID').fill('26SCC777');
  await dialog().getByLabel(/Reason/).fill('Again');
  await dialog().getByRole('button', { name: 'Assign' }).click();
  check(`${label}: an id somebody holds is refused with the reason, and the dialog stays open`, await seen(dialog().getByRole('alert')) && await seen(dialog().getByRole('button', { name: 'Assign' })));
  await dialog().getByRole('button', { name: 'Cancel' }).click();

  // Reserve
  await page.getByRole('button', { name: 'Reserve an id' }).first().click();
  await dialog().getByLabel('Email of the person').fill('returning@example.org');
  await dialog().getByLabel(/Reason/).fill('Past member');
  await dialog().getByRole('button', { name: 'Reserve' }).click();
  check(`${label}: reserving gives a number for that email`, await seen(page.getByText(/is reserved for returning@example\.org/)));
  await page.getByRole('tab', { name: 'Reservations' }).click();
  check(`${label}: it appears under Reservations as held`, await seen(page.getByRole('region', { name: 'Reservations' }).getByText('returning@example.org')) && /tab=reservations/.test(page.url()));
  await shot('3-reservations');
  await page.getByRole('button', { name: 'Release' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'Release' }).click();
  check(`${label}: releasing asks first and the hold disappears from the held list`, await gone(page.getByRole('region', { name: 'Reservations' }).getByText('returning@example.org')));

  // Move and clear from the registry
  await page.getByRole('tab', { name: 'Registry' }).click();
  await page.getByLabel('Search the registry').fill('25SCC001');
  await seen(page.getByRole('button', { name: 'Move 25SCC001' }));
  await page.getByRole('button', { name: 'Move 25SCC001' }).click();
  check(`${label}: moving is disabled until a person, a reason and the id typed again are given`, await dialog().getByRole('button', { name: 'Move the id' }).isDisabled());
  await dialog().getByLabel('Who receives it').fill('kiran');
  await dialog().getByRole('list', { name: 'Matching people' }).getByRole('button').first().click();
  await dialog().getByLabel(/Reason/).fill('Wrong person');
  await dialog().getByLabel(/^Type/).fill('25SCC00');
  check(`${label}: a wrong confirmation is refused by the server`, await (async () => { await dialog().getByRole('button', { name: 'Move the id' }).click(); return seen(dialog().getByRole('alert')); })());
  await dialog().getByLabel(/^Type/).fill('25SCC001');
  await dialog().getByRole('button', { name: 'Move the id' }).click();
  check(`${label}: moving with the id typed correctly works`, await seen(page.getByText(/25SCC001 now belongs to/)));

  await page.getByLabel('Search the registry').fill('25SCC004');
  await seen(page.getByRole('button', { name: 'Clear 25SCC004' }));
  await page.getByRole('button', { name: 'Clear 25SCC004' }).click();
  await dialog().getByLabel(/Reason/).fill('Left the club');
  await dialog().getByLabel(/^Type/).fill('25SCC004');
  await shot('4-clear-dialog');
  await dialog().getByRole('button', { name: 'Clear and retire' }).click();
  check(`${label}: clearing retires the id`, await seen(page.getByText(/25SCC004 was cleared and retired/)));
  await page.getByLabel(/Look up a Club ID/).fill('25SCC004');
  await lookup.getByRole('button', { name: 'Look up' }).click();
  check(`${label}: the look-up shows it as retired`, await seen(page.getByRole('region', { name: 'Look up' }).getByText('Retired', { exact: true })));

  // Counters and history
  await page.getByRole('tab', { name: 'Counters' }).click();
  check(`${label}: counters show the next id, what is in use and the gaps`, await seen(page.getByRole('region', { name: 'Counters' }).getByText(/26SCC\d{3}/).first()) && await seen(page.getByText('Gaps').first()));
  await page.getByRole('button', { name: 'Move counter' }).first().click();
  await dialog().getByLabel('Next number').fill('900');
  await dialog().getByLabel(/Reason/).fill('New batch');
  await dialog().getByRole('button', { name: 'Move the counter' }).click();
  check(`${label}: the counter moves forward`, await seen(page.getByText(/The counter is now at 900/)) && await seen(page.getByText('26SCC900').first()));
  await page.getByRole('tab', { name: 'History' }).click();
  check(`${label}: the history lists every change with who and why`, await seen(page.getByRole('region', { name: 'History' }).getByText('Cleared (retired)')) && await seen(page.getByRole('region', { name: 'History' }).getByText(/“Left the club”/)));
  await page.getByLabel('Filter by kind').selectOption({ label: 'Cleared' });
  check(`${label}: the history can be filtered by kind`, await until(async () => (await page.getByRole('region', { name: 'History' }).getByText('Counter moved').count()) === 0));
  await shot('5-history');

  check(`${label}: nothing scrolls sideways`, await noOverflow(page));
  check(`${label}: no console errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();

  // A Club Lead can look but not change
  const lead = await open(viewport, 'CLUB_LEAD');
  await lead.page.goto(`${BASE}/admin/club-ids`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  check(`${label}: a Club Lead sees the panel with a note that only an Admin can change`, await seen(lead.page.getByText(/only an Admin can change an id/)));
  check(`${label}: a Club Lead gets no change buttons`, (await lead.page.getByRole('button', { name: /Give the next number|Assign an id|Reserve an id|^Move |^Clear /i }).count()) === 0);
  await lead.ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
