import { expect, test } from '@playwright/test';
import { helper, signIn, uniqueEmail } from './live';

/**
 * The hackathon idea phase end to end: real backend, real site, real S3 API (LocalStack).
 * A team leader submits an idea with slides, a LinkedIn link and a ₹200 payment screenshot; an admin reviews it;
 * a judge can read the slides but never the payment; the admin then switches editing off and the leader is locked out.
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'idea-storm';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PPTX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(2000, 7)]);
const LINKEDIN = 'https://www.linkedin.com/posts/bin-busters-activity-1';

interface IdeaState { id: number; status: string; linkedin: string; txn: string; deck: { name: string; state: string; key: string } | null; payment: { name: string; state: string; key: string } | null }
const idea = () => helper<IdeaState | null>('idea_state', SLUG);
const exists = (key: string) => helper<{ exists: boolean }>('object_exists', key).exists;

let leader = '';
let admin = '';
let judge = '';

test.beforeAll(() => {
  leader = uniqueEmail('leader');
  admin = uniqueEmail('boss');
  judge = uniqueEmail('judge');
  helper('create_user', leader, '--verified');
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
  helper('create_user', judge, '--verified');
  helper('make_idea_hackathon', SLUG, '--leader', leader, '--judge', judge);
});

test.beforeEach(() => { helper('clear_cache'); });

test('an admin sets the fee, the requirements and the way to pay', async ({ page }) => {
  await signIn(page, admin);
  await page.goto(`/hackathons/${SLUG}/manage`);
  await page.getByRole('tab', { name: /Ideas/ }).click();
  await page.getByLabel('Payment (₹)').fill('200');
  await page.getByLabel('How to pay').fill('Pay ₹200 to UPI: club@upi');
  await page.getByRole('switch', { name: /Presentation file required/ }).click();
  await page.getByRole('switch', { name: /LinkedIn post link required/ }).click();
  await page.getByRole('button', { name: 'Save idea phase' }).click();
  await expect(page.getByText('Idea phase saved')).toBeVisible();

  // the payment QR code is saved the moment it uploads
  await page.locator('input[type=file]').first().setInputFiles({ name: 'club-upi-qr.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByText(/uploaded/)).toBeVisible();
  await expect(page.getByAltText('Payment QR code')).toBeVisible();
  await expect.poll(() => page.getByAltText('Payment QR code').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 30_000 }).toBe(true);
});

test('the team leader sees the payment and the requirements, and cannot submit without them', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await expect(page.getByText('Payment: ₹200')).toBeVisible();
  await expect(page.getByText('Pay ₹200 to UPI: club@upi')).toBeVisible();
  await expect(page.getByText(/Scan this QR code with any UPI app and pay ₹200/)).toBeVisible();
  await expect.poll(() => page.getByAltText('Payment QR code').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 30_000 }).toBe(true);
  await page.getByLabel(/Idea title/).fill('Smart bins');
  await page.getByLabel(/The problem/).fill('Campus waste is not sorted.');
  await page.getByLabel(/Your approach/).fill('Sensors and an app.');
  await page.getByRole('button', { name: 'Submit idea' }).click();
  await expect(page.getByText(/LinkedIn post link is required/)).toBeVisible();
  expect(idea()).toBeNull();
});

test('a full submission: files go to the bucket, the idea is saved, and the answer holds only references', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await page.getByLabel(/Idea title/).fill('Smart bins');
  await page.getByLabel(/The problem/).fill('Campus waste is not sorted.');
  await page.getByLabel(/Your approach/).fill('Sensors and an app.');
  await page.getByLabel(/The plan/).fill('Week 1: sensors.');
  await page.getByLabel(/LinkedIn post link/).fill(LINKEDIN);
  await page.getByLabel(/Transaction ID/).fill('UPI-884213');

  const pickers = page.locator('input[type=file]');
  await pickers.nth(0).setInputFiles({ name: 'bins.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: PPTX });
  await expect(page.getByText('bins.pptx')).toBeVisible();
  await pickers.nth(1).setInputFiles({ name: 'payment.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByAltText('Preview of payment.png')).toBeVisible();
  await expect(page.getByText(/uploaded/)).toHaveCount(2);

  await page.getByRole('button', { name: 'Submit idea' }).click();
  await expect(page.getByText('Idea sent for review')).toBeVisible();

  const saved = idea()!;
  expect(saved).toMatchObject({ status: 'SUBMITTED', linkedin: LINKEDIN, txn: 'UPI-884213' });
  expect(saved.deck).toMatchObject({ name: 'bins.pptx', state: 'ATTACHED' });
  expect(saved.payment).toMatchObject({ name: 'payment.png', state: 'ATTACHED' });
  for (const file of [saved.deck!, saved.payment!]) {
    expect(file.key).toContain('/files/');
    expect(exists(file.key)).toBe(true);
  }
});

test('the admin reads the idea and opens the payment screenshot (not public)', async ({ page }) => {
  await signIn(page, admin);
  await page.goto(`/hackathons/${SLUG}/manage`);
  await page.getByRole('tab', { name: /Ideas/ }).click();
  await page.getByRole('button', { name: 'Read and review' }).first().click();
  await expect(page.getByRole('link', { name: /LinkedIn post/ })).toHaveAttribute('href', LINKEDIN);
  await expect(page.getByText(/Payment: ₹200 · transaction/)).toContainText('UPI-884213');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: /Payment screenshot: payment\.png/ }).click()]);
  await popup.waitForLoadState();
  expect(popup.url()).toContain('X-Amz-Signature');
  await popup.close();
});

test('a judge can reach the slides but never the payment screenshot or the transaction id', async ({ page }) => {
  await signIn(page, judge);
  const ideaId = idea()!.id;
  const get = (kind: string) => page.evaluate(async ([id, k]) => {
    const reply = await fetch(`/api/proxy/hackathons/idea-storm/ideas/${id}/files/${k}/link/`, { credentials: 'include' });
    return reply.status;
  }, [ideaId, kind] as const);
  expect(await get('deck')).toBe(200);
  expect(await get('payment')).toBe(404);
  const qr = await page.evaluate(async () => (await fetch('/api/proxy/hackathons/idea-storm/idea-qr/link/', { credentials: 'include' })).status);
  expect(qr).toBe(404);   // judges are not paying, so they do not get the QR either
  const list = await page.evaluate(async () => (await fetch('/api/proxy/hackathons/idea-storm/judging/ideas/', { credentials: 'include' })).text());
  expect(list).toContain('bins.pptx');
  expect(list).not.toContain('UPI-884213');
  expect(list).not.toContain('payment.png');
});

test('with editing switched off the leader is locked out and told why; switching it on lets them edit again', async ({ page, browser }) => {
  const organizer = await browser.newContext();
  const tab = await organizer.newPage();
  const setEditing = async (on: boolean) => {
    await tab.goto(`/hackathons/${SLUG}/manage`);
    await tab.getByRole('tab', { name: /Ideas/ }).click();
    const toggle = tab.getByRole('switch', { name: /Teams can edit a submitted idea/ });
    if ((await toggle.getAttribute('aria-checked')) !== String(on)) await toggle.click();
    await tab.getByRole('button', { name: 'Save idea phase' }).click();
    await expect(tab.getByText('Idea phase saved')).toBeVisible();
  };
  await signIn(tab, admin);
  await setEditing(false);

  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await expect(page.getByText(/switched off editing/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Save changes|Submit idea/ })).toHaveCount(0);
  await expect(page.getByText('Transaction ID: UPI-884213')).toBeVisible();
  await expect(page.getByRole('button', { name: /payment\.png/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /bins\.pptx/ })).toBeVisible();

  await setEditing(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  await page.getByLabel(/The plan/).fill('Week 1: sensors. Week 2: app.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Idea sent for review')).toBeVisible();
  await organizer.close();
});

test('an approved idea stays final even when editing is on', async ({ page, browser }) => {
  const organizer = await browser.newContext();
  const tab = await organizer.newPage();
  await signIn(tab, admin);
  await tab.goto(`/hackathons/${SLUG}/manage`);
  await tab.getByRole('tab', { name: /Ideas/ }).click();
  await tab.getByRole('button', { name: 'Read and review' }).first().click();
  await tab.getByRole('button', { name: 'Approve' }).click();
  await expect.poll(() => idea()!.status, { timeout: 30_000 }).toBe('APPROVED');
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await expect(page.getByText(/already been decided/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Save changes/ })).toHaveCount(0);
  await organizer.close();
});
