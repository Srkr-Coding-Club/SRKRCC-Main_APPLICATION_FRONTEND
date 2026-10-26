// Walks every tab of the hackathon control room (admin) at one viewport: overflow, small targets, inputs under 16px
// (iOS zooms the page on focus), axe, console errors, full-page screenshot.
// Usage: node e2e-audit/tabs.mjs <label> <base> <WxH> [theme] [route]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const [label, BASE, size, theme = 'dark', route = '/admin/hackathons/hackoverflow-2026'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const OUT = 'docs/ui-ux-audit';
fs.mkdirSync(`${OUT}/screenshots/${label}`, { recursive: true });
const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1024 });
await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
await ctx.addCookies([{ name: 'srkrcc_access_token', value: 'admin', url: BASE }, { name: 'srkrcc_user_role', value: 'ADMIN', url: BASE }]);
await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 160)));

await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('[role=tab]', { timeout: 30000 });
const keys = ['overview', 'settings', 'registration', 'team', 'problems', 'teams', 'emails', 'timeline', 'rounds', 'ideas', 'submissions', 'judging', 'checkin', 'results', 'publicpage', 'announcements'];
const results = [];
for (const key of keys) {
  errors.length = 0;
  await page.goto(`${BASE}${route}?tab=${key}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[role=tab]', { timeout: 30000 });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const doc = document.documentElement; const vw = doc.clientWidth;
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const sel = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`;
    const culprits = [];
    if (doc.scrollWidth - vw > 1) for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); if (r.width === 0 || r.right <= vw + 1 || getComputedStyle(el).position === 'fixed') continue;
      let p = el.parentElement, sc = false; while (p && p !== document.body) { if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(p).overflowX)) { sc = true; break; } p = p.parentElement; }
      if (!sc) culprits.push(`${sel(el)} right=${Math.round(r.right)}`);
    }
    const small = [];
    for (const el of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=tab]')) {
      if (!vis(el)) continue; const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) small.push(`${sel(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 22)}"`);
    }
    const zoom = [];
    for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')) {
      if (!vis(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 16) zoom.push(`${sel(el)} ${fs}px`);
    }
    const unlabeled = [];
    for (const el of document.querySelectorAll('input:not([type=hidden]),select,textarea')) {
      if (!vis(el)) continue;
      const has = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label');
      if (!has) unlabeled.push(`${sel(el)} type=${el.type} ph="${el.placeholder || ''}"`);
    }
    return { over: doc.scrollWidth - vw, culprits: culprits.slice(0, 5), small: small.slice(0, 12), smallCount: small.length, zoom: zoom.slice(0, 6), zoomCount: zoom.length, unlabeled: unlabeled.slice(0, 8), unlabeledCount: unlabeled.length, height: doc.scrollHeight };
  });
  await page.addScriptTag({ content: axeSrc });
  m.axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => ({ id: v.id, n: v.nodes.length, sample: v.nodes[0].target.join(' ').slice(0, 80) })));
  m.tab = key; m.errors = [...new Set(errors)].slice(0, 3);
  await page.screenshot({ path: `${OUT}/screenshots/${label}/tab-${key}__${size}__${theme}.png`, fullPage: true });
  results.push(m);
  console.log(`${key}: over=${m.over} small=${m.smallCount} zoom=${m.zoomCount} unlabeled=${m.unlabeledCount} axe=${m.axe.map((a) => a.id + ':' + a.n).join(',')} err=${m.errors.length}`);
}
fs.writeFileSync(`${OUT}/data/tabs-${label}-${size}-${theme}.json`, JSON.stringify(results, null, 1));
await browser.close();
