import { expect, test } from '@playwright/test';
import { openAdmin } from './admin-helpers';
import { openSite, unverified } from './site-helpers';

/**
 * One place that checks the fixes from the latest round in the browser:
 *  - Admin "Create New User": Year of Study and College are on the form, the server's year error lands under Year,
 *    and Club IDs accept 25SCC/21CCA formats while refusing the rest.
 *  - Email verification: the banner shows by default (mode "banner") without restricting anyone.
 * The navbar, round delete, idea card and team finder fixes have their own specs (listed in the report).
 */

const openCreate = async (page: import('@playwright/test').Page, context: any, handlers: Record<string, any> = {}) => {
  const backend = await openAdmin(page, context, '/admin/users', {
    'GET ^/auth/users/': () => [],
    'GET ^/forms/': () => [],
    ...handlers,
  });
  await page.getByRole('button', { name: /Create New User/ }).first().click();
  await expect(page.getByRole('dialog', { name: /Create New User Account/ })).toBeVisible();
  return backend;
};

test.describe('admin: create user form', () => {
  test('Year of Study and College are on the form, with the four years to choose from', async ({ page, context }) => {
    await openCreate(page, context);
    const dialog = page.getByRole('dialog', { name: /Create New User Account/ });
    const year = dialog.getByLabel(/Year of Study/);
    await expect(year).toBeVisible();
    await expect(year.locator('option')).toHaveText(['1st Year', '2nd Year', '3rd Year', '4th Year']);
    await expect(dialog.getByLabel(/^College/)).toBeVisible();
  });

  test('the server saying the year is wrong shows the message under the Year field', async ({ page, context }) => {
    await openCreate(page, context, {
      'POST ^/auth/register/': () => ({
        __status: 400,
        year: ['Year of study must be between 1 and 4.'],
      }),
    });
    const dialog = page.getByRole('dialog', { name: /Create New User Account/ });
    await dialog.getByLabel(/Full Name/).fill('Ravi Kumar');
    await dialog.getByLabel(/^Email/).fill('ravi.fixes@example.org');
    await dialog.getByLabel(/^Password/).fill('AdminSet#2026');
    await dialog.getByRole('button', { name: 'Save User Account' }).click();
    const yearError = dialog.getByText('Year of study must be between 1 and 4.');
    await expect(yearError).toBeVisible();
    await expect(yearError).toHaveAttribute('role', 'alert');
    await expect(dialog.getByLabel(/Full Name/)).toHaveValue('Ravi Kumar');
  });

  test('a club id in 25SCC or 21CCA format is accepted, and the other formats are refused with the list', async ({ page, context }) => {
    await openCreate(page, context);
    const dialog = page.getByRole('dialog', { name: /Create New User Account/ });
    await dialog.getByLabel(/Platform Role/).selectOption('AFFILIATE');
    const clubId = dialog.getByLabel(/Affiliate ID/);

    await clubId.fill('25XYZ123');
    await dialog.getByRole('button', { name: 'Save User Account' }).click();
    await expect(dialog.getByText(/Affiliate ID must look like 25SCC277 or 21CCA041/).first()).toBeVisible();

    await clubId.fill('21cca041');
    await expect(clubId).toHaveValue('21CCA041');
    await expect(dialog.getByText(/Affiliate ID must look like/)).toHaveCount(0);

    await clubId.fill('25scc123');
    await expect(clubId).toHaveValue('25SCC123');
  });
});

test.describe('email verification: banner by default', () => {
  test('an unverified member sees the banner with the days left, and can still use the site', async ({ page }) => {
    await openSite(page, '/forms', { verification: unverified({ mode: 'banner', days_left: 7, blocked: false }) });
    const banner = page.getByRole('region', { name: 'Email verification' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Verify email');
    await expect(page.getByRole('heading', { name: 'Verify your email to continue' })).toHaveCount(0);
  });
});
