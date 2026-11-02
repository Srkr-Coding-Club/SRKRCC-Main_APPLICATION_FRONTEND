import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { SITE_URL, helper, signIn, stateDir, uniqueEmail } from './live';

/**
 * The events listing and an event's own page, end to end: real backend, real site.
 * What it covers: event cards built like the hackathon and form cards (poster, chips, When/Where, seats, the same entrance),
 * a click opening the event's page (not a pop-up), the page itself (facts, About, seats, register, calendar, share,
 * more events), one-click registration from the page, full and closed events, and the phone: no sideways scroll,
 * registration before About, and the lamp as the only theme switch in the menu.
 * Watch it:  pnpm test:e2e:live --headed e2e-live/events-pages.live.spec.ts   (screenshots: test-results/live/events-pages/)
 */
const SHOTS = join(stateDir, 'events-pages');
const DAY = 24;
const stamp = Date.now().toString(36);
const open = { slug: `open-lab-${stamp}`, title: `Open Lab ${stamp}` };
const full = { slug: `full-lab-${stamp}`, title: `Full Lab ${stamp}` };
const closed = { slug: `closed-lab-${stamp}`, title: `Closed Lab ${stamp}` };
const past = { slug: `past-lab-${stamp}`, title: `Past Lab ${stamp}` };
const oldHack = { slug: `old-hack-${stamp}`, title: `Old Hack ${stamp}` };
const newHack = { slug: `new-hack-${stamp}`, title: `New Hack ${stamp}` };
const member = uniqueEmail('member');

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

async function visitor(browser: Browser, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, baseURL: SITE_URL });
  await context.addInitScript(() => { try { window.localStorage.setItem('srkrcc_intro_seen_at', String(Date.now())); } catch { /* storage blocked */ } });
  return { context, page: await context.newPage() };
}


/**
 * The listings are cached for up to a minute (`revalidate: 60`), so an event created a moment ago may not be in the list
 * yet. Reload until the page shows it, instead of assuming it is there on the first look.
 */
async function openListingShowing(page: Page, path: string, title: string) {
  await expect(async () => {
    await page.goto(path);
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 90_000, intervals: [2000, 5000, 10_000] });
}

const card = (page: Page, title: string) => page.locator('article', { hasText: title }).first();

test.beforeAll(() => {
  helper('create_user', member, '--verified', '--first-name', 'Mira', '--last-name', 'Tester');
  helper('make_event', open.slug, '--title', open.title, '--start-hours', String(3 * DAY), '--capacity', '50', '--poster', `${SITE_URL}/Form.png`);
  helper('make_event', full.slug, '--title', full.title, '--start-hours', String(4 * DAY), '--capacity', '1');
  helper('register_event', full.slug, member);
  helper('make_event', closed.slug, '--title', closed.title, '--start-hours', String(5 * DAY), '--status', 'CLOSED');
  helper('make_event', past.slug, '--title', past.title, '--start-hours', String(-30), '--duration-hours', '3');
  helper('make_listing_hackathon', oldHack.slug, '--title', oldHack.title, '--theme', 'Old', '--prize', '1', '--description', 'Already over.', '--start-days', '-20');
  helper('make_listing_hackathon', newHack.slug, '--title', newHack.title, '--theme', 'New', '--prize', '1', '--description', 'Still ahead.', '--start-days', '20');
});

test.describe('the listing', () => {
  test('past events are not under Upcoming; they sit in a Past section until asked for', async ({ browser }) => {
    const { context, page } = await visitor(browser);
    await openListingShowing(page, '/events', open.title);
    const upcoming = page.getByRole('region', { name: /Upcoming events/ });
    await expect(upcoming).toBeVisible();
    const heading = (await upcoming.getByRole('heading', { level: 2 }).textContent()) ?? '';
    const count = Number(/\((\d+)\)/.exec(heading)?.[1]);
    await expect(upcoming.locator('article')).toHaveCount(count);                               // the number in the heading is the number of cards
    await expect(upcoming.getByRole('heading', { name: open.title })).toBeVisible();
    await expect(upcoming.getByRole('heading', { name: past.title })).toHaveCount(0);                                // an event that is over is not "upcoming"
    await expect(page.getByText(past.title)).toHaveCount(0);                                    // and is hidden until Past events is opened
    await page.getByRole('button', { name: /Past events/ }).click();
    const finished = card(page, past.title);
    await expect(finished).toBeVisible();
    await expect(finished.getByText('Event ended').first()).toBeVisible();
    await expect(finished.getByRole('link', { name: /Register now/ })).toHaveCount(0);
    await shot(page, '00-listing-past');
    await context.close();
  });

  test('hackathons are sorted the same way: an over hackathon is Past, not Upcoming', async ({ browser }) => {
    const { context, page } = await visitor(browser);
    await openListingShowing(page, '/hackathons', newHack.title);
    const upcoming = page.getByRole('region', { name: /Upcoming hackathons/ });
    await expect(upcoming.getByText(newHack.title)).toBeVisible();
    await expect(upcoming.getByText(oldHack.title)).toHaveCount(0);
    await page.getByRole('button', { name: /Past hackathons/ }).click();
    const finished = page.locator('article', { hasText: oldHack.title }).first();
    await expect(finished).toBeVisible();
    await expect(finished.getByText('Ended').first()).toBeVisible();
    await expect(finished.getByText('Register Team')).toHaveCount(0);
    await context.close();
  });

  test('events are cards like the hackathon cards, and they finish their entrance', async ({ browser }) => {
    const { context, page } = await visitor(browser);
    await openListingShowing(page, '/events', open.title);
    const item = card(page, open.title);
    await expect(item).toBeVisible();
    await expect(item.getByRole('heading', { name: open.title })).toBeVisible();
    await expect(item.getByText('Registration open')).toBeVisible();
    await expect(item.getByText('When', { exact: true })).toBeVisible();
    await expect(item.getByText('Where', { exact: true })).toBeVisible();
    await expect(item.getByText('Seminar Hall')).toBeVisible();
    await expect(item.getByText(/50 of 50 seats left/)).toBeVisible();
    await expect(item.locator('img')).toHaveAttribute('src', /Form\.png/);                         // the poster is the cover

    // The entrance leaves nothing half-way: every part of the card ends fully visible and in place.
    await item.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    const parts = await item.evaluate((el) => ['.ec-chip', '.ec-title', '.ec-desc', '.ec-step', '.ec-meta', '.ec-footer'].map((selector) => {
      const node = el.querySelector(selector);
      const style = node ? getComputedStyle(node) : null;
      return { selector, found: !!node, opacity: style ? Number(style.opacity) : 0, transform: style?.transform ?? '' };
    }));
    for (const part of parts) {
      expect(part.found, `${part.selector} exists`).toBe(true);
      expect(part.opacity, `${part.selector} is fully visible`).toBe(1);
      expect(['none', 'matrix(1, 0, 0, 1, 0, 0)'], `${part.selector} is back in place`).toContain(part.transform);
    }
    await shot(page, '01-listing');
    await context.close();
  });

  test('a full, a closed and an open event each say so, and only the open one offers Register now', async ({ browser }) => {
    const { context, page } = await visitor(browser);
    await openListingShowing(page, '/events', open.title);
    await expect(card(page, open.title).getByRole('button', { name: /Register now/ })).toBeVisible();
    await expect(card(page, full.title).getByText('Event full').first()).toBeVisible();
    await expect(card(page, full.title).getByRole('link', { name: /Register now/ })).toHaveCount(0);
    await expect(card(page, full.title).getByRole('button', { name: /Register now/ })).toHaveCount(0);
    await expect(card(page, closed.title).getByText('Closed').first()).toBeVisible();
    await expect(card(page, closed.title).getByRole('link', { name: /Register now/ })).toHaveCount(0);
    await expect(card(page, closed.title).getByRole('button', { name: /Register now/ })).toHaveCount(0);
    await context.close();
  });

  test("clicking a card opens that event's own page, not a pop-up", async ({ browser }) => {
    const { context, page } = await visitor(browser);
    await openListingShowing(page, '/events', open.title);
    await card(page, open.title).getByRole('heading', { name: open.title }).click();
    await page.waitForURL(`**/events/${open.slug}`);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: open.title })).toBeVisible();

    await page.goBack();
    await card(page, full.title).getByRole('link', { name: `View details for ${full.title}` }).click();   // the Details link works too
    await page.waitForURL(`**/events/${full.slug}`);
    await context.close();
  });
});

test.describe("an event's page", () => {
  test('shows the poster, the facts, the seats, About and other events', async ({ browser }) => {
    const { context, page } = await visitor(browser);
    await page.goto(`/events/${open.slug}`);
    await expect(page.getByRole('heading', { level: 1, name: open.title })).toBeVisible();
    await expect(page.getByText('Registration open').first()).toBeVisible();
    for (const label of ['Date', 'Time', 'Venue', 'Seats']) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Seminar Hall').first()).toBeVisible();
    await expect(page.getByText('IST', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Seats taken' })).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByRole('heading', { name: 'About this event' })).toBeVisible();
    await expect(page.getByText(`${open.title} for the live run.`)).toBeVisible();
    await expect(page.getByRole('link', { name: /All events/ })).toHaveAttribute('href', '/events');
    await expect(page.getByRole('heading', { name: 'More events' })).toBeVisible();
    await expect(page.locator('article', { hasText: full.title }).first()).toBeVisible();
    await shot(page, '02-event-page');
    await context.close();
  });

  test('has the right title for sharing, and an unknown event shows the 404 page', async ({ browser }) => {
    const { context, page } = await visitor(browser);
    await page.goto(`/events/${open.slug}`);
    await expect(page).toHaveTitle(new RegExp(open.title));
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /Form\.png/);
    await page.goto('/events/no-such-event-here');
    await expect(page.getByText('Page Not Found')).toBeVisible();
    await context.close();
  });

  test('Add to calendar and Share work', async ({ browser }) => {
    const { context, page } = await visitor(browser);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/events/${open.slug}`);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Add to calendar' }).click();
    expect((await download).suggestedFilename()).toBe(`${open.slug}.ics`);
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/events/${open.slug}`);
    await context.close();
  });

  test('a member registers with one click from the page, and the page remembers it', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: SITE_URL });
    await context.addInitScript(() => { try { window.localStorage.setItem('srkrcc_intro_seen_at', String(Date.now())); } catch { /* storage blocked */ } });
    const page = await context.newPage();
    await signIn(page, member);
    await page.goto(`/events/${open.slug}`);
    const panel = page.getByRole('complementary', { name: 'Registration' });
    await panel.getByRole('button', { name: 'Register now' }).click();
    await expect(panel.getByText("You're registered")).toBeVisible();
    expect(helper<{ registrations: number }>('event_state', open.slug).registrations).toBe(1);
    await page.reload();
    await expect(page.getByRole('complementary', { name: 'Registration' }).getByText("You're registered")).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Seats taken' })).toHaveAttribute('aria-valuenow', '2');   // 1 of 50
    await context.close();
  });

  test('a full event and a closed event say why nobody can register', async ({ browser }) => {
    const { context, page } = await visitor(browser);
    await page.goto(`/events/${full.slug}`);
    await expect(page.getByText('Event full').first()).toBeVisible();
    const panel = page.getByRole('complementary', { name: 'Registration' });
    await expect(panel.getByRole('link', { name: /Register now/ })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Register now' })).toHaveCount(0);
    await page.goto(`/events/${closed.slug}`);
    await expect(page.getByRole('complementary', { name: 'Registration' }).getByText('Registration closed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to calendar' })).toHaveCount(0);       // a closed event is not offered for a calendar
    await context.close();
  });
});

test.describe('on a phone (390 x 844)', () => {
  const phone = { width: 390, height: 844 };

  test('the listing and the page fit the screen, and registration comes before About', async ({ browser }) => {
    const { context, page } = await visitor(browser, phone);
    for (const path of ['/events', `/events/${open.slug}`]) {
      await page.goto(path);
      await expect(page.locator('h1, h3').first()).toBeVisible();
      const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, screen: document.documentElement.clientWidth }));
      expect(widths.page, `${path} scrolls sideways`).toBeLessThanOrEqual(widths.screen);
    }
    const registration = await page.getByRole('complementary', { name: 'Registration' }).boundingBox();
    const about = await page.getByRole('heading', { name: 'About this event' }).boundingBox();
    expect(registration!.y, 'registration is above About').toBeLessThan(about!.y);
    await shot(page, '03-event-page-phone');
    await context.close();
  });

  test('the menu has the lamp as the only theme switch, and pulling it changes the theme', async ({ browser }) => {
    const { context, page } = await visitor(browser, phone);
    await page.goto('/events');
    const menu = page.getByRole('dialog');
    await expect(async () => {
      await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
      await expect(menu).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
    await expect(menu.getByRole('group', { name: 'Theme' })).toHaveCount(0);                  // no Light / Dark buttons beside the lamp
    await expect(menu.getByRole('button', { name: 'Light', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
    await shot(page, '04-menu-phone');
    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await menu.getByRole('button', { name: 'Toggle theme' }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!before);
    await shot(page, '05-menu-phone-switched');
    await context.close();
  });
});
