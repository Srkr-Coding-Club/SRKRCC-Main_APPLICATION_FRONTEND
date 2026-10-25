import { expect, test, type Page } from '@playwright/test';
import { openSite, verifiedState } from './site-helpers';

const notification = (id: number, title: string) => ({
  id, title, message: 'Your team has a new update.', type: 'INFO', category: 'HACKATHON', link_url: '', is_read: false, read_at: null,
  created_at: new Date().toISOString(), created_by_name: 'System',
});

const open = async (page: Page, width: number, items: ReturnType<typeof notification>[]) => {
  await page.setViewportSize({ width, height: 800 });
  await openSite(page, '/forms', {
    verification: verifiedState(),
    handlers: [
      (c) => (c.path === '/notifications/unread-count/' ? { body: { unread_count: items.length } } : undefined),
      (c) => (c.path.startsWith('/notifications/?') ? { body: { unread_count: items.length, results: items } } : undefined),
    ],
  });
  await page.getByRole('button', { name: 'Notifications' }).first().click();
  return page.getByRole('heading', { name: 'Notifications', exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
};

async function insideScreen(page: Page, panel: ReturnType<Page['locator']>) {
  const box = await panel.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box, 'the panel is on screen').not.toBeNull();
  expect(box!.x, 'nothing cut off on the left').toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, 'nothing cut off on the right').toBeLessThanOrEqual(viewport.width);
  return box!;
}

test.describe('notification panel', () => {
  test('on a 390px phone the whole panel is on screen, with the list readable', async ({ page }) => {
    const panel = await open(page, 390, [notification(1, 'Team update'), notification(2, 'Round 2 is open')]);
    await expect(page.getByText('Team update')).toBeVisible();
    const box = await insideScreen(page, panel);
    expect(box.width).toBeGreaterThan(300);
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeInViewport();
  });

  test('on a phone with nothing new it still fits and says so', async ({ page }) => {
    const panel = await open(page, 360, []);
    await expect(page.getByText('All caught up!')).toBeVisible();
    await insideScreen(page, panel);
  });

  test('clicking inside the panel keeps it open, and Escape-free clicking outside closes it', async ({ page }) => {
    await open(page, 390, [notification(1, 'Team update')]);
    await page.getByText('Team update').click();
    await expect(page.getByText('Team update')).toBeVisible();
    await page.mouse.click(10, 800 - 10);
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toHaveCount(0);
  });

  test('on a desktop the dropdown still hangs from the bell and stays on screen', async ({ page }) => {
    const panel = await open(page, 1280, [notification(1, 'Team update')]);
    await insideScreen(page, panel);
  });
});
