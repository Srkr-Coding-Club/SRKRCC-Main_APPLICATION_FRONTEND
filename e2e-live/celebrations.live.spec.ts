import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { BACKEND_URL, PASSWORD, SITE_URL, helper, mailTo, pathOf, signIn, stateDir, uniqueEmail } from './live';

/**
 * Celebrations end to end: real backend, real site, a real S3 API (moto) for the paid-team scenario.
 * A card with confetti appears for happy moments, once per person on any device, never for rejections, and can be switched off.
 * Watch it:  pnpm test:e2e:live --headed e2e-live/celebrations.live.spec.ts   (screenshots: test-results/live/celebrations/)
 */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SHOTS = join(stateDir, 'celebrations');
/** The site checks every 30 seconds (the hackathon dashboard every 15), so a celebration that happens elsewhere shows within this. */
const WAIT = { timeout: 50_000 };

interface Card { kind: string; size: string; title: string; seen: boolean; key: string }
const cards = (email: string) => helper<Card[]>('celebrations_of', email);
const kinds = (email: string) => cards(email).map((c) => c.kind).sort();

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

async function person(browser: Browser, email: string, options: Parameters<Browser['newContext']>[0] = {}, playIntro = false): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options, baseURL: SITE_URL });
  // Most of these are about the card, so they skip the home opening film, as a returning member would.
  if (!playIntro) await context.addInitScript(() => { try { window.localStorage.setItem('srkrcc_intro_seen_at', String(Date.now())); } catch { /* storage blocked */ } });
  const page = await context.newPage();
  await signIn(page, email);
  return { context, page };
}

const celebration = (page: Page) => page.locator('[data-celebration]');
const confettiCanvas = (page: Page) => page.locator('body > canvas');
const closeCard = (page: Page) => page.getByRole('button', { name: 'Close' }).click();

async function register(email: string, firstName = 'Newbie') {
  const reply = await fetch(`${BACKEND_URL}/api/auth/register/`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, first_name: firstName, branch: 'CSE', year: 2 }),
  });
  expect(reply.status, await reply.clone().text()).toBe(201);
}

// ---------------------------------------------------------------------------------------------------------------------
test.describe('the account', () => {
  test.describe.configure({ mode: 'serial' });
  const email = uniqueEmail('newbie');

  test('signing up gets a welcome with confetti, shown once and never again on a reload or another device', async ({ browser }) => {
    await register(email);
    expect(kinds(email)).toEqual(['account.welcome']);
    const first = await person(browser, email);
    await expect(first.page.getByText('Welcome to SRKR Coding Club!')).toBeVisible(WAIT);
    await expect(celebration(first.page)).toHaveAttribute('data-celebration', 'MEDIUM');
    await expect(confettiCanvas(first.page)).toBeAttached();
    await shot(first.page, '01-welcome');
    await expect.poll(() => cards(email)[0].seen).toBe(true);                  // marked seen the moment it appeared

    await first.page.reload();
    await first.page.waitForTimeout(3000);
    await expect(celebration(first.page)).toHaveCount(0);                      // not again after a reload

    const phone = await person(browser, email, { ...devices['Pixel 7'] });      // a second device of the same person
    await phone.page.waitForTimeout(3500);
    await expect(celebration(phone.page)).toHaveCount(0);
    await first.context.close();
    await phone.context.close();
  });

  test('confirming the email gets a small celebration on the next page', async ({ browser }) => {
    const { context, page } = await person(browser, email);
    await page.goto('/forms');
    await page.getByRole('region', { name: 'Email verification' }).getByRole('button', { name: 'Verify email' }).click();
    await expect(page.getByText(/Link sent to/)).toBeVisible();
    const link = mailTo(email).find((m) => m.verify)!.verify!;
    const other = await browser.newContext({ baseURL: SITE_URL });
    const confirm = await other.newPage();
    await confirm.goto(pathOf(link));
    await confirm.getByRole('button', { name: 'Confirm my email' }).click();
    await expect(confirm.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();
    await other.close();
    expect(kinds(email)).toEqual(['account.email_verified', 'account.welcome']);

    await page.goto('/events');                                                // moving to another page is a moment to look
    await expect(page.getByText('Email verified')).toBeVisible(WAIT);
    await expect(celebration(page)).toHaveAttribute('data-celebration', 'SMALL');
    await shot(page, '02-email-verified');
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('a team forms', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = 'celebrate-team';
  let leader = '';
  let mate = '';
  let outsider = '';

  test.beforeAll(() => {
    leader = uniqueEmail('lead');
    mate = uniqueEmail('mate');
    outsider = uniqueEmail('alone');
    helper('create_user', leader, '--verified', '--first-name', 'Lena');
    helper('create_user', mate, '--verified', '--first-name', 'Milo');
    helper('create_user', outsider, '--verified', '--first-name', 'Olly');
    helper('make_payment_hackathon', slug, '--stage', 'NONE', '--min-team-size', '2', '--title', 'Celebrate Together');
  });

  test('a team below its minimum is not celebrated; when a teammate joins everyone is, on the pages they already have open', async ({ browser }) => {
    const lead = await person(browser, leader);
    await lead.page.goto(`/hackathons/${slug}/dashboard`);
    await lead.page.getByRole('button', { name: /Create a team/ }).click();
    const dialog = lead.page.getByRole('dialog');
    await dialog.getByLabel(/Team name/).fill('Pair');
    await dialog.getByRole('button', { name: 'Create team' }).click();
    await expect(lead.page.getByText(/needs at least 2 members to be registered/)).toBeVisible();
    await lead.page.waitForTimeout(2500);
    await expect(celebration(lead.page)).toHaveCount(0);
    expect(kinds(leader)).toEqual([]);

    await lead.page.getByRole('button', { name: /Invite member/ }).click();
    const modal = lead.page.getByRole('dialog');
    await modal.getByRole('combobox').fill(mate);
    await expect(modal.getByText('Eligible to join this team')).toBeVisible();
    await modal.getByRole('button', { name: 'Send Invite' }).click();
    await expect(lead.page.getByText(/invited|Invite sent/i).first()).toBeVisible();
    await lead.page.keyboard.press('Escape');

    const guest = await person(browser, mate);
    await guest.page.goto(`/hackathons/${slug}/dashboard`);
    await guest.page.getByRole('button', { name: /Accept/ }).click();

    // The newcomer: the biggest first ("You're in!"), then the welcome; the leader (page still open) hears about it too.
    await expect(guest.page.getByText("You're in!")).toBeVisible(WAIT);
    await expect(celebration(guest.page)).toHaveAttribute('data-celebration', 'BIG');
    await expect(confettiCanvas(guest.page)).toBeAttached();
    await shot(guest.page, '10-team-registered-newcomer');
    await expect(guest.page.getByText('1 more waiting')).toBeVisible();
    await closeCard(guest.page);
    await expect(guest.page.getByText('Welcome to Pair!')).toBeVisible();
    await shot(guest.page, '11-welcome-to-team');

    await expect(lead.page.getByText("You're in!")).toBeVisible(WAIT);
    await shot(lead.page, '12-team-registered-leader');
    await closeCard(lead.page);
    await expect(lead.page.getByText(/Milo joined Pair/)).toBeVisible();
    expect(kinds(leader)).toEqual(['hackathon.member_joined', 'hackathon.team_registered']);
    expect(kinds(mate)).toEqual(['hackathon.joined_team', 'hackathon.team_registered']);
    await lead.context.close();
    await guest.context.close();
  });

  test('someone not on the team hears nothing, and a celebration is never shown a second time', async ({ browser }) => {
    const { context, page } = await person(browser, outsider);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await page.waitForTimeout(3500);
    await expect(celebration(page)).toHaveCount(0);
    await context.close();

    const again = await person(browser, leader);
    await again.page.goto(`/hackathons/${slug}/dashboard`);
    await again.page.waitForTimeout(3500);
    await expect(celebration(again.page)).toHaveCount(0);                       // they saw them in the previous test
    await again.context.close();
  });

  test('a team that only needs one member is celebrated the moment it is created', async ({ browser }) => {
    const lone = uniqueEmail('solo');
    helper('create_user', lone, '--verified');
    helper('make_payment_hackathon', 'celebrate-gone', '--stage', 'NONE', '--title', 'Gone Before Seen');
    const { context, page } = await person(browser, lone);
    await page.goto('/hackathons/celebrate-gone/dashboard');
    await page.getByRole('button', { name: /Create a team/ }).click();
    await page.getByRole('dialog').getByLabel(/Team name/).fill('Vanishers');
    await page.getByRole('dialog').getByRole('button', { name: 'Create team' }).click();
    await expect(page.getByText("You're in!")).toBeVisible(WAIT);                // min size 1: registered at once, celebrated
    await expect.poll(() => cards(lone).some((c) => c.kind === 'hackathon.team_registered' && c.seen)).toBe(true);
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('a paid team, and what is never celebrated', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = 'celebrate-paid';
  let admin = '';
  let paid = '';
  let turnedDown = '';

  test.beforeAll(() => {
    admin = uniqueEmail('boss');
    paid = uniqueEmail('payer');
    turnedDown = uniqueEmail('refused');
    helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
    helper('create_user', paid, '--verified');
    helper('create_user', turnedDown, '--verified');
    helper('make_payment_hackathon', slug, '--title', 'Celebrate Paid');
  });

  async function pay(page: Page, team: string, reference: string) {
    await page.goto(`/hackathons/${slug}/dashboard`);
    await page.getByRole('button', { name: /Create a team/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Team name/).fill(team);
    await dialog.getByRole('button', { name: 'Next' }).click();
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'upi.png', mimeType: 'image/png', buffer: PNG });
    await dialog.getByLabel(/Transaction ID/).fill(reference);
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
  }

  test('paying alone is not celebrated; the moment an organizer verifies, the leader\'s open page celebrates', async ({ browser }) => {
    const lead = await person(browser, paid);
    await pay(lead.page, 'Payers', `CEL-${Date.now().toString(36)}-A`);
    await lead.page.waitForTimeout(2500);
    await expect(celebration(lead.page)).toHaveCount(0);
    expect(kinds(paid)).toEqual([]);

    const boss = await person(browser, admin);
    await boss.page.goto(`/admin/hackathons/${slug}?tab=payments`);
    await boss.page.getByRole('listitem').filter({ hasText: 'Payers' }).first().getByRole('button', { name: 'Verify', exact: true }).click();
    await boss.page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
    await expect(boss.page.getByText('Payers is registered')).toBeVisible();
    await boss.context.close();

    await expect(lead.page.getByText("You're in!")).toBeVisible(WAIT);          // no reload, no navigation: the open page noticed
    await expect(confettiCanvas(lead.page)).toBeAttached();
    await expect(lead.page.getByText('Payers is registered for Celebrate Paid.')).toBeVisible();
    await shot(lead.page, '20-paid-team-celebrates');
    await lead.page.getByRole('link', { name: 'Take me there' }).click();
    await expect(lead.page).toHaveURL(new RegExp(`/hackathons/${slug}/dashboard`));
    await lead.context.close();
  });

  test('a rejected payment is never celebrated: only the plain message to contact the club', async ({ browser }) => {
    const lead = await person(browser, turnedDown);
    await pay(lead.page, 'Refused', `CEL-${Date.now().toString(36)}-B`);
    const boss = await person(browser, admin);
    await boss.page.goto(`/admin/hackathons/${slug}?tab=payments`);
    await boss.page.getByRole('listitem').filter({ hasText: 'Refused' }).first().getByRole('button', { name: 'Reject', exact: true }).click();
    await boss.page.getByLabel(/Why is it being rejected/).fill('Blurry');
    await boss.page.getByRole('button', { name: 'Reject payment' }).click();
    await expect(boss.page.getByText('Refused rejected')).toBeVisible();
    await boss.context.close();

    await lead.page.reload();
    await expect(lead.page.getByText('Your payment could not be verified. Please contact the club representatives.')).toBeVisible();
    await lead.page.waitForTimeout(4000);
    await expect(celebration(lead.page)).toHaveCount(0);
    expect(kinds(turnedDown)).toEqual([]);
    await shot(lead.page, '21-rejected-no-celebration');
    await lead.context.close();
  });

  test('someone who asks for less motion still gets the card, without confetti', async ({ browser }) => {
    const calm = uniqueEmail('calm');
    helper('create_user', calm, '--verified');
    helper('award_celebration', calm, 'hackathon.team_registered', 'calm-1', '--context', 'team=Calm', 'hackathon=Quiet', '--link', '/forms');
    const { context, page } = await person(browser, calm, { reducedMotion: 'reduce' });
    await expect(page.getByText("You're in!")).toBeVisible(WAIT);
    await page.waitForTimeout(1500);
    await expect(confettiCanvas(page)).toHaveCount(0);
    await shot(page, '22-reduced-motion');
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('results', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = 'celebrate-results';
  let winnerLead = '';
  let otherLead = '';
  let teamMate = '';

  test.beforeAll(() => {
    helper('create_user', uniqueEmail('boss'), '--verified', '--staff', '--role', 'ADMIN');
    winnerLead = uniqueEmail('winner');
    teamMate = uniqueEmail('winnermate');
    otherLead = uniqueEmail('other');
    helper('create_user', winnerLead, '--verified');
    helper('create_user', teamMate, '--verified');
    helper('create_user', otherLead, '--verified');
    helper('make_payment_hackathon', slug, '--stage', 'NONE', '--title', 'Celebrate Results');
  });

  test('shortlisting is celebrated for the whole team once results are published, and a rejection is not', async ({ browser }) => {
    const lead = await person(browser, winnerLead);
    await lead.page.goto(`/hackathons/${slug}/dashboard`);
    await lead.page.getByRole('button', { name: /Create a team/ }).click();
    await lead.page.getByRole('dialog').getByLabel(/Team name/).fill('Finalists');
    await lead.page.getByRole('dialog').getByRole('button', { name: 'Create team' }).click();
    await expect(lead.page.getByText("You're in!")).toBeVisible(WAIT);
    await closeCard(lead.page);
    const other = await person(browser, otherLead);
    await other.page.goto(`/hackathons/${slug}/dashboard`);
    await other.page.getByRole('button', { name: /Create a team/ }).click();
    await other.page.getByRole('dialog').getByLabel(/Team name/).fill('Almost');
    await other.page.getByRole('dialog').getByRole('button', { name: 'Create team' }).click();
    await expect(other.page.getByText("You're in!")).toBeVisible(WAIT);
    await closeCard(other.page);

    helper('shortlist', slug, '--team', 'Finalists', '--reject', 'Almost');

    await expect(lead.page.getByText("You're shortlisted!")).toBeVisible(WAIT);
    await expect(lead.page.getByText('Finalists goes through Round 1.')).toBeVisible();
    await expect(celebration(lead.page)).toHaveAttribute('data-celebration', 'BIG');
    await shot(lead.page, '30-shortlisted');
    await closeCard(lead.page);
    await other.page.waitForTimeout(4000);
    await expect(celebration(other.page)).toHaveCount(0);                      // not shortlisted: no party
    expect(kinds(otherLead)).toEqual(['hackathon.team_registered']);
    await lead.context.close();
    await other.context.close();
  });

  test('winning an award is celebrated for the team', async ({ browser }) => {
    const lead = await person(browser, winnerLead);
    helper('make_winner', slug, 'Finalists', '--title', 'Best Project');
    await expect(lead.page.getByText('Congratulations!')).toBeVisible(WAIT);
    await expect(lead.page.getByText('Finalists won Best Project at Celebrate Results.')).toBeVisible();
    await shot(lead.page, '31-winner');
    await lead.context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('the queue, expiry, links and the on/off choice', () => {
  test.describe.configure({ mode: 'serial' });
  const email = uniqueEmail('queue');

  test.beforeAll(() => {
    helper('create_user', email, '--verified', '--first-name', 'Quin');
  });

  test('several at once: biggest first, a count of those waiting, and at most three at a time with the rest on a later check', async ({ browser }) => {
    helper('award_celebration', email, 'account.email_verified', 'q-small-1');
    helper('award_celebration', email, 'hackathon.winner', 'q-big', '--context', 'team=Q', 'award=Gold', 'hackathon=H');
    helper('award_celebration', email, 'account.profile_completed', 'q-small-2');
    helper('award_celebration', email, 'event.registered', 'q-medium', '--context', 'event=Workshop');
    const { context, page } = await person(browser, email);
    await expect(page.getByText('Congratulations!')).toBeVisible(WAIT);          // the BIG one first
    await expect(page.getByText('2 more waiting')).toBeVisible();                // three lined up, the fourth waits
    await shot(page, '40-queue-big-first');
    await closeCard(page);
    await expect(page.getByText("You're registered!")).toBeVisible();            // then the medium one
    await closeCard(page);
    await expect(celebration(page).first()).toBeVisible();
    await closeCard(page);
    await page.goto('/forms');                                                   // a later check picks up the one that waited
    await expect(celebration(page).first()).toBeVisible(WAIT);
    await closeCard(page);
    await page.waitForTimeout(2500);
    await expect(celebration(page)).toHaveCount(0);
    expect(cards(email).every((c) => c.seen)).toBe(true);
    await context.close();
  });

  test('a celebration nobody saw in time is dropped rather than shown late', async ({ browser }) => {
    helper('award_celebration', email, 'account.email_verified', 'q-expired');
    helper('expire_celebrations', email);
    const { context, page } = await person(browser, email);
    await page.waitForTimeout(3500);
    await expect(celebration(page)).toHaveCount(0);
    await context.close();
  });

  test('the link goes where it says; a link to another site is not offered', async ({ browser }) => {
    helper('award_celebration', email, 'event.registered', 'q-link', '--context', 'event=Linked', '--link', '/events');
    const { context, page } = await person(browser, email);
    await expect(page.getByText("You're registered!")).toBeVisible(WAIT);
    await page.getByRole('link', { name: 'Take me there' }).click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(celebration(page)).toHaveCount(0);                              // following the link closes the card

    helper('award_celebration', email, 'event.registered', 'q-evil', '--context', 'event=Phish', '--link', 'https://evil.example/login');
    await page.goto('/forms');
    await expect(page.getByText("You're registered!")).toBeVisible(WAIT);
    await expect(page.getByRole('link', { name: 'Take me there' })).toHaveCount(0);
    await closeCard(page);
    await context.close();
  });

  test('turning celebrations off from the card saves it on the account: nothing new is created, and the profile shows it', async ({ browser }) => {
    helper('award_celebration', email, 'account.profile_completed', 'q-off-1');
    const { context, page } = await person(browser, email);
    await expect(celebration(page).first()).toBeVisible(WAIT);
    await page.getByRole('button', { name: 'Turn off celebrations' }).click();
    await expect(page.getByText('Celebrations are off')).toBeVisible();
    await expect(celebration(page)).toHaveCount(0);
    expect(helper<{ made: boolean }>('award_celebration', email, 'account.email_verified', 'q-off-2').made).toBe(false);   // while off, none are created

    await page.goto('/profile');
    const toggle = page.getByRole('switch', { name: 'Celebrate my milestones' });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await shot(page, '41-profile-switch-off');

    const other = await browser.newContext({ baseURL: SITE_URL });                 // another device: the choice follows the account
    const phone = await other.newPage();
    await signIn(phone, email);
    await phone.goto('/profile');
    await expect(phone.getByRole('switch', { name: 'Celebrate my milestones' })).toHaveAttribute('aria-checked', 'false');
    await other.close();

    await toggle.click();
    await expect(page.getByText('Celebrations are on')).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(helper<{ made: boolean }>('award_celebration', email, 'account.email_verified', 'q-on-1').made).toBe(true);
    await page.goto('/forms');
    await expect(page.getByText('Email verified')).toBeVisible(WAIT);
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('where it appears', () => {
  test('a small card floats under the navigation, a big one is centred over a backdrop, fireworks are drawn, and sign-in pages stay quiet', async ({ browser }) => {
    const email = uniqueEmail('place');
    helper('create_user', email, '--verified');
    helper('award_celebration', email, 'hackathon.team_registered', 'pl-1', '--context', 'team=Placed', 'hackathon=Placement Cup', '--link', '/forms');
    const { context, page } = await person(browser, email);
    await page.goto('/forms');
    await expect(celebration(page)).toHaveAttribute('data-celebration', 'BIG', WAIT);
    const view = page.viewportSize()!;
    const big = (await celebration(page).boundingBox())!;
    expect(Math.abs(big.x + big.width / 2 - view.width / 2)).toBeLessThan(4);
    expect(big.y).toBeGreaterThan(40);
    await expect(page.locator('[data-celebration-backdrop]')).toBeVisible();
    await expect.poll(() => page.locator('canvas').count(), WAIT).toBeGreaterThan(0);   // the fireworks canvas
    await shot(page, '60-big-centred');
    await page.locator('[data-celebration-backdrop]').click({ position: { x: 5, y: 5 } });
    await expect(celebration(page)).toHaveCount(0);

    helper('award_celebration', email, 'account.email_verified', 'pl-2');
    await page.goto('/login');
    await page.waitForTimeout(2500);
    await expect(celebration(page)).toHaveCount(0);                                        // never on the sign-in page
    await page.goto('/forms');
    await expect(celebration(page)).toBeVisible(WAIT);
    const small = (await celebration(page).boundingBox())!;
    const navBottom = await page.evaluate(() => (document.querySelector('header[data-site-chrome]') as HTMLElement | null)?.getBoundingClientRect().bottom ?? 0);
    expect(small.y).toBeGreaterThanOrEqual(navBottom - 4);   // the card is still settling into place (a spring), so allow a few pixels
    expect(small.y).toBeLessThan(160);                                                      // up at the top, not over the content
    await expect(page.locator('[data-celebration-backdrop]')).toHaveCount(0);
    await shot(page, '61-small-under-nav');
    await context.close();
  });
});

test.describe('the home opening film', () => {
  test('a celebration waits for it to end instead of appearing over it', async ({ browser }) => {
    const email = uniqueEmail('film');
    helper('create_user', email, '--verified');
    helper('award_celebration', email, 'hackathon.team_registered', 'film-1', '--context', 'team=Film', 'hackathon=Film Cup', '--link', '/forms');
    const { context, page } = await person(browser, email, {}, true);
    await page.goto('/');
    await expect(page.getByRole('button', { name: /skip intro/i })).toBeVisible(WAIT);
    await page.waitForTimeout(5000);
    await expect(celebration(page)).toHaveCount(0);
    await shot(page, '62-film-no-card');
    await page.getByRole('button', { name: /skip intro/i }).click();
    await expect(celebration(page)).toBeVisible(WAIT);
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('on a phone', () => {
  test('the card fits the screen, sits above the bottom edge, has big enough buttons and nothing scrolls sideways', async ({ browser }) => {
    const email = uniqueEmail('pocket');
    helper('create_user', email, '--verified');
    helper('award_celebration', email, 'hackathon.team_registered', 'p-1', '--context', 'team=Pocket Rockets With A Very Long Name Indeed', 'hackathon=A Hackathon Whose Title Is Also Quite Long', '--link', '/forms');
    const phone = devices['Pixel 7'];
    const { context, page } = await person(browser, email, { ...phone });
    await expect(celebration(page)).toBeVisible(WAIT);
    const box = (await celebration(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(phone.viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(phone.viewport.height);
    const close = (await page.getByRole('button', { name: 'Close' }).boundingBox())!;
    expect(close.width).toBeGreaterThanOrEqual(40);
    expect(close.height).toBeGreaterThanOrEqual(40);
    const link = (await page.getByRole('link', { name: 'Take me there' }).boundingBox())!;
    expect(link.height).toBeGreaterThanOrEqual(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await shot(page, '50-phone');
    await page.getByRole('button', { name: 'Close' }).tap();
    await expect(celebration(page)).toHaveCount(0);
    await context.close();
  });
});
