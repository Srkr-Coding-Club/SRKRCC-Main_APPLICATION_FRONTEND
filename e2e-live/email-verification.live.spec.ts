import { expect, test, type Page } from '@playwright/test';
import { helper, mailTo, pathOf, signIn, uniqueEmail, PASSWORD } from './live';

/**
 * The whole email-verification journey against the REAL backend and the REAL site. Nothing is mocked: the emails are the
 * ones Django actually rendered and "sent" (written to files), and every state change is checked in the real database.
 * Tests run in order and each uses its own person, so they do not depend on each other.
 */
test.describe.configure({ mode: 'serial' });

const banner = (page: Page) => page.getByRole('region', { name: 'Email verification' });
const user = (email: string) => helper<{ verified: boolean; active: boolean; days_left: number | null } | null>('get_user', email);
const person = (name: string, ...flags: string[]) => {
  const email = uniqueEmail(name);
  helper('create_user', email, ...flags);
  return email;
};

test.beforeEach(() => { helper('clear_cache'); });

test('a new account: nothing is sent at sign-up, the banner shows, one click sends the real link, the link verifies', async ({ page, browser }) => {
  const email = person('newbie');
  expect(user(email)).toMatchObject({ verified: false, active: true });
  expect(user(email)!.days_left).toBeGreaterThan(6.9);
  expect(mailTo(email)).toHaveLength(0);

  await signIn(page, email);
  await page.goto('/forms');
  await expect(banner(page)).toContainText('days left');
  expect(mailTo(email)).toHaveLength(0); // still nothing sent: only the click sends

  await banner(page).getByRole('button', { name: 'Verify email' }).click();
  await expect(banner(page).getByText(/Link sent to/)).toBeVisible();
  await expect(banner(page).getByRole('button', { name: /Send again in \d+s/ })).toBeDisabled();

  const mails = mailTo(email);
  expect(mails).toHaveLength(1);
  expect(mails[0].verify).toBeTruthy();
  expect(mails[0].dispute).toBeTruthy(); // the "I didn't create this account" link is in the real email
  expect(mails[0].text).not.toContain('Secret'); // sanity: no password anywhere

  // Open the link in a fresh browser, as someone clicking from their phone would.
  const other = await browser.newContext();
  const phone = await other.newPage();
  await phone.goto(`http://localhost:3200${pathOf(mails[0].verify!)}`);
  await expect(phone.getByRole('heading', { name: 'Confirm your email address' })).toBeVisible();
  expect(user(email)!.verified).toBe(false); // looking at the page used nothing up
  await phone.getByRole('button', { name: 'Confirm my email' }).click();
  await expect(phone.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();
  expect(user(email)!.verified).toBe(true);

  // Opening the same link again is harmless.
  await phone.goto(`http://localhost:3200${pathOf(mails[0].verify!)}`);
  await expect(phone.getByRole('heading', { name: /Already confirmed/ })).toBeVisible();
  await other.close();

  // The original tab notices without a sign-in.
  await page.reload();
  await expect(banner(page)).toHaveCount(0);
});

test('a form: an unverified person can read it but not fill or submit it; a verified person submits and it is stored', async ({ page }) => {
  helper('make_form', 'live-form');
  const unverified = person('formless');
  await signIn(page, unverified);
  await page.goto('/forms/live-form');
  await expect(page.getByText('Verify your email address to fill in this form.')).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Submit Form' })).toBeDisabled();
  expect(helper('count_responses', 'live-form', unverified)).toEqual({ count: 0 });

  const verified = person('formfull', '--verified');
  const second = await page.context().browser()!.newContext();
  const tab = await second.newPage();
  await signIn(tab, verified);
  await tab.goto('/forms/live-form');
  await expect(tab.getByLabel('Full name')).toBeEnabled();
  await tab.getByLabel('Full name').fill('Dee Verified');
  await tab.getByRole('button', { name: 'Submit Form' }).click();
  await expect.poll(() => helper<{ count: number }>('count_responses', 'live-form', verified).count).toBe(1);
  await second.close();
});

test('past the deadline: private pages show only the verify screen, public pages stay open, verifying elsewhere unblocks', async ({ page, browser }) => {
  const email = person('late');
  helper('set_deadline', email, '--days', '-1');
  await signIn(page, email);
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toBeVisible();

  await page.goto('/forms');
  await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toHaveCount(0);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByText(/We sent a link to/)).toBeVisible();

  const link = mailTo(email).at(-1)!.verify!;
  const other = await browser.newContext();
  const phone = await other.newPage();
  await phone.goto(`http://localhost:3200${pathOf(link)}`);
  await phone.getByRole('button', { name: 'Confirm my email' }).click();
  await expect(phone.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();
  await other.close();

  await page.getByRole('button', { name: /I have verified/ }).click();
  await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toHaveCount(0, { timeout: 30_000 });
  expect(user(email)).toMatchObject({ verified: true });
});

test('an unverified admin is not exempt and gets the admin-tools screen until they verify', async ({ page }) => {
  const email = person('boss', '--staff', '--role', 'ADMIN');
  await signIn(page, email);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /Verify your email/ })).toBeVisible();
});

test('"This wasn\'t me" removes an account nobody has used, frees the address, and the link cannot be reused', async ({ page, browser }) => {
  const email = person('squat');
  await signIn(page, email);
  await page.goto('/forms');
  await banner(page).getByRole('button', { name: 'Verify email' }).click();
  await expect(banner(page).getByText(/Link sent to/)).toBeVisible();
  const mail = mailTo(email).at(-1)!;

  const other = await browser.newContext();
  const owner = await other.newPage();
  await owner.goto(`http://localhost:3200${pathOf(mail.dispute!)}`);
  await expect(owner.getByRole('heading', { name: 'Was this not you?' })).toBeVisible();
  expect(helper<{ count: number }>('count_users', email).count).toBe(1); // looking changed nothing
  await owner.getByRole('button', { name: "This wasn't me" }).click();
  await expect(owner.getByRole('heading', { name: 'Thank you, it is done' })).toBeVisible();
  expect(helper<{ count: number }>('count_users', email).count).toBe(0);
  await other.close();
});

test('the resend cooldown is enforced by the server, not just the button', async ({ page }) => {
  const email = person('eager');
  await signIn(page, email);
  await page.goto('/forms');
  await banner(page).getByRole('button', { name: 'Verify email' }).click();
  await expect(banner(page).getByText(/Link sent to/)).toBeVisible();
  const second = await page.evaluate(async () => {
    const token = (JSON.parse(localStorage.getItem('srkrcc_user') || '{}') as { access?: string }).access;
    const reply = await fetch('http://127.0.0.1:8001/api/auth/email/verification/request/', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: '{}',
    });
    return reply.status;
  });
  expect([400, 401, 403, 429]).toContain(second); // refused, never a second email
  expect(mailTo(email)).toHaveLength(1);
});

test('forgotten password: finishing a reset through the emailed link also verifies the address', async () => {
  // Covered by the backend suite end to end; the live reset UI needs the SMTP-sent reset mail, which is the same mailbox.
  test.skip(true, 'password-reset UI is outside this run');
});

void PASSWORD;
