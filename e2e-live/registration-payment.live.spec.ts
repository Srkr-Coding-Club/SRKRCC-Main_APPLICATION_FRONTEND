import { mkdirSync, readFileSync } from 'node:fs';
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { SITE_URL, helper, signIn, stateDir, uniqueEmail } from './live';
import { join } from 'node:path';

/**
 * Paying the fee when a team is created, end to end: the real backend, the real site, a real S3 API (moto).
 * Run it where you can watch:  LIVE_SLOWMO=500 LIVE_VIDEO=1 pnpm test:e2e:live --headed e2e-live/registration-payment.live.spec.ts
 * Screenshots of every key moment are written to test-results/live/payments/.
 */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SHOTS = join(stateDir, 'payments');

interface PaymentRow { team: string; team_exists: boolean; team_status: string | null; waitlisted: boolean | null; status: string; reason: string; amount: number; txn: string; leader_email: string; reviewed_by: string | null; screenshot: string | null; reminded: boolean }
interface PaymentState { payments: PaymentRow[]; placed_teams: number; teams: number }
const state = (slug: string) => helper<PaymentState>('payments_state', slug);
const paymentOf = (slug: string, team: string) => state(slug).payments.find((p) => p.team === team);
const notifications = (email: string) => helper<{ title: string; message: string }[]>('notifications', email);

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

async function person(browser: Browser, email: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: SITE_URL, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await signIn(page, email);
  return { context, page };
}

/** The leader's part: open "Create a team", fill the team, add the payment and press the button. Leaves the dialog open. */
async function payAndCreate(page: Page, slug: string, team: string, reference: string, file: { name: string; mimeType: string; buffer: Buffer } = { name: 'upi-payment.png', mimeType: 'image/png', buffer: PNG }): Promise<Locator> {
  await page.goto(`/hackathons/${slug}/dashboard`);
  await page.getByRole('button', { name: /Create a team/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Team name/).fill(team);
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog.getByText(/Pay ₹\d+ to register your team/)).toBeVisible();
  await dialog.locator('input[type="file"]').setInputFiles(file);
  await dialog.getByLabel(/Transaction ID/).fill(reference);
  return dialog;
}

const row = (page: Page, team: string) => page.getByRole('listitem').filter({ hasText: team }).first();
const openPayments = async (page: Page, slug: string) => {
  await page.goto(`/admin/hackathons/${slug}?tab=payments`);
  await expect(page.getByRole('heading', { name: 'Registration payments', exact: false })).toBeVisible();
};

// ---------------------------------------------------------------------------------------------------------------------
// 1. The organizer sets it up
// ---------------------------------------------------------------------------------------------------------------------
test.describe('the organizer sets the fee', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = 'pay-setup';
  let admin = '';

  test.beforeAll(() => {
    admin = uniqueEmail('boss');
    helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
    helper('make_payment_hackathon', slug, '--stage', 'NONE', '--title', 'Setup Check');
  });

  test('chooses when teams pay, the amount, the note and uploads the QR code', async ({ page }) => {
    await signIn(page, admin);
    await page.goto(`/admin/hackathons/${slug}?tab=payments`);
    const form = page.getByRole('form', { name: 'Payment settings' });
    await expect(page.getByText(/No fee is collected/)).toBeVisible();
    await shot(page, '01-no-fee-yet');

    await form.getByRole('button', { name: /When teams pay/ }).click();
    await page.getByRole('option', { name: /Paid when the team is created/ }).click();
    await form.getByLabel(/Amount/).fill('200');
    await form.getByLabel('How to pay').fill('Pay ₹200 to UPI: club@upi');
    await form.getByRole('button', { name: 'Save fee settings' }).click();
    await expect(page.getByText('Payment settings saved').first()).toBeVisible();

    await form.locator('input[type=file]').setInputFiles({ name: 'club-upi-qr.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByAltText('Payment QR code')).toBeVisible();
    await expect.poll(() => page.getByAltText('Payment QR code').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 30_000 }).toBe(true);
    await expect(page.getByText('Registration payments')).toBeVisible();
    await shot(page, '02-fee-and-qr-saved');
  });

  test('edge: an amount of 0 means nothing to pay, and it can be set back', async ({ page }) => {
    await signIn(page, admin);
    await page.goto(`/admin/hackathons/${slug}?tab=payments`);
    const form = page.getByRole('form', { name: 'Payment settings' });
    await form.getByLabel(/Amount/).fill('0');
    await form.getByRole('button', { name: 'Save fee settings' }).click();
    await expect(page.getByText('Payment settings saved').first()).toBeVisible();
    await form.getByLabel(/Amount/).fill('200');
    await form.getByRole('button', { name: 'Save fee settings' }).click();
    await expect(page.getByText('Payment settings saved').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// 2. The leader pays: validation, edge cases, the pending state
// ---------------------------------------------------------------------------------------------------------------------
test.describe('the leader pays when creating the team', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = 'pay-main';
  let admin = '';
  let leaderA = '';
  let leaderB = '';
  const refA = `UPI-${Date.now().toString(36)}-A`;

  test.beforeAll(() => {
    admin = uniqueEmail('boss');
    leaderA = uniqueEmail('asha');
    leaderB = uniqueEmail('bo');
    helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
    helper('create_user', leaderA, '--verified');
    helper('create_user', leaderB, '--verified');
    helper('make_payment_hackathon', slug);
  });

  test('edge: nothing is created without the screenshot and the transaction ID', async ({ browser }) => {
    const { context, page } = await person(browser, leaderA);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await expect(page.getByText(/Registering costs ₹200/)).toBeVisible();
    await page.getByRole('button', { name: /Create a team/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Team name/).fill('Alpha');
    await dialog.getByRole('button', { name: 'Next' }).click();
    await expect(dialog.getByText('Pay ₹200 to register your team')).toBeVisible();
    await expect(dialog.getByText('Pay to UPI: club@upi and keep the screenshot.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(dialog.getByText('Upload the screenshot of your payment.')).toBeVisible();
    await expect(dialog.getByText('Enter the transaction ID of your payment.')).toBeVisible();
    await shot(page, '10-payment-step-errors');
    expect(state(slug).teams).toBe(0);
    await context.close();
  });

  test('edge: a file that is not an image is refused by the picker', async ({ browser }) => {
    const { context, page } = await person(browser, leaderA);
    const dialog = await payAndCreate(page, slug, 'Alpha', refA, { name: 'receipt.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await expect(dialog.getByText(/png|jpg|jpeg|webp|not allowed|must be/i).first()).toBeVisible();
    await shot(page, '11-wrong-file-type');
    expect(state(slug).teams).toBe(0);
    await context.close();
  });

  test('a good payment creates a team that waits, holds no seat and shows what was sent', async ({ browser }) => {
    const { context, page } = await person(browser, leaderA);
    const dialog = await payAndCreate(page, slug, 'Alpha', refA);
    await expect(dialog.getByText('upi-payment.png').first()).toBeVisible();
    await shot(page, '12-payment-step-filled');
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();

    await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
    await expect(page.getByText('Payment pending').first()).toBeVisible();
    await expect(page.getByText(refA)).toBeVisible();
    await expect(page.getByText('₹200').first()).toBeVisible();
    await expect(page.getByText(/Team members \(/)).toHaveCount(0);        // not a team with a member list yet
    await expect(page.getByText('Idea and project submission')).toHaveCount(0);
    await shot(page, '13-pending');

    const payment = paymentOf(slug, 'Alpha')!;
    expect(payment).toMatchObject({ status: 'PENDING', team_status: 'PAYMENT_PENDING', amount: 200, txn: refA, screenshot: 'ATTACHED' });
    expect(state(slug).placed_teams).toBe(0);                               // no seat taken
    await context.close();
  });

  test('every new payment sends the organizers a notification', async () => {
    const mine = notifications(admin).filter((n) => n.title === 'New payment to check: Alpha');
    expect(mine).toHaveLength(1);
    expect(mine[0].message).toContain('Payments tab');
  });

  test('edge: the same transaction ID cannot be used by another team, whatever its spacing or case', async ({ browser }) => {
    const { context, page } = await person(browser, leaderB);
    const dialog = await payAndCreate(page, slug, 'Bravo', refA.toLowerCase().replace(/-/g, ' - '));
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(dialog.getByText(/already been used/)).toBeVisible();
    await expect(dialog.getByLabel(/Transaction ID/)).toHaveValue(refA.toLowerCase().replace(/-/g, ' - '));  // what was typed is kept
    await shot(page, '14-duplicate-transaction-id');
    expect(state(slug).teams).toBe(1);
    await context.close();
  });

  test('edge: a pending leader cannot start a second team or reach the idea phase', async ({ browser }) => {
    const { context, page } = await person(browser, leaderA);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await expect(page.getByRole('button', { name: /Create a team/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Invite member/ })).toHaveCount(0);
    await expect(page.getByText('Submit idea')).toHaveCount(0);
    await context.close();
  });

  test('the organizer sees the payment with everything needed to decide, and the leader\'s contacts', async ({ browser }) => {
    const { context, page } = await person(browser, admin);
    await openPayments(page, slug);
    const item = row(page, 'Alpha');
    await expect(item.getByText(refA)).toBeVisible();
    await expect(item.getByText('₹200')).toBeVisible();
    await expect(item.getByRole('link', { name: new RegExp(leaderA.replace('.', '\\.')) })).toBeVisible();
    await expect(item.getByText('upi-payment.png')).toBeVisible();
    await expect(page.getByText(/1 to check/)).toBeVisible();
    await shot(page, '15-admin-queue');
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// 3. Verify, reject, reopen, remove, cancel, export
// ---------------------------------------------------------------------------------------------------------------------
test.describe('the organizer decides', () => {
  test.describe.configure({ mode: 'serial' });
  const slug = 'pay-decide';
  const refs = { verify: `V-${Date.now().toString(36)}`, reject: `R-${Date.now().toString(36)}`, cancel: `C-${Date.now().toString(36)}`, remove: `X-${Date.now().toString(36)}` };
  let admin = '';
  const leaders: Record<string, string> = {};

  test.beforeAll(async () => {
    admin = uniqueEmail('boss');
    helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
    helper('make_payment_hackathon', slug);
    for (const name of ['Verified', 'Rejected', 'Cancelled', 'Removed']) {
      leaders[name] = uniqueEmail(name.toLowerCase());
      helper('create_user', leaders[name], '--verified');
    }
  });

  test('four leaders pay', async ({ browser }) => {
    for (const [name, key] of [['Verified', 'verify'], ['Rejected', 'reject'], ['Cancelled', 'cancel'], ['Removed', 'remove']] as const) {
      const { context, page } = await person(browser, leaders[name]);
      const dialog = await payAndCreate(page, slug, `Team ${name}`, refs[key]);
      await dialog.getByRole('button', { name: 'Pay and create team' }).click();
      await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
      await context.close();
    }
    expect(state(slug).payments).toHaveLength(4);
    expect(state(slug).placed_teams).toBe(0);
  });

  test('verifying registers the team and the leader sees a normal team page', async ({ browser }) => {
    const { context, page } = await person(browser, admin);
    await openPayments(page, slug);
    await row(page, 'Team Verified').getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('The team is registered');
    await page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
    await expect(page.getByText('Team Verified is registered')).toBeVisible();
    await expect(row(page, 'Team Verified')).toHaveCount(0);               // gone from "to check"
    await page.getByRole('tab', { name: /Verified/ }).click();
    await expect(page.getByText(/Verified by/)).toBeVisible();
    await expect(row(page, 'Team Verified').getByRole('button', { name: /Remove team/ })).toHaveCount(0);   // a placed team is not removed from here
    await shot(page, '20-verified');
    await context.close();

    expect(paymentOf(slug, 'Team Verified')).toMatchObject({ status: 'VERIFIED', team_status: 'REGISTERED', waitlisted: false });
    expect(state(slug).placed_teams).toBe(1);
    const leader = await person(browser, leaders.Verified);
    await leader.page.goto(`/hackathons/${slug}/dashboard`);
    await expect(leader.page.getByText(/Team members \(/)).toBeVisible();
    await expect(leader.page.getByText('Waiting for the organizers')).toHaveCount(0);
    await expect(leader.page.getByText('Registered').first()).toBeVisible();
    await shot(leader.page, '21-leader-after-verify');
    await leader.context.close();
    expect(notifications(leaders.Verified).some((n) => n.title.includes('payment verified'))).toBe(true);
  });

  test('rejecting keeps the reason for organizers; the leader is told to contact the club, never about a refund', async ({ browser }) => {
    const { context, page } = await person(browser, admin);
    await openPayments(page, slug);
    await row(page, 'Team Rejected').getByRole('button', { name: 'Reject', exact: true }).click();
    await page.getByLabel(/Why is it being rejected/).fill('Amount does not match the bank statement');
    await shot(page, '22-reject-reason');
    await page.getByRole('button', { name: 'Reject payment' }).click();
    await expect(page.getByText('Team Rejected rejected')).toBeVisible();
    await page.getByRole('tab', { name: /Rejected/ }).click();
    await expect(page.getByText(/Reason \(only organizers see this\): Amount does not match/)).toBeVisible();
    await context.close();

    const leader = await person(browser, leaders.Rejected);
    await leader.page.goto(`/hackathons/${slug}/dashboard`);
    await expect(leader.page.getByText('Your payment could not be verified. Please contact the club representatives.')).toBeVisible();
    await expect(leader.page.getByRole('list', { name: 'Club representatives' }).getByText('Ravi Kumar')).toBeVisible();
    await expect(leader.page.getByRole('link', { name: /ravi@club.org/ })).toBeVisible();
    const text = (await leader.page.locator('body').innerText()).toLowerCase();
    expect(text).not.toContain('refund');
    expect(text).not.toContain('bank statement');                          // the organizers' reason stays with them
    await expect(leader.page.getByRole('button', { name: 'Cancel and start again' })).toHaveCount(0);
    await expect(leader.page.getByRole('button', { name: /Create a team/ })).toHaveCount(0);   // still "in a team": cannot start another
    await shot(leader.page, '23-leader-rejected');
    await leader.context.close();

    const notice = notifications(leaders.Rejected).find((n) => n.title.includes('could not be verified'));
    expect(notice?.message).toContain('contact the club representatives');
    expect(notice?.message.toLowerCase()).not.toContain('refund');
    expect(notice?.message).not.toContain('bank statement');
  });

  test('reopening puts it back in the queue, and it can then be verified', async ({ browser }) => {
    const { context, page } = await person(browser, admin);
    await openPayments(page, slug);
    await page.getByRole('tab', { name: /Rejected/ }).click();
    await row(page, 'Team Rejected').getByRole('button', { name: /Reopen/ }).click();
    await page.getByRole('tab', { name: /To check/ }).click();       // switching tabs while the reopen is still going must not lose the row
    await expect(row(page, 'Team Rejected').getByRole('button', { name: 'Verify', exact: true })).toBeVisible();
    await shot(page, '24-reopened');
    await row(page, 'Team Rejected').getByRole('button', { name: 'Verify', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
    await expect(page.getByText('Team Rejected is registered')).toBeVisible();
    await context.close();
    expect(paymentOf(slug, 'Team Rejected')).toMatchObject({ status: 'VERIFIED', team_status: 'REGISTERED' });
  });

  test('a leader can cancel a pending team, and pay again with the same transaction ID', async ({ browser }) => {
    const { context, page } = await person(browser, leaders.Cancelled);
    await page.goto(`/hackathons/${slug}/dashboard`);
    await page.getByRole('button', { name: 'Cancel and start again' }).click();
    await expect(page.getByRole('dialog')).toContainText('Cancel this registration?');
    await shot(page, '25-cancel-confirm');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel registration' }).click();
    await expect(page.getByRole('button', { name: /Create a team/ })).toBeVisible();
    expect(paymentOf(slug, 'Team Cancelled')).toMatchObject({ status: 'CANCELLED', team_exists: false });   // the record stays for the club

    const dialog = await payAndCreate(page, slug, 'Team Cancelled Again', refs.cancel);                  // the reference was freed
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
    await context.close();
    expect(paymentOf(slug, 'Team Cancelled Again')).toMatchObject({ status: 'PENDING' });
  });

  test('removing a team frees the leader to start again, and the record stays for the money to be settled', async ({ browser }) => {
    const { context, page } = await person(browser, admin);
    await openPayments(page, slug);
    await row(page, 'Team Removed').getByRole('button', { name: /Remove team/ }).click();
    await expect(page.getByRole('dialog')).toContainText('transaction ID can be used again');
    await page.getByRole('dialog').getByRole('button', { name: 'Remove team' }).click();
    await expect(page.getByText('Team Removed removed')).toBeVisible();
    await shot(page, '26-removed');
    await context.close();
    expect(paymentOf(slug, 'Team Removed')).toMatchObject({ status: 'REMOVED', team_exists: false });

    const leader = await person(browser, leaders.Removed);
    await leader.page.goto(`/hackathons/${slug}/dashboard`);
    await expect(leader.page.getByRole('button', { name: /Create a team/ })).toBeVisible();
    await leader.context.close();
    expect(notifications(leaders.Removed).some((n) => n.message.includes('contact the club representatives'))).toBe(true);
  });

  test('the payments export lists every payment, including deleted teams, with the money to settle', async ({ browser }) => {
    const { context, page } = await person(browser, admin);
    await openPayments(page, slug);
    await page.getByRole('button', { name: 'Export payments' }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /CSV/ }).click()]);
    expect(download.suggestedFilename()).toMatch(/payments.*\.csv$/);
    const csv = readFileSync(await download.path(), 'utf-8');
    const header = csv.split(/\r?\n/)[0];
    for (const column of ['Team', 'Leader Email', 'Amount', 'Transaction ID', 'Payment Status', 'Reviewed By', 'Reason', 'Money To Settle']) expect(header).toContain(column);
    expect(csv).toContain('Team Removed');
    expect(csv).toContain('Team Cancelled');
    expect(csv).toContain('Removed by an organizer');
    expect(csv).toContain('Cancelled by the leader');
    const removed = csv.split(/\r?\n/).find((line) => line.includes('Team Removed'))!;
    expect(removed).toContain('Yes');                                       // money to settle
    const verified = csv.split(/\r?\n/).find((line) => line.includes('Team Verified'))!;
    expect(verified.trim().endsWith('No')).toBe(true);
    await shot(page, '27-export-menu');
    await context.close();
  });

  test('edge: two organizers open the same payment, and the second one is told who already handled it', async ({ browser }) => {
    const second = uniqueEmail('second-boss');
    helper('create_user', second, '--verified', '--staff', '--role', 'ADMIN');
    const guest = uniqueEmail('late');
    helper('create_user', guest, '--verified');
    const leader = await person(browser, guest);
    const dialog = await payAndCreate(leader.page, slug, 'Team Race', `RACE-${Date.now().toString(36)}`);
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(leader.page.getByText('Waiting for the organizers').first()).toBeVisible();
    await leader.context.close();

    const first = await person(browser, admin);
    const other = await person(browser, second);
    await openPayments(first.page, slug);
    await openPayments(other.page, slug);
    await expect(row(first.page, 'Team Race')).toBeVisible();
    await expect(row(other.page, 'Team Race')).toBeVisible();
    await row(first.page, 'Team Race').getByRole('button', { name: 'Verify', exact: true }).click();
    await first.page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
    await expect(first.page.getByText('Team Race is registered')).toBeVisible();

    await row(other.page, 'Team Race').getByRole('button', { name: 'Verify', exact: true }).click();     // the page is stale: it still shows it waiting
    await other.page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
    await expect(other.page.getByText(/already verified by/)).toBeVisible();
    await shot(other.page, '28-second-organizer-told');
    await first.context.close();
    await other.context.close();
    expect(paymentOf(slug, 'Team Race')).toMatchObject({ status: 'VERIFIED' });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// 4. Seats: nothing is held until verified
// ---------------------------------------------------------------------------------------------------------------------
test.describe('seats are decided when the payment is verified', () => {
  test.describe.configure({ mode: 'serial' });
  const slugWl = 'pay-full-wl';
  const slugNo = 'pay-full-nowl';
  let admin = '';
  const leaders = { a: uniqueEmail('lea'), b: uniqueEmail('leb'), c: uniqueEmail('lec'), d: uniqueEmail('led') };

  test.beforeAll(() => {
    admin = uniqueEmail('boss');
    helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
    for (const email of Object.values(leaders)) helper('create_user', email, '--verified');
    helper('make_payment_hackathon', slugWl, '--max-teams', '1', '--waitlist', '--title', 'One Seat With Waitlist');
    helper('make_payment_hackathon', slugNo, '--max-teams', '1', '--title', 'One Seat No Waitlist');
  });

  test('with a waitlist: both teams can pay, the first verified is placed and the second is waitlisted', async ({ browser }) => {
    for (const [email, team, ref] of [[leaders.a, 'Seat One', 'WL-1'], [leaders.b, 'Seat Two', 'WL-2']] as const) {
      const { context, page } = await person(browser, email);
      const dialog = await payAndCreate(page, slugWl, team, `${ref}-${Date.now().toString(36)}`);
      await dialog.getByRole('button', { name: 'Pay and create team' }).click();
      await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
      await context.close();
    }
    expect(state(slugWl).placed_teams).toBe(0);                             // two payments, still no seat taken

    const { context, page } = await person(browser, admin);
    await openPayments(page, slugWl);
    for (const team of ['Seat One', 'Seat Two']) {
      await row(page, team).getByRole('button', { name: 'Verify', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
      await expect(page.getByText(`${team} is registered`)).toBeVisible();
    }
    await shot(page, '30-two-verified-one-seat');
    await context.close();
    expect(paymentOf(slugWl, 'Seat One')).toMatchObject({ team_status: 'REGISTERED', waitlisted: false });
    expect(paymentOf(slugWl, 'Seat Two')).toMatchObject({ team_status: 'REGISTERED', waitlisted: true });
    expect(state(slugWl).placed_teams).toBe(1);

    const second = await person(browser, leaders.b);
    await second.page.goto(`/hackathons/${slugWl}/dashboard`);
    await expect(second.page.getByText(/The hackathon is full. Your team is in the queue/)).toBeVisible();
    await shot(second.page, '31-leader-waitlisted-after-paying');
    await second.context.close();
  });

  test('without a waitlist: verifying the second team is blocked, it stays pending, and the organizer can reject it', async ({ browser }) => {
    for (const [email, team, ref] of [[leaders.c, 'Fast', 'NW-1'], [leaders.d, 'Slow', 'NW-2']] as const) {
      const { context, page } = await person(browser, email);
      const dialog = await payAndCreate(page, slugNo, team, `${ref}-${Date.now().toString(36)}`);
      await dialog.getByRole('button', { name: 'Pay and create team' }).click();
      await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
      await context.close();
    }
    const { context, page } = await person(browser, admin);
    await openPayments(page, slugNo);
    await row(page, 'Fast').getByRole('button', { name: 'Verify', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
    await expect(page.getByText('Fast is registered')).toBeVisible();

    await row(page, 'Slow').getByRole('button', { name: 'Verify', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
    await expect(page.getByText(/No seats are left and the waitlist is off/)).toBeVisible();
    await expect(row(page, 'Slow')).toBeVisible();                           // still in the queue
    await shot(page, '32-no-seats-blocked');
    expect(paymentOf(slugNo, 'Slow')).toMatchObject({ status: 'PENDING', team_status: 'PAYMENT_PENDING' });

    await row(page, 'Slow').getByRole('button', { name: 'Reject', exact: true }).click();
    await page.getByLabel(/Why is it being rejected/).fill('No seat left');
    await page.getByRole('button', { name: 'Reject payment' }).click();
    await expect(page.getByText('Slow rejected')).toBeVisible();
    await context.close();
    expect(state(slugNo).placed_teams).toBe(1);
  });

  test('edge: a hackathon that filled up before anyone paid refuses before taking a payment', async ({ browser }) => {
    const slug = 'pay-already-full';
    const late = uniqueEmail('late');
    helper('create_user', late, '--verified');
    helper('make_payment_hackathon', slug, '--max-teams', '1', '--title', 'Already Full');
    helper('fill_seats', slug, '--count', '1');
    const { context, page } = await person(browser, late);
    const dialog = await payAndCreate(page, slug, 'Too Late', `FULL-${Date.now().toString(36)}`);
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(dialog.getByText(/hackathon is full/i)).toBeVisible();
    await shot(page, '33-already-full');
    expect(state(slug).payments).toHaveLength(0);
    expect(helper<{ exists: boolean }>('team_status', slug, 'Too Late').exists).toBe(false);
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// 5. Reminders, and hackathons that do not use this
// ---------------------------------------------------------------------------------------------------------------------
test.describe('reminders and other hackathons', () => {
  test.describe.configure({ mode: 'serial' });
  test('a payment waiting more than a day reminds the organizers once a day', async ({ browser }) => {
    const slug = 'pay-reminder';
    const admin = uniqueEmail('boss');
    const leader = uniqueEmail('slow');
    helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
    helper('create_user', leader, '--verified');
    helper('make_payment_hackathon', slug, '--title', 'Reminder Check');
    const { context, page } = await person(browser, leader);
    const dialog = await payAndCreate(page, slug, 'Forgotten', `REM-${Date.now().toString(36)}`);
    await dialog.getByRole('button', { name: 'Pay and create team' }).click();
    await expect(page.getByText('Waiting for the organizers').first()).toBeVisible();
    await context.close();

    expect(helper<{ mentioned: number }>('run_reminders').mentioned).toBe(0);           // it has only just arrived
    helper('age_payments', slug, '--hours', '30');
    expect(helper<{ mentioned: number }>('run_reminders').mentioned).toBe(1);
    expect(helper<{ mentioned: number }>('run_reminders').mentioned).toBe(0);           // already told today
    const note = notifications(admin).find((n) => n.title.includes('waiting for a check'));
    expect(note?.message).toContain('more than a day');
    expect(paymentOf(slug, 'Forgotten')?.reminded).toBe(true);
  });

  test('edge: a hackathon with no fee, or with the fee paid with the idea, asks for no payment when creating a team', async ({ browser }) => {
    for (const [slug, stage] of [['pay-none', 'NONE'], ['pay-idea', 'IDEA']] as const) {
      const leader = uniqueEmail('free');
      helper('create_user', leader, '--verified');
      helper('make_payment_hackathon', slug, '--stage', stage, '--title', `Stage ${stage}`);
      const { context, page } = await person(browser, leader);
      await page.goto(`/hackathons/${slug}/dashboard`);
      await page.getByRole('button', { name: /Create a team/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel(/Team name/).fill(`Free ${stage}`);
      await expect(dialog.getByRole('list', { name: 'Progress' })).toHaveCount(0);
      await expect(dialog.getByText(/Pay ₹/)).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Create team' }).click();
      await expect(page.getByText(/Team members \(/)).toBeVisible();                 // registered straight away
      await shot(page, `40-no-payment-${stage.toLowerCase()}`);
      await context.close();
    }
    expect(state('pay-none').placed_teams).toBe(1);
    expect(state('pay-idea').payments).toHaveLength(0);
  });
});
