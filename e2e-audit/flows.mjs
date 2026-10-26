// Functional checks of the audited fixes on a built site. Usage: node e2e-audit/flows.mjs <base> <label>
// 1 team registration: empty submit, server-side name clash, keyboard in the problem picker
// 2 section nav keeps the active tab in view on a phone
// 3 admin control-room tabs: roving focus with the arrow keys, tab panel wiring
// 4 skip link is the first tab stop and lands on <main>
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const [BASE, label = 'flows'] = process.argv.slice(2);
const OUT = `docs/ui-ux-audit/screenshots/${label}`;
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const browser = await chromium.launch();
const mk = async (w, h, token, role) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1024 });
  await ctx.addInitScript(() => localStorage.setItem('theme', 'dark'));
  if (token) {
    await ctx.addCookies([{ name: 'srkrcc_access_token', value: token, url: BASE }, { name: 'srkrcc_user_role', value: role, url: BASE }]);
    await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), role === 'ADMIN'
      ? { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true }
      : { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', last_name: 'R', role: 'NON_AFFILIATE' });
  }
  return ctx;
};

// 1. registration -----------------------------------------------------------------------------------------------------
{
  const ctx = await mk(375, 812, 'user-noteam', 'NON_AFFILIATE');
  const page = await ctx.newPage();
  await page.goto(`${BASE}/hackathons/hackoverflow-2026/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Create a team/ }).click();
  const dialog = page.getByRole('dialog').or(page.locator('[role=dialog]')).first();
  await page.getByRole('button', { name: 'Create team' }).waitFor();
  await page.getByRole('button', { name: 'Create team' }).click();
  const name = page.getByLabel(/Team name/);
  const describedBy = await name.getAttribute('aria-describedby');
  const msg = describedBy ? await page.locator(`#${describedBy}`).textContent() : null;
  check('empty submit: name error is announced and tied to the field', msg === 'Team name is required.' && (await page.locator(`#${describedBy}`).getAttribute('role')) === 'alert', `describedby=${describedBy} msg=${msg}`);
  check('empty submit: problem statement error shown', await page.getByText('Pick a problem statement.').count() === 1);
  await page.screenshot({ path: `${OUT}/registration-empty-375.png` });
  // keyboard in the problem picker: Escape closes the list but not the dialog
  const picker = page.locator('button[aria-haspopup=listbox]').first();
  await picker.focus();
  await page.keyboard.press('ArrowDown');
  const opened = await page.locator('[role=listbox]').count();
  await page.keyboard.press('Escape');
  const stillOpenDialog = await page.getByRole('button', { name: 'Create team' }).count();
  const afterEsc = await page.locator('[role=listbox]').count();
  check('picker: ArrowDown opens the list, Escape closes only the list', opened === 1 && afterEsc === 0 && stillOpenDialog === 1, `opened=${opened} listAfterEscape=${afterEsc} dialogStillOpen=${stillOpenDialog}`);
  if (stillOpenDialog === 0) { await page.getByRole('button', { name: /Create a team/ }).click(); }
  if (afterEsc) { await page.keyboard.press('Escape'); }
  // server-side clash
  await name.fill('Taken');
  await picker.click();
  await page.getByRole('option').first().click();
  await page.getByLabel(/I have read and accept the rules/).check();
  await page.getByRole('button', { name: 'Create team' }).click();
  await page.getByText('A team with this name already exists.').waitFor({ timeout: 8000 }).catch(() => {});
  const clashId = await name.getAttribute('aria-describedby');
  check('server clash: message is tied to the name field', !!clashId && (await page.locator(`#${clashId}`).textContent()) === 'A team with this name already exists.', `describedby=${clashId}`);
  await page.screenshot({ path: `${OUT}/registration-clash-375.png` });
  await ctx.close();
}

// 2. section nav keeps the active tab visible on a phone -----------------------------------------------------------------
{
  const ctx = await mk(375, 812);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/hackathons/hackoverflow-2026`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav[aria-label="Hackathon sections"]');
  await page.evaluate(() => document.getElementById('faq')?.scrollIntoView());
  await page.waitForTimeout(1500);
  const inView = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Hackathon sections"]');
    const active = nav?.querySelector('[aria-current="true"]');
    if (!nav || !active) return { ok: false, why: 'no active tab' };
    const n = nav.getBoundingClientRect(); const a = active.getBoundingClientRect();
    return { ok: a.left >= n.left - 1 && a.right <= n.right + 1, label: active.textContent, left: Math.round(a.left), right: Math.round(a.right), navRight: Math.round(n.right) };
  });
  check('section nav: active tab is inside the visible bar after scrolling to the last section', inView.ok, JSON.stringify(inView));
  await page.screenshot({ path: `${OUT}/section-nav-faq-375.png` });
  await ctx.close();
}

// 3. admin tabs ----------------------------------------------------------------------------------------------------------
{
  const ctx = await mk(1280, 900, 'admin', 'ADMIN');
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/hackathons/hackoverflow-2026`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[role=tab]');
  const first = page.locator('[role=tab]').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  const second = await page.evaluate(() => ({ selected: document.querySelector('[role=tab][aria-selected=true]')?.textContent?.trim(), focused: document.activeElement?.textContent?.trim(), tabindexes: [...document.querySelectorAll('[role=tab]')].filter((t) => t.tabIndex === 0).length, url: location.search }));
  check('admin tabs: ArrowRight selects and focuses the next tab, one tab stop', second.selected === second.focused && second.tabindexes === 1 && /tab=settings/.test(second.url), JSON.stringify(second));
  await page.keyboard.press('End');
  await page.waitForTimeout(600);
  const last = await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]')?.textContent?.trim());
  check('admin tabs: End goes to the last tab', /Announcements/.test(last ?? ''), last);
  const panel = await page.evaluate(() => { const p = document.getElementById('hackathon-tabpanel'); return { role: p?.getAttribute('role'), labelled: !!document.getElementById(p?.getAttribute('aria-labelledby') ?? ''), h2: p?.querySelector('h2.sr-only')?.textContent }; });
  check('admin tabs: panel is wired to its tab and has a heading', panel.role === 'tabpanel' && panel.labelled && !!panel.h2, JSON.stringify(panel));
  await ctx.close();
}

// 4. skip link -----------------------------------------------------------------------------------------------------------
{
  const ctx = await mk(1280, 900);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/hackathons`, { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
  const visible = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.width > 40 && r.height > 20; });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  const target = await page.evaluate(() => document.activeElement?.id).catch(() => '(page navigated)');
  check('skip link: first Tab stop, visible on focus, moves focus to main', first === 'Skip to main content' && visible && target === 'main-content', `first=${first} visible=${visible} target=${target}`);
  const mains = await page.locator('main').count();
  check('exactly one <main> landmark on /hackathons', mains === 1, `count=${mains}`);
  await ctx.close();
}

// 5. listing: keyboard focus fans the stack out, as hover does -------------------------------------------------------------
{
  const ctx = await mk(1440, 900);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/hackathons`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.bounce-card');
  await page.mouse.move(2, 2);
  await page.waitForTimeout(2500);
  const rotation = () => page.evaluate(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector('.bounce-card-0')).transform); return Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI * 10) / 10; });
  const before = await rotation();
  await page.locator('.bounce-card-2 a').first().focus();
  await page.waitForTimeout(900);
  const during = await rotation();
  await page.locator('h1').first().evaluate((el) => { el.setAttribute('tabindex', '-1'); el.focus(); });
  await page.waitForTimeout(900);
  const after = await rotation();
  check('listing: focusing a card control spreads the cards (rotation 0) and blurring folds them again', before !== 0 && during === 0 && after !== 0, `rotation before=${before} focused=${during} after=${after}`);
  await ctx.close();
}

// 6. phone: register bar follows the reader once the header button scrolls away ----------------------------------------------
{
  const ctx = await mk(375, 812);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/hackathons/hackoverflow-2026`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(800);
  const bar = () => page.evaluate(() => [...document.querySelectorAll('div.fixed')].some((el) => /bottom-0/.test(el.className) && /register|sign in/i.test(el.textContent || '')));
  const top = await bar();
  await page.evaluate(() => document.getElementById('prizes')?.scrollIntoView());
  await page.waitForTimeout(800);
  const mid = await bar();
  await page.screenshot({ path: `${OUT}/sticky-register-375.png` });
  check('phone detail: no register bar at the top, one appears after scrolling past the header button', !top && mid, `top=${top} scrolled=${mid}`);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`docs/ui-ux-audit/data/flows-${label}.json`, JSON.stringify(results, null, 1));
process.exit(results.every((r) => r.ok) ? 0 : 1);
