import { expect, test } from '@playwright/test';
import { helper, signIn, uniqueEmail } from './live';

/**
 * File uploads end to end: the real backend, the real site and a real S3 API (LocalStack). The browser posts the file
 * straight to the bucket, so this also proves the bucket's CORS rule and the signed upload form work for real.
 */
test.describe.configure({ mode: 'serial' });

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SLUG = 'live-upload';

interface UploadRow { id: string; name: string; state: string; size: number; key: string; response: number | null }
const uploads = () => helper<UploadRow[]>('uploads', SLUG);
const exists = (key: string) => helper<{ exists: boolean; size?: number }>('object_exists', key).exists;

let member = '';
let admin = '';

test.beforeAll(() => {
  helper('make_upload_form', SLUG);
  member = uniqueEmail('filer');
  admin = uniqueEmail('boss');
  helper('create_user', member, '--verified');
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
});

test.beforeEach(() => { helper('clear_cache'); });

test('a member picks a photo: it goes straight to the bucket, and submitting attaches it', async ({ page }) => {
  await signIn(page, member);
  await page.goto(`/forms/${SLUG}`);
  await expect(page.getByText('Max 2 MB each')).toBeVisible();
  await page.getByLabel('Full name').fill('Filer One');

  await page.locator('input[type=file]').first().setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByAltText('Preview of me.png')).toBeVisible();
  await expect(page.getByText(/uploaded/)).toBeVisible();

  const [row] = uploads();
  expect(row).toMatchObject({ name: 'me.png', state: 'UPLOADED', size: PNG.length, response: null });
  expect(row.key).toContain('/tmp/');
  expect(exists(row.key)).toBe(true); // the browser really sent it to the bucket

  await page.getByRole('button', { name: 'Submit Form' }).click();
  await expect.poll(() => uploads()[0].state, { timeout: 30_000 }).toBe('ATTACHED');
  const [done] = uploads();
  expect(done.response).not.toBeNull();
  expect(done.key).toContain('/files/');
  expect(exists(done.key)).toBe(true);
  expect(exists(row.key)).toBe(false); // the temporary copy is gone
});

test('a file over the limit never leaves the browser', async ({ page }) => {
  await signIn(page, member);
  await page.goto(`/forms/${SLUG}`);
  const before = uploads().length;
  await page.locator('input[type=file]').first().setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(3 * 1024 * 1024, 1) });
  await expect(page.getByText(/The limit is 2 MB/)).toBeVisible();
  expect(uploads().length).toBe(before);
});

test('an admin sees the file in the Files tab, previews it, replaces it, and deletes it from the bucket', async ({ page }) => {
  const target = uploads().find((u) => u.state === 'ATTACHED')!;
  await signIn(page, admin);
  await page.goto(`/admin/responses?form=${SLUG}`);
  await page.getByRole('button', { name: 'Files', exact: true }).click();

  const card = page.getByRole('listitem').filter({ hasText: 'me.png' });
  await expect(card).toContainText(member);
  await expect(card).toContainText('Photo');
  // the thumbnail comes from a real presigned link
  await expect.poll(async () => page.getByAltText('me.png').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 30_000 }).toBe(true);

  await page.getByRole('button', { name: 'View me.png' }).click();
  await expect(page.getByRole('dialog').getByRole('img', { name: 'me.png' })).toBeVisible();
  await page.keyboard.press('Escape');

  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Replace me.png' }).click()]);
  await chooser.setFiles({ name: 'fixed.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByText('fixed.png').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Replaced by an admin')).toBeVisible();
  const after = uploads();
  expect(after.find((u) => u.id === target.id)!.state).toBe('DELETED');
  expect(exists(target.key)).toBe(false);
  const replacement = after.find((u) => u.name === 'fixed.png' && u.state === 'ATTACHED')!;
  expect(replacement.response).toBe(target.response);
  expect(exists(replacement.key)).toBe(true);

  await page.getByRole('button', { name: 'Delete fixed.png' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No files have been uploaded to this form yet.')).toBeVisible();
  expect(exists(replacement.key)).toBe(false);
});

test('the response viewer shows the file by name and opens it through a fresh link', async ({ page }) => {
  // a new submission to look at
  await signIn(page, member);
  await page.goto(`/forms/${SLUG}`);
  await page.getByLabel('Full name').fill('Filer Two');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'second.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByText(/uploaded/)).toBeVisible();
  await page.getByRole('button', { name: 'Submit Form' }).click();
  await expect.poll(() => uploads().filter((u) => u.name === 'second.png' && u.state === 'ATTACHED').length, { timeout: 30_000 }).toBe(1);

  const other = await page.context().browser()!.newContext();
  const tab = await other.newPage();
  await signIn(tab, admin);
  await tab.goto(`/admin/responses?form=${SLUG}`);
  const open = tab.getByRole('button', { name: /second\.png/ }).first();
  await expect(open).toBeVisible({ timeout: 30_000 });
  const [popup] = await Promise.all([tab.waitForEvent('popup'), open.click()]);
  await popup.waitForLoadState();
  expect(popup.url()).toContain('4566');
  expect(popup.url()).toContain('X-Amz-Signature');
  await other.close();
});

test('the Maintenance page shows what is waiting, runs a task for real, and records it', async ({ page }) => {
  helper('stale_drafts', SLUG, '--count', '3');
  await signIn(page, admin);
  await page.goto('/admin/maintenance');
  const drafts = page.getByRole('listitem').filter({ hasText: 'Delete abandoned drafts' });
  await expect(drafts).toContainText('Needs running');
  await expect(drafts).toContainText('3 abandoned draft(s) waiting to be deleted');
  await expect(page.getByRole('img', { name: /maintenance tasks? need running/ })).toBeVisible();

  await page.getByRole('button', { name: 'Run Delete abandoned drafts now' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Run now' }).click();
  await expect(drafts).toContainText('3 abandoned drafts deleted.', { timeout: 30_000 });
  await expect(drafts).toContainText('Up to date');
  await expect(drafts).toContainText('Last run just now');
  await expect(drafts).toContainText('Nothing waiting.');
});
