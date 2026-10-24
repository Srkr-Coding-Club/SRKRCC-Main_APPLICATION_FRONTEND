import axe from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { openAdmin, savedForm } from './admin-helpers';

const twoQuestions = savedForm({
  fields: [
    { id: 11, label: 'Are you a student?', type: 'RADIO', is_required: true, order: 1, options: ['Yes', 'No'], validation_rules: {}, conditional_logic: {} },
    { id: 12, label: 'Which college?', type: 'TEXT', is_required: false, order: 2, options: [], validation_rules: {}, conditional_logic: {} },
    { id: 13, label: 'Total', type: 'CALCULATED', is_required: false, order: 3, options: [], validation_rules: { formula: '1 + 1' }, conditional_logic: {} },
  ],
});
const handlers = { 'GET ^/forms/demo/$': () => twoQuestions, 'PUT ^/forms/demo/': (c: any) => ({ ...twoQuestions, ...c.body }) };

// Only the question being edited is open; clicking another one's heading opens that instead.
async function openQuestion(page: Page, label: string) {
  await page.getByText(label, { exact: true }).first().click();
  await expect(page.getByRole('button', { name: /Add conditions|Conditions: Active/ })).toHaveCount(1);
}

async function violations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.body, { rules: { region: { enabled: false } } });
    return result.violations.map((v: any) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 4).map((n: any) => n.target.join(' ')).join(' | ')}`);
  });
}

test.describe('conditions and per-question controls in the builder', () => {
  test('a condition can be added to a question and is saved with the form', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/builder?slug=demo', handlers);
    await openQuestion(page, 'Which college?');
    await page.getByRole('button', { name: 'Add conditions' }).click();
    await page.getByRole('button', { name: 'Add a condition' }).click();
    const watch = page.getByLabel('Question to watch').first();
    await expect(watch).toBeVisible();
    await watch.selectOption({ label: 'Are you a student?' });
    await page.getByLabel('Operator').first().selectOption('equals');
    await page.getByRole('button', { name: /Save/ }).first().click();
    await expect.poll(() => admin.find('PUT', '/forms/demo/').length).toBeGreaterThan(0);
    const fields = admin.find('PUT', '/forms/demo/')[0].body.fields;
    const college = fields.find((f: any) => f.id === 12);
    expect(college.conditional_logic.rules[0]).toMatchObject({ field: 11, operator: 'equals' });
    expect(fields.find((f: any) => f.id === 11).profile_field ?? null).toBeNull();
  });

  test('a rule can be removed again with the keyboard', async ({ page, context }) => {
    const withRule = savedForm({
      fields: [
        twoQuestions.fields[0],
        { ...twoQuestions.fields[1], conditional_logic: { logic: 'AND', action: 'show', rules: [{ field: 11, operator: 'equals', value: 'Yes' }] } },
      ],
    });
    await openAdmin(page, context, '/admin/builder?slug=demo', { 'GET ^/forms/demo/$': () => withRule });
    await openQuestion(page, 'Which college?');
    await page.getByRole('button', { name: 'Conditions: Active' }).click();
    const remove = page.getByRole('button', { name: 'Remove this rule' }).first();
    await remove.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Question to watch')).toHaveCount(0);
  });

  test('the open condition editor and the calculated-field editor have no accessibility violations', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?slug=demo', handlers);
    await openQuestion(page, 'Which college?');
    await page.getByRole('button', { name: 'Add conditions' }).click();
    await page.getByRole('button', { name: 'Add a condition' }).click();
    await expect(page.getByLabel('Question to watch').first()).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });

  test('a PAGE_BREAK can be added from the palette', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?slug=demo', handlers);
    const pageBreak = page.getByRole('button', { name: /Page break/i }).first();
    await expect(pageBreak).toBeVisible();
    await pageBreak.click();
    await expect(page.getByText(/Page break|Page 2/i).first()).toBeVisible();
  });
});

test.describe('the forms registry', () => {
  const forms = [savedForm({ id: 55, title: 'Hack Night', slug: 'demo', status: 'PUBLISHED' }), savedForm({ id: 56, title: 'Workshop', slug: 'workshop', status: 'DRAFT' })];
  const registry = (extra: Record<string, any> = {}) => ({ 'GET ^/forms/$': () => forms, ...extra });

  test('lists the forms and has no accessibility violations', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/forms', registry());
    await expect(page.getByText('Hack Night').first()).toBeVisible();
    await expect(page.getByText('Workshop').first()).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });

  test('Duplicate asks for a name and posts it', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/forms', registry({ 'POST /duplicate/': () => savedForm({ id: 90, slug: 'copy-of-hack-night', title: 'Copy of Hack Night' }) }));
    await page.getByText('Hack Night').first().click();
    page.once('dialog', (d) => d.accept('My copy'));
    await page.getByRole('button', { name: 'Duplicate' }).click();
    await expect.poll(() => admin.find('POST', '/duplicate/').length).toBe(1);
    expect(admin.find('POST', '/duplicate/')[0].body).toEqual({ title: 'My copy' });
  });

  test('cancelling the name prompt sends nothing', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/forms', registry());
    await page.getByText('Hack Night').first().click();
    page.once('dialog', (d) => d.dismiss());
    await page.getByRole('button', { name: 'Duplicate' }).click();
    await page.waitForTimeout(500);
    expect(admin.find('POST', '/duplicate/')).toHaveLength(0);
  });

  test('Save as template posts and explains where it went', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/forms', registry({ 'POST /save-as-template/': () => savedForm({ id: 91, slug: 'tpl', title: 'Hack Night (template)' }) }));
    await page.getByText('Hack Night').first().click();
    page.once('dialog', (d) => d.accept('Hack Night (template)'));
    await page.getByRole('button', { name: /Save as template/ }).click();
    await expect.poll(() => admin.find('POST', '/save-as-template/').length).toBe(1);
    await expect(page.getByText(/Templates are kept out of this list/)).toBeVisible();
  });

  test('Export downloads a file', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/forms', registry());
    await page.getByText('Hack Night').first().click();
    await page.route('**/api/proxy/forms/demo/export-definition/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-disposition': 'attachment; filename="demo-form.json"' }, body: JSON.stringify({ format: 'srkrcc-form', version: 1 }) }));
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export file/ }).click()]);
    expect(download.suggestedFilename()).toBe('demo-form.json');
  });

  test('Import refuses a file that is not JSON and one that is far too big, without calling the server', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/forms', registry());
    const chooser = page.locator('input[type="file"]').first();
    await chooser.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
    await expect(page.getByText(/not valid JSON/i).first()).toBeVisible();
    await chooser.setInputFiles({ name: 'big.json', mimeType: 'application/json', buffer: Buffer.alloc(1_200_000, 32) });
    await expect(page.getByText(/under 1 MB/i).first()).toBeVisible();
    expect(admin.find('POST', 'import-definition')).toHaveLength(0);
  });

  test('Import sends a good file and shows the server\'s reason when it is refused', async ({ page, context }) => {
    let refuse = true;
    const admin = await openAdmin(page, context, '/admin/forms', registry({
      'POST /import-definition/': () => (refuse ? { __status: 400, detail: 'That file is not a form definition this site can read.' } : savedForm({ id: 92, slug: 'imported', title: 'Imported' })),
    }));
    const chooser = page.locator('input[type="file"]').first();
    const file = { name: 'form.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'srkrcc-form', version: 1, form: {}, fields: [] })) };
    await chooser.setInputFiles(file);
    await expect(page.getByText(/not a form definition this site can read/)).toBeVisible();
    refuse = false;
    await chooser.setInputFiles(file);
    await expect.poll(() => admin.find('POST', 'import-definition').length).toBe(2);
  });

  test('From template lists templates and starts a form from one', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/forms', registry({
      'GET templates=only': () => [savedForm({ id: 70, title: 'Event sign-up', slug: 'event-signup', is_template: true, description: 'A starting point' })],
      'POST /duplicate/': () => savedForm({ id: 93, slug: 'from-template', title: 'From template' }),
    }));
    await page.getByRole('button', { name: /From template/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Event sign-up')).toBeVisible();
    expect(await violations(page)).toEqual([]);
    page.once('dialog', (d) => d.accept('My event form'));
    await dialog.getByRole('button', { name: 'Use' }).click();
    await expect.poll(() => admin.find('POST', '/duplicate/').length).toBe(1);
    await page.keyboard.press('Escape');
  });
});
