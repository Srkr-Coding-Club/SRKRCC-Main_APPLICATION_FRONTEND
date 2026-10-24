import { expect, test } from '@playwright/test';
import { audit, report } from './audit';
import { makeForm, type Question } from './helpers';
import { openSite, verifiedState, type SiteCall } from './site-helpers';

const photo: Question = { id: 1, label: 'Photo', type: 'FILE', order: 1, is_required: true };
const docs: Question = { id: 2, label: 'Documents', type: 'MULTI_FILE', order: 2, is_required: false, validation_rules: { maxFiles: 2, maxFileSizeMB: 1 } } as Question;

// A real 1x1 PNG, so the browser can draw the preview.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let counter = 0;
const names = new Map<string, { name: string; size: number }>();
function storage(options: { failFirstSend?: boolean; slow?: boolean } = {}) {
  let sends = 0;
  return {
    sends: () => sends,
    handlers: [
      (call: SiteCall) => (call.path === '/forms/upload-config/' ? { body: { direct_upload: true, default_mb: 2, max_mb: 25 } } : undefined),
      (call: SiteCall) => {
        if (call.method === 'POST' && call.path === '/forms/demo/uploads/') {
          counter += 1;
          names.set(`up-${counter}`, { name: call.body.name, size: PNG.length });
          return { status: 201, body: { upload: { id: `up-${counter}`, name: call.body.name, size: call.body.size, type: call.body.type, state: 'PENDING' }, post: { url: 'https://bucket.example/', fields: { key: `k${counter}` } }, max_bytes: 2097152, expires_in: 900 } };
        }
        const done = call.path.match(/^\/forms\/demo\/uploads\/(up-\d+)\/complete\/$/);
        if (done && call.method === 'POST') return { body: { upload: { id: done[1], ...names.get(done[1])!, type: 'image/png', state: 'UPLOADED' } } };
        if (call.method === 'DELETE' && call.path.startsWith('/forms/demo/uploads/')) return { status: 204, body: null };
        return undefined;
      },
    ],
    route: async (page: import('@playwright/test').Page) => {
      await page.route('https://bucket.example/**', async (route) => {
        sends += 1;
        if (options.slow) await new Promise((resolve) => setTimeout(resolve, 1500));
        if (options.failFirstSend && sends === 1) return route.abort('failed');
        return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      });
    },
  };
}

const formHandler = (fields: Question[]) => (call: SiteCall) =>
  call.method === 'GET' && call.path === '/forms/demo/' ? { body: makeForm(fields) } : undefined;

test.describe('files go straight to storage', () => {
  test('pick an image: a preview and progress show, the answer holds only a reference, and submit sends no file data', async ({ page }) => {
    const fake = storage();
    await fake.route(page);
    const site = await openSite(page, '/forms/demo', { verification: verifiedState(), handlers: [...fake.handlers, formHandler([photo])] });
    await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();
    await expect(page.getByText('Max 2 MB each')).toBeVisible();

    await page.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByAltText('Preview of me.png')).toBeVisible();
    await expect(page.getByText(/uploaded/)).toBeVisible();
    expect(site.find('POST', '/forms/demo/uploads/')).toHaveLength(2); // asked for permission, then confirmed
    expect(fake.sends()).toBe(1);

    await page.getByRole('button', { name: 'Submit Form' }).click();
    await expect.poll(() => site.find('POST', '/forms/submissions/').length).toBe(1);
    const sent = site.find('POST', '/forms/submissions/')[0].body;
    expect(sent.answers[0].value).toMatchObject({ upload_id: 'up-' + counter, name: 'me.png', type: 'image/png' });
    expect(JSON.stringify(sent)).not.toContain('data:image');
  });

  test('a file over the limit is refused in the browser before anything is requested', async ({ page }) => {
    const fake = storage();
    await fake.route(page);
    const site = await openSite(page, '/forms/demo', { verification: verifiedState(), handlers: [...fake.handlers, formHandler([photo])] });
    await page.locator('input[type=file]').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(3 * 1024 * 1024, 1) });
    await expect(page.getByText(/The limit is 2 MB/)).toBeVisible();
    expect(site.find('POST', '/forms/demo/uploads/')).toHaveLength(0);
  });

  test('submit is blocked while a file is still going, then allowed', async ({ page }) => {
    const fake = storage({ slow: true });
    await fake.route(page);
    await openSite(page, '/forms/demo', { verification: verifiedState(), handlers: [...fake.handlers, formHandler([photo])] });
    await page.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByRole('progressbar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Form' })).toBeDisabled();
    await expect(page.getByText(/uploaded/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Submit Form' })).toBeEnabled();
  });

  test('a dropped connection shows a message and Retry finishes the upload', async ({ page }) => {
    const fake = storage({ failFirstSend: true });
    await fake.route(page);
    await openSite(page, '/forms/demo', { verification: verifiedState(), handlers: [...fake.handlers, formHandler([photo])] });
    await page.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByRole('alert').filter({ hasText: /connection dropped/ })).toBeVisible();
    await page.getByRole('button', { name: /Retry/ }).click();
    await expect(page.getByText(/uploaded/)).toBeVisible();
  });

  test('removing a file asks the server to delete it', async ({ page }) => {
    const fake = storage();
    await fake.route(page);
    const site = await openSite(page, '/forms/demo', { verification: verifiedState(), handlers: [...fake.handlers, formHandler([photo])] });
    await page.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByText(/uploaded/)).toBeVisible();
    await page.getByRole('button', { name: 'Remove me.png' }).click();
    await expect(page.getByAltText('Preview of me.png')).toHaveCount(0);
    await expect.poll(() => site.find('DELETE', '/forms/demo/uploads/').length).toBe(1);
  });

  test('a multi-file question stops at its maximum', async ({ page }) => {
    const fake = storage();
    await fake.route(page);
    await openSite(page, '/forms/demo', { verification: verifiedState(), handlers: [...fake.handlers, formHandler([docs])] });
    const files = [1, 2, 3].map((n) => ({ name: `d${n}.png`, mimeType: 'image/png', buffer: PNG }));
    await page.locator('input[type=file]').setInputFiles(files);
    await expect(page.getByText('You can attach at most 2 files.')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'uploaded' })).toHaveCount(2);
  });

  test('a saved draft brings the uploaded file back', async ({ page }) => {
    const fake = storage();
    await fake.route(page);
    await openSite(page, '/forms/demo', {
      verification: verifiedState(),
      handlers: [
        ...fake.handlers,
        formHandler([photo]),
        (call) => (call.method === 'GET' && call.path === '/forms/demo/draft/'
          ? { body: { draft: { answers: { '1': { upload_id: 'up-old', name: 'saved.png', size: 70, type: 'image/png' } }, current_page: 0, form_changed: false } } }
          : undefined),
      ],
    });
    await expect(page.getByText('saved.png')).toBeVisible();
    await expect(page.getByText(/Files are not saved/)).toHaveCount(0);
  });

  test('the uploader fits a 320px phone', async ({ page }) => {
    const fake = storage();
    await fake.route(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await openSite(page, '/forms/demo', { verification: verifiedState(), handlers: [...fake.handlers, formHandler([photo])] });
    await page.locator('input[type=file]').setInputFiles({ name: 'a-rather-long-photo-name-that-keeps-going.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByText(/uploaded/)).toBeVisible();
    expect(report(await audit(page))).toEqual([]);
  });
});
