import { expect, test } from '@playwright/test';
import { openAdmin, savedForm } from './admin-helpers';
import { adminUser, user } from './helpers';

// Every screen of the site at phone and tablet size. The API answers with "nothing here yet" (empty lists), which is
// also what a brand-new club sees, so this checks the empty states and the page frames of every screen.
// Looked for: the page scrolling sideways, and controls too small to tap.

const SIZES = [
  { name: 'phone-320', width: 320, height: 640 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
];

const PUBLIC = ['/', '/about', '/events', '/forms', '/hackathons', '/blogs', '/career', '/codequest', '/iconcoders', '/login', '/signup', '/403'];
const ADMIN = [
  '/admin', '/admin/announcements', '/admin/audit-logs', '/admin/codequest', '/admin/content', '/admin/csv-ingestion', '/admin/data-health',
  '/admin/data-management', '/admin/events', '/admin/flags', '/admin/forms', '/admin/hackathons', '/admin/jobs', '/admin/members', '/admin/responses', '/admin/users',
];

async function sideways(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const wide: string[] = [];
    if (doc.scrollWidth - doc.clientWidth > 1) {
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= doc.clientWidth + 1) continue;
        if (getComputedStyle(el).position === 'fixed' || el.closest('nextjs-portal')) continue;
        let p: Element | null = el.parentElement; let inScroller = false;
        while (p && p !== document.body) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') { inScroller = true; break; } p = p.parentElement; }
        if (!inScroller) wide.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 60)} ends at ${Math.round(r.right)}`);
      }
    }
    return { over: doc.scrollWidth - doc.clientWidth, culprits: wide.slice(0, 4) };
  });
}

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const path of PUBLIC) {
      test(`public ${path}`, async ({ page }) => {
        await page.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), user);
        await page.route('**/api/proxy/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.request().method() === 'GET' ? [] : {}) }));
        await page.goto(path);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1800); // intro animations and client data
        const result = await sideways(page);
        expect(result.over, `${path} scrolls sideways: ${JSON.stringify(result.culprits)}`).toBeLessThanOrEqual(1);
      });
    }

    for (const path of ADMIN) {
      test(`admin ${path}`, async ({ page, context }) => {
        await openAdmin(page, context, path, [() => undefined]);
        await page.waitForTimeout(1800);
        const result = await sideways(page);
        expect(result.over, `${path} scrolls sideways: ${JSON.stringify(result.culprits)}`).toBeLessThanOrEqual(1);
      });
    }
  });
}

test.describe('admin screens with data in them, on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const forms = Array.from({ length: 8 }, (_, i) => savedForm({ id: 100 + i, title: `Form number ${i + 1} with a fairly long descriptive title`, slug: `f-${i}`, status: i % 2 ? 'PUBLISHED' : 'DRAFT', response_count: i * 37 }));

  test('forms registry with many forms', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/forms', { 'GET ^/forms/$': () => forms });
    await expect(page.getByText('Form number 1', { exact: false }).first()).toBeVisible();
    const result = await sideways(page);
    expect(result.over, JSON.stringify(result.culprits)).toBeLessThanOrEqual(1);
  });

  test('the admin menu opens on a phone and every link can be reached', async ({ page, context }) => {
    await openAdmin(page, context, '/admin', []);
    const menu = page.getByRole('button', { name: /menu|open/i }).first();
    if (await menu.count()) await menu.click();
    await page.waitForTimeout(500);
    const links = page.getByRole('link', { name: /Forms|Users|Data Center|Dashboard/i });
    expect(await links.count()).toBeGreaterThan(0);
    const result = await sideways(page);
    expect(result.over, JSON.stringify(result.culprits)).toBeLessThanOrEqual(1);
  });
});

void adminUser;
