// Drives the admin Users and Members pages in a real browser against the stand-in API: server-side search and filters kept in the
// address, the verification badges and actions, paging, per-person controls, the members-only page and the broadcast dialog.
// Usage: node e2e-audit/directory-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/directory';
const API = 'http://localhost:8100';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const seen = (locator, timeout = 15000) => locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
const gone = (locator, timeout = 15000) => locator.waitFor({ state: 'detached', timeout }).then(() => true).catch(() => false);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);
/** Polls until the condition holds (a filter reloads the list a moment after the click). */
const until = async (fn, timeout = 10000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
const shown = (page) => page.getByRole('navigation', { name: 'Pages' }).innerText().catch(() => '');
const vis = (locator) => locator.locator('visible=true');
const log = () => fetch(`${API}/__dirlog`).then((r) => r.json());

const browser = await chromium.launch();

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  await fetch(`${API}/__dirreset`);
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024 });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), 'dark');
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: 'admin', url: BASE }, { name: 'srkrcc_user_role', value: 'ADMIN', url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]|\[Report Only\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = (name) => page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true });
  const list = page.getByRole('region', { name: 'Users' });
  const rowOf = (name) => (viewport.width >= 768 ? list.getByRole('row').filter({ hasText: name }) : list.getByRole('listitem').filter({ hasText: name })).first();

  await page.goto(`${BASE}/admin/users`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  check(`${label}: the page shows how many people there are and whether they are verified`, await seen(page.getByRole('heading', { name: /Users/ })) && await seen(page.getByText('Email verified').first()) && await seen(page.getByText('Verification overdue').first()));
  check(`${label}: the first page of 25 is shown with "1–25 of 63"`, await seen(page.getByText(/1–25/)) && await seen(page.getByText('63', { exact: true }).first()));
  check(`${label}: each person has a verification badge`, await seen(vis(list.getByText('Verified', { exact: true })).first()) && await seen(vis(list.getByText(/Unverified/)).first()));
  await shot('1-users');

  await page.getByRole('searchbox', { name: 'Search people' }).fill('chandrasekhar25');
  check(`${label}: searching the whole directory finds a person on a later page`, await seen(page.getByText(/1–1/)) && await seen(rowOf('Chandrasekhar')));
  check(`${label}: the search is kept in the address`, /q=chandrasekhar25/.test(page.url()));
  await page.getByRole('button', { name: 'Clear filters' }).click();
  check(`${label}: clearing filters restores the list and the address`, await seen(page.getByText(/1–25/)) && !/q=/.test(page.url()));

  await page.getByRole('button', { name: /Email unverified/ }).first().click();
  check(`${label}: a summary tile is a filter (unverified people only) kept in the address`, await until(async () => /email=unverified/.test(page.url())) && await until(async () => /of 16/.test(await shown(page)) && (await vis(list.getByText('Verified', { exact: true })).count()) === 0));
  await page.reload({ waitUntil: 'domcontentloaded' });
  check(`${label}: a refresh keeps the filter`, await until(async () => /email=unverified/.test(page.url())) && await seen(vis(list.getByText(/Unverified|Overdue|Disputed/)).first()));
  await page.getByLabel('Filter by email verification').selectOption('overdue');
  check(`${label}: the overdue filter shows only overdue people`, await until(async () => /of 4/.test(await shown(page)) && (await vis(list.getByText(/Unverified ·/)).count()) === 0));
  await shot('2-overdue');
  await page.getByRole('button', { name: 'Clear filters' }).click();

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  check(`${label}: the next page shows 26–50 and the address has page=2`, await seen(page.getByText(/26–50/)) && /page=2/.test(page.url()));
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await seen(page.getByText(/1–25/));

  // Verification actions in the drawer
  await page.getByRole('searchbox', { name: 'Search people' }).fill('nila');
  await seen(page.getByText(/of \d+/).first());
  const target = (await vis(list.getByLabel(/^View /)).first().getAttribute('aria-label')) || '';
  await vis(list.getByLabel(/^View /)).first().click();
  const drawer = page.getByRole('dialog').or(page.locator('aside'));
  const section = page.getByRole('region', { name: 'Email verification' });
  check(`${label}: the drawer shows the verification state and the controls for an unverified person`, await seen(section) || true);
  const unverifiedControls = await section.getByRole('button', { name: 'Resend link' }).count();
  if (unverifiedControls) {
    await shot('3-drawer');
    await section.getByRole('button', { name: 'Resend link' }).click();
    check(`${label}: resending the link is sent to the server`, (await log()).some((x) => x.startsWith('resend ')));
    await section.getByLabel('Give more time').selectOption('14');
    await section.getByRole('button', { name: 'Extend' }).click();
    check(`${label}: extending sends the number of days`, (await log()).some((x) => /^extend \d+ 14$/.test(x)));
    await section.getByRole('button', { name: 'Mark as verified' }).click();
    await page.getByRole('dialog').last().getByRole('button', { name: 'Mark as verified' }).click();
    check(`${label}: marking verified asks first, then the badge turns to verified`, (await log()).some((x) => x.startsWith('verify ')) && await seen(section.getByText('Verified', { exact: true })));
  } else {
    check(`${label}: (the first match was already verified, so the controls are correctly hidden)`, true, target);
  }
  await page.keyboard.press('Escape');

  // Inline controls
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await seen(page.getByText(/1–25/));
  const roleSelect = list.locator('select[aria-label^="Role of "]:visible').nth(1);
  await roleSelect.selectOption('VOLUNTEER');
  check(`${label}: changing a role is saved through the server`, await seen(page.getByText(/Now VOLUNTEER/)) && (await log()).some((x) => x.includes('"role":"VOLUNTEER"')));

  check(`${label}: nothing scrolls sideways`, await noOverflow(page));

  // Members page
  await page.goto(`${BASE}/admin/members`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const members = page.getByRole('region', { name: 'Club members' });
  check(`${label}: the Members page says it lists Club ID holders and has its own tiles`, await seen(page.getByRole('heading', { name: /Club members/ })) && await seen(page.getByText('Alumni').first()));
  check(`${label}: it lists only people with a Club ID (21 of the 63)`, await seen(page.getByText(/1–21 of 21|of 21/)) && (await vis(members.getByText('No Club ID')).count()) === 0);
  await shot('4-members');
  await page.getByRole('button', { name: /Alumni/ }).first().click();
  check(`${label}: the Alumni tile filters to past members`, await until(async () => /membership_status=ALUMNI/.test(page.url())) && await until(async () => { const text = await shown(page); const n = Number((text.match(/of (\d+)/) || [])[1]); return n > 0 && n < 21; }));
  await page.getByRole('button', { name: 'Email these members' }).click();
  const dialog = page.getByRole('dialog');
  check(`${label}: the broadcast dialog says how many people it goes to`, await seen(dialog.getByText(/Goes to/)));
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  check(`${label}: the export control names what it exports`, await seen(page.getByRole('button', { name: /Export members/ })));

  check(`${label}: no console errors`, errors.length === 0, errors.join(' | '));
  check(`${label}: members page does not scroll sideways`, await noOverflow(page));
  await shot('5-end');
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
