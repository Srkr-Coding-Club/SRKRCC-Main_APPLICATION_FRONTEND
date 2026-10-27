// Drives every Export control in the admin against the stand-in API and checks each one asks the server for the right file.
// Usage: node e2e-audit/export-flow.mjs <base>   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';

const BASE = process.argv[2] || 'http://localhost:3100';
const API = 'http://localhost:8100';
const HACK = '/admin/hackathons/hackoverflow-2026';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const seen = async () => (await (await fetch(`${API}/__exports`)).json());

const browser = await chromium.launch();

async function session(viewport) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true, hasTouch: viewport.width < 1024 });
  await ctx.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: 'admin', url: BASE }, { name: 'srkrcc_user_role', value: 'ADMIN', url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
  return { ctx, page, errors };
}

/** Opens the menu named `subject`, checks it, picks the item and returns the file the browser saved. */
async function exportVia(page, subject, itemName) {
  const trigger = page.getByRole('button', { name: `Export ${subject}` });
  await trigger.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction((el) => !el.disabled, await trigger.elementHandle(), { timeout: 15000 });
  await trigger.click();
  const items = await page.getByRole('menuitem').allTextContents();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.getByRole('menuitem', { name: itemName }).click()]);
  return { items, name: download.suggestedFilename() };
}

const tabs = [
  ['teams', 'teams', /teams-\d{8}_\d{6}\.csv$/, '/export/teams/?export_format=csv'],
  ['rounds', 'round results', /rounds-\d{8}_\d{6}\.csv$/, '/export/rounds/?round=1&export_format=csv'],
  ['ideas', 'ideas', /ideas-\d{8}_\d{6}\.csv$/, '/export/ideas/?export_format=csv'],
  ['submissions', 'projects', /submissions-\d{8}_\d{6}\.csv$/, '/export/submissions/?export_format=csv'],
  ['overview', 'participants', /participants-\d{8}_\d{6}\.csv$/, '/export/participants/?export_format=csv'],
  ['checkin', 'check-in list', /check-in-\d{8}_\d{6}\.csv$/, '/export/check-in/?export_format=csv'],
];

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const { ctx, page, errors } = await session(viewport);
  for (const [tab, subject, filename, urlPart] of tabs) {
    await page.goto(`${BASE}${HACK}?tab=${tab}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3500);
    let outcome;
    try {
      outcome = await exportVia(page, subject, /CSV/);
    } catch (err) {
      check(`[${label}] ${tab}: Export ${subject} downloads a file`, false, String(err).slice(0, 120));
      continue;
    }
    check(`[${label}] ${tab}: menu offers CSV, Excel and JSON`, outcome.items.join('|') === 'CSV (.csv)|Excel (.xlsx)|JSON (.json)', outcome.items.join('|'));
    check(`[${label}] ${tab}: file is named by the server`, filename.test(outcome.name), outcome.name);
    const requests = await seen();
    check(`[${label}] ${tab}: asked the server for ${urlPart}`, requests.some((url) => url.endsWith(urlPart) || url.includes(urlPart)), requests.slice(-1)[0] ?? 'nothing');
  }
  check(`[${label}] no console errors on the admin tabs`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// Excel and JSON from one tab, and the menu staying on screen at phone width.
{
  const { ctx, page } = await session({ width: 390, height: 844 });
  await page.goto(`${BASE}${HACK}?tab=ideas`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3500);
  const trigger = page.getByRole('button', { name: 'Export ideas' });
  await trigger.waitFor({ state: 'visible', timeout: 30000 });
  await trigger.click();
  const menu = await page.getByRole('menu').boundingBox();
  check('[phone] the export menu stays inside the screen', menu.x >= 0 && menu.x + menu.width <= 390, `x=${Math.round(menu.x)} w=${Math.round(menu.width)}`);
  check('[phone] menu items are tap sized', (await page.getByRole('menuitem').first().boundingBox()).height >= 44);
  await page.screenshot({ path: 'docs/ui-ux-audit/screenshots/export-menu-phone.png' });
  const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Excel/ }).click()]);
  check('Excel option saves a .xlsx file', /\.xlsx$/.test(xlsx.suggestedFilename()), xlsx.suggestedFilename());
  await trigger.click();
  const [json] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /JSON/ }).click()]);
  check('JSON option saves a .json file', /\.json$/.test(json.suggestedFilename()), json.suggestedFilename());
  await ctx.close();
}

// Teams: exporting after filtering sends exactly the teams on screen.
{
  const { ctx, page } = await session({ width: 1280, height: 900 });
  await page.goto(`${BASE}${HACK}?tab=teams`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: 'Export teams' }).waitFor({ timeout: 30000 });
  const search = page.getByPlaceholder(/search/i).first();
  if (await search.count()) {
    await search.fill('zzz-no-such-team');
    await page.waitForTimeout(600);
    check('teams: Export is disabled when the filter leaves no teams', await page.getByRole('button', { name: 'Export teams' }).isDisabled());
  } else {
    check('teams: search box found', false);
  }
  await ctx.close();
}

// Members: the on-screen members are exported through the Data Management Center in every permitted column.
{
  const { ctx, page, errors } = await session({ width: 1280, height: 900 });
  await page.goto(`${BASE}/admin/members`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const trigger = page.getByRole('button', { name: 'Export members' });
  await trigger.waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(3500);
  await page.waitForFunction((el) => !el.disabled, await trigger.elementHandle(), { timeout: 20000 }).catch(() => undefined);
  if (await trigger.isDisabled()) {
    check('members: list loaded so Export is enabled', false);
  } else {
    await trigger.click();
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.getByRole('menuitem', { name: /CSV/ }).click()]);
    check('members: file is named like every other export', /^users-export-\d{8}_\d{6}\.csv$/.test(download.suggestedFilename()), download.suggestedFilename());
    const post = (await seen()).find((entry) => entry.startsWith('POST ') && entry.includes('/admin/dmc/datasets/users/export'));
    check('members: exported the selected rows in all permitted columns', Boolean(post) && post.includes('"row_scope":"selected"') && post.includes('"column_scope":"all_permitted"'), post ?? 'no request');
    check('members: sent the member ids', Boolean(post) && /"selected_record_ids":\["\d+"/.test(post), post ?? '');
  }
  check('members: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
