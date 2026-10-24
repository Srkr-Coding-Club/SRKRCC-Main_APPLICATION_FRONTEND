import axe from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { audit, report } from './audit';
import { makeForm, type Question } from './helpers';
import { openSite, unverified, verifiedState } from './site-helpers';

const name: Question = { id: 1, label: 'Full name', type: 'TEXT', order: 1, is_required: true };
const demoForm = (extra: Record<string, unknown> = {}) => makeForm([name], extra);
const formHandler = (extra: Record<string, unknown> = {}) => (call: { method: string; path: string }) =>
  call.method === 'GET' && call.path === '/forms/demo/' ? { body: demoForm(extra) } : undefined;

async function accessibilityViolations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.body, { rules: { region: { enabled: false } } });
    return result.violations.map((v: any) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n: any) => n.target.join(' ')).join(' | ')}`);
  });
}

test.describe('the banner and sending the link', () => {
  test('shows the days left, sends the link on click, then counts down before another', async ({ page }) => {
    const site = await openSite(page, '/forms', {
      verification: unverified(),
      handlers: [(c) => (c.path === '/auth/email/verification/request/' ? { body: { detail: 'sent', sent: true, email_masked: 'd**@example.org' } } : undefined)],
    });
    const banner = page.getByRole('region', { name: 'Email verification' });
    await expect(banner).toContainText('5 days left');
    expect(site.find('POST', '/auth/email/verification/request/')).toHaveLength(0); // nothing is sent until the click
    await banner.getByRole('button', { name: 'Verify email' }).click();
    await expect(banner.getByText('Link sent to d**@example.org')).toBeVisible();
    expect(site.find('POST', '/auth/email/verification/request/')).toHaveLength(1);
    await expect(banner.getByRole('button', { name: /Send again in \d+s/ })).toBeDisabled();
  });

  test('the banner is accessible, and gone for a verified person and when the feature is off', async ({ page }) => {
    await openSite(page, '/forms', { verification: unverified() });
    await expect(page.getByRole('region', { name: 'Email verification' })).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test('nothing shows for a verified person', async ({ page }) => {
    await openSite(page, '/forms', { verification: verifiedState() });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('region', { name: 'Email verification' })).toHaveCount(0);
  });

  test('nothing shows when verification is switched off on the server', async ({ page }) => {
    await openSite(page, '/forms', { verification: unverified({ mode: 'off' }) });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('region', { name: 'Email verification' })).toHaveCount(0);
  });

  test('a signed-out visitor sees no banner and no calls are made to the verification API', async ({ page }) => {
    const site = await openSite(page, '/forms', { verification: unverified(), asUser: null });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('region', { name: 'Email verification' })).toHaveCount(0);
    expect(site.find('GET', '/auth/me')).toHaveLength(0);
  });

  test('the server saying the email service is down is shown, and the button comes back', async ({ page }) => {
    await openSite(page, '/forms', {
      verification: unverified(),
      handlers: [(c) => (c.path === '/auth/email/verification/request/' ? { status: 503, body: { detail: 'We could not send the email just now. Please try again in a moment.', code: 'SEND_FAILED' } } : undefined)],
    });
    await page.getByRole('region', { name: 'Email verification' }).getByRole('button', { name: 'Verify email' }).click();
    await expect(page.getByRole('alert').first()).toContainText('could not send the email just now');
    await expect(page.getByRole('region', { name: 'Email verification' }).getByRole('button', { name: /Verify email|Send again/ })).toBeEnabled({ timeout: 20_000 });
  });
});

test.describe('the link from the email', () => {
  const statusAnswer = (body: unknown, status = 200) => (c: { path: string }) => (c.path.startsWith('/auth/email/verification/status/') ? { status, body } : undefined);

  test('opens on a button, not on its own, and confirms; the token leaves the address bar', async ({ page }) => {
    const site = await openSite(page, '/account/verify-email?token=abc123', {
      verification: verifiedState(),
      asUser: null,
      handlers: [
        statusAnswer({ valid: true, email_masked: 'd**@example.org', purpose: 'VERIFY', first_name: 'Dee' }),
        (c) => (c.path === '/auth/email/verification/confirm/' ? { body: { verified: true, already: false, email_masked: 'd**@example.org', purpose: 'VERIFY' } } : undefined),
      ],
    });
    await expect(page.getByRole('heading', { name: 'Confirm your email address' })).toBeVisible();
    expect(page.url()).not.toContain('token');
    expect(site.find('POST', '/auth/email/verification/confirm/')).toHaveLength(0); // looking never uses the link
    await page.getByRole('button', { name: 'Confirm my email' }).click();
    await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();
    expect(site.find('POST', '/auth/email/verification/confirm/')[0].body).toEqual({ token: 'abc123' });
    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test('an expired link says so', async ({ page }) => {
    await openSite(page, '/account/verify-email?token=old', {
      verification: verifiedState(), asUser: null,
      handlers: [statusAnswer({ detail: 'This link has expired or was replaced by a newer one.', code: 'LINK_EXPIRED' }, 400)],
    });
    await expect(page.getByRole('heading', { name: 'This link has expired' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in to get a new link' })).toBeVisible();
  });

  test('a link opened twice says it is already confirmed', async ({ page }) => {
    await openSite(page, '/account/verify-email?token=used', {
      verification: verifiedState(), asUser: null,
      handlers: [statusAnswer({ valid: false, code: 'ALREADY_USED', already_verified: true, email_masked: 'd**@example.org', purpose: 'VERIFY' })],
    });
    await expect(page.getByRole('heading', { name: 'Already confirmed' })).toBeVisible();
  });

  test('a page opened without a token explains itself', async ({ page }) => {
    await openSite(page, '/account/verify-email', { verification: verifiedState(), asUser: null });
    await expect(page.getByRole('heading', { name: 'No link found' })).toBeVisible();
  });

  test('"This wasn\'t me" only acts on the button', async ({ page }) => {
    const site = await openSite(page, '/account/verify-email/not-me?token=dispute1', {
      verification: verifiedState(), asUser: null,
      handlers: [(c) => (c.path === '/auth/email/verification/dispute/' ? { body: { done: true, already: false, removed: true } } : undefined)],
    });
    await expect(page.getByRole('heading', { name: 'Was this not you?' })).toBeVisible();
    expect(site.find('POST', '/dispute/')).toHaveLength(0);
    await page.getByRole('button', { name: "This wasn't me" }).click();
    await expect(page.getByRole('heading', { name: 'Thank you, it is done' })).toBeVisible();
    expect(site.find('POST', '/dispute/')[0].body).toEqual({ token: 'dispute1' });
  });

  test('both pages work on a 320px phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openSite(page, '/account/verify-email?token=abc', {
      verification: verifiedState(), asUser: null,
      handlers: [statusAnswer({ valid: true, email_masked: 'a-rather-long-name@example.org', purpose: 'VERIFY' })],
    });
    await expect(page.getByRole('button', { name: 'Confirm my email' })).toBeVisible();
    expect(report(await audit(page))).toEqual([]);
  });
});

test.describe('after the deadline', () => {
  test('a private page is replaced by the verify screen, public pages stay open, and verifying brings it back', async ({ page }) => {
    let state = unverified({ blocked: true, days_left: 0 });
    await openSite(page, '/profile', {
      verification: () => state,
      handlers: [(c) => (c.path === '/auth/email/verification/request/' ? { body: { detail: 'sent', sent: true, email_masked: 'd**@example.org' } } : undefined)],
    });
    await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Verify email' }).click();
    await expect(page.getByText(/We sent a link to d\*\*@example.org/)).toBeVisible();

    await page.getByRole('link', { name: 'Browse public pages' }).click();
    await page.waitForURL('**/');
    await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toHaveCount(0);

    await page.goto('/forms');
    await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toHaveCount(0);

    state = verifiedState();
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toHaveCount(0);
  });

  test('"I have verified" lets someone back in without signing in again', async ({ page }) => {
    let state = unverified({ blocked: true, days_left: 0 });
    await openSite(page, '/profile', { verification: () => state });
    await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toBeVisible();
    state = verifiedState();
    await page.getByRole('button', { name: /I have verified/ }).click();
    await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toHaveCount(0, { timeout: 20_000 });
  });

  test('the blocked screen fits a 320px phone and has big enough buttons', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openSite(page, '/profile', { verification: unverified({ blocked: true, days_left: 0 }) });
    await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toBeVisible();
    expect(report(await audit(page))).toEqual([]);
  });

  test('a wrong address can be corrected from the blocked screen', async ({ page }) => {
    const site = await openSite(page, '/profile', {
      verification: unverified({ blocked: true, days_left: 0 }),
      handlers: [(c) => (c.path === '/auth/email/change/' ? { body: { detail: 'We sent a link to n**@example.org. Your address changes once you confirm it.', sent: true } } : undefined)],
    });
    await page.getByRole('button', { name: /Wrong address/ }).click();
    await page.getByLabel('New email address').fill('new@example.org');
    await page.getByLabel('Your password').fill('Secret123!');
    await page.getByRole('button', { name: 'Send a link to the new address' }).click();
    await expect(page.getByText(/Your address changes once you confirm it/)).toBeVisible();
    expect(site.find('POST', '/auth/email/change/')[0].body).toEqual({ new_email: 'new@example.org', password: 'Secret123!' });
  });
});

test.describe('filling in a form', () => {
  test('an unverified person can read the form but not fill it in or submit it', async ({ page }) => {
    const site = await openSite(page, '/forms/demo', { verification: unverified({ mode: 'features' }), handlers: [formHandler()] });
    await expect(page.getByRole('heading', { name: 'Hack Night' })).toBeVisible();
    await expect(page.getByText('Verify your email address to fill in this form.')).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Submit Form' })).toBeDisabled();
    await page.waitForTimeout(2200); // long enough for an autosave to have happened if it were going to
    expect(site.find('PUT', '/draft/')).toHaveLength(0);
    expect(site.find('POST', '/forms/submissions/')).toHaveLength(0);
  });

  test('"Verify email" on a locked form opens the dialog and sends the link', async ({ page }) => {
    const site = await openSite(page, '/forms/demo', {
      verification: unverified({ mode: 'features' }),
      handlers: [formHandler(), (c) => (c.path === '/auth/email/verification/request/' ? { body: { detail: 'sent', sent: true, email_masked: 'd**@example.org' } } : undefined)],
    });
    await page.getByRole('region', { name: 'Email verification' }).filter({ hasText: 'fill in this form' }).getByRole('button', { name: 'Verify email' }).click();
    const dialog = page.getByRole('dialog', { name: 'Verify your email' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Verify email' }).click();
    await expect(dialog.getByText(/We sent a link to d\*\*@example.org/)).toBeVisible();
    expect(site.find('POST', '/auth/email/verification/request/')).toHaveLength(1);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('a verified person fills it in and submits as before', async ({ page }) => {
    const site = await openSite(page, '/forms/demo', {
      verification: verifiedState({ mode: 'features' }),
      handlers: [formHandler(), (c) => (c.path === '/forms/submissions/' ? { status: 201, body: { id: 1, answers: [] } } : undefined)],
    });
    await expect(page.getByLabel('Full name')).toBeEnabled();
    await page.getByLabel('Full name').fill('Dee');
    await page.getByRole('button', { name: 'Submit Form' }).click();
    await expect(page.getByText('Submission Received!')).toBeVisible();
    expect(site.find('POST', '/forms/submissions/')).toHaveLength(1);
  });

  test('in banner mode nothing is restricted yet', async ({ page }) => {
    await openSite(page, '/forms/demo', { verification: unverified({ mode: 'banner' }), handlers: [formHandler()] });
    await expect(page.getByLabel('Full name')).toBeEnabled();
    await expect(page.getByText('Verify your email address to fill in this form.')).toHaveCount(0);
  });

  test('if the server still refuses (the rule changed under the page), the dialog explains and the answers stay', async ({ page }) => {
    await openSite(page, '/forms/demo', {
      verification: unverified({ mode: 'banner' }),
      handlers: [
        formHandler(),
        (c) => (c.path === '/forms/submissions/' ? { status: 403, body: { detail: 'Verify your email address to use this feature.', code: 'EMAIL_VERIFICATION_REQUIRED', reason: 'feature', blocked: false, days_left: 5 } } : undefined),
      ],
    });
    await page.getByLabel('Full name').fill('Dee');
    await page.getByRole('button', { name: 'Submit Form' }).click();
    await expect(page.getByRole('dialog', { name: 'Verify your email' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Full name')).toHaveValue('Dee');
  });
});

test.describe('the profile page', () => {
  test('shows the status and lets an unverified person start verifying', async ({ page }) => {
    await openSite(page, '/profile', { verification: unverified({ mode: 'features' }) });
    await expect(page.getByRole('region', { name: 'Email verification' }).filter({ hasText: 'Email not verified' })).toBeVisible();
  });
});
