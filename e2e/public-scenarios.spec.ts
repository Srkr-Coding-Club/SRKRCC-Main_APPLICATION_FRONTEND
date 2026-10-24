import axe from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { makeForm, openForm, type Question } from './helpers';

const text = (id: number, label: string, extra: Partial<Question> = {}): Question => ({ id, label, type: 'TEXT', order: id, ...extra });
const submitButton = (page: Page) => page.getByRole('button', { name: /^(Submit Form|Update Response)$/ });
const choose = (page: Page, option: string) => page.locator('label').filter({ has: page.getByText(option, { exact: true }) }).first().click();

async function violations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.body, { rules: { region: { enabled: false } } });
    return result.violations.map((v: any) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n: any) => n.target.join(' ')).join(' | ')}`);
  });
}

test.describe('who can fill the form', () => {
  test('a visitor who is not signed in is asked to sign in and cannot submit', async ({ page }) => {
    const backend = await openForm(page, makeForm([text(1, 'Name')]), { asUser: null });
    await expect(page.getByText('You must sign in to submit your response')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Form' })).toHaveCount(0);
    expect(backend.submissions).toHaveLength(0);
  });

  test('a closed form says so and cannot be submitted', async ({ page }) => {
    const backend = await openForm(page, makeForm([text(1, 'Name')], { status: 'CLOSED' }));
    const button = page.getByRole('button', { name: 'Submissions Closed' });
    await expect(button).toBeDisabled();
    expect(backend.submissions).toHaveLength(0);
  });

  test('a form that opens later says so', async ({ page }) => {
    const later = new Date(Date.now() + 3 * 86400_000).toISOString();
    await openForm(page, makeForm([text(1, 'Name')], { status: 'SCHEDULED', open_at: later }));
    await expect(page.getByRole('button', { name: 'Submissions Not Yet Open' })).toBeDisabled();
  });

  test('a form whose deadline has passed is closed even if nobody flipped its status', async ({ page }) => {
    const earlier = new Date(Date.now() - 86400_000).toISOString();
    await openForm(page, makeForm([text(1, 'Name')], { close_at: earlier }));
    await expect(page.getByRole('button', { name: 'Submissions Closed' })).toBeDisabled();
  });

  test('someone who already answered a one-response form cannot answer again', async ({ page }) => {
    const backend = await openForm(page, makeForm([text(1, 'Name')], { allow_response_editing: false }), {
      myResponse: { has_submitted: true, can_edit: false, response: { id: 9, submitted_at: '2026-10-01T10:00:00Z', answers: [{ field: 1, value: 'Dee' }] } },
    });
    await expect(page.getByText('You have already submitted a response for this form')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Response Already Submitted' })).toBeDisabled();
    expect(backend.submissions).toHaveLength(0);
  });

  test('someone who may edit their response sees it and saves the change as an edit, not a new response', async ({ page }) => {
    const backend = await openForm(page, makeForm([text(1, 'Name', { is_required: true })]), {
      myResponse: { has_submitted: true, can_edit: true, response: { id: 9, submitted_at: '2026-10-01T10:00:00Z', answers: [{ field: 1, value: 'Dee' }] } },
    });
    await expect(page.getByLabel('Name')).toHaveValue('Dee');
    await page.getByLabel('Name').fill('Dee Two');
    await page.getByRole('button', { name: 'Update Response' }).click();
    await expect(page.getByRole('heading', { name: 'Response Updated!' })).toBeVisible();
    expect(backend.submissions).toHaveLength(0);
    expect(backend.edits).toHaveLength(1);
  });
});

test.describe('questions that react to each other', () => {
  const logic = [
    text(1, 'Are you a student?', { is_required: true }),
    text(2, 'Which college?', { is_required: true, conditional_logic: { logic: 'AND', action: 'show', rules: [{ field: 1, operator: 'equals', value: 'yes' }] } }),
  ];

  test('a question appears when its condition is met, is required only then, and is dropped from the answer when it goes away', async ({ page }) => {
    const backend = await openForm(page, makeForm(logic));
    await expect(page.getByLabel('Which college?')).toHaveCount(0);
    await page.getByLabel('Are you a student?').fill('yes');
    await expect(page.getByLabel('Which college?')).toBeVisible();
    await page.getByLabel('Which college?').fill('SRKR');
    await page.getByLabel('Are you a student?').fill('no');
    await expect(page.getByLabel('Which college?')).toHaveCount(0);
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions[0].answers).toEqual([{ field: 1, value: 'no' }]);
  });

  test('a shown question that is required blocks the submit until answered', async ({ page }) => {
    const backend = await openForm(page, makeForm(logic));
    await page.getByLabel('Are you a student?').fill('yes');
    await submitButton(page).click();
    await expect(page.getByLabel('Which college?')).toBeFocused();
    expect(backend.submissions).toHaveLength(0);
  });

  test('a calculated total follows the numbers and is submitted', async ({ page }) => {
    const backend = await openForm(page, makeForm([
      { id: 1, label: 'Tickets', type: 'NUMBER', order: 1, is_required: true },
      { id: 2, label: 'Price', type: 'NUMBER', order: 2, is_required: true },
      { id: 3, label: 'Total', type: 'CALCULATED', order: 3, validation_rules: { formula: '{1} * {2}', decimals: 2 } },
    ]));
    await page.getByLabel('Tickets').fill('3');
    await page.getByLabel('Price').fill('12.5');
    await expect(page.getByText('37.5', { exact: false }).first()).toBeVisible();
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions[0].answers).toContainEqual({ field: 3, value: 37.5 });
  });

  test('a hidden question is filled from the link and a default is pre-filled', async ({ page }) => {
    const backend = await openForm(page, makeForm([
      text(1, 'City', { is_required: true, validation_rules: { defaultValue: 'Hyderabad' } }),
      { id: 2, label: 'Source', type: 'HIDDEN', order: 2, validation_rules: { queryParam: 'ref' } },
    ]), { path: '/forms/demo?ref=poster-7' });
    await expect(page.getByLabel('City')).toHaveValue('Hyderabad');
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions[0].answers).toEqual([{ field: 1, value: 'Hyderabad' }, { field: 2, value: 'poster-7' }]);
  });

  test('an option that is full is not offered', async ({ page }) => {
    await openForm(page, makeForm([{ id: 1, label: 'Slot', type: 'RADIO', order: 1, options: ['Morning', 'Evening'], validation_rules: { optionLimits: { Morning: 1 } } }]), {
      availability: { '1': { Morning: 0, Evening: 5 } },
    });
    await expect(page.getByText('Evening', { exact: true })).toBeVisible();
    await expect(page.getByText('Morning', { exact: true })).toHaveCount(0);
  });
});

test.describe('input kinds', () => {
  test('numbers, phone, web address, date and time reject bad values with a message and accept good ones', async ({ page }) => {
    const backend = await openForm(page, makeForm([
      { id: 1, label: 'Age', type: 'NUMBER', order: 1, is_required: true, min_value: 16, max_value: 60 },
      { id: 2, label: 'Phone', type: 'PHONE', order: 2, is_required: true },
      { id: 3, label: 'Portfolio', type: 'URL', order: 3 },
      { id: 4, label: 'Birthday', type: 'DATE', order: 4 },
      { id: 5, label: 'Arrival', type: 'TIME', order: 5 },
    ]));
    await page.getByLabel('Age').fill('5');
    await page.getByLabel('Phone').fill('12345');
    await page.getByLabel('Portfolio').fill('not a url');
    await submitButton(page).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    expect(backend.submissions).toHaveLength(0);
    expect(await page.getByRole('alert').count()).toBeGreaterThanOrEqual(3);

    await page.getByLabel('Age').fill('21');
    await page.getByLabel('Phone').fill('9876543210');
    await page.getByLabel('Portfolio').fill('https://example.org');
    await page.getByLabel('Birthday').fill('2005-04-09');
    await page.getByLabel('Arrival').fill('09:30');
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions[0].answers).toEqual(expect.arrayContaining([{ field: 1, value: '21' }, { field: 5, value: '09:30' }]));
  });

  test('the dropdown works with the keyboard', async ({ page }) => {
    const backend = await openForm(page, makeForm([{ id: 1, label: 'Branch', type: 'DROPDOWN', order: 1, is_required: true, options: ['CSE', 'ECE', 'EEE'] }]));
    const trigger = page.locator('#field-1');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions[0].answers).toEqual([{ field: 1, value: 'CSE' }]);
  });

  test('Escape closes the dropdown and keeps focus on it, and the question names the control', async ({ page }) => {
    await openForm(page, makeForm([{ id: 1, label: 'Branch', type: 'DROPDOWN', order: 1, options: ['CSE', 'ECE'] }]));
    await expect(page.getByRole('button', { name: /Branch/ })).toBeVisible();
    await page.locator('#field-1').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('listbox', { name: 'Branch' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(page.locator('#field-1')).toBeFocused();
  });

  test('radio and checkbox groups are named after their question for screen readers', async ({ page }) => {
    await openForm(page, makeForm([
      { id: 1, label: 'Track', type: 'RADIO', order: 1, options: ['AI', 'Web'] },
      { id: 2, label: 'Interests', type: 'CHECKBOX', order: 2, options: ['Robotics', 'Design'] },
    ]));
    await expect(page.getByRole('radiogroup', { name: 'Track' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Interests' })).toBeVisible();
  });

  test('a file that is too big is refused on the spot', async ({ page }) => {
    const backend = await openForm(page, makeForm([{ id: 1, label: 'Resume', type: 'FILE', order: 1, is_required: true, validation_rules: { maxFileSizeMB: 1 } }]));
    await page.locator('input[type="file"]').setInputFiles({ name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(2 * 1024 * 1024, 1) });
    await submitButton(page).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    expect(backend.submissions).toHaveLength(0);
  });

  test('a signature can be drawn and is submitted', async ({ page }) => {
    const backend = await openForm(page, makeForm([{ id: 1, label: 'Sign here', type: 'SIGNATURE', order: 1, is_required: true }]));
    const canvas = page.locator('canvas').first();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 40, { steps: 5 });
    await page.mouse.up();
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(String(backend.submissions[0].answers[0].value)).toMatch(/^data:image\/png;base64,/);
  });

  test('a linear scale and a checkbox group take several choices', async ({ page }) => {
    const backend = await openForm(page, makeForm([
      { id: 1, label: 'Confidence', type: 'LINEAR_SCALE', order: 1, min_value: 1, max_value: 5, is_required: true },
      { id: 2, label: 'Interests', type: 'CHECKBOX', order: 2, options: ['Robotics', 'Design', 'Web'], is_required: true },
    ]));
    await page.getByRole('button', { name: '4', exact: true }).click();
    await choose(page, 'Robotics');
    await choose(page, 'Web');
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions[0].answers).toEqual([{ field: 1, value: 4 }, { field: 2, value: ['Robotics', 'Web'] }]);
  });
});

test.describe('when things go wrong while submitting', () => {
  const simple = makeForm([text(1, 'Name', { is_required: true })]);

  test('double-clicking Submit sends one response', async ({ page }) => {
    const backend = await openForm(page, simple, { submitDelay: 600 });
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).dblclick();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions).toHaveLength(1);
  });

  test('pressing Enter inside a text box submits once and does not skip a required page', async ({ page }) => {
    const backend = await openForm(page, simple);
    await page.getByLabel('Name').fill('Dee');
    await page.getByLabel('Name').press('Enter');
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions).toHaveLength(1);
  });

  test('a server error is reported, the answers are kept and Submit works again', async ({ page }) => {
    const backend = await openForm(page, simple, {
      onSubmit: (_body, count) => (count === 1 ? { status: 500, body: { detail: 'Something broke on our side.' } } : { status: 201, body: { id: 1, answers: [] } }),
    });
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    await expect(page.getByText(/Something broke|Failed|failed/).first()).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue('Dee');
    await expect(submitButton(page)).toBeEnabled();
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions).toHaveLength(2);
  });

  test('losing the connection is reported and the visitor can try again', async ({ page }) => {
    const backend = await openForm(page, simple, { onSubmit: (_b, count) => (count === 1 ? null : { status: 201, body: { id: 1, answers: [] } }) });
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    await expect(submitButton(page)).toBeEnabled({ timeout: 30_000 });
    await expect(page.getByText('Submission Received!')).toHaveCount(0);
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions).toHaveLength(2);
  });

  test('being asked to slow down keeps the answers, shows a countdown and lets the visitor try again', async ({ page }) => {
    const backend = await openForm(page, simple, {
      onSubmit: (_body, count) => (count === 1
        ? { status: 429, body: { detail: 'You are going a little too fast. Please wait 2 seconds and try again.', code: 'THROTTLED', retry_after: 2 } }
        : { status: 201, body: { id: 1, answers: [] } }),
    });
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    await expect(page.getByText(/Try again in \d+s/)).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue('Dee');
    await expect(submitButton(page)).toBeEnabled({ timeout: 10_000 });
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions).toHaveLength(2);
  });

  test('the server saying the form just filled up is shown, not swallowed', async ({ page }) => {
    await openForm(page, simple, { onSubmit: () => ({ status: 400, body: { error: 'This form has reached its maximum number of responses.', code: 'MAX_TOTAL_RESPONSES_REACHED' } }) });
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    await expect(page.getByText('This form has reached its maximum number of responses.').first()).toBeVisible();
  });

  test('being signed out in the middle (401) sends the visitor to sign in without losing what they typed', async ({ page }) => {
    const backend = await openForm(page, simple, { onSubmit: () => ({ status: 401, body: { detail: 'Authentication credentials were not provided.' } }) });
    // Typing counts as a change only once the saved draft has been looked up (see useFormDraft).
    await expect.poll(() => backend.requests.includes('GET /forms/demo/draft/')).toBe(true);
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    await page.waitForURL(/\/login/, { timeout: 20_000 });
    const kept = await page.evaluate(() => sessionStorage.getItem('srkrcc_form_backup:demo:7'));
    expect(JSON.parse(kept!).answers).toEqual({ '1': 'Dee' });
  });

  test('the answers come back from this tab when the server has no draft', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('srkrcc_form_backup:demo:7', JSON.stringify({ answers: { '1': 'Back again' }, current_page: 0, at: Date.now() })));
    await openForm(page, simple);
    await expect(page.getByLabel('Name')).toHaveValue('Back again');
  });
});

test.describe('captcha', () => {
  const captchaForm = makeForm([text(1, 'Name', { is_required: true })], { captcha_enabled: true });

  test('without a site key the form says it cannot be submitted instead of hanging', async ({ page }) => {
    await openForm(page, captchaForm);
    await page.getByLabel('Name').fill('Dee');
    await expect(page.getByRole('alert').filter({ hasText: /bot check/i })).toBeVisible();
    await expect(submitButton(page)).toBeDisabled();
  });
});

test.describe('small screens and themes', () => {
  const wide = makeForm([
    text(1, 'A rather long question label that goes on and on so it has to wrap on a phone screen without breaking the layout', { is_required: true, description: 'And a long piece of help text that also needs to wrap nicely under the question.' }),
    { id: 2, label: 'Skills grid', type: 'MATRIX_RADIO', order: 2, options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], rows: ['Python programming', 'Java programming', 'Web development'] },
    { id: 3, label: 'Pick one', type: 'RADIO', order: 3, options: ['An option with quite a long name to see it wrap', 'Short'] },
  ]);

  test('on a phone nothing forces sideways scrolling and the submit button can be reached', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openForm(page, wide);
    await expect(page.getByLabel(/A rather long question/)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await submitButton(page).scrollIntoViewIfNeeded();
    await expect(submitButton(page)).toBeInViewport();
  });

  test('Telugu text does not overflow its buttons on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openForm(page, makeForm([text(1, 'పేరు', { is_required: true }), { id: 2, label: 'పేజీ', type: 'PAGE_BREAK', order: 2 }, text(3, 'కారణం')], { language: 'te' }));
    const next = page.getByRole('button', { name: 'తదుపరి' });
    await expect(next).toBeVisible();
    const box = (await next.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('touch targets for options are big enough to tap', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openForm(page, wide);
    const row = page.locator('label').filter({ has: page.getByText('Short', { exact: true }) }).first();
    const box = (await row.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(36);
  });

  test('dark mode keeps the form readable', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await openForm(page, wide);
    await expect(page.getByLabel(/A rather long question/)).toBeVisible();
    const found = await violations(page);
    expect(found.filter((v: string) => v.startsWith('color-contrast'))).toEqual([]);
  });

  test('text can be enlarged to 200% without the question being cut off', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await openForm(page, wide);
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    const label = page.getByLabel(/A rather long question/);
    await expect(label).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('after submitting', () => {
  test('refreshing after a submit does not allow a second response on a one-response form', async ({ page }) => {
    const backend = await openForm(page, makeForm([text(1, 'Name', { is_required: true })]));
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(backend.submissions).toHaveLength(1);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();
  });

  test('"Stay here" cancels the redirect', async ({ page }) => {
    await openForm(page, makeForm([text(1, 'Name', { is_required: true })], { redirect_url: '/forms', redirect_delay_seconds: 3 }));
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    await page.getByRole('button', { name: 'Stay here' }).click();
    await page.waitForTimeout(4000);
    expect(new URL(page.url()).pathname).toBe('/forms/demo');
    await expect(page.getByText('Submission Received!')).toBeVisible();
  });

  test('"Go now" does not wait', async ({ page }) => {
    await openForm(page, makeForm([text(1, 'Name', { is_required: true })], { redirect_url: '/forms', redirect_delay_seconds: 30 }));
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    await page.getByRole('button', { name: 'Go now' }).click();
    await page.waitForURL('**/forms', { timeout: 20_000 });
  });

  test('the thank-you message keeps its line breaks and shows markup as plain text', async ({ page }) => {
    await openForm(page, makeForm([text(1, 'Name', { is_required: true })], { confirmation_message: 'Line one\nLine two <b>not bold</b>' }));
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    const message = page.getByTestId('thank-you-message');
    await expect(message).toContainText('<b>not bold</b>');
    await expect(message.locator('b')).toHaveCount(0);
    const lines = await message.evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
    expect(lines).toBeGreaterThan(1.5);
  });

  test('an unsafe redirect that somehow got stored is ignored', async ({ page }) => {
    await openForm(page, makeForm([text(1, 'Name', { is_required: true })], { redirect_url: 'javascript:alert(1)', redirect_delay_seconds: 1 }));
    await page.getByLabel('Name').fill('Dee');
    await submitButton(page).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    await page.waitForTimeout(2500);
    await expect(page.getByRole('status').filter({ hasText: /second/ })).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe('/forms/demo');
  });
});
