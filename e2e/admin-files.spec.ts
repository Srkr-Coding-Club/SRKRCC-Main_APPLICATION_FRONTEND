import axe from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { audit, report } from './audit';
import { openAdmin, savedForm } from './admin-helpers';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const withFiles = savedForm({
  status: 'PUBLISHED',
  fields: [
    { id: 11, label: 'Full name', type: 'TEXT', is_required: true, order: 1, options: [], validation_rules: {}, conditional_logic: {} },
    { id: 21, label: 'Photo', type: 'FILE', is_required: true, order: 2, options: [], validation_rules: {}, conditional_logic: {} },
    { id: 22, label: 'Documents', type: 'MULTI_FILE', is_required: false, order: 3, options: [], validation_rules: {}, conditional_logic: {} },
  ],
});

const file = (n: number, over: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name: n % 2 ? `photo-${n}.png` : `report-${n}.pdf`, size: 1200 * n, type: n % 2 ? 'image/png' : 'application/pdf', is_image: n % 2 === 1,
  state: 'ATTACHED', scan_status: 'NOT_SCANNED', uploaded_at: '2026-10-20T09:30:00Z',
  field: n % 2 ? { id: 21, label: 'Photo' } : { id: 22, label: 'Documents' }, response_id: 100 + n,
  uploader: { id: n, name: `Person ${n}`, email: `person${n}@srkr.ac.in` }, replaced_a_file: false, ...over,
});
const listing = (results: unknown[], count = results.length) => ({ count, next: null, previous: null, total_bytes: 56789, results });

async function violations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.body, { rules: { region: { enabled: false } } });
    return result.violations.map((v: any) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n: any) => n.target.join(' ')).join(' | ')}`);
  });
}

const base = (extra: Record<string, any> = {}) => ({
  'GET ^/forms/upload-config/': () => ({ direct_upload: true, default_mb: 2, max_mb: 25 }),
  'GET ^/forms/$': () => [withFiles],
  'GET ^/forms/demo/$': () => withFiles,
  'GET ^/forms/demo/responses/': () => ({ count: 0, next: null, previous: null, results: [] }),
  'GET /link/': (call: { path: string }) => ({ url: `http://localhost:3100/icon.png?x=${call.path.includes('inline=1') ? 'inline' : 'attach'}`, expires_in: 60, inline: call.path.includes('inline=1') }),
  ...extra,
});

async function openFilesTab(page: Page, context: any, files = [file(1), file(2), file(3)], extra: Record<string, any> = {}) {
  const backend = await openAdmin(page, context, '/admin/responses?form=demo', base({ 'GET ^/forms/demo/files/\\?': () => listing(files), ...extra }));
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  return backend;
}

test.describe('the Files tab', () => {
  test('lists every file with who, what and where, and the totals', async ({ page, context }) => {
    await openFilesTab(page, context);
    await expect(page.getByRole('list', { name: 'Uploaded files' }).getByRole('listitem')).toHaveCount(3);
    await expect(page.getByText('photo-1.png')).toBeVisible();
    await expect(page.getByText('Person 2 · person2@srkr.ac.in')).toBeVisible();
    await expect(page.getByText(/Documents · response #102/)).toBeVisible();
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/55 KB in total/)).toBeVisible();
  });

  test('the Files switch is not offered for a form without file questions', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/responses?form=demo', {
      'GET ^/forms/upload-config/': () => ({ direct_upload: true, default_mb: 2, max_mb: 25 }),
      'GET ^/forms/$': () => [savedForm({ status: 'PUBLISHED' })],
      'GET ^/forms/demo/$': () => savedForm({ status: 'PUBLISHED' }),
    });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: 'Files', exact: true })).toHaveCount(0);
  });

  test('filters are sent to the server', async ({ page, context }) => {
    const backend = await openFilesTab(page, context);
    await page.getByLabel('Search files').fill('person2');
    await expect.poll(() => backend.find('GET', /files\/\?.*search=person2/).length).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'All types' }).click();
    await page.getByRole('option', { name: 'Images' }).click();
    await expect.poll(() => backend.find('GET', /files\/\?.*kind=images/).length).toBeGreaterThan(0);
  });

  test('View opens an image in a preview; Download asks for an attachment link', async ({ page, context }) => {
    const backend = await openFilesTab(page, context);
    await page.getByRole('button', { name: 'View photo-1.png' }).click();
    await expect(page.getByRole('dialog').getByRole('img', { name: 'photo-1.png' })).toBeVisible();
    expect(backend.find('GET', /files\/00000000-0000-4000-8000-000000000001\/link\/\?inline=1/).length).toBeGreaterThan(0);
  });

  test('deleting asks first, names the person, and sends the id', async ({ page, context }) => {
    let files = [file(1), file(2)];
    const backend = await openFilesTab(page, context, files, {
      'GET ^/forms/demo/files/\\?': () => listing(files),
      'POST ^/forms/demo/files/delete/': () => { files = files.filter((f) => f.name !== 'photo-1.png'); return { removed: 1, responses_missing_required_file: [101] }; },
    });
    await page.getByRole('button', { name: 'Delete photo-1.png' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('photo-1.png');
    await expect(dialog).toContainText('Person 1');
    await expect(dialog).toContainText('cannot be undone');
    expect(backend.find('POST', '/files/delete/')).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    expect(backend.find('POST', '/files/delete/')).toHaveLength(0);

    await page.getByRole('button', { name: 'Delete photo-1.png' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect.poll(() => backend.find('POST', '/files/delete/').length).toBe(1);
    expect(backend.find('POST', '/files/delete/')[0].body).toEqual({ ids: ['00000000-0000-4000-8000-000000000001'] });
    await expect(page.getByText('A required file is now missing')).toBeVisible();
    await expect(page.getByText('photo-1.png')).toHaveCount(0);
  });

  test('bulk delete sends every selected id', async ({ page, context }) => {
    const backend = await openFilesTab(page, context, [file(1), file(2), file(3)], { 'POST ^/forms/demo/files/delete/': () => ({ removed: 2, responses_missing_required_file: [] }) });
    await page.getByRole('button', { name: 'Select photo-1.png' }).click();
    await page.getByRole('button', { name: 'Select report-2.pdf' }).click();
    await expect(page.getByRole('region', { name: 'Selected files' })).toContainText('2 selected');
    await page.getByRole('region', { name: 'Selected files' }).getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect.poll(() => backend.find('POST', '/files/delete/').length).toBe(1);
    expect(backend.find('POST', '/files/delete/')[0].body.ids).toHaveLength(2);
  });

  test('Replace uploads the new file for the same question, then swaps it in', async ({ page, context }) => {
    let granted = 0;
    await page.route('https://bucket.example/**', (route) => route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } }));
    const backend = await openFilesTab(page, context, [file(1)], {
      'POST ^/forms/demo/uploads/$': (call: { body: any }) => { granted += 1; return { upload: { id: 'new-up', name: call.body.name, size: call.body.size, type: call.body.type, state: 'PENDING' }, post: { url: 'https://bucket.example/', fields: { key: 'k' } }, max_bytes: 100, expires_in: 900 }; },
      'POST ^/forms/demo/uploads/new-up/complete/': () => ({ upload: { id: 'new-up', name: 'fixed.png', size: PNG.length, type: 'image/png', state: 'UPLOADED' } }),
      'POST /replace/': () => ({ file: file(1, { name: 'fixed.png', replaced_a_file: true }) }),
    });
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Replace photo-1.png' }).click()]);
    await chooser.setFiles({ name: 'fixed.png', mimeType: 'image/png', buffer: PNG });
    await expect.poll(() => backend.find('POST', /\/replace\/$/).length).toBe(1);
    expect(backend.find('POST', /\/replace\/$/)[0].body).toEqual({ upload_id: 'new-up' });
    expect(backend.find('POST', /\/forms\/demo\/uploads\/$/)[0].body).toMatchObject({ field_id: 21, name: 'fixed.png' }); // the same question
    expect(granted).toBe(1);
    await expect(page.getByText('File replaced')).toBeVisible();
  });

  test('an error loading the files can be retried', async ({ page, context }) => {
    let calls = 0;
    await openFilesTab(page, context, [], { 'GET ^/forms/demo/files/\\?': () => (++calls === 1 ? { __status: 500, detail: 'boom' } : listing([file(1)])) });
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('photo-1.png')).toBeVisible();
  });

  test('an empty form says so', async ({ page, context }) => {
    await openFilesTab(page, context, []);
    await expect(page.getByText('No files have been uploaded to this form yet.')).toBeVisible();
  });

  test('is accessible, and fits a 320px phone', async ({ page, context }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openFilesTab(page, context);
    await expect(page.getByText('photo-1.png')).toBeVisible();
    expect(await violations(page)).toEqual([]);
    expect(report(await audit(page))).toEqual([]);
  });
});

test.describe('files inside a response', () => {
  test('a file answer is shown by name, and opening it fetches a fresh link', async ({ page, context }) => {
    const answer = { field: 21, field_id: 21, field_label: 'Photo', field_type: 'FILE', value: [{ upload_id: '00000000-0000-4000-8000-000000000001', name: 'photo-1.png', size: 1200, type: 'image/png' }] };
    const row = {
      id: 1, form_id: 55, form_title: 'Hack Night', form_slug: 'demo', submitted_at: '2026-10-11T09:30:00Z', is_manual_entry: false, is_test_submission: false, form_version: 3,
      user: { id: 1, email: 'p1@srkr.ac.in', first_name: 'Person', last_name: '1' }, user_name: 'Person 1', user_email: 'p1@srkr.ac.in',
      answers: [{ field: 11, field_id: 11, field_label: 'Full name', field_type: 'TEXT', value: 'Person 1' }, answer],
    };
    const backend = await openAdmin(page, context, '/admin/responses?form=demo', base({ 'GET ^/forms/demo/responses/': () => ({ count: 1, next: null, previous: null, results: [row] }) }));
    const open = page.getByRole('button', { name: /photo-1\.png/ }).first();
    await expect(open).toBeVisible();
    await open.click();
    await expect.poll(() => backend.find('GET', /\/link\/\?inline=1/).length).toBeGreaterThan(0);
  });
});
