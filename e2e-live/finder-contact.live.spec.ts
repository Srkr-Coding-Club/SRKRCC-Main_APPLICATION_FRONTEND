import { expect, test } from '@playwright/test';
import { helper, signIn, uniqueEmail } from './live';

/**
 * In the team finder a mobile number goes to team leaders only: they can call before inviting someone
 * or accepting a request. Everyone else, and the page's other lists, never show it.
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'contact-fest';
const NUMBER = '9333344444';
let leader = '';
let seeker = '';
let stranger = '';

test.beforeAll(() => {
  leader = uniqueEmail('lead');
  seeker = uniqueEmail('sita');
  stranger = uniqueEmail('omar');
  helper('create_user', leader, '--verified', '--first-name', 'Lena', '--phone', '9111100000');
  helper('create_user', seeker, '--verified', '--first-name', 'Sita', '--phone', NUMBER);
  helper('create_user', stranger, '--verified', '--first-name', 'Omar', '--phone', '9555566666');
  helper('make_finder_hackathon', SLUG, '--leader', leader);
});

test.beforeEach(() => { helper('clear_cache'); });

test('a person lists themselves, and is told leaders will see their number', async ({ page }) => {
  await signIn(page, seeker);
  await page.goto(`/hackathons/${SLUG}/finder`);
  await expect(page.getByText(/your mobile number is shown only to team leaders/i)).toBeVisible();
  await page.getByLabel('Your skills').fill('React, design');
  await page.getByRole('button', { name: 'List me' }).click();
  await expect(page.getByText('You are listed in the team finder')).toBeVisible();
});

test('someone who leads no team does not see the number', async ({ page }) => {
  await signIn(page, stranger);
  await page.goto(`/hackathons/${SLUG}/finder`);
  await expect(page.getByText('Sita')).toBeVisible();
  await expect(page.getByText(NUMBER)).toHaveCount(0);
});

test('the team leader sees the number on the person, before inviting', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/finder`);
  const row = page.locator('li', { hasText: 'Sita' }).first();
  await expect(row.getByRole('link', { name: NUMBER })).toBeVisible();
  await expect(row.getByRole('link', { name: NUMBER })).toHaveAttribute('href', `tel:${NUMBER}`);
});

test('the leader sees the number on a join request, before accepting', async ({ page, browser }) => {
  const sitaContext = await browser.newContext();
  const sita = await sitaContext.newPage();
  await signIn(sita, seeker);
  await sita.goto(`/hackathons/${SLUG}/finder`);
  await sita.getByRole('button', { name: /Ask to join/ }).click();
  await sita.getByRole('button', { name: 'Send request' }).click();
  await expect(sita.getByText(/Request sent: waiting for the leader/)).toBeVisible();
  await sitaContext.close();

  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  const card = page.getByRole('region', { name: 'Teams and people' });
  await expect(card.getByText(/Waiting for your answer \(1\)/)).toBeVisible({ timeout: 30_000 });
  const request = card.locator('li', { hasText: 'wants to join' });
  await expect(request.getByRole('link', { name: NUMBER })).toBeVisible();
});
