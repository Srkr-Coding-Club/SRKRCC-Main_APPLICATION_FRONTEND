// Drives the pull-cord lamp theme switch in a real browser against the stand-in API: pull, tap, keyboard, reduced motion,
// remembered choice, desktop and phone bars, the phone drawer, and that its glow never blocks the page. Screenshots too.
// Usage: node e2e-audit/lamp-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3320';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/lamp';
fs.mkdirSync(OUT, { recursive: true });

const check = (name, ok, detail = '') => { if (!ok) process.exitCode = 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const isDark = (page) => page.evaluate(() => document.documentElement.classList.contains('dark'));
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const settle = (page, ms = 700) => page.waitForTimeout(ms);

const browser = await chromium.launch();

async function open(width, { token, theme = 'dark', reduced = false, touch = width < 1024, count = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 800 : 820 }, hasTouch: touch, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript((t) => { if (!sessionStorage.getItem('lamp-seeded')) { localStorage.setItem('theme', t); sessionStorage.setItem('lamp-seeded', '1'); } }, theme);
  if (count) await ctx.addInitScript(() => { window.__transitions = 0; const original = document.startViewTransition?.bind(document); if (original) document.startViewTransition = (callback) => { window.__transitions += 1; return original(callback); }; });
  if (token) {
    await ctx.addCookies([{ name: 'srkrcc_access_token', value: token, url: BASE }, { name: 'srkrcc_user_role', value: 'ADMIN', url: BASE }]);
    await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true, club_id: '26SCC014' });
  }
  const page = await ctx.newPage();
  await page.goto(BASE + '/forms', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(3500);   // let the page hydrate
  return { ctx, page };
}

/** The lamp that is actually showing: the first "Toggle theme" button with a size. */
const visibleLamp = async (page) => {
  const all = page.getByRole('button', { name: 'Toggle theme' });
  for (let i = 0; i < await all.count(); i += 1) {
    const box = await all.nth(i).boundingBox();
    if (box && box.width > 0) return { locator: all.nth(i), box };
  }
  return { locator: null, box: null };
};

/** Press on the bead (it sits near the bottom of the lamp's box), drag it down by `dy`, let go. */
async function pull(page, box, dy, steps = 8) {
  const x = box.x + box.width * (51 / 68);
  const y = box.y + box.height * (82 / 100);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps });
  await page.mouse.up();
}

// ------------------------------------------------------------------------------- desktop, signed out
{
  const { ctx, page } = await open(1280, {});
  let { locator, box } = await visibleLamp(page);
  check('desktop 1280: the lamp hangs in the bar, 68 x 100, and starts dark with the lamp off', !!box && Math.round(box.width) === 68 && (await isDark(page)) && (await locator.getAttribute('aria-pressed')) === 'false', box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'not found');
  const header = await page.locator('header[data-site-chrome]').boundingBox();
  check('desktop 1280: its cord and bead hang a little below the bar', !!box && !!header && box.y + box.height > header.y + header.height + 6 && box.y <= header.y + 2, `lamp bottom ${Math.round((box?.y ?? 0) + (box?.height ?? 0))}, bar bottom ${Math.round((header?.y ?? 0) + (header?.height ?? 0))}`);
  await page.screenshot({ path: `${OUT}/desktop-dark.png`, clip: { x: 0, y: 0, width: 1280, height: 260 } });

  await pull(page, box, 8);
  await settle(page);
  check('desktop 1280: a short pull (8 px) springs back and changes nothing', await isDark(page));
  await pull(page, box, 28);
  await settle(page);
  check('desktop 1280: pulling the bead down and letting go switches to light', !(await isDark(page)) && (await locator.getAttribute('aria-pressed')) === 'true');
  check('desktop 1280: the choice is remembered', (await page.evaluate(() => localStorage.getItem('theme'))) === 'light');
  await page.screenshot({ path: `${OUT}/desktop-light.png`, clip: { x: 0, y: 0, width: 1280, height: 320 } });

  const under = await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); return el ? (el.closest('a,button')?.getAttribute('aria-label') || el.closest('a,button')?.textContent?.trim() || el.tagName) : null; }, { x: box.x + 5, y: box.y + 110 });
  check('desktop 1280: the light cone does not block what is under it', under !== 'Toggle theme', String(under));

  await locator.click({ position: { x: 34, y: 40 } });
  await settle(page);
  check('desktop 1280: a plain click or tap on the lamp switches it too', await isDark(page));
  await locator.focus();
  await page.keyboard.press('Enter');
  await settle(page);
  check('desktop 1280: Enter switches it', !(await isDark(page)));
  await page.keyboard.press('Space');
  await settle(page);
  check('desktop 1280: Space switches it', await isDark(page));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  check('desktop 1280: a reload keeps the theme without a flash of the other one', (await isDark(page)) === ((await page.evaluate(() => localStorage.getItem('theme'))) === 'dark'));
  check('desktop 1280: no sideways scroll', (await sideways(page)) <= 1);
  await ctx.close();
}

// -------------------------------------------- desktop: the circular reveal, the one-time hint, the haptic buzz
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('lamp-seeded')) { localStorage.setItem('theme', 'dark'); sessionStorage.setItem('lamp-seeded', '1'); }
    window.__transitions = 0;
    const original = document.startViewTransition?.bind(document);
    if (original) document.startViewTransition = (callback) => { window.__transitions += 1; return original(callback); };
    window.__buzz = [];
    navigator.vibrate = (pattern) => { window.__buzz.push(pattern); return true; };
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/forms', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(1500);
  const hint = page.getByText('Pull to switch the lights');
  check('hint: not there straight away', (await hint.count()) === 0);
  await page.waitForTimeout(2500);
  check('hint: a small bubble appears beside the bead after a moment', await hint.isVisible());
  await page.screenshot({ path: `${OUT}/desktop-hint.png`, clip: { x: 0, y: 0, width: 1280, height: 260 } });
  const box = (await visibleLamp(page)).box;
  await pull(page, box, 28);
  await page.waitForTimeout(260);
  check('reveal: the switch ran as a view transition', (await page.evaluate(() => window.__transitions)) === 1);
  await page.screenshot({ path: `${OUT}/desktop-reveal-midway.png`, clip: { x: 0, y: 0, width: 1280, height: 520 } });
  await page.waitForTimeout(800);
  check('reveal: it ended in the light theme, and the choice is stored', !(await isDark(page)) && (await page.evaluate(() => localStorage.getItem('theme'))) === 'light');
  check('hint: gone as soon as the lamp was used, and remembered', (await hint.count()) === 0 && (await page.evaluate(() => localStorage.getItem('lamp-hint-seen'))) === '1');
  check('haptics: one short buzz for the switch', JSON.stringify(await page.evaluate(() => window.__buzz)) === '[10]');
  await pull(page, box, 28);
  await page.waitForTimeout(1200);
  check('reveal: and back to dark', await isDark(page));
  // Two quick pulls in a row: the second waits for the first, so the lamp and the theme never disagree.
  await pull(page, box, 28, 2);
  await pull(page, box, 28, 2);
  await page.waitForTimeout(1500);
  const settledDark = await isDark(page);
  check('reveal: two pulls in a row leave the lamp and the theme agreeing', (await (await visibleLamp(page)).locator.getAttribute('aria-pressed')) === String(!settledDark));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  check('hint: not shown again on a later visit', (await hint.count()) === 0);
  await ctx.close();
}

// ------------------------------------------------------------------------ desktop, reduced motion
{
  const { ctx, page } = await open(1280, { reduced: true, count: true });
  const { locator, box } = await visibleLamp(page);
  await pull(page, box, 28, 4);
  await page.waitForTimeout(150);
  check('reduced motion: the theme switches at once', !(await isDark(page)));
  const cord = await locator.locator('path[d^="M51 41V"]').first().getAttribute('d');
  check('reduced motion: the cord does not stretch or swing', cord === 'M51 41V76', cord ?? '');
  check('reduced motion: no view transition ran', (await page.evaluate(() => window.__transitions)) === 0);
  await ctx.close();
}

// -------------------------------------------------------------------------------- phone, signed in
for (const width of [390, 430]) {
  const { ctx, page } = await open(width, { token: 'admin' });
  const { locator, box } = await visibleLamp(page);
  check(`phone ${width}: the lamp shows in the bar and is big enough to press`, !!box && box.width >= 44 && box.height >= 44, box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'not found');
  const logo = await page.getByRole('link', { name: 'SRKR Coding Club Home' }).boundingBox();
  const bell = (await page.getByRole('button', { name: /Notifications/ }).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, width: r.width }; }).filter((r) => r.width > 0)))[0];
  check(`phone ${width}: it sits between the logo and the icons without touching them`, !!box && !!logo && !!bell && box.x >= logo.x + logo.width && box.x + box.width <= bell.x + 1, `logo ends ${Math.round((logo?.x ?? 0) + (logo?.width ?? 0))}, lamp ${Math.round(box?.x ?? 0)}-${Math.round((box?.x ?? 0) + (box?.width ?? 0))}, bell ${Math.round(bell?.x ?? 0)}`);
  check(`phone ${width}: no sideways scroll`, (await sideways(page)) <= 1);
  await page.screenshot({ path: `${OUT}/phone-${width}-dark.png`, clip: { x: 0, y: 0, width, height: 190 } });
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.55);
  await settle(page);
  check(`phone ${width}: a tap on the lamp switches the theme`, !(await isDark(page)));
  await page.screenshot({ path: `${OUT}/phone-${width}-light.png`, clip: { x: 0, y: 0, width, height: 190 } });
  await pull(page, box, 30);
  await settle(page);
  check(`phone ${width}: pulling the bead switches it back`, await isDark(page));
  await ctx.close();
}

// ----------------------------------------------------------------------- phone, the drawer's lamp
{
  const { ctx, page } = await open(390, { token: 'admin' });
  await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
  const drawer = page.getByRole('dialog', { name: 'Site menu' });
  await drawer.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(700);
  const lamp = drawer.getByRole('button', { name: 'Toggle theme' });
  const box = await lamp.boundingBox();
  check('phone drawer: a big lamp hangs from the top with its caption', !!box && box.width >= 90 && /switch\s+the lights/i.test(await drawer.innerText()), box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'not found');
  await page.screenshot({ path: `${OUT}/phone-drawer-dark.png` });
  await pull(page, box, 40);
  await settle(page);
  check('phone drawer: pulling it switches the theme', !(await isDark(page)));
  check('phone drawer: the Light button shows it is now the chosen one', (await drawer.getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')) === 'true');
  await page.screenshot({ path: `${OUT}/phone-drawer-light.png` });
  await drawer.getByRole('button', { name: 'Dark' }).click();
  await settle(page);
  check('phone drawer: the Dark button switches back and the lamp follows', (await isDark(page)) && (await lamp.getAttribute('aria-pressed')) === 'false');
  await ctx.close();
}

// ----------------------------------------------------------------------------- narrow phones
for (const width of [360, 320]) {
  const { ctx, page } = await open(width, { token: 'admin' });
  const { box } = await visibleLamp(page);
  check(`phone ${width}: no lamp in the bar (no room), no sideways scroll`, !box && (await sideways(page)) <= 1);
  await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
  const drawer = page.getByRole('dialog', { name: 'Site menu' });
  await drawer.waitFor({ state: 'visible', timeout: 20000 });
  check(`phone ${width}: the drawer still has the lamp and the Light/Dark buttons`, (await drawer.getByRole('button', { name: 'Toggle theme' }).count()) === 1 && (await drawer.getByRole('group', { name: 'Theme' }).count()) === 1);
  await ctx.close();
}
await browser.close();
