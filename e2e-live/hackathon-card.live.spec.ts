import { expect, test } from '@playwright/test';
import { helper } from './live';

/**
 * The hackathon card on the public list, on phones. The list shows one card per page there, in a fixed-height stack,
 * so the card's text must fit inside it: nothing clipped, and the buttons whole and inside the card's edge.
 */
const SLUG = 'card-check';
const TITLE = 'IconCoders Flagship Hackathon 2025';

test.beforeAll(() => {
  helper(
    'make_listing_hackathon', SLUG,
    '--title', TITLE,
    '--theme', 'AI for Social Good & Web3 Innovations',
    '--prize', '₹1,00,000 INR',
    '--description', '# IconCoders\n\n![banner](/favicon.ico)\n\nSRKR Coding Club annual flagship 36-hour hackathon.',
  );
});

for (const width of [360, 393, 430, 466]) {
  test(`on a ${width}px phone the card text is not clipped and its buttons sit whole inside the card`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.goto('/hackathons');

    // The list is paged one card at a time on a phone; step forward until our card is on screen.
    const card = page.locator('.bounce-card').filter({ hasText: TITLE });
    const next = page.getByRole('button', { name: 'Next page' });
    for (let step = 0; step < 20 && (await card.count()) === 0 && (await next.isEnabled()); step++) {
      await next.click();
    }
    await expect(card).toHaveCount(1);
    await expect(card.getByText('SRKR Coding Club annual flagship 36-hour hackathon.')).toBeVisible();
    await expect(card.locator('img')).toHaveCount(0);

    // The title and description block is not squeezed: everything in it is drawn, none of it cut off.
    const textBlock = card.locator('h3').locator('xpath=..');
    const clipped = await textBlock.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(clipped, 'title and description are not cut off').toBeLessThanOrEqual(1);

    const cardBox = await card.boundingBox();
    for (const name of [/View details for/, /Register Team/]) {
      const button = card.getByRole('link', { name });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box!.y + box!.height, `${name} fits inside the card`).toBeLessThanOrEqual(cardBox!.y + cardBox!.height);
      expect(box!.height, `${name} is one line tall`).toBeLessThanOrEqual(48);
    }

    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflows, 'no sideways scrolling').toBe(false);
  });
}
