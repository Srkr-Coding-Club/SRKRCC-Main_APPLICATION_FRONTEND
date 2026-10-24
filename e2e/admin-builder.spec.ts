import { expect, test } from '@playwright/test';
import { openAdmin, savedForm } from './admin-helpers';

const slugForm = { 'GET ^/forms/demo/$': () => savedForm() };

test.describe('the form builder', () => {
  test('opens a saved form with its questions and the tools for a saved form', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?slug=demo', slugForm);
    await expect(page.getByText('Full name').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'History' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analytics' })).toBeVisible();
  });

  test('a brand-new form has no history or analytics yet', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?new=true');
    await expect(page.getByRole('button', { name: 'Preview' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analytics' })).toHaveCount(0);
  });

  test('the after-submit settings are saved with the form', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/builder?slug=demo', {
      ...slugForm,
      'PUT ^/forms/demo/': (call) => ({ ...savedForm(), ...call.body }),
    });
    await page.getByLabel(/Thank-you message/).fill('See you there, {{11}}!');
    await page.getByLabel(/Then send them to/).fill('/events');
    await page.getByLabel(/After \(seconds\)/).fill('8');
    await page.getByLabel(/Language of the form/).selectOption('te');
    await page.getByRole('button', { name: /Save/ }).first().click();
    await expect.poll(() => admin.find('PUT', '/forms/demo/').length).toBeGreaterThan(0);
    const sent = admin.find('PUT', '/forms/demo/')[0].body;
    expect(sent).toMatchObject({ confirmation_message: 'See you there, {{11}}!', redirect_url: '/events', redirect_delay_seconds: 8, language: 'te' });
  });

  test('an unsafe redirect is flagged as it is typed, before saving', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?slug=demo', slugForm);
    await page.getByLabel(/Then send them to/).fill('javascript:alert(1)');
    await expect(page.getByRole('alert').filter({ hasText: /https:\/\// })).toBeVisible();
    await page.getByLabel(/Then send them to/).fill('/events');
    await expect(page.getByRole('alert').filter({ hasText: /https:\/\// })).toHaveCount(0);
  });

  test('a refusal from the server about the redirect is shown to the admin', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?slug=demo', {
      ...slugForm,
      'PUT ^/forms/demo/': () => ({ __status: 400, redirect_url: ['The redirect must be an https:// address or a path on this site such as /events.'] }),
    });
    await page.getByLabel(/Then send them to/).fill('http://plain.example');
    await page.getByRole('button', { name: /Save/ }).first().click();
    await expect(page.getByText(/redirect must be an https/i).first()).toBeVisible();
  });

  test('the bot-check switch tells the admin what it needs, and the server refusing it is explained', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?slug=demo', {
      ...slugForm,
      'PUT ^/forms/demo/': () => ({ __status: 400, captcha_enabled: ['The bot check (CAPTCHA) is switched on for this form, but the server has no TURNSTILE_SECRET_KEY, so nobody could submit it.'] }),
    });
    await page.getByLabel('Bot check (CAPTCHA)').check();
    await expect(page.getByText(/TURNSTILE_SECRET_KEY on the server/)).toBeVisible();
    await page.getByRole('button', { name: /Publish|Save/ }).first().click();
    await expect(page.getByText(/no TURNSTILE_SECRET_KEY/).first()).toBeVisible();
  });
});

test.describe('dialogs opened from the builder', () => {
  test('analytics: shows the numbers and changes period', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/builder?slug=demo', {
      ...slugForm,
      'GET /analytics/': (call) => {
        const days = Number(new URL(`http://x${call.path}`).searchParams.get('days'));
        return {
          form: { id: 55, slug: 'demo', title: 'Hack Night' }, total_responses: 12, responses_analysed: 12, truncated: false,
          first_response_at: null, last_response_at: null, days,
          timeline: Array.from({ length: days }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, count: i % 3 })),
          unfinished: { count: 2, stopped_after: [{ field_id: 11, label: 'Full name', count: 2 }] },
          fields: [{ field_id: 12, label: 'Track', type: 'RADIO', answered: 12, answer_rate: 1, options: [{ option: 'AI', count: 9 }, { option: 'Web', count: 3 }] }],
        };
      },
    });
    await page.getByRole('button', { name: 'Analytics' }).click();
    await expect(page.getByTestId('total-responses')).toHaveText('12');
    await expect(page.getByText('After "Full name"')).toBeVisible();
    await page.getByRole('button', { name: '90 days' }).click();
    await expect.poll(() => admin.find('GET', 'days=90').length).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('history: lists versions and asks before restoring', async ({ page, context }) => {
    const admin = await openAdmin(page, context, '/admin/builder?slug=demo', {
      ...slugForm,
      'GET /versions/$': () => [
        { version: 3, note: 'Saved', created_at: '2026-10-22T09:00:00Z', created_by: 'ada@srkr.ac.in', is_current: true, summary: { settings: 1, added: 0, removed: 0, changed: 0, reordered: false } },
        { version: 2, note: 'Published', created_at: '2026-10-21T09:00:00Z', created_by: null, is_current: false, summary: null },
      ],
      'GET /versions/\\d+/': () => ({ version: 2, note: '', created_at: '', diff: { form: [], fields: { added: [], removed: [], changed: [], reordered: false }, summary: { settings: 0, added: 0, removed: 0, changed: 0, reordered: false }, is_empty: true } }),
      'POST /restore/': () => savedForm({ version: 4 }),
    });
    await page.getByRole('button', { name: 'History' }).click();
    const dialog = page.getByRole('dialog', { name: 'Form history' });
    await dialog.getByText('Published', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Restore this version' }).click();
    await expect(dialog.getByText(/saved as version 4/)).toBeVisible();
    expect(admin.find('POST', '/restore/')).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Restore version 2' }).click();
    await expect(dialog).toHaveCount(0);
    expect(admin.find('POST', '/versions/2/restore/')).toHaveLength(1);
  });

  test('Tab never leaves an open dialog', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?slug=demo', slugForm);
    await page.getByRole('button', { name: 'History' }).click();
    const dialog = page.getByRole('dialog', { name: 'Form history' });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
  });
});

test.describe('saving a form that is already live', () => {
  test('the admin sees what will change and can back out without saving', async ({ page, context }) => {
    const live = savedForm({ status: 'PUBLISHED', response_count: 12 });
    const admin = await openAdmin(page, context, '/admin/builder?slug=demo', {
      'GET ^/forms/demo/$': () => live,
      'POST /preview-changes/': () => ({
        current_version: 3,
        diff: { form: [], fields: { added: [{ id: null, label: 'Phone', type: 'PHONE' }], removed: [], changed: [], reordered: false }, summary: { settings: 0, added: 1, removed: 0, changed: 0, reordered: false }, is_empty: false },
        impact: { response_count: 12, new_required: [{ id: null, label: 'Phone' }], now_required: [], removed_with_answers: [], options_removed_with_answers: [], type_changes_blocked: [] },
      }),
      'PUT ^/forms/demo/': (call) => ({ ...live, ...call.body }),
    });
    await page.getByLabel(/Thank-you message/).fill('Updated');
    await page.getByRole('button', { name: /Save|Update/ }).first().click();
    const dialog = page.getByRole('dialog', { name: /Review/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('alert')).toContainText('"Phone" is new and required');
    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    await expect(dialog).toHaveCount(0);
    expect(admin.find('PUT', '/forms/demo/')).toHaveLength(0);
    await expect(page.getByLabel(/Thank-you message/)).toHaveValue('Updated');
  });
});

test.describe('accessibility of the builder', () => {
  const run = async (page: import('@playwright/test').Page) => {
    await page.addScriptTag({ content: (await import('axe-core')).default.source });
    return page.evaluate(async () => {
      const result = await (window as any).axe.run(document.body, { rules: { region: { enabled: false } } });
      return result.violations.map((v: any) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 4).map((n: any) => n.target.join(' ')).join(' | ')}`);
    });
  };

  test('the builder canvas and settings panel have no violations', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?slug=demo', slugForm);
    await expect(page.getByText('Full name').first()).toBeVisible();
    expect(await run(page)).toEqual([]);
  });

  test('and none in dark mode', async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await openAdmin(page, context, '/admin/builder?slug=demo', slugForm);
    await expect(page.getByText('Full name').first()).toBeVisible();
    expect(await run(page)).toEqual([]);
  });

  test('the new dialogs have none while open', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/builder?slug=demo', slugForm);
    for (const name of ['Analytics', 'History']) {
      await page.getByRole('button', { name }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(300);
      expect(await run(page), name).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });
});
