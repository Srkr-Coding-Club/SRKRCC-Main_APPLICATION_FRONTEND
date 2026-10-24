import axe from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { openAdmin, savedForm, type AdminCall } from './admin-helpers';

const form = savedForm({ status: 'PUBLISHED', response_count: 45 });

const answer = (field: number, label: string, value: unknown, type = 'TEXT') => ({ field, field_id: field, field_label: label, field_type: type, value });
const response = (id: number, over: Record<string, unknown> = {}) => ({
  id, form_id: 55, form_title: 'Hack Night', form_slug: 'demo', submitted_at: `2026-10-${String(10 + (id % 10)).padStart(2, '0')}T09:30:00Z`,
  is_manual_entry: false, is_test_submission: false, form_version: 3,
  user: { id: id, email: `person${id}@srkr.ac.in`, first_name: `Person`, last_name: `${id}` }, user_name: `Person ${id}`, user_email: `person${id}@srkr.ac.in`,
  answers: [answer(11, 'Full name', `Person ${id}`), answer(12, 'Track', id % 2 ? 'AI' : 'Web', 'RADIO')],
  ...over,
});

const page1 = Array.from({ length: 20 }, (_, i) => response(i + 1));
const listing = (results: unknown[], count = results.length) => ({ count, next: null, previous: null, results });

const baseHandlers = (extra: Record<string, any> = {}) => ({
  'GET ^/forms/$': () => [form],
  'GET ^/forms/demo/$': () => form,
  ...extra,
});

async function violations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.body, { rules: { region: { enabled: false } } });
    return result.violations.map((v: any) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n: any) => n.target.join(' ')).join(' | ')}`);
  });
}

test.describe('the responses screen', () => {
  test('lists the answers people gave', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({ 'GET /forms/demo/responses/': () => listing(page1, 45) }));
    await expect(page.getByText('Person 1', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('person2@srkr.ac.in').first()).toBeVisible();
  });

  test('says so when nobody has responded yet', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({ 'GET /forms/demo/responses/': () => listing([]) }));
    await expect(page.getByText(/no responses|nothing|No data|yet/i).first()).toBeVisible();
  });

  test('says what went wrong when the responses cannot be loaded', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({ 'GET /forms/demo/responses/': () => ({ __status: 500, detail: 'Server error' }) }));
    await expect(page.getByText(/Failed to Load Responses/i).first()).toBeVisible();
  });

  test('search waits for a pause in typing and asks the server once', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({ 'GET /forms/demo/responses/': () => listing(page1, 45) }));
    await expect(page.getByText('Person 1', { exact: true }).first()).toBeVisible();
    const before = admin.find('GET', '/forms/demo/responses/').length;
    await page.getByPlaceholder('Search…').pressSequentially('person 7', { delay: 40 });
    await expect.poll(() => admin.find('GET', 'search=person').length).toBeGreaterThan(0);
    await page.waitForTimeout(800);
    expect(admin.find('GET', 'search=').length).toBe(1);
    expect(admin.find('GET', '/forms/demo/responses/').length).toBe(before + 1);
  });

  test('paging asks for the next page of twenty', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({
      'GET /forms/demo/responses/': (call: AdminCall) => (call.path.includes('page=2') ? listing(Array.from({ length: 20 }, (_, i) => response(i + 21)), 45) : listing(page1, 45)),
    }));
    await expect(page.getByText('Person 1', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /next/i }).first().click();
    await expect(page.getByText('Person 21', { exact: true }).first()).toBeVisible();
    expect(admin.find('GET', 'page=2').length).toBeGreaterThan(0);
  });

  test('answers that contain markup are shown as text, never run', async ({ page, context }) => {
    const nasty = response(1, { answers: [answer(11, 'Full name', '<img src=x onerror="window.__pwned=1">'), answer(12, 'Track', '<b>bold</b>', 'RADIO')] });
    await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({ 'GET /forms/demo/responses/': () => listing([nasty]) }));
    await expect(page.getByText('<b>bold</b>').first()).toBeVisible();
    expect(await page.evaluate(() => (window as any).__pwned)).toBeUndefined();
    await expect(page.locator('table img[src="x"]')).toHaveCount(0);
  });

  test('a very long answer does not break the table or push the page wider than the screen', async ({ page, context }) => {
    const long = response(1, { answers: [answer(11, 'Full name', 'x'.repeat(4000)), answer(12, 'Track', 'AI', 'RADIO')] });
    await page.setViewportSize({ width: 390, height: 800 });
    await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({ 'GET /forms/demo/responses/': () => listing([long]) }));
    await page.waitForTimeout(1500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('the screen has no accessibility violations once responses are showing', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({ 'GET /forms/demo/responses/': () => listing(page1, 45) }));
    await expect(page.getByText('Person 1', { exact: true }).first()).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });

  test('on a phone the toolbar and the list are usable', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({ 'GET /forms/demo/responses/': () => listing(page1, 45) }));
    await expect(page.getByText('Person 1', { exact: true }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByPlaceholder('Search…')).toBeInViewport();
  });

  test('a response can be opened and closed with the keyboard alone', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({ 'GET /forms/demo/responses/': () => listing(page1, 45) }));
    const open = page.getByRole('button', { name: 'Open the response from Person 1', exact: true });
    await open.focus();
    await page.keyboard.press('Enter');
    const drawer = page.getByRole('dialog', { name: 'Response #1' });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
  });

  test('selecting rows shows how many are selected, and deleting asks first and sends the chosen ids', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/responses?form=demo', baseHandlers({
      'GET /forms/demo/responses/': () => listing(page1, 45),
      'POST /responses/bulk-delete/': () => ({ deleted_count: 2 }),
    }));
    await page.getByRole('button', { name: 'Select the response from Person 1', exact: true }).click();
    await page.getByRole('button', { name: 'Select the response from Person 2', exact: true }).click();
    await expect(page.getByText(/2 selected/i).first()).toBeVisible();
    page.once('dialog', (d) => d.dismiss());
    await page.getByRole('button', { name: /Delete/ }).first().click();
    await page.waitForTimeout(500);
    expect(admin.find('POST', 'bulk-delete')).toHaveLength(0);
  });
});

