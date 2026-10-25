import { expect, test } from '@playwright/test';
import { adminUser } from './helpers';
import { openAdmin } from './admin-helpers';
import { openSite, verifiedState } from './site-helpers';

/**
 * A bar that changed height when the page scrolled used to shake on pages only a little taller than the window: the shorter bar
 * shortened the page, which scrolled the person back to the top, which made the bar tall again, over and over.
 */
async function heightsWhileNudged(page: import('@playwright/test').Page, selector: string) {
  const doc = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 1280, height: Math.max(300, doc - 20) });   // the page is now only 20px taller than the window
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 14));
  const samples: number[] = [];
  for (let i = 0; i < 25; i += 1) {
    samples.push(await page.evaluate((sel) => Math.round((document.querySelector(sel) as HTMLElement).getBoundingClientRect().height), selector));
    await page.waitForTimeout(80);
  }
  return samples;
}

test('the site header keeps its height on a page barely taller than the window (profile page)', async ({ page }) => {
  await openSite(page, '/profile', { verification: verifiedState() });
  await page.waitForTimeout(2000);
  const samples = await heightsWhileNudged(page, 'header');
  expect(new Set(samples).size, samples.join(',')).toBe(1);
});

test('the site header keeps the same height at the top and after scrolling', async ({ page }) => {
  await openSite(page, '/profile', { verification: verifiedState() });
  await page.waitForTimeout(2000);
  const top = await page.evaluate(() => Math.round((document.querySelector('header') as HTMLElement).getBoundingClientRect().height));
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  const scrolled = await page.evaluate(() => Math.round((document.querySelector('header') as HTMLElement).getBoundingClientRect().height));
  expect(scrolled).toBe(top);
});

test('the admin header does not change height either', async ({ page, context }) => {
  await openAdmin(page, context, '/admin', {});
  await page.waitForTimeout(2000);
  const samples = await heightsWhileNudged(page, 'header');
  expect(new Set(samples).size, samples.join(',')).toBe(1);
  void adminUser;
});
