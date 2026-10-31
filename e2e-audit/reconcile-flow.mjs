// Drives the admin "Past members" page in a real browser against the stand-in API: upload and column choice, the groups of results,
// linking (one and all), mismatches, inviting, the sheet's own problems, members missing from the sheet, exports, check again,
// delete, and what a Club Lead can and cannot do.
// Usage: node e2e-audit/reconcile-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/reconcile';
const API = 'http://localhost:8100';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const seen = (locator, timeout = 15000) => locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
const gone = (locator, timeout = 15000) => locator.waitFor({ state: 'detached', timeout }).then(() => true).catch(() => false);
const until = async (fn, timeout = 10000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);
const log = () => fetch(`${API}/__reconlog`).then((r) => r.json());
const CSV = Buffer.from('Name,Email,Affiliate ID,Remarks\nSita Rao,sita0@srkr.ac.in,25SCC001,\n', 'utf-8');

const browser = await chromium.launch();

async function open(viewport, role) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024, acceptDownloads: true });
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
  await fetch(`${API}/__reconreset`);
  await fetch(`${API}/__idreset`);
  const { ctx, page, errors } = await open(viewport, 'ADMIN');
  const shot = (name) => page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true });
  const dialog = () => page.getByRole('dialog').last();
  const section = (name) => page.getByRole('region', { name });
  const item = (name) => page.getByRole('listitem').filter({ hasText: name });
  const absent = (name) => until(async () => (await item(name).count()) === 0);
  const tile = (name) => page.getByRole('button', { name: new RegExp(`^${name}`, 'i') });

  await page.goto(`${BASE}/admin/reconcile`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  check(`${label}: the page lists earlier comparisons with how many need a decision`, await seen(page.getByRole('heading', { name: 'Past members' })) && await seen(page.getByText('past-members-2023.xlsx')) && await seen(page.getByText(/need a decision/)));
  await shot('1-list');

  // Upload
  await page.getByRole('button', { name: 'Upload a sheet' }).click();
  await page.locator('#reconcile-file').setInputFiles({ name: 'past.csv', mimeType: 'text/csv', buffer: CSV });
  check(`${label}: after choosing a file the columns are suggested and the first rows are shown`, await seen(dialog().getByLabel(/^Email/)) && (await dialog().getByLabel(/^Email/).inputValue()) === 'Email' && (await dialog().getByLabel(/^Club ID or Affiliate ID/).inputValue()) === 'Affiliate ID' && await seen(dialog().getByText('Sita Rao')));
  check(`${label}: a workbook with several sheets asks which one`, await seen(dialog().getByLabel('Which sheet?')));
  await dialog().getByLabel(/^Email/).selectOption('');
  await dialog().getByLabel(/^Club ID or Affiliate ID/).selectOption('');
  check(`${label}: without an email or a Club ID column the compare button is off and says why`, await dialog().getByRole('button', { name: /^Compare/ }).isDisabled() && await seen(dialog().getByText(/Choose the email column/)));
  await dialog().getByLabel(/^Email/).selectOption('Email');
  await shot('2-upload');
  await dialog().getByRole('button', { name: /^Compare/ }).click();
  check(`${label}: comparing opens the result and keeps it in the address`, await seen(page.getByRole('heading', { name: 'past-members-2023.xlsx' })) && await until(async () => /run=/.test(page.url())));

  // Groups
  check(`${label}: each group shows how many rows it holds`, await seen(tile('Matches')) && /2/.test(await tile('Matches').innerText()) && /3/.test(await tile('No account').innerText()) && /3/.test(await tile('Mismatches').innerText()));
  check(`${label}: it opens on the rows that can be linked, with a bulk shortcut`, await seen(item('Meena Kumari').first()) && await seen(page.getByRole('button', { name: 'Link all 2…' })));
  await shot('3-link');

  // Link one
  await page.getByRole('button', { name: 'Link 25SCC080' }).click();
  check(`${label}: linking one row sends it and the row leaves the open list`, await absent('Meena Kumari') && (await log()).includes('link 4'));
  check(`${label}: the bulk shortcut now counts the remaining one`, await seen(page.getByRole('button', { name: 'Link all 1…' })));
  await page.getByRole('button', { name: 'Link all 1…' }).click();
  check(`${label}: linking all asks first, with the count`, await seen(dialog().getByText(/Link 1 Club IDs\?/)));
  await dialog().getByRole('button', { name: 'Link 1', exact: true }).click();
  check(`${label}: after linking everything nothing is left to decide here`, await seen(page.getByText('Nothing here needs a decision.')) && (await log()).includes('bulk link 1'));
  await tile('Matches').click();
  check(`${label}: the linked rows now show under Matches, marked as linked`, await seen(item('Club ID linked').first()) && (await item('Club ID linked').count()) === 2);

  // Mismatches
  await tile('Mismatches').click();
  check(`${label}: mismatches show both sides in plain words`, await seen(page.getByText(/The account has Club ID 25SCC010; the sheet says 25SCC090/)) && await seen(page.getByText('Holder of the Club ID')));
  await page.getByLabel(/Only rows that need a decision/).check();
  const hana = page.getByRole('listitem').filter({ hasText: 'Hana Hussain' });
  await hana.getByRole('button', { name: /Use the sheet/ }).click();
  check(`${label}: using the sheet's id asks for a reason first`, await dialog().getByRole('button', { name: /^Use 25SCC090/ }).isDisabled());
  await dialog().getByLabel(/Why is the sheet right/).fill('Original register');
  await dialog().getByRole('button', { name: /^Use 25SCC090/ }).click();
  check(`${label}: it is applied and the row is resolved`, await absent('Hana Hussain') && (await log()).includes('use-sheet 6'));
  const old = page.getByRole('listitem').filter({ hasText: 'Old Hand' });
  check(`${label}: an email mismatch offers no link, only keep / follow up / dismiss`, (await old.getByRole('button', { name: /Link|Use the sheet|Invite/ }).count()) === 0 && await seen(old.getByRole('button', { name: 'Dismiss' })));
  await old.getByRole('button', { name: 'Follow up later' }).click();
  check(`${label}: following up resolves it without changing any account`, await absent('Old Hand'));
  const retired = page.getByRole('listitem').filter({ hasText: 'Retired Holder' });
  await retired.getByRole('button', { name: /Link the retired id anyway/ }).click();
  check(`${label}: linking a retired id needs an explicit confirmation`, await seen(dialog().getByText(/Link the retired id 25SCC060\?/)));
  await dialog().getByRole('button', { name: 'Link it' }).click();
  check(`${label}: and then it is linked`, await absent('Retired Holder'));
  await shot('4-mismatch');

  // No account
  await tile('No account').click();
  check(`${label}: people with no account can be invited, with the bulk count`, await seen(page.getByRole('button', { name: 'Invite all 2…' })));
  const person = page.getByRole('listitem').filter({ hasText: 'New Person' }).first();
  await person.getByRole('button', { name: /Invite and reserve 25SCC100/ }).click();
  check(`${label}: inviting one explains what is sent and reserved`, await seen(dialog().getByText(/reserved for this email/)));
  await dialog().getByRole('button', { name: 'Invite', exact: true }).click();
  check(`${label}: the invited person is marked and leaves the open list`, await until(async () => (await log()).includes('invite 8')) && await until(async () => (await item('New Person').filter({ hasText: 'Invite and reserve' }).count()) === 0));
  const noId = page.getByRole('listitem').filter({ hasText: 'No Id Person' });
  check(`${label}: someone with no Club ID in the sheet cannot be invited`, (await noId.getByRole('button', { name: /Invite/ }).count()) === 0);

  // Sheet problems
  await tile('Check the sheet').click();
  check(`${label}: unreadable and repeated rows are listed without actions`, await seen(page.getByText(/is not an email address/)) && await seen(page.getByText(/already on row 2/)) && (await page.getByRole('listitem').filter({ hasText: 'Bad Email' }).getByRole('button').count()) === 0);

  // Missing from the sheet
  await tile('Not in the sheet').click();
  check(`${label}: members missing from the sheet are listed`, await seen(section('Members not in the sheet').getByText(/25SCC/).first()));
  await shot('5-missing');

  // Search, recheck, export
  await tile('Matches').click();
  await page.getByLabel('Search this sheet').fill('omar');
  check(`${label}: search narrows the rows`, await seen(item('Omar Z').first()) && await absent('Sita Rao'));
  await page.getByLabel('Search this sheet').fill('');
  await page.getByRole('button', { name: 'Check again' }).click();
  check(`${label}: checking again reports that nothing changed`, await seen(page.getByText('Nothing has changed')));
  await page.getByRole('button', { name: /Export the report/ }).click();
  await page.getByRole('menuitem', { name: /CSV/ }).click();
  check(`${label}: the report export is requested`, await until(async () => (await log()).some((x) => x.startsWith('export report csv'))));

  check(`${label}: nothing scrolls sideways`, await noOverflow(page));
  check(`${label}: no console errors`, errors.length === 0, errors.join(' | '));
  await shot('6-end');

  // Delete
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await dialog().getByRole('button', { name: 'Delete', exact: true }).click();
  check(`${label}: deleting a comparison returns to the list, which is then empty`, await seen(page.getByText('No sheet has been compared yet.')) && !/run=/.test(page.url()));
  await ctx.close();

  // A Club Lead can look but not change
  await fetch(`${API}/__reconreset`);
  const lead = await open(viewport, 'CLUB_LEAD');
  await lead.page.goto(`${BASE}/admin/reconcile`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  check(`${label}: a Club Lead sees the comparisons and a note, but no upload button`, await seen(lead.page.getByText(/only an Admin can upload/)) && (await lead.page.getByRole('button', { name: 'Upload a sheet' }).count()) === 0);
  await lead.page.getByText('past-members-2023.xlsx').click();
  check(`${label}: a Club Lead can open a comparison and export, but gets no action buttons`, await seen(lead.page.getByRole('listitem').filter({ hasText: 'Meena Kumari' }).first()) && (await lead.page.getByRole('button', { name: /^Link (all|\d|25)|^Invite|^Dismiss|^Delete$|^Follow up/ }).count()) === 0);
  await lead.ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
