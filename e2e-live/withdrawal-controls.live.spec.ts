import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { SITE_URL, helper, signIn, stateDir, uniqueEmail } from './live';

/**
 * Who may withdraw, and until when: the organizers' controls for an event registration and for a hackathon team, end to end.
 * Events: Allowed or Locked, plus a cutoff in hours before the start, set in the admin Events screen and seen on the member's ticket.
 * Hackathons: Instant, Needs approval or Locked, plus a deadline, set in the hackathon's Settings and seen on the team dashboard.
 * Watch it:  pnpm test:e2e:live --headed e2e-live/withdrawal-controls.live.spec.ts   (screenshots: test-results/live/withdrawal-controls/)
 */
const SHOTS = join(stateDir, 'withdrawal-controls');
const stamp = Date.now().toString(36);
const admin = uniqueEmail('admin');
const asha = uniqueEmail('asha');
const HOUR = 1;
const DAY = 24 * HOUR;

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

async function person(browser: Browser, email: string) {
  helper('expire_celebrations', email);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, baseURL: SITE_URL });
  await context.addInitScript(() => { try { window.localStorage.setItem('srkrcc_intro_seen_at', String(Date.now())); } catch { /* storage blocked */ } });
  const page = await context.newPage();
  await signIn(page, email);
  return { context, page };
}

const ticket = (page: Page, title: string): Locator => page.locator('article', { hasText: title }).first();
const adminCard = (page: Page, title: string): Locator =>
  page.getByText(title, { exact: true }).first().locator('xpath=ancestor::div[.//button[normalize-space()="Feedback"]][1]');

test.beforeAll(() => {
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN', '--first-name', 'Admin', '--last-name', 'Tester');
  helper('create_user', asha, '--verified', '--first-name', 'Asha', '--last-name', 'Tester');
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('an event registration', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = `cancel-rules-${stamp}`;
  const title = `Cancel Rules ${stamp}`;

  test.beforeAll(() => {
    helper('make_event', slug, '--title', title, '--start-hours', String(5 * DAY));
    helper('register_event', slug, asha);
  });

  async function editEvent(browser: Browser, change: (panel: Locator) => Promise<void>) {
    const { context, page } = await person(browser, admin);
    await page.goto('/admin/events');
    await adminCard(page, title).getByRole('button', { name: 'Edit' }).click();
    await change(page.locator('fieldset', { hasText: 'Cancelling a registration' }));
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Event Updated')).toBeVisible();
    await context.close();
  }

  test('by default a member can cancel until the event starts', async ({ browser }) => {
    const { context, page } = await person(browser, asha);
    await page.goto('/profile');
    const card = ticket(page, title);
    await expect(card.getByRole('button', { name: 'Cancel registration' })).toBeVisible();
    await expect(card.getByText(/You can cancel until/)).toHaveCount(0);                      // no cutoff set, so no deadline to show
    await context.close();
  });

  test('a cutoff shows the member when cancelling stops, and closes it once that moment has passed', async ({ browser }) => {
    await editEvent(browser, async (rules) => { await rules.getByLabel(/hours before the start/).fill('48'); });
    const member = await person(browser, asha);
    await member.page.goto('/profile');
    const card = ticket(member.page, title);
    await expect(card.getByRole('button', { name: 'Cancel registration' })).toBeVisible();
    await expect(card.getByText(/You can cancel until .* IST/)).toBeVisible();
    await shot(member.page, '01-event-cutoff');
    await member.context.close();

    await editEvent(browser, async (rules) => { await rules.getByLabel(/hours before the start/).fill('200'); });   // 200 h > the 120 h left
    const later = await person(browser, asha);
    await later.page.goto('/profile');
    const closed = ticket(later.page, title);
    await expect(closed.getByRole('button', { name: 'Cancel registration' })).toHaveCount(0);
    await expect(closed.getByText(/Cancelling has closed for this event/)).toBeVisible();
    await shot(later.page, '02-event-cutoff-passed');
    await later.context.close();
  });

  test('turning cancellation off locks it, says so, and the server refuses it too', async ({ browser }) => {
    await editEvent(browser, async (rules) => {
      await rules.getByLabel(/hours before the start/).fill('0');
      await rules.getByRole('switch', { name: /Let registered people cancel/ }).click();
    });
    const { context, page } = await person(browser, asha);
    await page.goto('/profile');
    const card = ticket(page, title);
    await expect(card.getByRole('button', { name: 'Cancel registration' })).toHaveCount(0);
    await expect(card.getByText(/Cancelling is closed for this event/)).toBeVisible();
    const refused = await page.evaluate(async (eventSlug) => {
      const reply = await fetch(`/api/proxy/events/${eventSlug}/my-registration/`, { method: 'DELETE', credentials: 'include' });
      return { status: reply.status, body: await reply.json() };
    }, slug);
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('CANCELLATION_LOCKED');
    expect(helper<{ registrations: number }>('event_state', slug).registrations).toBe(1);
    await shot(page, '03-event-locked');
    await context.close();
  });

  test('allowing it again gives the button back', async ({ browser }) => {
    await editEvent(browser, async (rules) => { await rules.getByRole('switch', { name: /Let registered people cancel/ }).click(); });
    const { context, page } = await person(browser, asha);
    await page.goto('/profile');
    await expect(ticket(page, title).getByRole('button', { name: 'Cancel registration' })).toBeVisible();
    await context.close();
  });

  test('a cutoff outside 0 to 720 hours is refused by the form and nothing is saved', async ({ browser }) => {
    const { context, page } = await person(browser, admin);
    await page.goto('/admin/events');
    await adminCard(page, title).getByRole('button', { name: 'Edit' }).click();
    const cutoff = page.getByLabel(/hours before the start/);
    for (const bad of ['-3', '721']) {
      await cutoff.fill(bad);
      await page.getByRole('button', { name: 'Save Changes' }).click();
      expect(await cutoff.evaluate((input: HTMLInputElement) => input.validity.valid), `${bad} is refused`).toBe(false);
      await expect(page.getByText('Event Updated')).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();          // still open, nothing was saved
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('a hackathon team', () => {
  const hack = (word: string) => ({ slug: `${word}-${stamp}`, title: `${word} Hack ${stamp}`, team: `Team ${word}` });

  async function setPolicy(browser: Browser, slug: string, policy: 'Instant' | 'Needs approval' | 'Locked', deadline?: string) {
    const { context, page } = await person(browser, admin);
    await page.goto(`/admin/hackathons/${slug}?tab=settings`);
    await page.getByRole('radio', { name: new RegExp(`^${policy}`) }).check();
    if (deadline !== undefined) await page.getByLabel(/Withdrawals close at/).fill(deadline);
    await page.getByRole('button', { name: 'Save all settings' }).click();
    await expect(page.getByText('You have unsaved changes.')).toHaveCount(0);
    await context.close();
  }

  const dashboard = async (browser: Browser, slug: string) => {
    const { context, page } = await person(browser, asha);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await expect(page.getByRole('button', { name: 'Withdraw team' })).toBeVisible();
    return { context, page };
  };

  test('needs approval is how it works until the organizers change it', async ({ browser }) => {
    const h = hack('approval');
    helper('make_team_hackathon', h.slug, asha, '--title', h.title, '--team', h.team);
    const { context, page } = await dashboard(browser, h.slug);
    await expect(page.getByRole('button', { name: 'Withdraw team' })).toBeEnabled();
    await page.getByRole('button', { name: 'Withdraw team' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/organizers have to approve this/)).toBeVisible();
    await dialog.getByLabel('Why are you withdrawing?').fill('Exams that week');
    await dialog.getByRole('button', { name: 'Ask to withdraw' }).click();
    await expect(page.getByText('Request sent')).toBeVisible();
    expect(helper<{ status: string; requests: number }>('team_status_of', h.slug, h.team)).toEqual({ status: 'REGISTERED', requests: 1 });
    await context.close();
  });

  test('locked: the button is off and the dashboard says why; the server refuses too', async ({ browser }) => {
    const h = hack('locked');
    helper('make_team_hackathon', h.slug, asha, '--title', h.title, '--team', h.team);
    await setPolicy(browser, h.slug, 'Locked');
    const { context, page } = await person(browser, asha);
    await page.goto(`/hackathons/${h.slug}/dashboard`);
    await expect(page.getByRole('button', { name: 'Withdraw team' })).toBeDisabled();
    await expect(page.getByText(/The organizers have closed withdrawals/)).toBeVisible();
    const teamId = await page.evaluate(async (hackSlug) => (await (await fetch(`/api/proxy/hackathons/${hackSlug}/my-team/`, { credentials: 'include' })).json()).team.id, h.slug);
    const refused = await page.evaluate(async (id) => {
      const reply = await fetch(`/api/proxy/hackathons/teams/${id}/leave/`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'Trying anyway' }) });
      return { status: reply.status, body: await reply.json() };
    }, teamId);
    expect(refused.status).toBe(400);
    expect(refused.body.code).toBe('WITHDRAWAL_LOCKED');
    expect(helper<{ status: string }>('team_status_of', h.slug, h.team).status).toBe('REGISTERED');
    await shot(page, '04-hackathon-locked');
    await context.close();
  });

  test('instant: the team withdraws at once, no request', async ({ browser }) => {
    const h = hack('instant');
    helper('make_team_hackathon', h.slug, asha, '--title', h.title, '--team', h.team);
    await setPolicy(browser, h.slug, 'Instant');
    const { context, page } = await dashboard(browser, h.slug);
    await page.getByRole('button', { name: 'Withdraw team' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/the only member/)).toBeVisible();                           // no "organizers have to approve" wording
    await expect(dialog.getByText(/organizers have to approve/)).toHaveCount(0);
    await dialog.getByLabel('Why are you withdrawing?').fill('Changed my plans');
    await dialog.getByRole('button', { name: 'Withdraw team' }).click();
    await expect(page.getByText('Team withdrawn')).toBeVisible();
    expect(helper<{ status: string; requests: number }>('team_status_of', h.slug, h.team)).toEqual({ status: 'WITHDRAWN', requests: 0 });
    await context.close();
  });

  test('a deadline in the past closes withdrawals; one in the future shows when they close', async ({ browser }) => {
    const h = hack('deadline');
    helper('make_team_hackathon', h.slug, asha, '--title', h.title, '--team', h.team);
    const soon = new Date(Date.now() + 6 * 3600_000);
    const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    await setPolicy(browser, h.slug, 'Needs approval', local(soon));
    const open = await person(browser, asha);
    await open.page.goto(`/hackathons/${h.slug}/dashboard`);
    await expect(open.page.getByText(/Withdrawals close /)).toBeVisible();
    await expect(open.page.getByRole('button', { name: 'Withdraw team' })).toBeEnabled();
    await shot(open.page, '05-hackathon-deadline-open');
    await open.context.close();

    await setPolicy(browser, h.slug, 'Needs approval', local(new Date(Date.now() - 3600_000)));
    const closed = await person(browser, asha);
    await closed.page.goto(`/hackathons/${h.slug}/dashboard`);
    await expect(closed.page.getByRole('button', { name: 'Withdraw team' })).toBeDisabled();
    await expect(closed.page.getByText(/Withdrawals closed on/)).toBeVisible();
    await closed.context.close();
  });
});
