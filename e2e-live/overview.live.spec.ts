import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { SITE_URL, helper, signIn, stateDir, uniqueEmail } from './live';

/**
 * The organizer's hackathon Overview end to end: real backend, real site.
 * One request feeds the page; the stage strip, next date, attention items, money, trend with the last edition, pipeline,
 * problem statements by domain, share-a-status, event-day arrivals, what a limited organizer may see, and what the page
 * does when a part (or all of it) fails. Watch it:  pnpm test:e2e:live --headed e2e-live/overview.live.spec.ts
 * (screenshots: test-results/live/overview/)
 */
// Each test reads its own seeded hackathon (the ones that change one use their own), so one failure does not hide the rest.

const SHOTS = join(stateDir, 'overview');
const WAIT = { timeout: 30_000 };
const REG = 'ov-registration';
const EVENT = 'ov-event-day';
const EMPTY = 'ov-empty';
const FULL = 'ov-full';
const STAGES = 'ov-stages';

let admin = '';
let viewer = '';

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

const open = async (page: Page, slug: string) => {
  await page.goto(`/admin/hackathons/${slug}?tab=overview`);
  await expect(page.getByRole('navigation', { name: 'Stage of the hackathon' })).toBeVisible(WAIT);
};
const kpi = (page: Page, label: string) => page.getByText(label, { exact: true }).first().locator('xpath=ancestor::*[2]');
const strip = (page: Page) => page.getByRole('region', { name: 'Needs attention' });
const current = (page: Page) => page.locator('nav[aria-label="Stage of the hackathon"] [aria-current="step"]');
const top = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!.y;
/** An attention item reads "<count><label>" (the count sits in its own badge). */
const item = (count: number, label: string) => new RegExp(`${count}\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.beforeAll(() => {
  admin = uniqueEmail('boss');
  viewer = uniqueEmail('watcher');
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
  helper('create_user', viewer, '--verified', '--first-name', 'Watcher');

  // Registration stage, fees on, limits, an earlier edition, statements in three domains, money in every state.
  helper('make_overview_hackathon', REG, '--stage', 'registration', '--teams', '8', '--forming', '3', '--fee', '200', '--max-teams', '20', '--max-participants', '60', '--previous', '6', '--statements', '6');
  helper('add_payment', REG, '--status', 'VERIFIED', '--count', '3', '--hours', '50');
  helper('add_payment', REG, '--status', 'PENDING', '--count', '1', '--hours', '30');
  helper('add_payment', REG, '--status', 'PENDING', '--count', '1', '--hours', '2');
  helper('add_payment', REG, '--status', 'REJECTED', '--count', '1', '--hours', '10');
  helper('add_ideas', REG, '--count', '2');
  helper('add_withdrawal', REG);
  helper('staff_perms', REG, viewer, '--perms', 'insights');

  helper('make_overview_hackathon', EVENT, '--stage', 'event', '--teams', '6');
  helper('arrive', EVENT, '--count', '5');
  helper('make_overview_hackathon', EMPTY, '--stage', 'registration');
  helper('make_overview_hackathon', FULL, '--stage', 'registration', '--teams', '4', '--max-teams', '4');
  helper('make_overview_hackathon', STAGES, '--stage', 'registration', '--teams', '4');
});

test.beforeEach(() => { helper('clear_cache'); });

test('registration stage: the stage, the next date and the numbers match what the database holds', async ({ page }) => {
  await signIn(page, admin);
  await open(page, REG);
  await expect(current(page)).toHaveText(/Registration/);
  const next = page.getByRole('region', { name: 'Next date' });
  await expect(next).toContainText('Registration closes');
  await expect(next).toContainText(/in [45] days?/);
  await expect(next).toContainText('IST');
  await expect(next).toContainText(/of 20 team places taken/);
  await expect(page.getByText(/Updated (just now|\d+ seconds? ago)/)).toBeVisible();

  // 8 registered + 3 whose payment was verified; 3 forming; one waitlist-free pool of 20 places.
  await expect(kpi(page, 'Registered teams')).toContainText('11');
  await expect(kpi(page, 'Team places left')).toContainText('14 of 20 taken');
  await expect(kpi(page, 'Team places left')).toContainText('6');
  await expect(kpi(page, 'Fees verified')).toContainText('₹600');

  const attention = strip(page);
  await expect(attention).toContainText(item(2, 'teams are waiting for their payment to be checked (1 for over a day)'));
  await expect(attention).toContainText(item(2, 'ideas are waiting for a review'));
  await expect(attention).toContainText(item(3, 'teams are below the minimum size of 2'));
  await expect(attention).toContainText(item(1, 'team asks to withdraw and needs an answer'));
  await shot(page, '01-registration-desktop');
});

test('the money card splits verified, waiting and rejected, and says what is still to settle', async ({ page }) => {
  await signIn(page, admin);
  await open(page, REG);
  const fees = page.getByRole('region', { name: 'Fees' });
  await expect(fees).toContainText('₹200 per team');
  await expect(fees).toContainText('₹600');
  await expect(fees).toContainText('verified');
  await expect(fees.getByText('Waiting for a check')).toBeVisible();
  await expect(fees).toContainText('₹400');
  await expect(fees).toContainText('₹200');
  await expect(fees).toContainText('still to settle with 1 team');
  await expect(fees).toContainText('1 payment has waited over 24 hours');
  await fees.getByRole('button', { name: 'Open payments' }).click();
  await expect(page).toHaveURL(/tab=payments/);
});

test('every block of the page comes from one request, and Refresh makes exactly one more', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (request) => { if (request.url().includes(`/api/proxy/hackathons/${REG}/`)) asked.push(new URL(request.url()).pathname.replace(/\/$/, '').split('/').pop()!); });
  await signIn(page, admin);
  await open(page, REG);
  await expect(page.getByRole('region', { name: 'Fees' })).toBeVisible(WAIT);
  await page.waitForTimeout(1500);
  const loaded = [...new Set(asked)];
  expect(asked.filter((name) => name === 'overview').length).toBeGreaterThanOrEqual(1);
  for (const part of ['stats', 'analytics', 'ideas', 'payments', 'finder', 'withdrawals']) expect(loaded, `${part} is not asked for on its own`).not.toContain(part);

  const before = asked.filter((name) => name === 'overview').length;
  await page.getByRole('button', { name: 'Refresh the overview' }).click();
  await expect.poll(() => asked.filter((name) => name === 'overview').length).toBeGreaterThan(before);
  await page.waitForTimeout(800);
  // The site follows its trailing-slash redirect, so one ask can show twice; never a burst.
  expect(asked.filter((name) => name === 'overview').length - before).toBeLessThanOrEqual(2);
});

test('the sign-ups card shows the trend, the limit, where it is heading and how the last edition stood', async ({ page }) => {
  await signIn(page, admin);
  await open(page, REG);
  const trend = page.getByRole('region', { name: 'Sign-ups over time' });
  await expect(trend).toBeVisible(WAIT);
  await expect(trend.getByRole('img').first()).toHaveAttribute('aria-label', /people in teams of a limit of 60/);
  await expect(trend).toContainText('Limit 60');
  await expect(trend.getByText(/At this pace you reach|Not enough sign-ups/)).toBeVisible();
  const note = trend.getByTestId('edition-note');
  await expect(note).toContainText('(last year)');
  await expect(note).toContainText(/You have \d+:/);
  await expect(note).toContainText(/ahead|behind|level with it/);
  await trend.getByText('Show the numbers').click();
  await expect(trend.getByRole('table')).toBeVisible();
  await shot(page, '02-trend');
});

test('the blocks follow the stage: forming teams and sign-ups first while registering, the pipeline last', async ({ page }) => {
  await signIn(page, admin);
  await open(page, REG);
  const forming = page.getByRole('region', { name: 'Teams below the minimum size' });
  const trend = page.getByRole('region', { name: 'Sign-ups over time' });
  const problems = page.getByRole('region', { name: 'Problem statement uptake' });
  const pipeline = page.getByRole('region', { name: 'Team pipeline' });
  await expect(pipeline).toBeVisible(WAIT);
  const [f, t, p, l] = [await top(forming), await top(trend), await top(problems), await top(pipeline)];
  expect(f).toBeLessThan(t);
  expect(t).toBeLessThan(p);
  expect(p).toBeLessThan(l);
});

test('the pipeline counts teams step by step and names the biggest drop', async ({ page }) => {
  await signIn(page, admin);
  await open(page, REG);
  const pipeline = page.getByRole('region', { name: 'Team pipeline' });
  await expect(pipeline).toContainText('Teams registered');
  await expect(pipeline.getByRole('img', { name: /Teams registered: 11, 100% of registered teams/ })).toBeVisible(WAIT);
  await expect(pipeline.getByRole('img', { name: /Teams submitted an idea: 2, 18% of registered teams/ })).toBeVisible();
  await expect(pipeline).toContainText('−9 (82%) since the step above');
  await expect(pipeline).toContainText('Biggest drop: Teams submitted an idea');
  // Nothing has reached the project stage yet, so those steps do not claim a loss.
  await expect(pipeline.getByText(/since the step above/)).toHaveCount(1);
  await expect(pipeline.getByText('Teams submitted a project')).toHaveCount(0);   // the submissions module is off here
});

test('problem statements can be grouped by domain, with the ones nobody picked and the full ones', async ({ page }) => {
  await signIn(page, admin);
  await open(page, REG);
  const region = page.getByRole('region', { name: 'Problem statement uptake' });
  await expect(region.getByText('Statement 1', { exact: false }).first()).toBeVisible(WAIT);
  await region.getByRole('tab', { name: 'By domain' }).click();
  const list = region.getByRole('list', { name: 'Problem statements by domain' });
  for (const domain of ['HealthTech', 'AgriTech', 'EdTech']) await expect(list).toContainText(domain);
  await expect(list).toContainText('1 full');
  await expect(list).toContainText(/nobody picked/);
  await expect(region.getByRole('tab', { name: 'By domain' })).toHaveAttribute('aria-selected', 'true');
  await region.getByRole('tab', { name: 'Busiest first' }).click();
  await expect(list).toHaveCount(0);
});

test('Share status writes a message from the page numbers, lets you edit it and copies exactly that', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await signIn(page, admin);
  await open(page, REG);
  const share = page.getByRole('button', { name: 'Share status' });
  await share.click();
  const box = page.getByLabel('Status message', { exact: true });
  await expect(box).toBeVisible();
  const text = await box.inputValue();
  expect(text).toContain('Teams: 11 registered, 3 still forming (14 of 20 team places taken)');
  expect(text).toMatch(/Next: Registration closes in [45] days/);
  expect(text).toContain('Fees: ₹600 verified from 3 teams, 2 waiting for a check, 1 rejected');
  expect(text).toContain('Ideas: 2 waiting for a review');
  expect(text).toContain('*Needs attention*');
  expect(text).toContain('- 1 team asks to withdraw and needs an answer');
  await shot(page, '03-share');

  await box.fill(`${text}\nSee you at the briefing.`);
  await page.getByRole('button', { name: 'Copy message' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('See you at the briefing.');

  await page.keyboard.press('Escape');
  await expect(box).toHaveCount(0);
  await expect(share).toBeFocused();   // keyboard users land back where they were
  await share.click();
  expect(await page.getByLabel('Status message', { exact: true }).inputValue()).not.toContain('See you at the briefing.');   // made fresh each time
});

test('a part that fails to load is named and retried alone; the rest of the page stays', async ({ page }) => {
  await signIn(page, admin);
  let broken = true;
  await page.route(`**/api/proxy/hackathons/${REG}/overview/**`, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (broken) Object.assign(body, { payments: null, errors: { payments: 'Could not load this part.' } });
    await route.fulfill({ response, json: body });
  });
  await open(page, REG);
  const notice = page.getByRole('status').filter({ hasText: 'Could not load' });
  await expect(notice).toContainText('fees');
  await expect(kpi(page, 'Registered teams')).toContainText('11');
  await expect(page.getByRole('region', { name: 'Fees' })).toHaveCount(0);
  await shot(page, '04-part-failed');
  broken = false;
  await notice.getByRole('button', { name: 'Try again' }).click();
  await expect(notice).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Fees' })).toBeVisible();
});

test('if the whole overview fails the page says so with a retry, and recovers', async ({ page }) => {
  await signIn(page, admin);
  let calls = 0;
  await page.route(`**/api/proxy/hackathons/${REG}/overview/**`, async (route) => {
    calls += 1;
    if (calls <= 2) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'boom' }) });
    return route.continue();
  });
  await page.goto(`/admin/hackathons/${REG}?tab=overview`);
  const retry = page.getByRole('button', { name: /try again|retry/i }).first();
  await expect(retry).toBeVisible(WAIT);
  await retry.click();
  await expect(page.getByRole('navigation', { name: 'Stage of the hackathon' })).toBeVisible(WAIT);
  await expect(kpi(page, 'Registered teams')).toContainText('11');
});

test('what the server sends depends on the person: insights alone gets the numbers and no private part', async ({ page, browser }) => {
  // The admin screens are for admins and club leads, so a volunteer with one permission is checked at the API the page calls.
  await signIn(page, viewer);
  const fetchOverview = () => page.evaluate(async (slug) => {
    const reply = await fetch(`/api/proxy/hackathons/${slug}/overview/`, { credentials: 'include' });
    return { status: reply.status, body: await reply.json().catch(() => null) };
  }, REG);
  const reply = await fetchOverview();
  expect(reply.status).toBe(200);
  expect(reply.body.stats.teams_by_status.REGISTERED).toBe(11);
  expect(reply.body.analytics.capacity.max_teams).toBe(20);
  expect(reply.body.hidden.sort()).toEqual(['finder', 'ideas', 'payments', 'withdrawals']);
  for (const part of ['ideas', 'payments', 'finder', 'withdrawals']) expect(reply.body[part], `${part} stays private`).toBeNull();
  expect(JSON.stringify(reply.body)).not.toContain('leader_email@');   // no payer contact details leak into the numbers
  expect(reply.body.errors).toEqual({});

  // A person with no staff role at all is refused (in a fresh browser, so nothing of the first sign-in is reused).
  const stranger = uniqueEmail('stranger');
  helper('create_user', stranger, '--verified');
  const other = await browser.newContext({ baseURL: SITE_URL });
  const outsider = await other.newPage();
  await signIn(outsider, stranger);
  const refused = await outsider.evaluate(async (slug) => (await fetch(`/api/proxy/hackathons/${slug}/overview/`, { credentials: 'include' })).status, REG);
  expect(refused).toBe(403);
  await other.close();
});

test('event day: arrivals per session, who has not come, and a confirmed reminder', async ({ page }) => {
  await signIn(page, admin);
  await open(page, EVENT);
  await expect(current(page)).toHaveText(/Event day/);
  const day = page.getByRole('region', { name: 'Event day' });
  await expect(day).toBeVisible(WAIT);
  await expect(day.getByRole('img', { name: /5 of 12 people/ })).toBeVisible();
  await expect(day).toContainText('7 people in 3 teams have not arrived yet');   // 6 teams of 2; five arrived, two teams were whole
  // The arrival card comes before the pipeline and the details on the day.
  expect(await top(day)).toBeLessThan(await top(page.getByRole('region', { name: 'Problem statement uptake' })));
  await shot(page, '06-event-day');

  await day.getByRole('button', { name: 'Remind them' }).click();
  await page.getByRole('button', { name: 'Send reminders' }).click();
  await expect(page.getByText('Reminders sent')).toBeVisible(WAIT);
  await expect(page.getByText(/7 people notified/)).toBeVisible();

  // Check-in is closed: the button is off.
  helper('set_stage', EVENT, '--stage', 'selection');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Event day' })).toHaveCount(0);
  await expect(current(page)).toHaveText(/Selection/);
});

test('a hackathon nobody has joined yet is calm: no pipeline, no false alarms, a share message that still reads well', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await signIn(page, admin);
  await open(page, EMPTY);
  await expect(page.getByRole('region', { name: 'Sign-ups over time' })).toContainText('Nobody has joined a team yet.');
  await expect(page.getByRole('region', { name: 'Team pipeline' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Sign-ups over time' }).getByTestId('edition-note')).toHaveCount(0);
  await expect(strip(page)).toContainText('All clear');
  await expect(page.getByRole('region', { name: 'Fees' })).toHaveCount(0);
  await expect(kpi(page, 'Rounds')).toBeVisible();
  await page.getByRole('button', { name: 'Share status' }).click();
  const text = await page.getByLabel('Status message', { exact: true }).inputValue();
  expect(text).toContain('Teams: 0 registered, 0 still forming');
  expect(text).not.toContain('Needs attention');
  expect(text).not.toContain('Fees');
});

test('when every team place is taken the page says so in red and the card stops projecting', async ({ page }) => {
  await signIn(page, admin);
  await open(page, FULL);
  await expect(kpi(page, 'Team places left')).toContainText('0');
  await expect(kpi(page, 'Team places left')).toContainText('4 of 4 taken');
  await expect(page.getByRole('region', { name: 'Next date' })).toContainText('4 of 4 team places taken');
});

test('the stage strip follows the dates from registration through results', async ({ page }) => {
  await signIn(page, admin);
  await open(page, STAGES);
  await expect(current(page)).toHaveText(/Registration/);
  for (const [stage, label] of [['ideas', 'Ideas'], ['selection', 'Selection'], ['results', 'Results']] as const) {
    helper('set_stage', STAGES, '--stage', stage);
    await page.reload();
    await expect(current(page)).toHaveText(new RegExp(label));
    const done = page.locator('nav[aria-label="Stage of the hackathon"] li');
    await expect(done.first()).toBeVisible();
  }
  // Results: every date is behind us, and the page says so rather than counting down to nothing.
  await expect(page.getByRole('region', { name: 'Schedule' })).toContainText('Every date has passed');
  await shot(page, '07-results-stage');
});

test('phone: no sideways scroll, big enough buttons, the strip scrolls on its own and the dialog fits', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, admin);
  await open(page, REG);
  await expect(page.getByRole('region', { name: 'Fees' })).toBeVisible(WAIT);
  expect(await sideways(page)).toBeLessThanOrEqual(1);
  for (const name of ['Refresh the overview', 'Share status']) {
    const box = (await page.getByRole('button', { name }).boundingBox())!;
    expect(box.height, `${name} is tall enough to tap`).toBeGreaterThanOrEqual(40);
  }
  await page.getByRole('button', { name: 'Share status' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const frame = (await dialog.boundingBox())!;
  expect(frame.x).toBeGreaterThanOrEqual(0);
  expect(frame.x + frame.width).toBeLessThanOrEqual(390.5);
  expect(frame.y + frame.height).toBeLessThanOrEqual(844.5);
  await expect(page.getByRole('button', { name: 'Copy message' })).toBeInViewport();
  await shot(page, '08-phone-share');
  await page.keyboard.press('Escape');
  await shot(page, '09-phone-overview');
});

test('dark theme: the new cards keep readable contrast and nothing overflows', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await signIn(page, admin);
  await open(page, REG);
  await expect(page.getByRole('region', { name: 'Fees' })).toBeVisible(WAIT);
  expect(await sideways(page)).toBeLessThanOrEqual(1);
  const dark = await page.evaluate(() => document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor);
  expect(dark).toBeTruthy();
  // Text in the money card must not blend into its panel: measure the colour difference.
  const contrast = await page.getByRole('region', { name: 'Fees' }).evaluate((node) => {
    const parse = (value: string) => value.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
    const lum = ([r, g, b]: number[]) => [r, g, b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const heading = node.querySelector('h3')!;
    let bg: Element | null = node; let background = 'rgba(0, 0, 0, 0)';
    while (bg && /rgba\(0, 0, 0, 0\)|transparent/.test(background)) { background = getComputedStyle(bg).backgroundColor; bg = bg.parentElement; }
    const a = lum(parse(getComputedStyle(heading).color)); const b = lum(parse(background));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(contrast).toBeGreaterThan(4.5);
  await shot(page, '10-dark');
});

test('keyboard: the stage strip, Refresh and Share status are reachable and operable without a mouse', async ({ page }) => {
  await signIn(page, admin);
  await open(page, REG);
  await page.getByRole('button', { name: 'Refresh the overview' }).focus();
  await expect(page.getByRole('button', { name: 'Refresh the overview' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Updated (just now|\d+ seconds? ago)/)).toBeVisible();
  await page.getByRole('button', { name: 'Share status' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Status message', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog').locator(':focus')).toHaveCount(1);   // focus stays inside the dialog
  await page.keyboard.press('Escape');
  const nav = page.getByRole('navigation', { name: 'Stage of the hackathon' });
  await expect(nav.locator('[aria-current="step"]')).toHaveCount(1);
});
