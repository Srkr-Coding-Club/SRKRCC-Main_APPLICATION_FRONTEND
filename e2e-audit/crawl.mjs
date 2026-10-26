// UI/UX audit crawler. For every route x viewport x role it records: horizontal overflow (with culprit elements),
// tap targets under 24px (WCAG 2.2 SC 2.5.8), text under 12px, axe-core violations, console errors, failed requests,
// and a screenshot. Output: docs/ui-ux-audit/data/crawl-<label>.json and screenshots/.
// Usage: node e2e-audit/crawl.mjs <label> [routeFilter] [viewportFilter]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.AUDIT_BASE || 'http://localhost:3100';
const label = process.argv[2] || 'baseline';
const routeFilter = process.argv[3] ? new RegExp(process.argv[3]) : null;
const vpFilter = process.argv[4] ? new RegExp(process.argv[4]) : null;
const OUT = 'docs/ui-ux-audit';
fs.mkdirSync(`${OUT}/data`, { recursive: true });
fs.mkdirSync(`${OUT}/screenshots/${label}`, { recursive: true });

const VIEWPORTS = [
  ['320x568', 320, 568], ['375x812', 375, 812], ['430x932', 430, 932], ['768x1024', 768, 1024],
  ['1024x768', 1024, 768], ['1366x768', 1366, 768], ['1440x900', 1440, 900], ['1920x1080', 1920, 1080],
];
const SLUG = 'hackoverflow-2026';
const ROUTES = [
  ['anon', '/'], ['anon', '/about'], ['anon', '/events'], ['anon', '/forms'], ['anon', '/blogs'], ['anon', '/career'], ['anon', '/codequest'],
  ['anon', '/iconcoders'], ['anon', '/login'], ['anon', '/signup'], ['anon', '/403'],
  ['anon', '/hackathons'], ['anon', `/hackathons/${SLUG}`], ['anon', '/hackathons/long-title-agri'], ['anon', '/hackathons/past-codefest'],
  ['user', `/hackathons/${SLUG}`], ['user', `/hackathons/${SLUG}/dashboard`], ['user', `/hackathons/${SLUG}/finder`], ['user', `/hackathons/${SLUG}/check-in`],
  ['user', `/hackathons/${SLUG}/manage`], ['user', `/hackathons/${SLUG}/judging`], ['user', `/hackathons/${SLUG}/certificate`], ['user', '/profile'],
  ['admin', '/admin'], ['admin', '/admin/hackathons'], ['admin', `/admin/hackathons/${SLUG}`], ['admin', '/admin/events'], ['admin', '/admin/forms'],
  ['admin', '/admin/members'], ['admin', '/admin/users'], ['admin', '/admin/announcements'], ['admin', '/admin/audit-logs'], ['admin', '/admin/codequest'],
  ['admin', '/admin/content'], ['admin', '/admin/csv-ingestion'], ['admin', '/admin/data-health'], ['admin', '/admin/data-management'], ['admin', '/admin/flags'],
  ['admin', '/admin/jobs'], ['admin', '/admin/maintenance'], ['admin', '/admin/responses'], ['admin', '/admin/builder'], ['admin', '/admin/attendance/scan'],
];

const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

const measure = () => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const sel = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`;
  const culprits = [];
  if (doc.scrollWidth - vw > 1) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= vw + 1) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || el.closest('nextjs-portal')) continue;
      let p = el.parentElement, scroller = false;
      while (p && p !== document.body) { const ox = getComputedStyle(p).overflowX; if (['auto', 'scroll', 'hidden', 'clip'].includes(ox)) { scroller = true; break; } p = p.parentElement; }
      if (!scroller) culprits.push(`${sel(el)} right=${Math.round(r.right)}`);
    }
  }
  const small = [];
  for (const el of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],summary')) {
    if (!visible(el) || el.closest('nextjs-portal')) continue;
    if (el.tagName === 'A' && el.closest('p,li') && getComputedStyle(el).display === 'inline') continue; // inline text links are exempt (SC 2.5.8)
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) small.push(`${sel(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}"`);
  }
  const tiny = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el || !visible(el) || el.closest('nextjs-portal,script,style')) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) tiny.set(`${fs}px ${sel(el)}`, (tiny.get(`${fs}px ${sel(el)}`) || 0) + 1);
  }
  const noName = [];
  for (const el of document.querySelectorAll('button,a[href]')) {
    if (!visible(el)) continue;
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
    if (!name && !el.querySelector('img[alt]:not([alt=""])')) noName.push(sel(el));
  }
  return {
    overflow: doc.scrollWidth - vw, culprits: culprits.slice(0, 6),
    small: small.slice(0, 15), smallCount: small.length,
    tiny: [...tiny.entries()].slice(0, 8), noName: noName.slice(0, 8),
    h1: document.querySelectorAll('h1').length, title: document.title, finalPath: location.pathname,
  };
};

const browser = await chromium.launch();
const results = [];
for (const [vpName, width, height] of VIEWPORTS) {
  if (vpFilter && !vpFilter.test(vpName)) continue;
  for (const role of ['anon', 'user', 'admin']) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 1024 });
    await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, process.env.AUDIT_THEME || 'dark');
    if (role !== 'anon') {
      await ctx.addCookies([
        { name: 'srkrcc_access_token', value: role === 'admin' ? 'admin' : 'user', url: BASE },
        { name: 'srkrcc_user_role', value: role === 'admin' ? 'ADMIN' : 'NON_AFFILIATE', url: BASE },
      ]);
      await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), role === 'admin'
        ? { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true }
        : { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', last_name: 'R', role: 'NON_AFFILIATE' });
    }
    for (const [r, route] of ROUTES) {
      if (r !== role || (routeFilter && !routeFilter.test(route))) continue;
      const page = await ctx.newPage();
      const consoleErrors = []; const failed = [];
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
      page.on('response', (resp) => { if (resp.status() >= 400) failed.push(`${resp.status()} ${new URL(resp.url()).pathname}`); });
      const entry = { vp: vpName, role, route };
      try {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForTimeout(Number(process.env.AUDIT_WAIT || 1500));
        Object.assign(entry, await page.evaluate(measure));
        await page.addScriptTag({ content: axeSrc });
        const axe = await page.evaluate(async () => {
          const res = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] });
          return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].target.join(' ').slice(0, 90) }));
        });
        entry.axe = axe;
        const file = `${route.replace(/[^a-z0-9]+/gi, '_') || 'home'}__${role}__${vpName}.png`;
        await page.screenshot({ path: `${OUT}/screenshots/${label}/${file}`, fullPage: process.env.AUDIT_FULL === '1' });
        entry.shot = file;
      } catch (e) { entry.error = String(e).slice(0, 200); }
      entry.consoleErrors = [...new Set(consoleErrors)].slice(0, 5);
      entry.failed = [...new Set(failed)].slice(0, 5);
      results.push(entry);
      process.stdout.write(`${vpName} ${role} ${route} over=${entry.overflow ?? '?'} small=${entry.smallCount ?? '?'} axe=${entry.axe?.length ?? '?'}${entry.error ? ' ERR' : ''}\n`);
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(`${OUT}/data/crawl-${label}.json`, JSON.stringify(results, null, 1));
console.log('done', results.length);
