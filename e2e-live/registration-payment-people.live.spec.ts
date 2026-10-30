import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { SITE_URL, helper, signIn, stateDir, uniqueEmail } from './live';

/**
 * Paying the fee at registration, part two: on a phone, and what happens to people and money when members leave.
 * Real backend, real site, real S3 API (moto). Watch it at normal speed:
 *   pnpm test:e2e:live --headed e2e-live/registration-payment-people.live.spec.ts
 */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SHOTS = join(stateDir, 'payments-people');

interface PaymentRow { team: string; team_exists: boolean; team_status: string | null; waitlisted: boolean | null; status: string; txn: string }
interface PaymentState { payments: PaymentRow[]; placed_teams: number; teams: number }
const state = (slug: string) => helper<PaymentState>('payments_state', slug);
const paymentOf = (slug: string, team: string) => state(slug).payments.find((p) => p.team === team);
const teamStatus = (slug: string, name: string) => helper<{ exists: boolean; status: string | null; waitlisted: boolean | null; members: number }>('team_status', slug, name);

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

async function person(browser: Browser, email: string, device?: (typeof devices)[string]): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ ...(device ?? {}), baseURL: SITE_URL, viewport: device ? device.viewport : { width: 1280, height: 900 } });
  const page = await context.newPage();
  await signIn(page, email);
  return { context, page };
}

async function payAndCreate(page: Page, slug: string, team: string, reference: string): Promise<Locator> {
  await page.goto(`/hackathons/${slug}/dashboard`);
  await page.getByRole('button', { name: /Create a team/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Team name/).fill(team);
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog.getByText(/Pay ₹\d+ to register your team/)).toBeVisible();
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'upi-payment.png', mimeType: 'image/png', buffer: PNG });
  await dialog.getByLabel(/Transaction ID/).fill(reference);
  return dialog;
}

const row = (page: Page, team: string) => page.getByRole('listitem').filter({ hasText: team }).first();
const openPayments = async (page: Page, slug: string) => {
  await page.goto(`/admin/hackathons/${slug}?tab=payments`);
  await expect(page.getByRole('heading', { name: 'Registration payments', exact: false })).toBeVisible();
};
const verify = async (page: Page, slug: string, team: string) => {
  await openPayments(page, slug);
  await row(page, team).getByRole('button', { name: 'Verify', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
  await expect(page.getByText(`${team} is registered`)).toBeVisible();
};
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// ---------------------------------------------------------------------------------------------------------------------
// On a phone
// ---------------------------------------------------------------------------------------------------------------------
test.describe('on a phone', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = 'pay-phone';
  const phone = devices['Pixel 7'];
  let admin = '';
  let leader = '';
  const reference = `PHONE-${Date.now().toString(36)}`;

  test.beforeAll(() => {
    admin = uniqueEmail('boss');
    leader = uniqueEmail('phone');
    helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
    helper('create_user', leader, '--verified');
    helper('make_payment_hackathon', slug, '--title', 'Pay On A Phone');
  });

  test('a leader pays from a phone: every step fits the screen and nothing scrolls sideways', async ({ browser }) => {
    const { context, page } = await person(browser, leader, phone);
    await page.goto(`/hackathons/${slug}/dashboard`);
    expect(await sideways(page)).toBeLessThanOrEqual(1);
    await expect(page.getByText(/Registering costs ₹200/)).toBeVisible();
    await shot(page, 'p01-dashboard-before');
    await page.getByRole('button', { name: /Create a team/ }).tap();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Team name/).fill('Pocket Team');
    await shot(page, 'p02-team-step');
    await dialog.getByRole('button', { name: 'Next' }).tap();
    await expect(dialog.getByText('Pay ₹200 to register your team')).toBeVisible();
    await expect(dialog.getByText('Pay to UPI: club@upi and keep the screenshot.')).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(phone.viewport.width);          // the dialog is never wider than the phone
    expect(await sideways(page)).toBeLessThanOrEqual(1);
    await shot(page, 'p03-payment-step');

    await dialog.getByRole('button', { name: 'Pay and create team' }).tap();
    await expect(dialog.getByText('Upload the screenshot of your payment.')).toBeVisible();
    await expect(dialog.getByText('Enter the transaction ID of your payment.')).toBeVisible();
    await shot(page, 'p04-errors-on-a-phone');

    await dialog.locator('input[type="file"]').setInputFiles({ name: 'upi-payment.png', mimeType: 'image/png', buffer: PNG });
    await dialog.getByLabel(/Transaction ID/).fill(reference);
    await expect(dialog.getByText('upi-payment.png').first()).toBeVisible();
    const pay = dialog.getByRole('button', { name: 'Pay and create team' });
    await expect(pay).toBeEnabled();
    const target = await pay.boundingBox();
    expect(target!.height).toBeGreaterThanOrEqual(40);                      // easy to hit with a thumb
    await pay.tap();

    await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
    expect(await sideways(page)).toBeLessThanOrEqual(1);
    await expect(page.getByText(reference)).toBeVisible();
    await shot(page, 'p05-pending-on-a-phone');
    await context.close();
    expect(paymentOf(slug, 'Pocket Team')).toMatchObject({ status: 'PENDING', team_status: 'PAYMENT_PENDING' });
  });

  test('an organizer checks and verifies the payment from a phone', async ({ browser }) => {
    const { context, page } = await person(browser, admin, phone);
    await openPayments(page, slug);
    const item = row(page, 'Pocket Team');
    await expect(item.getByText(reference)).toBeVisible();
    await expect(item.getByText('₹200')).toBeVisible();
    expect(await sideways(page)).toBeLessThanOrEqual(1);
    for (const name of ['Verify', 'Reject']) {
      const button = await item.getByRole('button', { name, exact: true }).boundingBox();
      expect(button!.height).toBeGreaterThanOrEqual(30);
    }
    await shot(page, 'p06-organizer-queue-on-a-phone');
    await item.getByRole('button', { name: 'Verify', exact: true }).tap();
    await shot(page, 'p07-organizer-confirm-on-a-phone');
    await page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).tap();
    await expect(page.getByText('Pocket Team is registered')).toBeVisible();
    expect(await sideways(page)).toBeLessThanOrEqual(1);
    await context.close();
    expect(paymentOf(slug, 'Pocket Team')).toMatchObject({ status: 'VERIFIED', team_status: 'REGISTERED' });
  });

  test('the leader\'s phone now shows an ordinary registered team', async ({ browser }) => {
    const { context, page } = await person(browser, leader, phone);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await expect(page.getByText(/Team members \(/)).toBeVisible();
    await expect(page.getByText('Waiting for the organizers')).toHaveCount(0);
    expect(await sideways(page)).toBeLessThanOrEqual(1);
    await shot(page, 'p08-registered-on-a-phone');
    await context.close();
  });

  test('edge: a rejected payment reads clearly on a phone, with tappable contacts', async ({ browser }) => {
    const other = uniqueEmail('phone2');
    helper('create_user', other, '--verified');
    const mine = await person(browser, other, phone);
    const dialog = await payAndCreate(mine.page, slug, 'Pocket Two', `${reference}-2`);
    await dialog.getByRole('button', { name: 'Pay and create team' }).tap();
    await expect(mine.page.getByText('Waiting for the organizers').first()).toBeVisible();

    const boss = await person(browser, admin, phone);
    await openPayments(boss.page, slug);
    await row(boss.page, 'Pocket Two').getByRole('button', { name: 'Reject', exact: true }).tap();
    await boss.page.getByLabel(/Why is it being rejected/).fill('Blurry screenshot');
    await boss.page.getByRole('button', { name: 'Reject payment' }).tap();
    await expect(boss.page.getByText('Pocket Two rejected')).toBeVisible();
    await boss.context.close();

    await mine.page.reload();
    await expect(mine.page.getByText('Your payment could not be verified. Please contact the club representatives.')).toBeVisible();
    await expect(mine.page.getByRole('link', { name: /\+91 90000 11111/ })).toHaveAttribute('href', 'tel:+91 90000 11111');
    expect(await sideways(mine.page)).toBeLessThanOrEqual(1);
    await shot(mine.page, 'p09-rejected-on-a-phone');
    await mine.context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// People: a member leaves a paid team, the leader withdraws
// ---------------------------------------------------------------------------------------------------------------------
test.describe('a member leaves a paid team', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = 'pay-members';
  let admin = '';
  let lead = '';
  let mate = '';
  const reference = `TEAM-${Date.now().toString(36)}`;

  test.beforeAll(() => {
    admin = uniqueEmail('boss');
    lead = uniqueEmail('lead');
    mate = uniqueEmail('mate');
    helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
    helper('create_user', lead, '--verified', '--first-name', 'Lena');
    helper('create_user', mate, '--verified', '--first-name', 'Milo');
    helper('make_payment_hackathon', slug, '--min-team-size', '2', '--title', 'Teams Of Two');
  });

  test('a verified team that is below the minimum size is forming, still paid, and may invite people', async ({ browser }) => {
    const { context, page } = await person(browser, lead);
    const dialog = await payAndCreate(page, slug, 'Pair', reference);
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Invite member/ })).toHaveCount(0);   // cannot invite while pending
    await context.close();

    const boss = await person(browser, admin);
    await verify(boss.page, slug, 'Pair');
    await boss.context.close();

    expect(teamStatus(slug, 'Pair')).toMatchObject({ status: 'FORMING', members: 1 });
    expect(paymentOf(slug, 'Pair')).toMatchObject({ status: 'VERIFIED' });
    const again = await person(browser, lead);
    await again.page.goto(`/hackathons/${slug}/dashboard`);
    await expect(again.page.getByText(/needs at least 2 members to be registered/)).toBeVisible();
    await expect(again.page.getByRole('button', { name: /Invite member/ })).toBeEnabled();
    await shot(again.page, 'm01-paid-but-forming');
    await again.context.close();
  });

  test('the leader invites a teammate, who accepts, and the team becomes registered', async ({ browser }) => {
    const { context, page } = await person(browser, lead);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await page.getByRole('button', { name: /Invite member/ }).click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('combobox').fill(mate);
    await expect(modal.getByText('Eligible to join this team')).toBeVisible();      // an exact email picks the person straight away
    await shot(page, 'm02-invite-selected');
    await modal.getByRole('button', { name: 'Send Invite' }).click();
    await expect(page.getByText(/invited|Invite sent/i).first()).toBeVisible();
    await context.close();

    const guest = await person(browser, mate);
    await guest.page.goto(`/hackathons/${slug}/dashboard`);
    await expect(guest.page.getByText('Pair')).toBeVisible();
    await expect(guest.page.getByText(/Registering costs ₹200/)).toBeVisible();   // the invited person still sees the fee for creating their own team
    await guest.page.getByRole('button', { name: /Accept/ }).click();
    await expect(guest.page.getByText(/Team members \(2\//)).toBeVisible();
    await shot(guest.page, 'm03-member-joined-paid-team');
    await guest.context.close();
    expect(teamStatus(slug, 'Pair')).toMatchObject({ status: 'REGISTERED', members: 2 });
    expect(paymentOf(slug, 'Pair')).toMatchObject({ status: 'VERIFIED' });      // the member paid nothing
  });

  test('edge: the leader cannot leave while a teammate is in; they must hand over leadership first', async ({ browser }) => {
    const { context, page } = await person(browser, lead);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await expect(page.getByText('Transfer leadership to a teammate before you can leave.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Withdraw team' })).toBeDisabled();
    await shot(page, 'm04-leader-cannot-leave');
    await context.close();
  });

  test('a member leaves: the team drops below the minimum and goes back to forming, but keeps its seat and its payment', async ({ browser }) => {
    const before = state(slug).placed_teams;
    const { context, page } = await person(browser, mate);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await page.getByRole('button', { name: 'Leave team' }).click();
    await expect(page.getByRole('dialog')).toContainText('Leave this team?');
    await shot(page, 'm05-leave-confirm');
    await page.getByRole('dialog').getByRole('button', { name: 'Leave team' }).click();
    await expect(page.getByText('You left the team')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create a team/ })).toBeVisible();
    await expect(page.getByText(/Registering costs ₹200/)).toBeVisible();    // starting their own team means paying their own fee
    await shot(page, 'm06-member-after-leaving');
    await context.close();

    expect(teamStatus(slug, 'Pair')).toMatchObject({ status: 'FORMING', members: 1 });
    expect(paymentOf(slug, 'Pair')).toMatchObject({ status: 'VERIFIED', team_exists: true });
    expect(state(slug).placed_teams).toBe(before);                           // the seat is still held

    const leader = await person(browser, lead);
    await leader.page.goto(`/hackathons/${slug}/dashboard`);
    await expect(leader.page.getByText(/needs at least 2 members to be registered: 1 more to go/)).toBeVisible();
    await expect(leader.page.getByRole('button', { name: /Invite member/ })).toBeEnabled();
    await shot(leader.page, 'm07-leader-after-member-left');
    await leader.context.close();
  });

  test('a member who left can pay for a team of their own with a fresh transaction ID', async ({ browser }) => {
    const { context, page } = await person(browser, mate);
    const dialog = await payAndCreate(page, slug, 'Solo Milo', `${reference}-milo`);
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
    await context.close();
    expect(paymentOf(slug, 'Solo Milo')).toMatchObject({ status: 'PENDING' });
  });

  test('the leader withdraws the forming team: it is gone at once, the payment record stays, and the money is flagged to settle', async ({ browser }) => {
    const { context, page } = await person(browser, lead);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await page.getByRole('button', { name: 'Withdraw team' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('You are the only member');
    await modal.getByLabel(/Why are you withdrawing/).fill('Our teammate left and we cannot find another');
    await shot(page, 'm08-withdraw-modal');
    await modal.getByRole('button', { name: 'Withdraw team' }).click();
    await expect(page.getByText('Team withdrawn')).toBeVisible();
    await context.close();

    expect(teamStatus(slug, 'Pair')).toMatchObject({ status: 'WITHDRAWN' });
    expect(paymentOf(slug, 'Pair')).toMatchObject({ status: 'VERIFIED', team_status: 'WITHDRAWN' });

    const boss = await person(browser, admin);
    await openPayments(boss.page, slug);
    await boss.page.getByRole('button', { name: 'Export payments' }).click();
    const [download] = await Promise.all([boss.page.waitForEvent('download'), boss.page.getByRole('menuitem', { name: /CSV/ }).click()]);
    const csv = (await import('node:fs')).readFileSync(await download.path(), 'utf-8');
    const line = csv.split(/\r?\n/).find((l) => l.includes('Pair') && l.includes(reference))!;
    expect(line).toContain('WITHDRAWN');
    expect(line.trim().endsWith('Yes')).toBe(true);                          // paid, then the team withdrew: the club has money to settle
    await boss.context.close();
  });

  test('edge: after withdrawing, the leader must wait a few minutes and pays again for any new team', async ({ browser }) => {
    const { context, page } = await person(browser, lead);
    const dialog = await payAndCreate(page, slug, 'Pair Again', `${reference}-again`);
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(dialog.getByText(/withdrew a team a moment ago/)).toBeVisible();
    await shot(page, 'm09-cooldown-after-withdrawing');
    expect(teamStatus(slug, 'Pair Again').exists).toBe(false);
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// A registered team that holds a seat cannot simply disappear
// ---------------------------------------------------------------------------------------------------------------------
test.describe('withdrawing a team that holds a place', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = 'pay-approve';
  let admin = '';
  let lead = '';
  const reference = `HOLD-${Date.now().toString(36)}`;

  test.beforeAll(() => {
    admin = uniqueEmail('boss');
    lead = uniqueEmail('holder');
    helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
    helper('create_user', lead, '--verified');
    helper('make_payment_hackathon', slug, '--title', 'Seat Holder');
  });

  test('a paid, registered team asks to withdraw, and stays until an organizer decides', async ({ browser }) => {
    const { context, page } = await person(browser, lead);
    const dialog = await payAndCreate(page, slug, 'Holders', reference);
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
    await context.close();
    const boss = await person(browser, admin);
    await verify(boss.page, slug, 'Holders');
    await boss.context.close();

    const leader = await person(browser, lead);
    await leader.page.goto(`/hackathons/${slug}/dashboard`);
    await leader.page.getByRole('button', { name: 'Withdraw team' }).click();
    const modal = leader.page.getByRole('dialog');
    await expect(modal).toContainText('the organizers have to approve this');
    await modal.getByLabel(/Why are you withdrawing/).fill('We chose another event');
    await modal.getByRole('button', { name: 'Ask to withdraw' }).click();
    await expect(leader.page.getByText('Withdrawal requested, waiting for the organizers')).toBeVisible();
    await shot(leader.page, 'w01-withdrawal-requested');
    await leader.context.close();
    expect(teamStatus(slug, 'Holders')).toMatchObject({ status: 'REGISTERED' });   // nothing changed yet
  });

  test('the organizer approves, the seat is freed, and the paid record is flagged to settle', async ({ browser }) => {
    const { context, page } = await person(browser, admin);
    await page.goto(`/admin/hackathons/${slug}?tab=teams`);
    await expect(page.getByRole('region', { name: 'Withdrawals' })).toContainText('Holders');
    await shot(page, 'w02-admin-withdrawals');
    await page.getByRole('region', { name: 'Withdrawals' }).getByRole('button', { name: 'Approve withdrawal' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Withdraw the team' }).click();
    await expect(page.getByRole('region', { name: 'Withdrawals' })).not.toContainText('Approve withdrawal');
    await context.close();
    expect(teamStatus(slug, 'Holders')).toMatchObject({ status: 'WITHDRAWN' });
    expect(paymentOf(slug, 'Holders')).toMatchObject({ status: 'VERIFIED', team_status: 'WITHDRAWN' });
    expect(state(slug).placed_teams).toBe(0);
  });
});
