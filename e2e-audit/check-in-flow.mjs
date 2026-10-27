// Drives the check-in console, admin panels and participant card in a real browser against the stand-in API.
// Usage: node e2e-audit/check-in-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/check-in';
const API = 'http://localhost:8100/api';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });

async function session(role, viewport) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024, permissions: ['camera'] });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), 'dark');
  const token = role === 'admin' ? 'admin' : 'user';
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: token, url: BASE }, { name: 'srkrcc_user_role', value: role === 'admin' ? 'ADMIN' : 'STUDENT', url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), role === 'admin'
    ? { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true }
    : { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', last_name: 'R', role: 'STUDENT' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
  return { ctx, page, errors };
}

const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);

await fetch(`${API.replace('/api', '')}/__checkin?reset=1&window=OPEN`);

// ---------- admin: panels ----------
for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const { ctx, page, errors } = await session('admin', viewport);
  await page.goto(`${BASE}/admin/hackathons/hackoverflow-2026?tab=checkin`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByText('Check-in window').waitFor({ timeout: 60000 });
  await page.getByText('Nobody has checked in yet').waitFor({ timeout: 20000 });
  await page.getByText('No-shows').first().waitFor();
  check(`[${label}] admin check-in tab renders window, stats, no-shows and console`, true);
  check(`[${label}] no horizontal scroll on the admin tab`, await noOverflow(page));
  await page.screenshot({ path: `${OUT}/admin-${label}.png`, fullPage: true });

  // window form: closing before opening is reported by the server, here only the form wiring is checked
  await page.getByLabel('Opens').fill('2026-11-01T09:00');
  check(`[${label}] window inputs accept a date-time`, (await page.getByLabel('Opens').inputValue()) === '2026-11-01T09:00');
  check(`[${label}] no console errors on the admin tab`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------- volunteer console ----------
{
  const { ctx, page, errors } = await session('admin', { width: 390, height: 844 });
  await page.goto(`${BASE}/hackathons/hackoverflow-2026/check-in`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByLabel('Search participants').waitFor({ timeout: 60000 });
  await page.getByText('Asha Rao').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(3000); // let React hydrate before interacting
  const typed = page.getByLabel('Enter or paste a QR code');
  const submitCode = async (code) => { await typed.fill(code); await page.getByRole('button', { name: 'Check in code' }).click(); };

  await submitCode('person-1');
  check('fresh code shows a green "checked in" result', await page.getByText('Asha Rao checked in').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
  await page.screenshot({ path: `${OUT}/console-success.png` });

  await page.waitForTimeout(4200);
  await submitCode('person-1');
  check('repeat code shows "already checked in" with who and when', await page.getByText(/Asha Rao was already checked in/).waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
  check('repeat result names the volunteer', await page.getByText(/by Vik Vol/).first().isVisible().catch(() => false));
  await page.screenshot({ path: `${OUT}/console-repeat.png` });

  await submitCode('expired');
  check('expired code shows the refusal message', await page.getByText(/QR code has expired/).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
  await page.screenshot({ path: `${OUT}/console-error.png` });

  await submitCode('person-2');
  await page.getByText('Bo Li checked in').waitFor({ timeout: 10000 });
  const recent = page.getByRole('list', { name: 'Recent scans' });
  check('recent scans list appears with an undo for a fresh check-in', await recent.getByRole('button', { name: /Undo/ }).first().isVisible());
  await recent.getByRole('button', { name: /Undo/ }).first().click().catch(() => {});

  // server-side search
  await page.getByLabel('Search participants').fill('team 3');
  await page.waitForTimeout(900);
  const names = (await page.locator('main li p.truncate.text-sm').allTextContents()).map((t) => t.replace(/Leader$/, '').trim());
  check('search is applied (server-side) and narrows the list', ['Gia Ray', 'Hal Moe', 'Ian Fox'].every((n) => names.includes(n)) && !names.includes('Asha Rao'), names.join(', '));

  // walk-in override
  await page.getByLabel('Search participants').fill('fay');
  await page.getByRole('button', { name: 'Let in anyway' }).waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${OUT}/console-held-back.png` });
  await page.getByRole('button', { name: 'Let in anyway' }).click();
  await page.getByLabel(/Reason for letting in Fay Forming/).fill('Teammate arrived late');
  await page.getByRole('button', { name: 'Check in', exact: true }).last().click();
  check('organizer can let in an unregistered person with a reason', await page.getByText('Fay Forming checked in').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
  await page.getByLabel('Search participants').fill('');

  // big screen
  await page.getByRole('button', { name: /Big screen/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Check-in progress' });
  check('big screen shows the counter', await dialog.isVisible() && /\d+\s*\/\s*12/.test(await dialog.innerText()));
  await page.screenshot({ path: `${OUT}/console-big-screen.png` });
  await page.getByRole('button', { name: /Close/ }).click();

  // offline queue
  await ctx.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await submitCode('person-5');
  check('offline scan is saved on the phone', await page.getByText('Saved on this phone').first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
  check('offline banner shows a waiting count', await page.getByText(/1 waiting/).isVisible().catch(() => false));
  check('queued scan is stored in localStorage', (await page.evaluate(() => localStorage.getItem('hackathon-check-in-queue:hackoverflow-2026'))) !== null);
  await page.screenshot({ path: `${OUT}/console-offline.png` });
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  check('queue is sent on reconnect', await page.getByText(/Eli Sun synced/).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false));
  check('queue is empty afterwards', (await page.evaluate(() => localStorage.getItem('hackathon-check-in-queue:hackoverflow-2026'))) === null);

  // camera path with a fake device
  await page.getByRole('button', { name: /Scan QR codes/ }).click();
  const cameraUp = await page.waitForSelector('#hackathon-check-in-scanner video', { timeout: 15000 }).then(() => true, () => false);
  check('camera starts and renders a live video element', cameraUp, cameraUp ? '' : (await page.getByRole('alert').allTextContents().catch(() => [])).join(' '));
  check('no torch button when the camera has no torch', (await page.getByRole('button', { name: /Torch/ }).count()) === 0);
  await page.screenshot({ path: `${OUT}/console-camera.png` });
  await page.getByRole('button', { name: /Stop camera/ }).click();

  check('no horizontal scroll on the phone console', await noOverflow(page));
  check('no console errors on the console page', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------- admin panels after activity ----------
{
  const { ctx, page, errors } = await session('admin', { width: 1280, height: 900 });
  await page.goto(`${BASE}/admin/hackathons/hackoverflow-2026?tab=checkin`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByText(/Scans per volunteer/).waitFor({ timeout: 30000 });
  await page.waitForTimeout(3000);
  check('stats show volunteers and a timeline once people have arrived', await page.getByText('Vik Vol').first().isVisible() && await page.getByText(/let in by an organizer/).isVisible());
  await page.screenshot({ path: `${OUT}/admin-stats.png`, fullPage: true });
  await page.getByRole('button', { name: /Remind everyone/ }).click();
  check('reminder reports how many were reminded', await page.getByText(/Reminded \d+ people/).waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
  await page.getByLabel(/Team 4/).check();
  await page.getByRole('button', { name: /Withdraw selected/ }).click();
  check('withdraw asks for confirmation and mentions the waitlist', await page.getByText(/Waitlisted teams \(2\)/).waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
  await page.screenshot({ path: `${OUT}/admin-withdraw-confirm.png` });
  await page.getByRole('button', { name: 'Withdraw teams' }).click();
  check('withdraw reports the result', await page.getByText(/Withdrew 1 team/).waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
  check('no console errors on the admin tab after activity', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------- participant card ----------
{
  const { ctx, page, errors } = await session('user', { width: 390, height: 844 });
  for (const [windowState, expected] of [['OPEN', null], ['NOT_OPEN', /Check-in opens/], ['CLOSED', /Check-in has closed/]]) {
    await fetch(`${API.replace('/api', '')}/__checkin?window=${windowState}&reset=1`);
    await page.goto(`${BASE}/hackathons/hackoverflow-2026/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByText('Event check-in').waitFor({ timeout: 60000 });
    await page.waitForTimeout(2500);
    console.log('   card:', (await page.locator('section', { hasText: 'Event check-in' }).last().innerText()).split('\n').join(' | ').slice(0, 160));
    if (expected) check(`participant card (${windowState}) shows the right message`, await page.getByText(expected).waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
    else check('participant card (OPEN) shows a QR code', await page.getByRole('img', { name: /check-in QR code/i }).waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
    await page.screenshot({ path: `${OUT}/participant-${windowState.toLowerCase()}.png` });
  }
  check('no horizontal scroll on the participant dashboard', await noOverflow(page));
  check('no console errors on the participant dashboard', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
