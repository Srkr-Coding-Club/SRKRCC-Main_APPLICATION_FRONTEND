import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { SITE_URL, helper, mailTo, signIn, stateDir, uniqueEmail } from './live';

/**
 * An event from sign-up to certificate, end to end: real backend, real site, nothing mocked.
 * What it covers: the one "My Events" list (Upcoming / Past, real event dates), cancelling a registration (and the seat
 * coming back on a full event), feedback from people who were checked in, attendance certificates and their public
 * check, "Add to calendar", reminders (bell and email, with the email switch), and the profile on a phone.
 * Watch it:  pnpm test:e2e:live --headed e2e-live/event-lifecycle.live.spec.ts   (screenshots: test-results/live/event-lifecycle/)
 */
const SHOTS = join(stateDir, 'event-lifecycle');
const HOUR = 1;
const DAY = 24 * HOUR;
const IST = 'Asia/Kolkata';

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

interface Person { context: BrowserContext; page: Page }

/** Sign in as someone who already saw the home film and has no celebration card waiting to cover the page. */
async function person(browser: Browser, email: string, viewport = { width: 1280, height: 900 }): Promise<Person> {
  helper('expire_celebrations', email);
  const context = await browser.newContext({ viewport, baseURL: SITE_URL });
  await context.addInitScript(() => { try { window.localStorage.setItem('srkrcc_intro_seen_at', String(Date.now())); } catch { /* storage blocked */ } });
  const page = await context.newPage();
  await signIn(page, email);
  return { context, page };
}

/** An address for a person; the account itself is created in the describe's beforeAll, once the backend is up. */
const makePerson = (name: string) => uniqueEmail(name.toLowerCase());
const createPerson = (email: string, name: string, extra: string[] = []) => helper('create_user', email, '--verified', '--first-name', name, '--last-name', 'Tester', ...extra);
const createAdmin = (email: string) => createPerson(email, 'Admin', ['--staff', '--role', 'ADMIN']);
const slugOf = (word: string) => `${word}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e3)}`;

async function openProfile(page: Page, tab?: 'Upcoming' | 'Past') {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: /^My Events/ })).toBeVisible();
  if (tab) await page.getByRole('tab', { name: new RegExp(tab) }).click();
}

const ticket = (page: Page, title: string): Locator => page.locator('article', { hasText: title }).first();

/** The admin events screen: the card of one event, found from its title. */
const adminCard = (page: Page, title: string): Locator =>
  page.getByText(title, { exact: true }).first().locator('xpath=ancestor::div[.//button[normalize-space()="Feedback"]][1]');

// ---------------------------------------------------------------------------------------------------------------------
test.describe('after the event: feedback and certificates', () => {
  test.describe.configure({ mode: 'serial' });
  const admin = makePerson('Admin');
  const asha = makePerson('Asha');
  const ravi = makePerson('Ravi');
  const slug = slugOf('past-workshop');
  const title = `Past Workshop ${slug}`;

  test.beforeAll(() => {
    createAdmin(admin); createPerson(asha, 'Asha'); createPerson(ravi, 'Ravi');
    helper('make_event', slug, '--title', title, '--start-hours', String(-30 * HOUR), '--duration-hours', '3', '--attendance');
    helper('register_event', slug, asha, '--scanned');   // checked in at the door
    helper('register_event', slug, ravi);                // registered, never scanned
  });

  test('the ticket shows when the event happened, not when the person signed up', async ({ browser }) => {
    const { context, page } = await person(browser, asha);
    await openProfile(page, 'Past');
    const card = ticket(page, title);
    await expect(card).toBeVisible();
    const started = new Date(Date.now() - 30 * HOUR * 3600_000);
    const day = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: IST }).format(started);
    const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: IST }).format(started);
    await expect(card).toContainText(new RegExp(`${day}(st|nd|rd|th) ${month} ${started.getFullYear()}`));
    await expect(card.getByRole('button', { name: 'Cancel registration' })).toHaveCount(0);   // it is over
    await shot(page, '01-past-ticket');
    await context.close();
  });

  test('someone who was checked in rates the event once, and can change the answer', async ({ browser }) => {
    const { context, page } = await person(browser, asha);
    await openProfile(page, 'Past');
    await ticket(page, title).getByRole('button', { name: 'Rate this event' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('5 out of 5, Excellent').check({ force: true });
    await dialog.getByLabel(/What went well/).fill('Clear examples and a good pace');
    await shot(page, '02-feedback-form');
    await dialog.getByRole('button', { name: 'Send feedback' }).click();
    await expect(dialog).toBeHidden();
    expect(helper<{ feedback: number }>('event_state', slug).feedback).toBe(1);

    await ticket(page, title).getByRole('button', { name: 'Rate this event' }).click();
    await expect(page.getByRole('dialog').getByText(/You rated this event 5 out of 5/)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Change my answer' }).click();
    await page.getByRole('dialog').getByLabel('4 out of 5, Very good').check({ force: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(helper<{ feedback: number }>('event_state', slug).feedback).toBe(1);        // changed, not added
    await context.close();
  });

  test('someone who registered but was never checked in is told feedback is for people who attended', async ({ browser }) => {
    const { context, page } = await person(browser, ravi);
    await openProfile(page, 'Past');
    await ticket(page, title).getByRole('button', { name: 'Rate this event' }).click();
    await expect(page.getByRole('dialog').getByText(/checked in at the event/)).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Send feedback' })).toHaveCount(0);
    expect(helper<{ feedback: number }>('event_state', slug).feedback).toBe(1);
    await context.close();
  });

  test('organizers see the score, who answered and the written answers', async ({ browser }) => {
    const { context, page } = await person(browser, admin);
    await page.goto('/admin/events');
    await adminCard(page, title).getByRole('button', { name: 'Feedback' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('4.0 / 5')).toBeVisible();
    await expect(dialog.getByText('1 of 1 checked in')).toBeVisible();
    await expect(dialog.getByText('Clear examples and a good pace')).toBeVisible();
    await shot(page, '03-admin-feedback');
    await context.close();
  });

  test('no certificate until an organizer releases them; then the attendee gets one anyone can check', async ({ browser }) => {
    const attendee = await person(browser, asha);
    await openProfile(attendee.page, 'Past');
    await expect(ticket(attendee.page, title).getByRole('link', { name: 'Certificate' })).toHaveCount(0);

    const organizer = await person(browser, admin);
    await organizer.page.goto('/admin/events');
    await adminCard(organizer.page, title).getByRole('button', { name: 'Certificates' }).click();
    const dialog = organizer.page.getByRole('dialog');
    await expect(dialog.getByText(/1 person was checked in/)).toBeVisible();
    await dialog.getByRole('switch', { name: /Release certificates/ }).click();
    await dialog.getByLabel('Signed by').fill('Dr. Rao');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(organizer.page.getByText('Certificate settings saved')).toBeVisible();
    expect(helper<{ released: boolean }>('event_state', slug).released).toBe(true);
    await organizer.context.close();

    await openProfile(attendee.page, 'Past');
    await ticket(attendee.page, title).getByRole('link', { name: 'Certificate' }).click();
    await expect(attendee.page.getByText('Asha Tester attended')).toBeVisible();
    await expect(attendee.page.getByText('Dr. Rao')).toBeVisible();
    await shot(attendee.page, '04-certificate');

    const verifyHref = await attendee.page.locator('a[href^="/certificates/verify/"]').first().getAttribute('href');
    expect(verifyHref).toContain('/certificates/verify/ev.');
    await attendee.page.goto(verifyHref!);
    await expect(attendee.page.getByRole('heading', { name: 'This certificate is genuine' })).toBeVisible();
    await expect(attendee.page.locator('dd', { hasText: 'Asha Tester' })).toBeVisible();

    await attendee.page.goto(`${verifyHref!.slice(0, -4)}AAAA`);                          // a code with its signature damaged
    await expect(attendee.page.getByRole('heading', { name: 'We could not verify this certificate' })).toBeVisible();
    await attendee.context.close();
  });

  test('a person who was not checked in cannot open a certificate', async ({ browser }) => {
    const { context, page } = await person(browser, ravi);
    await page.goto(`/events/${slug}/certificate`);
    await expect(page.getByText(/Only people who were checked in at the event/)).toBeVisible();
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('before the event: cancelling and the calendar', () => {
  test.describe.configure({ mode: 'serial' });
  const asha = makePerson('Asha');
  const ravi = makePerson('Ravi');
  const full = slugOf('tiny-lab');
  const fullTitle = `Tiny Lab ${full}`;
  const running = slugOf('running-talk');
  const runningTitle = `Running Talk ${running}`;

  test.beforeAll(() => {
    createPerson(asha, 'Asha'); createPerson(ravi, 'Ravi');
    helper('make_event', full, '--title', fullTitle, '--start-hours', String(2 * DAY), '--capacity', '2');
    helper('register_event', full, asha);
    helper('register_event', full, ravi);                 // the second seat: the event is full and its form has closed
    helper('make_event', running, '--title', runningTitle, '--start-hours', String(-1 * HOUR), '--duration-hours', '3');
    helper('register_event', running, asha);
  });

  test('a full event closes its form, and cancelling gives the seat back', async ({ browser }) => {
    expect(helper<{ form_status: string }>('event_state', full).form_status).toBe('CLOSED');
    const { context, page } = await person(browser, asha);
    await openProfile(page);
    const card = ticket(page, fullTitle);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Cancel registration' }).click();
    await shot(page, '05-cancel-confirm');
    await page.getByRole('dialog').getByRole('button', { name: 'Keep my seat' }).click();       // changed their mind
    expect(helper<{ registrations: number }>('event_state', full).registrations).toBe(2);

    await card.getByRole('button', { name: 'Cancel registration' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel registration' }).click();
    await expect(page.getByText('Registration cancelled')).toBeVisible();
    await expect(ticket(page, fullTitle)).toHaveCount(0);
    const state = helper<{ form_status: string; registrations: number }>('event_state', full);
    expect(state).toMatchObject({ form_status: 'PUBLISHED', registrations: 1 });                 // the seat can be taken again
    await context.close();
  });

  test("cancelling one person's registration leaves the other's", async ({ browser }) => {
    const { context, page } = await person(browser, ravi);
    await openProfile(page);
    await expect(ticket(page, fullTitle)).toBeVisible();
    await context.close();
  });

  test('an event that is already running cannot be cancelled from the ticket', async ({ browser }) => {
    const { context, page } = await person(browser, asha);
    await openProfile(page, 'Upcoming');
    const card = ticket(page, runningTitle);
    await expect(card).toBeVisible();                                                           // still on: it has not finished
    await expect(card.getByRole('button', { name: 'Cancel registration' })).toHaveCount(0);
    await context.close();
  });

  test('the event page offers "Add to calendar" and the file holds the event', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: SITE_URL });
    const page = await context.newPage();
    await page.goto(`/events/${full}`);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Add to calendar' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(`${full}.ics`);
    const text = await (await import('node:fs/promises')).readFile((await file.path())!, 'utf-8');
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain(`SUMMARY:${fullTitle}`);
    expect(text).toContain('LOCATION:Seminar Hall');
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('reminders', () => {
  test.describe.configure({ mode: 'serial' });
  const asha = makePerson('Asha');
  const ravi = makePerson('Ravi');
  const slug = slugOf('tomorrow-talk');
  const title = `Tomorrow Talk ${slug}`;

  test.beforeAll(() => {
    createPerson(asha, 'Asha'); createPerson(ravi, 'Ravi');
    helper('clear_mailbox');
    helper('make_event', slug, '--title', title, '--start-hours', String(20 * HOUR));
    helper('register_event', slug, asha);
    helper('register_event', slug, ravi);
    helper('set_reminder_emails', ravi, 'off');
  });

  test('everyone registered is reminded in the bell, and only those who want email get one, once', async () => {
    expect(helper<{ DAY: number; HOUR: number }>('send_event_reminders')).toEqual({ DAY: 2, HOUR: 0 });
    for (const email of [asha, ravi]) {
      expect(helper<{ title: string }[]>('notifications', email).map((n) => n.title)).toContain(`${title} starts tomorrow`);
    }
    const sent = mailTo(asha).filter((m) => m.subject.includes(title));
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain(`/events/${slug}`);
    expect(mailTo(ravi).filter((m) => m.subject.includes(title))).toHaveLength(0);
    expect(helper<{ DAY: number; HOUR: number }>('send_event_reminders')).toEqual({ DAY: 0, HOUR: 0 });   // nothing twice
  });

  test('the reminder shows in the notification bell and links to the event', async ({ browser }) => {
    const { context, page } = await person(browser, asha);
    await page.goto('/');
    await page.getByRole('button', { name: /notification/i }).click();
    await expect(page.getByText(`${title} starts tomorrow`)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open event' })).toBeVisible();                  // says what it opens, not just "action"
    await shot(page, '06-reminder-in-bell');
    await context.close();
  });

  test('the email switch on the profile is remembered', async ({ browser }) => {
    const { context, page } = await person(browser, asha);
    await page.goto('/profile');
    const toggle = page.getByRole('switch', { name: /Email me before events/ });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(page.getByText('Event reminder emails are off')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('switch', { name: /Email me before events/ })).toHaveAttribute('aria-checked', 'false');
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('on a phone', () => {
  const asha = makePerson('Asha');
  const slug = slugOf('phone-talk');

  test.beforeAll(() => {
    createPerson(asha, 'Asha');
    helper('make_event', slug, '--title', `Phone Talk ${slug}`, '--start-hours', String(3 * DAY));
    helper('register_event', slug, asha);
  });

  test('My Events fits a 390px screen without sideways scrolling, in both themes', async ({ browser }) => {
    const { context, page } = await person(browser, asha, { width: 390, height: 844 });
    for (const theme of ['dark', 'light']) {
      await page.evaluate((mode) => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
      await openProfile(page);
      await page.evaluate((mode) => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
      const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, screen: document.documentElement.clientWidth }));
      expect(widths.page, `${theme} theme scrolls sideways`).toBeLessThanOrEqual(widths.screen);
      await page.getByRole('tablist', { name: 'Upcoming or past' }).scrollIntoViewIfNeeded();
      await shot(page, `07-phone-${theme}`);
    }
    await context.close();
  });

  test('light theme: the lamp beam and cord stay inside the header, and the header does not show the page through it', async ({ browser }) => {
    const { context, page } = await person(browser, asha, { width: 390, height: 844 });
    await openProfile(page);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.evaluate(() => window.scrollBy(0, 600));
    const header = page.locator('header[data-site-chrome]');
    await expect(header).toHaveClass(/bg-white\/90/);                                            // scrolled: the phone bar is nearly solid
    const bar = (await header.boundingBox())!;
    const beam = (await header.locator('polygon >> visible=true').first().boundingBox())!;
    const bead = (await header.locator('button[title="Pull the cord to switch the lights"] >> visible=true').first().locator('svg circle').last().boundingBox())!;
    expect(beam.y + beam.height, 'the beam ends inside the bar').toBeLessThanOrEqual(bar.y + bar.height);
    expect(bead.y + bead.height, 'the bead rests inside the bar').toBeLessThanOrEqual(bar.y + bar.height);
    const alpha = await header.evaluate((el) => Number(/rgba?\([^)]*?,\s*[^,]*?,\s*[^,]*?,\s*([\d.]+)\)/.exec(getComputedStyle(el).backgroundColor)?.[1] ?? 1));
    expect(alpha).toBeGreaterThanOrEqual(0.85);
    await shot(page, '08-phone-lamp-light');
    await context.close();
  });
});
