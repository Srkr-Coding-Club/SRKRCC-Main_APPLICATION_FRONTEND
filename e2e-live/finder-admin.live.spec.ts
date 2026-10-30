import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import { SITE_URL, helper, signIn, stateDir, uniqueEmail } from './live';

/**
 * The organizer's Team Finder tab end to end: real backend, real site.
 * Who is looking, who is recruiting, the requests between them; removing, closing, placing, stopping and reminding,
 * with the people involved told. Watch it:  pnpm test:e2e:live --headed e2e-live/finder-admin.live.spec.ts
 * (screenshots: test-results/live/finder-admin/)
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'finder-admin-fest';
const SHOTS = join(stateDir, 'finder-admin');
const WAIT = { timeout: 30_000 };

interface FinderState { members: string[]; status: string; recruiting: boolean; seekers: Record<string, { active: boolean; skills: string; note: string }>; requests: Record<string, string> }
const state = () => helper<FinderState>('finder_state', SLUG);
const notes = (email: string) => helper<{ title: string; message: string }[]>('notifications', email);

let admin = '';
let leader = '';
const people: Record<'sita' | 'meena' | 'omar' | 'ravi' | 'nila', string> = { sita: '', meena: '', omar: '', ravi: '', nila: '' };

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

const panel = (page: Page) => page.getByRole('region', { name: 'Team finder' });
const openTab = async (page: Page, tab = 'finder') => {
  await page.goto(`/admin/hackathons/${SLUG}?tab=${tab}`);
  await expect(page.getByRole('tab', { name: /Team Finder/ })).toBeVisible(WAIT);
};
const card = (page: Page, name: string) => panel(page).getByRole('listitem').filter({ hasText: name });

test.beforeAll(() => {
  admin = uniqueEmail('boss');
  leader = uniqueEmail('lena');
  for (const key of Object.keys(people) as (keyof typeof people)[]) people[key] = uniqueEmail(key);
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
  helper('create_user', leader, '--verified', '--first-name', 'Lena', '--phone', '9111100000');
  helper('create_user', people.sita, '--verified', '--first-name', 'Sita', '--phone', '9222200001');
  helper('create_user', people.meena, '--verified', '--first-name', 'Meena', '--phone', '9222200002');
  helper('create_user', people.omar, '--verified', '--first-name', 'Omar', '--phone', '9222200003');
  helper('create_user', people.ravi, '--verified', '--first-name', 'Ravi', '--phone', '9222200004');
  helper('create_user', people.nila, '--verified', '--first-name', 'Nila', '--phone', '9222200005');
  helper('make_finder_hackathon', SLUG, '--leader', leader);
  helper('list_seeker', SLUG, people.sita, '--days', '5', '--skills', 'React, Figma', '--note', 'Keen on healthcare');
  helper('list_seeker', SLUG, people.meena, '--days', '0', '--skills', 'Python', '--note', 'Please call me');
  helper('list_seeker', SLUG, people.omar, '--days', '4', '--skills', 'Embedded');
  helper('list_seeker', SLUG, people.ravi, '--days', '1', '--skills', 'Django');
  helper('list_seeker', SLUG, people.nila, '--days', '2', '--skills', 'Design');
  helper('ask_to_join', SLUG, people.omar, '--hours', '60', '--message', 'Waiting for days');
  helper('ask_to_join', SLUG, people.ravi, '--hours', '1', '--message', 'Just asked');
});

test.beforeEach(() => { helper('clear_cache'); });

test('the tab lists everyone who is looking, with skills, notes and contact, and the numbers', async ({ page }) => {
  await signIn(page, admin);
  await openTab(page);
  await expect(page.getByText('Looking for a team').first()).toBeVisible(WAIT);
  for (const name of ['Sita', 'Meena', 'Omar', 'Ravi', 'Nila']) await expect(panel(page).getByText(name, { exact: false }).first()).toBeVisible();
  await expect(card(page, 'Sita')).toContainText('React, Figma');
  await expect(card(page, 'Sita')).toContainText('Keen on healthcare');
  await expect(card(page, 'Sita')).toContainText('listed 5 days ago');
  await expect(card(page, 'Meena').getByRole('link', { name: '9222200002' })).toBeVisible();
  await expect(page.getByText('1 older than 48 hours')).toBeVisible();
  await expect(page.getByText('Teams with a free seat')).toBeVisible();
  await shot(page, '01-people');

  await panel(page).getByRole('searchbox', { name: 'Search the finder' }).fill('python');
  await expect(card(page, 'Meena')).toBeVisible();
  await expect(card(page, 'Sita')).toHaveCount(0);
  await panel(page).getByRole('searchbox', { name: 'Search the finder' }).fill('');
  await panel(page).getByLabel(/Waiting 3\+ days/).check();
  await expect(card(page, 'Sita')).toBeVisible();
  await expect(card(page, 'Omar')).toBeVisible();
  await expect(card(page, 'Meena')).toHaveCount(0);
});

test('the teams view shows what the team looks for, free seats and the leader\'s contact', async ({ page }) => {
  await signIn(page, admin);
  await openTab(page);
  await panel(page).getByRole('tab', { name: /^Teams/ }).click();
  const team = panel(page).getByRole('listitem').filter({ hasText: 'Open Door' });
  await expect(team).toContainText('a designer');
  await expect(team).toContainText('1/3');
  await expect(team).toContainText('2 seats free');
  await expect(team.getByRole('link', { name: leader })).toBeVisible();
  await expect(team).toContainText('2 requests waiting for the leader');
  await shot(page, '02-teams');
});

test('the Overview strip points at stuck requests and people who have waited, and opens the finder', async ({ page }) => {
  await signIn(page, admin);
  await page.goto(`/admin/hackathons/${SLUG}?tab=overview`);
  const strip = page.getByRole('region', { name: 'Needs attention' });
  await expect(strip.getByText(/join request has waited over 48 hours/)).toBeVisible(WAIT);
  await expect(strip.getByText(/2 people have been looking for a team for 3\+ days|people have been looking/)).toBeVisible();
  await shot(page, '03-overview-strip');
  await strip.getByText(/join request has waited over 48 hours/).click();
  await expect(page).toHaveURL(/tab=finder/);
  await expect(page.getByRole('tab', { name: /Team Finder/ })).toHaveAttribute('aria-selected', 'true');
});

test('a stuck request can be closed: the sender is told and the request leaves the waiting list', async ({ page }) => {
  await signIn(page, admin);
  await openTab(page);
  await panel(page).getByRole('tab', { name: /^Requests/ }).click();
  const stuck = card(page, 'Omar');
  await expect(stuck).toContainText('Stuck');
  await shot(page, '04-requests');
  await stuck.getByRole('button', { name: 'Close request' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close request' }).click();
  await expect(card(page, 'Omar')).toHaveCount(0, WAIT);
  expect(state().requests[people.omar]).toBe('CANCELLED');
  expect(notes(people.omar).map((n) => n.title)).toContain('Your request to Open Door was closed');
  await panel(page).getByRole('tab', { name: 'All' }).click();
  await expect(card(page, 'Omar')).toContainText('Closed by');
});

test('a person is placed on a team: they join it, the team registers, they are told and the list updates', async ({ page }) => {
  await signIn(page, admin);
  await openTab(page);
  await card(page, 'Sita').getByRole('button', { name: 'Place on a team' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Place on team' })).toBeDisabled();
  await expect(dialog.locator('option', { hasText: 'Open Door · 1/3' })).toHaveCount(1, WAIT);
  await shot(page, '05-place-dialog');
  await dialog.getByLabel('Team').selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Place on team' }).click();
  await expect(card(page, 'Sita')).toHaveCount(0, WAIT);
  const now = state();
  expect(now.members).toContain(people.sita);
  expect(now.status).toBe('REGISTERED');
  expect(notes(people.sita).map((n) => n.title)).toContain('You were placed in Open Door');
  await panel(page).getByRole('tab', { name: 'On a team' }).click();
  await expect(card(page, 'Sita')).toContainText('On Open Door');
});

test('removing a listing clears it, tells the person why, and they can list themselves again', async ({ page, browser }) => {
  await signIn(page, admin);
  await openTab(page);
  await card(page, 'Meena').getByRole('button', { name: 'Remove listing' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Reason/).fill('Phone number in the note');
  await dialog.getByRole('button', { name: 'Remove listing' }).click();
  await expect(card(page, 'Meena')).toHaveCount(0, WAIT);
  const entry = state().seekers[people.meena];
  expect(entry).toEqual({ active: false, skills: '', note: '' });
  const message = notes(people.meena).find((n) => n.title === 'Your team finder listing was removed');
  expect(message?.message).toContain('Phone number in the note');

  const ctx = await browser.newContext();
  const seeker = await ctx.newPage();
  await signIn(seeker, people.meena);
  await seeker.goto(`/hackathons/${SLUG}/finder`);
  await seeker.getByLabel('Your skills').fill('Python, SQL');
  await seeker.getByRole('button', { name: 'List me' }).click();
  await expect(seeker.getByText('You are listed in the team finder')).toBeVisible(WAIT);
  expect(state().seekers[people.meena].active).toBe(true);
  await ctx.close();
});

test('reminders go to people who have waited, once a day, after a confirmation', async ({ page }) => {
  await signIn(page, admin);
  await openTab(page);
  await panel(page).getByRole('button', { name: 'Remind people' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send reminders' }).click();
  await expect(page.getByText('1 notified')).toBeVisible(WAIT);
  expect(notes(people.omar).map((n) => n.title)).toContain('Teams are looking for members');
  expect(notes(people.nila).map((n) => n.title)).not.toContain('Teams are looking for members');
  await panel(page).getByRole('button', { name: 'Remind people' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send reminders' }).click();
  await expect(page.getByText(/needed a reminder right now/)).toBeVisible(WAIT);
});

test('a full team cannot take another person, and stopping it recruiting closes its waiting requests', async ({ page }) => {
  await signIn(page, admin);
  await openTab(page);
  await card(page, 'Nila').getByRole('button', { name: 'Place on a team' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Team').selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Place on team' }).click();
  await expect(card(page, 'Nila')).toHaveCount(0, WAIT);
  expect(state().members).toContain(people.nila);

  await card(page, 'Ravi').getByRole('button', { name: 'Place on a team' }).click();
  await expect(page.getByRole('dialog').getByText('No team has a free seat right now.')).toBeVisible(WAIT);
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Place on team' })).toBeDisabled();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

  await panel(page).getByRole('tab', { name: /^Teams/ }).click();
  await expect(panel(page).getByRole('listitem').filter({ hasText: 'Open Door' })).toContainText('Full');
  await panel(page).getByRole('button', { name: 'Stop recruiting' }).click();
  await page.getByRole('dialog').getByLabel(/Reason/).fill('Team is complete');
  await page.getByRole('dialog').getByRole('button', { name: 'Stop recruiting' }).click();
  await expect(panel(page).getByText('No team is recruiting.')).toBeVisible(WAIT);
  const now = state();
  expect(now.recruiting).toBe(false);
  expect(now.requests[people.ravi]).toBe('CANCELLED');
  expect(notes(people.ravi).map((n) => n.title)).toContain('Open Door stopped recruiting');
  expect(notes(leader).find((n) => n.title.includes('no longer listed as recruiting'))?.message).toContain('Team is complete');
});

test('a participant who is not an organizer does not get the tab', async ({ page }) => {
  await signIn(page, people.ravi);
  await page.goto(`/admin/hackathons/${SLUG}?tab=finder`);
  await expect(page.getByRole('tab', { name: /Team Finder/ })).toHaveCount(0);
});

test('on a phone the tab fits the screen, every control is big enough and nothing scrolls sideways', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Pixel 7'], baseURL: SITE_URL });
  const page = await context.newPage();
  await signIn(page, admin);
  await openTab(page);
  await expect(panel(page).getByRole('tab', { name: /^People/ })).toBeVisible(WAIT);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  for (const control of [panel(page).getByRole('tab', { name: /^Teams/ }), panel(page).getByRole('button', { name: 'Refresh' })]) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(40);
  }
  await shot(page, '06-phone');
  await context.close();
});
