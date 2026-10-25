import { expect, test } from '@playwright/test';
import { helper, uniqueEmail } from './live';

/** The public hackathon page on a phone: the header buttons must sit inside the card, not run off its edge. */
const SLUG = 'header-check';

test.beforeAll(() => {
  const leader = uniqueEmail('header');
  helper('create_user', leader, '--verified');
  helper('make_idea_hackathon', SLUG, '--leader', leader);
});

test('on a 360px phone the Share and Add to calendar buttons fit inside the header card', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/hackathons/${SLUG}`);
  const share = page.getByRole('button', { name: 'Share this hackathon' });
  const calendar = page.getByRole('button', { name: 'Add key dates to your calendar' });
  await expect(share).toBeVisible();
  await expect(calendar).toBeVisible();

  // The card's inner edge: its right border minus the padding every item in the card keeps.
  const cardInnerRight = await share.evaluate((el) => {
    const header = el.closest('header') as HTMLElement;
    return header.getBoundingClientRect().right - parseFloat(getComputedStyle(header).paddingRight);
  });
  const shareBox = await share.boundingBox();
  expect(shareBox!.x + shareBox!.width, 'Share stays inside the card padding').toBeLessThanOrEqual(cardInnerRight);
  expect(shareBox!.x + shareBox!.width, 'Share stays on screen').toBeLessThanOrEqual(360);
  const calBox = await calendar.boundingBox();
  expect(calBox!.x).toBeGreaterThanOrEqual(0);

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows, 'no sideways scrolling').toBe(false);
});
