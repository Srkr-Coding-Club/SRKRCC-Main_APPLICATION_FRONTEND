// Looks at both navbars at every viewport against the stand-in API: screenshots (closed, scrolled, dropdown, mobile menu open),
// plus measurements: sideways overflow, tap-target sizes, where the bar switches between its desktop and mobile form.
// Usage: node e2e-audit/navbar-review.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3320';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/navbar';
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [320, 360, 390, 768, 1024, 1280, 1536];
const report = [];
const note = (line) => { report.push(line); console.log(line); };

const browser = await chromium.launch();

async function session(width, { token, theme }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 780 : 800 }, hasTouch: width < 1024 });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
  if (token) {
    const role = token === 'admin' ? 'ADMIN' : 'NON_AFFILIATE';
    await ctx.addCookies([{ name: 'srkrcc_access_token', value: token, url: BASE }, { name: 'srkrcc_user_role', value: role, url: BASE }]);
    await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), token === 'admin'
      ? { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true, club_id: '26SCC014' }
      : { id: 2, email: 'user@srkr.ac.in', username: 'user', first_name: 'Ravi', last_name: 'Kumar', role: 'MEMBER', club_id: '26SCC031' });
  }
  return ctx;
}

const measure = (page, selector) => page.evaluate((sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const box = root.getBoundingClientRect();
  const tiny = [...root.querySelectorAll('a,button')].filter((el) => el.offsetParent !== null).map((el) => {
    const r = el.getBoundingClientRect();
    return { text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter((item) => item.w && item.h && (item.h < 36 || item.w < 36));
  return {
    height: Math.round(box.height), scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
    clipped: root.scrollWidth > root.clientWidth + 1, small: tiny,
  };
}, selector);

for (const [label, token, route, header] of [['public-out', null, '/forms', 'header[data-site-chrome]'], ['public-in', 'admin', '/forms', 'header[data-site-chrome]'], ['admin', 'admin', '/admin/hackathons', 'header']]) {
  for (const width of WIDTHS) {
    const ctx = await session(width, { token, theme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForTimeout(4000);
    const m = await measure(page, header);
    if (!m) { note(`${label} @${width}: no header found`); await ctx.close(); continue; }
    const sideways = m.scrollW - m.clientW;
    note(`${label} @${width}: bar ${m.height}px, sideways ${sideways}px, clipped ${m.clipped}, small targets: ${m.small.map((s) => `${s.text || '?'} ${s.w}x${s.h}`).join('; ') || 'none'}`);
    await page.screenshot({ path: `${OUT}/${label}-${width}-closed.png`, clip: { x: 0, y: 0, width, height: 190 } });
    const burger = page.getByRole('button', { name: 'Toggle navigation menu' });
    if (await burger.isVisible().catch(() => false)) {
      await burger.click();
      await page.waitForTimeout(700);
      const overlay = await page.evaluate(() => { const el = [...document.querySelectorAll('div')].find((d) => /fixed/.test(d.className) && /inset-0/.test(d.className) && /z-40/.test(d.className)); return el ? getComputedStyle(el).backgroundColor : null; });
      note(`${label} @${width}: menu overlay background ${overlay}`);
      await page.screenshot({ path: `${OUT}/${label}-${width}-menu.png` });
    } else if (width >= 1280) {
      const dropdownTrigger = label === 'admin' ? page.getByRole('link', { name: /Modules/ }).first() : page.getByRole('link', { name: /Events/ }).first();
      if (await dropdownTrigger.isVisible().catch(() => false)) {
        await dropdownTrigger.hover();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/${label}-${width}-dropdown.png`, clip: { x: 0, y: 0, width, height: 520 } });
      }
    }
    await ctx.close();
  }
}

// Light theme and the scrolled state, on the two widths that matter most.
for (const width of [390, 1280]) {
  const ctx = await session(width, { token: null, theme: 'light' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/forms', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/light-public-${width}-top.png`, clip: { x: 0, y: 0, width, height: 190 } });
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/light-public-${width}-scrolled.png`, clip: { x: 0, y: 0, width, height: 190 } });
  await ctx.close();
}

// Where does the public bar change form? Walk the widths around its breakpoint.
for (const width of [900, 1000, 1023, 1024, 1100]) {
  const ctx = await session(width, { token: 'admin', theme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/forms', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(3500);
  const desktop = await page.locator('header[data-site-chrome] nav').first().isVisible().catch(() => false);
  note(`public-in @${width}: shows ${desktop ? 'the desktop bar' : 'the burger menu'}`);
  await ctx.close();
}
for (const width of [1100, 1200, 1279, 1280, 1366]) {
  const ctx = await session(width, { token: 'admin', theme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin/hackathons', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(3500);
  const desktop = await page.locator('header nav').first().isVisible().catch(() => false);
  const fits = await page.evaluate(() => { const n = document.querySelector('header nav'); return n ? { navRight: Math.round(n.getBoundingClientRect().right), cluster: Math.round(document.querySelector('header .xl\\:flex.flex-shrink-0')?.getBoundingClientRect().left ?? 0) } : null; });
  note(`admin @${width}: shows ${desktop ? 'the desktop bar' : 'the burger menu'} ${fits ? `(tabs end ${fits.navRight}px, right cluster starts ${fits.cluster}px)` : ''}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/measurements.txt`, report.join('\n'));
