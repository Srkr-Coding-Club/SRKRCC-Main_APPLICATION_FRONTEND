import { expect, test } from '@playwright/test';
import { helper, signIn, uniqueEmail } from './live';

/**
 * The team dashboard must show a change as soon as it is made, without a page refresh:
 * renaming the team, inviting someone, and removing a member.
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'refresh-check';
const team = () => helper<{ members: string[]; status: string; requests: string[]; rounds: string[]; name?: string }>('team_state', SLUG);

let leader = '';
let seeker = '';

test.beforeAll(() => {
  leader = uniqueEmail('refresh');
  seeker = uniqueEmail('invitee');
  helper('create_user', leader, '--verified', '--first-name', 'Rina');
  helper('create_user', seeker, '--verified', '--first-name', 'Sam');
  helper('make_finder_hackathon', SLUG, '--leader', leader);
});

test.beforeEach(() => { helper('clear_cache'); });

test('renaming the team shows the new name on the dashboard straight after saving', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await expect(page.getByRole('heading', { name: 'Open Door', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: /Edit team/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Team name').fill('Renamed Crew');
  await dialog.getByRole('button', { name: 'Save changes' }).click();

  // No reload: the heading has to change on its own.
  await expect(page.getByRole('heading', { name: 'Renamed Crew', level: 1 })).toBeVisible({ timeout: 5_000 });
});

test('inviting a teammate shows the invite on the leader\'s dashboard without refreshing', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('button', { name: /Invite member/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Find Teammate').fill(seeker);
  await dialog.getByText(seeker, { exact: true }).click();
  await dialog.getByRole('button', { name: 'Send Invite' }).click();
  await expect(dialog).toHaveCount(0, { timeout: 10_000 });

  // No reload: the invite has to appear in the team section on its own.
  await expect(page.getByText('Sam', { exact: false }).first()).toBeVisible({ timeout: 5_000 });
  expect(team().members).not.toContain(seeker.toLowerCase());
});

test('after the invitee joins, removing them updates the member count and list straight away', async ({ page, browser }) => {
  // Sam accepts the invite from the previous test in their own browser.
  const samContext = await browser.newContext();
  const sam = await samContext.newPage();
  await signIn(sam, seeker);
  await sam.goto(`/hackathons/${SLUG}/dashboard`);
  await sam.getByRole('button', { name: /^Accept$/ }).click();
  await expect(sam.getByText(/You joined/)).toBeVisible({ timeout: 15_000 });
  await samContext.close();

  // The leader reloads once to pick up Sam's acceptance, then removes Sam with no further reload.
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await expect(page.getByRole('heading', { name: /Team members \(2\//i })).toBeVisible();

  const samRow = page.locator('li', { hasText: 'Sam' }).first();
  await samRow.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove member' }).click();
  await expect(page.getByText('Member removed')).toBeVisible({ timeout: 5_000 });

  // No reload: the count and the list both have to change on their own.
  await expect(page.getByRole('heading', { name: /Team members \(1\//i })).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('li', { hasText: 'Sam' })).toHaveCount(0);
  expect(team().members).not.toContain(seeker.toLowerCase());
});

test('when someone accepts an invite, the leader\'s open dashboard shows them without a refresh', async ({ page, browser }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await expect(page.getByRole('heading', { name: /Team members \(1\//i })).toBeVisible();

  await page.getByRole('button', { name: /Invite member/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Find Teammate').fill(seeker);
  await dialog.getByText(seeker, { exact: true }).click();
  await dialog.getByRole('button', { name: 'Send Invite' }).click();
  await expect(dialog).toHaveCount(0, { timeout: 10_000 });

  const samContext = await browser.newContext();
  const sam = await samContext.newPage();
  await signIn(sam, seeker);
  await sam.goto(`/hackathons/${SLUG}/dashboard`);
  await sam.getByRole('button', { name: /^Accept$/ }).click();
  await expect(sam.getByText(/You joined/)).toBeVisible({ timeout: 15_000 });
  await samContext.close();

  // The leader's page was never reloaded: it has to catch up on its own.
  await expect(page.getByRole('heading', { name: /Team members \(2\//i })).toBeVisible({ timeout: 40_000 });
});
