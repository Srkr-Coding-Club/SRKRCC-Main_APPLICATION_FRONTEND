import { expect, test, type Page } from '@playwright/test';
import { audit, report } from './audit';
import { makeForm, openForm, type Question } from './helpers';

// Runs on an iPhone (WebKit, Safari's engine), an Android phone (Chromium with touch) and desktop Firefox.
// What a laptop test cannot show: real touch input, browser quirks, text that makes iOS zoom in, fixed bars on top of fields.

const questions: Question[] = [
  { id: 1, label: 'Full name', type: 'TEXT', order: 1, is_required: true },
  { id: 2, label: 'Email', type: 'EMAIL', order: 2, is_required: true },
  { id: 3, label: 'Track', type: 'RADIO', order: 3, is_required: true, options: ['AI', 'Web'] },
  { id: 4, label: 'Interests', type: 'CHECKBOX', order: 4, options: ['Robotics', 'Design'] },
  { id: 5, label: 'Branch', type: 'DROPDOWN', order: 5, options: ['CSE', 'ECE', 'EEE'] },
  { id: 6, label: 'Rate us', type: 'RATING', order: 6, max_value: 5 },
  { id: 7, label: 'Birthday', type: 'DATE', order: 7 },
  { id: 8, label: 'Notes', type: 'PARAGRAPH', order: 8 },
];

const tap = async (page: Page, locator: ReturnType<Page['locator']>) => {
  if (page.context().browser()?.browserType().name() === 'firefox') await locator.click();
  else await locator.tap();
};
const option = (page: Page, text: string) => page.locator('label').filter({ has: page.getByText(text, { exact: true }) }).first();

test('a person fills and submits the form with taps only', async ({ page }) => {
  const backend = await openForm(page, makeForm(questions));
  await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();
  await page.getByLabel('Full name').fill('Dee');
  await page.getByLabel('Email').fill('dee@srkr.ac.in');
  await tap(page, option(page, 'Web'));
  await tap(page, option(page, 'Design'));
  await tap(page, page.locator('#field-5'));
  await tap(page, page.getByRole('option', { name: 'ECE' }));
  await tap(page, page.getByRole('button', { name: '4 stars' }));
  await page.getByLabel('Birthday').fill('2005-04-09');
  await tap(page, page.getByRole('button', { name: 'Submit Form' }));
  await expect(page.getByText('Submission Received!')).toBeVisible();
  expect(backend.submissions[0].answers).toEqual(expect.arrayContaining([
    { field: 1, value: 'Dee' }, { field: 3, value: 'Web' }, { field: 4, value: ['Design'] }, { field: 5, value: 'ECE' }, { field: 6, value: 4 }, { field: 7, value: '2005-04-09' },
  ]));
});

test('the layout holds: nothing sideways, nothing cut off, every control big enough to tap', async ({ page }) => {
  await openForm(page, makeForm(questions));
  await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();
  expect(report(await audit(page))).toEqual([]);
  await page.getByRole('button', { name: 'Submit Form' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  expect(report(await audit(page)), 'with errors showing').toEqual([]);
});

test('text boxes are at least 16px, so iPhones do not zoom the page when one is tapped', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 640, 'only phones zoom');
  await openForm(page, makeForm(questions));
  await expect(page.getByLabel('Full name')).toBeVisible();
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll('form input, form select, form textarea'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const type = (el as HTMLInputElement).type;
        return r.width > 0 && r.height > 0 && !['checkbox', 'radio', 'hidden', 'file'].includes(type) && !el.closest('[aria-hidden="true"]');
      })
      .map((el) => ({ id: (el as HTMLElement).id || el.tagName, size: parseFloat(getComputedStyle(el).fontSize) }))
      .filter((x) => x.size < 16));
  expect(small).toEqual([]);
});

test('zooming is not switched off', async ({ page }) => {
  await openForm(page, makeForm(questions));
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport ?? '').not.toMatch(/user-scalable\s*=\s*(no|0)/i);
  expect(viewport ?? '').not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/i);
});

test('a field you move to is never hidden under the sticky top bar or a floating button', async ({ page }) => {
  const many: Question[] = Array.from({ length: 14 }, (_, i) => ({ id: i + 1, label: `Field ${i + 1}`, type: 'TEXT', order: i + 1 }));
  await openForm(page, makeForm(many));
  await expect(page.getByLabel('Field 1', { exact: true })).toBeVisible();
  const hidden: string[] = [];
  for (let i = 1; i <= 14; i++) {
    const field = page.getByLabel(`Field ${i}`, { exact: true });
    await field.focus();
    await page.waitForTimeout(120);
    const covered = await field.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const probe = [[r.left + 8, r.top + r.height / 2], [r.left + r.width - 8, r.top + r.height / 2], [r.left + r.width / 2, r.top + 3]];
      const blockers = new Set<string>();
      for (const [x, y] of probe) {
        const top = document.elementFromPoint(x, y);
        if (top && top !== el && !el.contains(top) && !top.contains(el) && top.tagName.toLowerCase() !== 'nextjs-portal') blockers.add(`${top.tagName.toLowerCase()}${top.id ? '#' + top.id : ''}`);
      }
      return { blockers: Array.from(blockers), top: Math.round(r.top), bottom: Math.round(r.bottom), height: window.innerHeight };
    });
    if (covered.blockers.length || covered.top < 0 || covered.bottom > covered.height) hidden.push(`Field ${i}: ${JSON.stringify(covered)}`);
  }
  expect(hidden).toEqual([]);
});

test('turning the phone sideways and back keeps the form usable', async ({ page }) => {
  await openForm(page, makeForm(questions));
  await expect(page.getByLabel('Full name')).toBeVisible();
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.height, height: size.width });
  await expect(page.getByLabel('Full name')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.setViewportSize(size);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('button', { name: 'Submit Form' })).toBeVisible();
});

test('the dropdown list opens inside the screen and does not run off the bottom', async ({ page }) => {
  await openForm(page, makeForm([{ id: 1, label: 'Branch', type: 'DROPDOWN', order: 1, options: ['Computer Science and Engineering', 'Electronics and Communication', 'Electrical and Electronics', 'Mechanical', 'Civil', 'Information Technology'] }]));
  await tap(page, page.locator('#field-1'));
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  const box = (await list.boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  // the page can still scroll far enough to reach every option
  await list.getByRole('option').last().scrollIntoViewIfNeeded();
  await expect(list.getByRole('option').last()).toBeInViewport();
});

test('a long page keeps the Submit button reachable and not covered by the back-to-top button', async ({ page }) => {
  const many: Question[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, label: `Question ${i + 1}`, type: 'TEXT', order: i + 1 }));
  await openForm(page, makeForm(many));
  const submit = page.getByRole('button', { name: 'Submit Form' });
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
  const covered = await submit.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const points = [[r.left + 6, r.top + r.height / 2], [r.left + r.width / 2, r.top + r.height / 2], [r.right - 6, r.top + r.height / 2]];
    return points.some(([x, y]) => { const top = document.elementFromPoint(x, y); return top !== el && !el.contains(top); });
  });
  expect(covered, 'something sits on top of the Submit button').toBe(false);
});

test('the thank-you page and the countdown fit and can be tapped', async ({ page }) => {
  await openForm(page, makeForm([{ id: 1, label: 'Name', type: 'TEXT', order: 1, is_required: true }], { redirect_url: '/forms', redirect_delay_seconds: 30 }));
  await page.getByLabel('Name').fill('Dee');
  await tap(page, page.getByRole('button', { name: 'Submit Form' }));
  await expect(page.getByRole('status').filter({ hasText: /second/ })).toBeVisible();
  expect(report(await audit(page))).toEqual([]);
  await tap(page, page.getByRole('button', { name: 'Stay here' }));
  await expect(page.getByRole('status').filter({ hasText: /second/ })).toHaveCount(0);
});
