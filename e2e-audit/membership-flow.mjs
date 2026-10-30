// Drives club membership requests in a real browser against the stand-in API: the organizers' Requests tab (waiting banner and badge,
// approve, decline with a reason, select and approve several, filters, search, Club Lead read-only) and a member's own card on the profile.
// Usage: node e2e-audit/membership-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/membership';
const API = 'http://localhost:8100';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const seen = (locator, timeout = 15000) => locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
const until = async (fn, timeout = 10000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);
const log = () => fetch(`${API}/__memlog`).then((r) => r.json());

const browser = await chromium.launch();

async function open(viewport, role) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024 });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), 'dark');
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: role === 'ADMIN' ? 'admin' : role === 'CLUB_LEAD' ? 'lead' : 'user-noteam', url: BASE }, { name: 'srkrcc_user_role', value: role, url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role, is_staff: role === 'ADMIN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]|\[Report Only\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
  return { ctx, page, errors };
}

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  await fetch(`${API}/__memreset`);
  await fetch(`${API}/__idreset`);
  const { ctx, page, errors } = await open(viewport, 'ADMIN');
  const shot = (name) => page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true });
  const dialog = () => page.getByRole('dialog').last();
  const item = (name) => page.getByRole('region', { name: 'Requests' }).getByRole('listitem').filter({ hasText: name });
  const absent = (name) => until(async () => (await item(name).count()) === 0);

  await page.goto(`${BASE}/admin/club-ids`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  check(`${label}: the Club IDs page says how many people are waiting and links to them`, await seen(page.getByText(/5 people are waiting to become club members/)));
  check(`${label}: the Requests tab carries the count`, await seen(page.getByRole('tab', { name: /Requests\s*5/ })));
  await page.getByRole('button', { name: /Open the requests/ }).click();
  check(`${label}: it opens the requests, kept in the address`, await seen(item('Asha Devi')) && /tab=requests/.test(page.url()));
  check(`${label}: waiting requests show the person, their details and what they wrote`, await seen(item('Asha Devi').getByText(/Git workshop/)) && await seen(item('Asha Devi').getByText('Email verified')) && await seen(item('Lakshmi N').getByText('Email not verified')));
  check(`${label}: the filters show the counts, waiting first`, await seen(page.getByRole('tab', { name: /^Waiting \(5\)/ })) && await seen(page.getByRole('tab', { name: /^Not approved \(1\)/ })));
  await shot('1-requests');

  // Approve one
  await item('Asha Devi').getByRole('button', { name: 'Approve' }).click();
  check(`${label}: approving asks first and says what happens`, await seen(dialog().getByText(/next Club ID/)));
  await dialog().getByRole('button', { name: 'Approve', exact: true }).click();
  check(`${label}: the approved person leaves the waiting list`, await absent('Asha Devi') && await until(async () => (await log()).includes('approve 10')));
  await page.getByRole('tab', { name: /^Approved/ }).click();
  check(`${label}: under Approved it shows the Club ID that was given and by whom`, await seen(item('Asha Devi').getByText(/26SCC9\d\d/)) && await seen(item('Asha Devi').getByText(/by admin@srkr\.ac\.in/)));

  // Decline needs a reason
  await page.getByRole('tab', { name: /^Waiting/ }).click();
  await item('Lakshmi N').getByRole('button', { name: /Decline/ }).click();
  check(`${label}: declining is disabled until a reason is typed`, await dialog().getByRole('button', { name: 'Decline and tell them' }).isDisabled());
  await dialog().getByLabel(/Reason/).fill('Please verify your email first');
  await shot('2-decline');
  await dialog().getByRole('button', { name: 'Decline and tell them' }).click();
  check(`${label}: after declining the person leaves the list and the reason is stored`, await absent('Lakshmi N') && await until(async () => (await log()).includes('reject 12')));
  await page.getByRole('tab', { name: /^Not approved/ }).click();
  check(`${label}: it shows under Not approved with its reason`, await seen(item('Lakshmi N').getByText(/Please verify your email first/)));

  // Select several
  await page.getByRole('tab', { name: /^Waiting/ }).click();
  await page.getByLabel('Select Kiran Babu').check();
  await page.getByLabel('Select Dev Anand').check();
  check(`${label}: the selection is counted`, await seen(page.getByText('2 selected', { exact: true })));
  await page.getByRole('button', { name: /Approve 2 selected/ }).click();
  check(`${label}: approving several asks first with the count`, await seen(dialog().getByText('Approve 2 people?')));
  await dialog().getByRole('button', { name: 'Approve 2', exact: true }).click();
  check(`${label}: they are all approved and leave the list`, await absent('Kiran Babu') && await absent('Dev Anand') && await until(async () => (await log()).includes('bulk 2')));

  // Search and filters
  await page.getByRole('tab', { name: /^All/ }).click();
  await page.getByLabel('Search the requests').fill('r2205');
  check(`${label}: search finds a person by roll number`, await seen(item('Meena Kumari')) && await absent('Asha Devi'));
  await page.getByLabel('Search the requests').fill('');

  check(`${label}: nothing scrolls sideways`, await noOverflow(page));
  check(`${label}: no console errors`, errors.length === 0, errors.join(' | '));
  await shot('3-end');
  await ctx.close();

  // A Club Lead can look but not decide
  const lead = await open(viewport, 'CLUB_LEAD');
  await lead.page.goto(`${BASE}/admin/club-ids?tab=requests`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  check(`${label}: a Club Lead sees the requests and details`, await seen(lead.page.getByRole('region', { name: 'Requests' }).getByRole('listitem').filter({ hasText: 'Meena Kumari' })));
  check(`${label}: but no approve, decline or select controls`, (await lead.page.getByRole('button', { name: /^Approve|Decline/ }).count()) === 0 && (await lead.page.getByLabel(/^Select /).count()) === 0);
  await lead.ctx.close();

  // A member's own card on the profile
  await fetch(`${API}/__memreset`);
  const member = await open(viewport, 'NON_AFFILIATE');
  await member.page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const card = member.page.getByRole('region', { name: 'Club membership' });
  if (await seen(card, 30000)) {
    await member.page.screenshot({ path: `${OUT}/${label}-4-profile.png`, fullPage: true });
    await card.getByLabel(/Anything the organizers/).fill('I would like to join');
    await card.getByRole('button', { name: 'Ask to join the club' }).click();
    check(`${label}: a person can ask from their profile and then sees it is waiting`, await seen(card.getByText(/is waiting for an organizer/)) && (await log()).includes('request'));
    await card.getByRole('button', { name: 'Withdraw the request' }).click();
    check(`${label}: and can withdraw it`, await seen(card.getByRole('button', { name: 'Ask to join the club' })) && (await log()).includes('cancel'));
  } else {
    check(`${label}: the profile page shows the membership card`, false, 'profile did not load with the stand-in API');
  }
  await member.ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
