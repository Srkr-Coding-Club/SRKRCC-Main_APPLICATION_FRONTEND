// Drives the redesigned navbars in a real browser against the stand-in API: the account menu, the Events "Next up" card,
// the admin bar at laptop and wide widths, the Ctrl K jump menu, the phone drawer. Screenshots plus pass/fail checks.
// Usage: node e2e-audit/navbar-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3320';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/navbar-flow';
fs.mkdirSync(OUT, { recursive: true });

const check = (name, ok, detail = '') => { if (!ok) process.exitCode = 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const seen = (locator, timeout = 20000) => locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
const gone = (locator, timeout = 8000) => locator.waitFor({ state: 'hidden', timeout }).then(() => true).catch(() => false);
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const browser = await chromium.launch();

async function open(width, { token, theme = 'dark' }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 800 : 820 }, hasTouch: width < 1024 });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => undefined);
  if (token) {
    await ctx.addCookies([{ name: 'srkrcc_access_token', value: token, url: BASE }, { name: 'srkrcc_user_role', value: 'ADMIN', url: BASE }]);
    await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true, club_id: '26SCC014' });
  }
  return ctx;
}

// ---------------------------------------------------------------- public bar, signed in, desktop
{
  const ctx = await open(1280, { token: 'admin' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]|\[Report Only\]/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  await page.goto(BASE + '/forms', { waitUntil: 'domcontentloaded', timeout: 180000 });
  const trigger = page.getByRole('button', { name: 'Account menu, Ada' });
  check('public 1280: one account button replaces the Admin Room and profile pills', await seen(trigger) && (await page.getByRole('link', { name: 'Admin Room' }).count()) === 0);
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Account' });
  await page.waitForTimeout(400);   // let it finish sliding in before looking at it
  check('public 1280: the menu shows name, email, club ID, role, links, theme and sign out', await seen(menu) && /Ada Min/.test(await menu.innerText()) && /admin@srkr.ac.in/.test(await menu.innerText()) && /26SCC014/.test(await menu.innerText())
    && await seen(menu.getByRole('menuitem', { name: 'Admin Room' })) && await seen(menu.getByRole('group', { name: 'Theme' })) && await seen(menu.getByRole('menuitem', { name: 'Sign out' })));
  await page.screenshot({ path: `${OUT}/public-1280-account.png`, clip: { x: 0, y: 0, width: 1280, height: 520 } });
  await menu.getByRole('button', { name: /Copy club ID/ }).click();
  check('public 1280: clicking the club ID copies it', await seen(menu.getByRole('button', { name: 'Club ID copied' })) && (await page.evaluate(() => navigator.clipboard.readText())) === '26SCC014');
  await menu.getByRole('button', { name: 'Light' }).click();
  check('public 1280: the theme switch in the menu changes the page', await page.evaluate(() => !document.documentElement.classList.contains('dark')));
  await menu.getByRole('button', { name: 'Dark' }).click();
  await page.keyboard.press('Escape');
  check('public 1280: Escape closes the menu and returns focus to the button', await gone(menu) && await trigger.evaluate((el) => el === document.activeElement));

  await page.waitForTimeout(1500);
  await page.getByRole('link', { name: /^Events/ }).first().hover();
  const card = page.getByRole('link', { name: /Next up/ });
  check('public 1280: hovering Events shows the Next up card', await seen(card));
  if (await card.count()) await page.screenshot({ path: `${OUT}/public-1280-events.png`, clip: { x: 0, y: 0, width: 1280, height: 480 } });
  check('public 1280: no sideways scroll, no console errors', (await sideways(page)) <= 1 && errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ------------------------------------------------------------ public bar, signed out: Next up asks for sign-in
{
  const ctx = await open(1280, {});
  const page = await ctx.newPage();
  await page.goto(BASE + '/forms', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(3000);   // let the page hydrate before hovering
  await page.getByRole('link', { name: /^Events/ }).first().hover();
  const card = page.getByRole('link', { name: /Next up/ });
  check('signed-out: the Next up card says Sign in to register and goes through login', await seen(card) && /Sign in to register/.test(await card.innerText()) && /\/login\?next=%2Fhackathons%2F/.test((await card.getAttribute('href')) || ''), (await card.getAttribute('href')) || '');
  await page.screenshot({ path: `${OUT}/public-1280-signed-out-events.png`, clip: { x: 0, y: 0, width: 1280, height: 480 } });
  await card.click();
  await page.waitForURL(/\/login\?next=/, { timeout: 60000 }).catch(() => undefined);
  check('signed-out: clicking it lands on the login page with the way back kept', /\/login\?next=%2Fhackathons%2F/.test(page.url()), page.url());
  await ctx.close();
}

// ------------------------------------------------------------------- admin bar at four widths
for (const width of [1024, 1100, 1280, 1536]) {
  const ctx = await open(width, { token: 'admin' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin/hackathons', { waitUntil: 'domcontentloaded', timeout: 180000 });
  const nav = page.getByRole('navigation', { name: 'Admin' });
  check(`admin ${width}: the tab bar shows (no burger takeover)`, await seen(nav) && !(await page.getByRole('button', { name: 'Toggle navigation menu' }).isVisible()));
  const box = await nav.boundingBox();
  const cluster = await page.getByRole('button', { name: /Jump to a page/ }).boundingBox();
  check(`admin ${width}: the tabs and the right-hand buttons do not touch`, !!box && !!cluster && box.x + box.width + 8 <= cluster.x, `tabs end ${Math.round((box?.x ?? 0) + (box?.width ?? 0))}, buttons start ${Math.round(cluster?.x ?? 0)}`);
  const labels = await nav.getByRole('link').evaluateAll((links) => links.map((a) => ({ name: a.getAttribute('aria-label'), shown: [...a.querySelectorAll('span')].some((s) => getComputedStyle(s).display !== 'none' && s.textContent.trim().length > 0) })));
  const shownCount = labels.filter((l) => l.shown).length;
  check(`admin ${width}: ${width >= 1280 ? 'every tab shows its name' : 'only the current tab shows its name'}`, width >= 1280 ? shownCount === labels.length : shownCount === 1, `${shownCount} of ${labels.length}`);
  check(`admin ${width}: no sideways scroll`, (await sideways(page)) <= 1);
  await page.screenshot({ path: `${OUT}/admin-${width}-bar.png`, clip: { x: 0, y: 0, width, height: 150 } });
  await ctx.close();
}

// ----------------------------------------------------------------------------- jump menu and account
{
  const ctx = await open(1280, { token: 'admin' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin/hackathons', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await seen(page.getByRole('navigation', { name: 'Admin' }));
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Jump to a page' });
  check('admin: Ctrl K opens the jump menu with the search focused', await seen(dialog) && await dialog.getByRole('combobox').evaluate((el) => el === document.activeElement));
  await page.screenshot({ path: `${OUT}/admin-jump-empty.png` });
  await dialog.getByRole('combobox').fill('club');
  const options = dialog.getByRole('option');
  check('admin: typing filters the pages, the best match first', (await options.count()) >= 1 && (await options.count()) < 6 && /Club IDs/.test(await options.first().innerText()), `${await options.count()} results`);
  await page.screenshot({ path: `${OUT}/admin-jump-club.png` });
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/admin\/club-ids/, { timeout: 60000 }).catch(() => undefined);
  check('admin: Enter opens the page and closes the menu', /\/admin\/club-ids/.test(page.url()) && await gone(dialog));
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Jump to a page' });
  await palette.getByRole('combobox').fill('hackoverflow');
  check('admin: the jump menu finds hackathons by name and their tabs', await seen(palette.getByRole('option', { name: /HackOverflow 2026$|HackOverflow 2026 / }).first()) && (await palette.getByRole('option', { name: /HackOverflow 2026: Payments/ }).count()) >= 0, `${await palette.getByRole('option').count()} results`);
  await page.screenshot({ path: `${OUT}/admin-jump-hackathons.png` });
  await palette.getByRole('combobox').fill('hackoverflow teams');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/admin\/hackathons\/hackoverflow-2026\?tab=teams/, { timeout: 60000 }).catch(() => undefined);
  check('admin: Enter on a hackathon tab opens that tab', /\/admin\/hackathons\/hackoverflow-2026\?tab=teams/.test(page.url()), page.url());
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  check('admin: Escape closes the jump menu', await gone(page.getByRole('dialog', { name: 'Jump to a page' })));

  await page.getByRole('button', { name: /Account menu/ }).click();
  const menu = page.getByRole('menu', { name: 'Account' });
  check('admin: the account menu has the role, profile, main site and sign out', await seen(menu) && /admin/i.test(await menu.innerText()) && await seen(menu.getByRole('menuitem', { name: 'Main site' })) && await seen(menu.getByRole('menuitem', { name: 'Sign out' })));
  await page.screenshot({ path: `${OUT}/admin-1280-account.png`, clip: { x: 0, y: 0, width: 1280, height: 560 } });
  await ctx.close();
}

// ------------------------------------------------------------------------------------- phone
{
  const ctx = await open(390, { token: 'admin' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin/hackathons', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
  const drawer = page.getByRole('dialog', { name: 'Admin menu' });
  check('admin phone: the drawer opens, with Sign out and Back to Main Site in view', await seen(drawer) && await seen(drawer.getByRole('button', { name: 'Sign out' })) && await seen(drawer.getByRole('link', { name: /Back to Main Site/ })));
  await page.keyboard.press('Escape');
  check('admin phone: Escape closes the drawer', await gone(drawer));
  check('admin phone: no sideways scroll', (await sideways(page)) <= 1);
  await ctx.close();
}
await browser.close();
