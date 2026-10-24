import axe from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { makeForm, openForm, type Question } from './helpers';

const questions: Question[] = [
  { id: 1, label: 'Full name', type: 'TEXT', is_required: true, order: 1, description: 'As on your ID card' },
  { id: 2, label: 'Email', type: 'EMAIL', is_required: true, order: 2 },
  { id: 3, label: 'Track', type: 'RADIO', is_required: true, order: 3, options: ['AI', 'Web'] },
  { id: 4, label: 'Interests', type: 'CHECKBOX', order: 4, options: ['Robotics', 'Design'] },
  { id: 5, label: 'Notes', type: 'PARAGRAPH', order: 5 },
];

// The options are drawn as custom controls over the real inputs, so - like a person - click the label.
const choose = (page: Page, text: string) => page.locator('label').filter({ has: page.getByText(text, { exact: true }) }).first().click();

// axe runs inside the page, so layout and colours are real (jsdom cannot check contrast).
async function axeViolations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.body, { rules: { region: { enabled: false } } });
    return result.violations.map((v: any) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n: any) => n.target.join(' ')).join(' | ')}`);
  });
}

test('someone fills the form with the keyboard and sees the thank-you page', async ({ page }) => {
  const backend = await openForm(page, makeForm(questions, { confirmation_message: 'See you, {{1}}!' }));
  await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();

  await page.getByLabel('Full name').fill('Dee');
  await page.keyboard.press('Tab'); // on to Email
  await page.keyboard.type('dee@srkr.ac.in');
  await choose(page, 'Web');
  await choose(page, 'Design');
  await page.getByRole('button', { name: 'Submit Form' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('thank-you-message')).toHaveText('See you, Dee!');
  expect(backend.submissions).toHaveLength(1);
  expect(backend.submissions[0].answers).toEqual(expect.arrayContaining([
    { field: 1, value: 'Dee' }, { field: 2, value: 'dee@srkr.ac.in' }, { field: 3, value: 'Web' }, { field: 4, value: ['Design'] },
  ]));
  expect(backend.submissions[0].hp_q7z4).toBe('');
});

test('an empty submit explains itself, puts keyboard focus on the first problem and sends nothing', async ({ page }) => {
  const backend = await openForm(page, makeForm(questions));
  await page.getByRole('button', { name: 'Submit Form' }).click();

  await expect(page.getByLabel('Full name')).toBeFocused();
  await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert').first()).toBeVisible();
  expect(backend.submissions).toHaveLength(0);
});

test('a refusal from the server is shown and the answers are kept', async ({ page }) => {
  await openForm(page, makeForm(questions), {
    onSubmit: () => ({ status: 400, body: { detail: 'x', code: 'VALIDATION', errors: [{ field_id: 2, code: 'X', message: 'That email is already registered.' }] } }),
  });
  await page.getByLabel('Full name').fill('Dee');
  await page.getByLabel('Email').fill('dee@srkr.ac.in');
  await choose(page, 'AI');
  await page.getByRole('button', { name: 'Submit Form' }).click();

  await expect(page.getByText('That email is already registered.').first()).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveValue('Dee');
});

test('the form meets the accessibility rules in a real browser, colours included', async ({ page }) => {
  await openForm(page, makeForm(questions));
  await expect(page.getByLabel('Full name')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test('the form still meets them with every error showing', async ({ page }) => {
  await openForm(page, makeForm(questions));
  await page.getByRole('button', { name: 'Submit Form' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test('a multi-page form walks forward and back, and the progress follows', async ({ page }) => {
  const backend = await openForm(page, makeForm([
    { id: 1, label: 'Full name', type: 'TEXT', is_required: true, order: 1 },
    { id: 2, label: 'Page two', type: 'PAGE_BREAK', order: 2 },
    { id: 3, label: 'Why join', type: 'TEXT', order: 3 },
  ]));
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByLabel('Full name')).toBeFocused(); // still page 1: the name is required
  await page.getByLabel('Full name').fill('Dee');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Dee');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByLabel('Why join').fill('Code');
  await page.getByRole('button', { name: 'Submit Form' }).click();
  await expect(page.getByText('Submission Received!')).toBeVisible();
  expect(backend.submissions[0].answers).toEqual([{ field: 1, value: 'Dee' }, { field: 3, value: 'Code' }]);
});

test('answers typed so far come back after a reload', async ({ page }) => {
  const backend = await openForm(page, makeForm(questions));
  // Autosave starts once the saved draft has been looked up; typing before that is treated as the starting point.
  await expect.poll(() => backend.requests.includes('GET /forms/demo/draft/')).toBe(true);
  await page.getByLabel('Full name').fill('Dee');
  await expect.poll(() => backend.drafts.length, { timeout: 20_000 }).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByText(/We restored your saved answers/)).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveValue('Dee');
});

test('the form speaks the language its admin chose', async ({ page }) => {
  await openForm(page, makeForm(questions, { language: 'te' }));
  await expect(page.getByRole('button', { name: 'ఫారమ్ సమర్పించండి' })).toBeVisible();
  await expect(page.locator('[lang="te"]').first()).toBeVisible();
});

test('after the thank-you countdown the visitor is sent on', async ({ page }) => {
  await openForm(page, makeForm(questions, { redirect_url: '/forms', redirect_delay_seconds: 1 }));
  await page.getByLabel('Full name').fill('Dee');
  await page.getByLabel('Email').fill('dee@srkr.ac.in');
  await choose(page, 'AI');
  await page.getByRole('button', { name: 'Submit Form' }).click();
  await expect(page.getByRole('status').filter({ hasText: /second/ })).toBeVisible();
  await page.waitForURL('**/forms', { timeout: 20_000 });
});

test('rating and grid questions work', async ({ page }) => {
  const backend = await openForm(page, makeForm([
    { id: 1, label: 'Rate us', type: 'RATING', order: 1, max_value: 5 },
    { id: 2, label: 'Skills', type: 'MATRIX_RADIO', order: 2, options: ['Low', 'High'], rows: ['Python', 'Java'] },
  ]));
  await page.getByRole('button', { name: '4 stars' }).click();
  await page.getByRole('radio', { name: 'Python: High' }).check();
  await page.getByRole('radio', { name: 'Java: Low' }).check();
  await page.getByRole('button', { name: 'Submit Form' }).click();
  await expect(page.getByText('Submission Received!')).toBeVisible();
  expect(backend.submissions[0].answers).toEqual([{ field: 1, value: 4 }, { field: 2, value: { Python: 'High', Java: 'Low' } }]);
});
