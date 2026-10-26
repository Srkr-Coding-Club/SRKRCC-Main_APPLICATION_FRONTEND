import { chromium } from '@playwright/test';
const BASE = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
await ctx.addCookies([{ name: 'srkrcc_access_token', value: 'admin', url: BASE }, { name: 'srkrcc_user_role', value: 'ADMIN', url: BASE }]);
await ctx.addInitScript((u) => { localStorage.setItem('theme', 'dark'); localStorage.setItem('srkrcc_user', JSON.stringify(u)); }, { id: 1, email: 'a@b.c', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true });
const p = await ctx.newPage();
await p.goto(BASE + '/admin/hackathons', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
await p.evaluate(() => window.scrollTo(300, 0));
const r = await p.evaluate(() => {
  const toggle = document.querySelector('button[aria-label="Toggle theme"]');
  const rect = toggle?.getBoundingClientRect();
  return { scrollX: window.scrollX, docScrollW: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth, themeToggle: rect ? { left: Math.round(rect.left), right: Math.round(rect.right), visibleInViewport: rect.right <= innerWidth && rect.left >= 0 } : 'none' };
});
console.log(JSON.stringify(r));
await b.close();
