// Keyboard behaviour of the shared FormSelect on the admin Settings tab. Usage: node e2e-audit/select-keyboard.mjs <base>
import { chromium } from '@playwright/test';

const BASE = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: 'srkrcc_access_token', value: 'admin', url: BASE }, { name: 'srkrcc_user_role', value: 'ADMIN', url: BASE }]);
await ctx.addInitScript((u) => { localStorage.setItem('theme', 'dark'); localStorage.setItem('srkrcc_user', JSON.stringify(u)); }, { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true });
const page = await ctx.newPage();
await page.goto(`${BASE}/admin/hackathons/hackoverflow-2026?tab=settings`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('button[aria-haspopup=listbox]');
const trigger = page.locator('button[aria-haspopup=listbox]').first();
const report = {};
report.accessibleName = await trigger.evaluate((el) => el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '(none; name comes from the selected text only)');
await trigger.focus();
await page.keyboard.press('Enter');
report.openedByEnter = await page.locator('[role=listbox]').count() > 0;
await page.keyboard.press('Escape');
report.closedByEscape = (await page.locator('[role=listbox]').count()) === 0;
if (!report.closedByEscape) await trigger.click();
await trigger.click();
await page.keyboard.press('ArrowDown');
report.focusAfterArrowDown = await page.evaluate(() => document.activeElement?.getAttribute('role') || document.activeElement?.tagName);
report.listboxHasName = await page.locator('[role=listbox]').evaluate((el) => !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')));
await page.keyboard.press('Escape');
report.focusReturnedToTrigger = await trigger.evaluate((el) => document.activeElement === el);
console.log(JSON.stringify(report, null, 1));
await browser.close();
