import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { openAdmin, savedForm } from './admin-helpers';
import { audit, report } from './audit';
import { makeForm, openForm, type Question } from './helpers';

// One audit for every screen size: nothing sideways, nothing cut off, nothing too small to tap, nothing off screen.
const SIZES = [
  { name: 'phone-320', width: 320, height: 640 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1024', width: 1024, height: 700 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

const SHOTS = 'test-results/responsive';
mkdirSync(SHOTS, { recursive: true });

const everything: Question[] = [
  { id: 1, label: 'A rather long question label that goes on and on so that it has to wrap on a small phone screen', type: 'TEXT', order: 1, is_required: true, description: 'And a long piece of help text that also needs to wrap nicely under the question without overflowing.' },
  { id: 2, label: 'Email', type: 'EMAIL', order: 2, is_required: true },
  { id: 3, label: 'Track', type: 'RADIO', order: 3, is_required: true, options: ['Artificial intelligence and machine learning', 'Web', 'IoT'] },
  { id: 4, label: 'Interests', type: 'CHECKBOX', order: 4, options: ['Robotics and embedded systems', 'Design', 'Web'] },
  { id: 5, label: 'Branch', type: 'DROPDOWN', order: 5, options: ['Computer Science and Engineering', 'ECE', 'EEE'] },
  { id: 6, label: 'Rate us', type: 'RATING', order: 6, max_value: 5 },
  { id: 7, label: 'Confidence', type: 'LINEAR_SCALE', order: 7, min_value: 1, max_value: 10 },
  { id: 8, label: 'Skills grid', type: 'MATRIX_RADIO', order: 8, options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], rows: ['Python programming', 'Java programming', 'Web development'] },
  { id: 9, label: 'Days grid', type: 'MATRIX_CHECKBOX', order: 9, options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], rows: ['Morning', 'Evening'] },
  { id: 10, label: 'Resume', type: 'FILE', order: 10 },
  { id: 11, label: 'Sign here', type: 'SIGNATURE', order: 11 },
  { id: 12, label: 'Birthday', type: 'DATE', order: 12 },
  { id: 13, label: 'Notes', type: 'PARAGRAPH', order: 13 },
];

test.describe('public form at every size', () => {
  for (const size of SIZES) {
    test(`${size.name}: every question type, with errors showing`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await openForm(page, makeForm(everything));
      await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/form-${size.name}.png`, fullPage: true });
      expect(report(await audit(page)), 'on load').toEqual([]);

      await page.getByRole('button', { name: 'Submit Form' }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/form-errors-${size.name}.png`, fullPage: true });
      expect(report(await audit(page)), 'with errors').toEqual([]);
    });
  }

  for (const size of SIZES.slice(0, 3)) {
    test(`${size.name}: thank-you page with a long message and the redirect bar`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await openForm(page, makeForm([{ id: 1, label: 'Name', type: 'TEXT', order: 1, is_required: true }], {
        confirmation_message: 'Thank you so much for registering! '.repeat(8) + 'https://example.org/a/very/long/link/that/has/no/spaces/and/keeps/going/and/going/forever/and/ever',
        redirect_url: '/forms', redirect_delay_seconds: 30,
      }));
      await page.getByLabel('Name').fill('Dee');
      await page.getByRole('button', { name: 'Submit Form' }).click();
      await expect(page.getByTestId('thank-you-message')).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/thanks-${size.name}.png`, fullPage: true });
      expect(report(await audit(page))).toEqual([]);
    });
  }

  for (const lang of ['te', 'hi']) {
    test(`phone-320 in ${lang}: multi-page buttons and progress fit`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await openForm(page, makeForm([
        { id: 1, label: 'పేరు / नाम', type: 'TEXT', order: 1, is_required: true },
        { id: 2, label: 'Break', type: 'PAGE_BREAK', order: 2 },
        { id: 3, label: 'కారణం / कारण', type: 'TEXT', order: 3 },
      ], { language: lang }));
      await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/lang-${lang}-320.png`, fullPage: true });
      expect(report(await audit(page))).toEqual([]);
    });
  }
});

test.describe('edge cases that stress the layout', () => {
  test('a question with a 300-character label and a 200-character option on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openForm(page, makeForm([
      { id: 1, label: 'L'.repeat(40) + ' ' + 'word '.repeat(50), type: 'RADIO', order: 1, options: ['O'.repeat(60) + ' ' + 'long option '.repeat(15), 'Short'] },
      { id: 2, label: 'Unbroken label: ' + 'W'.repeat(120), type: 'TEXT', order: 2 },
    ]));
    await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Short' })).toBeAttached();
    await page.screenshot({ path: `${SHOTS}/edge-long-text-320.png`, fullPage: true });
    expect(report(await audit(page))).toEqual([]);
  });

  test('a grid with 8 columns and long row names scrolls inside itself, not the page', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await openForm(page, makeForm([
      { id: 1, label: 'Big grid', type: 'MATRIX_RADIO', order: 1, options: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'], rows: ['A very long row name for a phone', 'Another very long row name here', 'Short'] },
    ]));
    await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/edge-big-grid-360.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('a form with 60 questions stays usable: the submit button is reachable and not covered', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    const many: Question[] = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, label: `Question ${i + 1}`, type: 'TEXT', order: i + 1 }));
    await openForm(page, makeForm(many));
    const submit = page.getByRole('button', { name: 'Submit Form' });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
    const covered = await submit.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return top !== el && !el.contains(top);
    });
    expect(covered, 'something sits on top of the Submit button').toBe(false);
  });

  test('landscape phone: dialogs fit and scroll inside themselves', async ({ page, context }) => {
    await page.setViewportSize({ width: 740, height: 360 });
    await openAdmin(page, context, '/admin/builder?slug=demo', { 'GET ^/forms/demo/$': () => savedForm() });
    await page.getByRole('button', { name: 'History' }).click();
    const dialog = page.getByRole('dialog', { name: 'Form history' });
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/dialog-landscape.png` });
    const box = (await dialog.locator('> div').first().boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(360 + 1);
    expect(box.x + box.width).toBeLessThanOrEqual(740 + 1);
  });

  test('portrait phone: the review-before-saving dialog fits, with both buttons reachable', async ({ page, context }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const live = savedForm({ status: 'PUBLISHED', response_count: 12 });
    await openAdmin(page, context, '/admin/builder?slug=demo', {
      'GET ^/forms/demo/$': () => live,
      'POST /preview-changes/': () => ({
        current_version: 3,
        diff: { form: [], fields: { added: Array.from({ length: 12 }, (_, i) => ({ id: null, label: `A brand new question number ${i + 1}`, type: 'TEXT' })), removed: [], changed: [], reordered: false }, summary: { settings: 0, added: 12, removed: 0, changed: 0, reordered: false }, is_empty: false },
        impact: { response_count: 12, new_required: Array.from({ length: 4 }, (_, i) => ({ id: null, label: `Required question ${i + 1}` })), now_required: [], removed_with_answers: [], options_removed_with_answers: [], type_changes_blocked: [] },
      }),
    });
    await page.getByLabel(/Thank-you message/).fill('x');
    await page.getByRole('button', { name: /Save|Update/ }).first().click();
    const dialog = page.getByRole('dialog', { name: /Review/ });
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/review-dialog-320.png` });
    await expect(dialog.getByRole('button', { name: 'Save and apply' })).toBeInViewport();
    await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeInViewport();
  });
});

test.describe('admin screens at phone and tablet size', () => {
  const forms = [savedForm({ id: 55, title: 'Hack Night with an extremely long title that will not fit on one line of a phone', slug: 'demo', status: 'PUBLISHED' }), savedForm({ id: 56, title: 'Workshop', slug: 'workshop', status: 'DRAFT' })];

  for (const size of [SIZES[0], SIZES[1], SIZES[2]]) {
    test(`${size.name}: forms registry`, async ({ page, context }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await openAdmin(page, context, '/admin/forms', { 'GET ^/forms/$': () => forms });
      await expect(page.getByText('Workshop').first()).toBeVisible();
      await page.getByText('Workshop').first().click();
      await page.screenshot({ path: `${SHOTS}/registry-${size.name}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(1);
    });

    test(`${size.name}: builder canvas and toolbar`, async ({ page, context }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await openAdmin(page, context, '/admin/builder?slug=demo', { 'GET ^/forms/demo/$': () => savedForm() });
      await expect(page.getByText('Full name').first()).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/builder-${size.name}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(1);
      for (const name of ['History', 'Analytics', 'Save Changes', 'Publish']) {
        await expect(page.getByRole('button', { name }).first(), name).toBeVisible();
      }
    });

    test(`${size.name}: History and Analytics dialogs fit the screen`, async ({ page, context }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await openAdmin(page, context, '/admin/builder?slug=demo', {
        'GET ^/forms/demo/$': () => savedForm(),
        'GET /versions/$': () => Array.from({ length: 6 }, (_, i) => ({ version: 6 - i, note: 'Saved', created_at: '2026-10-22T09:00:00Z', created_by: 'someone.with.a.long.address@srkr.ac.in', is_current: i === 0, summary: null })),
        'GET /analytics/': () => ({
          form: { id: 55, slug: 'demo', title: 'x' }, total_responses: 1234, responses_analysed: 1234, truncated: false, first_response_at: null, last_response_at: null, days: 30,
          timeline: Array.from({ length: 30 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, count: (i * 7) % 11 })),
          unfinished: { count: 5, stopped_after: [{ field_id: 1, label: 'A very long question label that needs to be shortened', count: 5 }] },
          fields: [{ field_id: 12, label: 'Track', type: 'RADIO', answered: 1234, answer_rate: 1, options: [{ option: 'Artificial intelligence and machine learning', count: 900 }, { option: 'Web', count: 334 }] }],
        }),
      });
      for (const name of ['History', 'Analytics']) {
        await page.getByRole('button', { name }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${SHOTS}/dialog-${name.toLowerCase()}-${size.name}.png` });
        const box = (await dialog.locator('> div').first().boundingBox())!;
        expect(box.x, `${name} left`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${name} right`).toBeLessThanOrEqual(size.width + 1);
        expect(box.y, `${name} top`).toBeGreaterThanOrEqual(-1);
        expect(box.y + box.height, `${name} bottom`).toBeLessThanOrEqual(size.height + 1);
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
      }
    });
  }
});
