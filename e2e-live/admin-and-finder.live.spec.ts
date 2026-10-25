import { expect, test } from '@playwright/test';
import { helper, signIn, uniqueEmail } from './live';

/**
 * Admin create-user (year, college, club id formats), deleting rounds, and the team finder with join requests
 * (accept / decline, also from the notification bell), all against the real backend and site.
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'finder-fest';
interface Profile { role: string; year: number; branch: string; club_id: string | null; college: string | null; other_college: string; first_name: string; last_name: string }
const profile = (email: string) => helper<Profile | null>('user_profile', email);
const team = () => helper<{ members: string[]; status: string; requests: string[]; rounds: string[] }>('team_state', SLUG);

let admin = '';
let leader = '';
let seekerA = '';
let seekerB = '';

test.beforeAll(() => {
  admin = uniqueEmail('boss');
  leader = uniqueEmail('lead');
  seekerA = uniqueEmail('sita');
  seekerB = uniqueEmail('gita');
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
  helper('create_user', leader, '--verified', '--first-name', 'Lena');
  helper('create_user', seekerA, '--verified', '--first-name', 'Sita');
  helper('create_user', seekerB, '--verified', '--first-name', 'Gita');
  helper('make_finder_hackathon', SLUG, '--leader', leader, '--rounds', '2');
});

test.beforeEach(() => { helper('clear_cache'); });

test.describe('admin creates a user', () => {
  test('the form asks for year and college and refuses an incomplete form field by field', async ({ page }) => {
    await signIn(page, admin);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /Create New User|Create User/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel(/Year of Study/)).toBeVisible();
    await expect(dialog.getByLabel(/^College/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Save User Account' }).click();
    await expect(dialog.getByText('Full name is required.')).toBeVisible();
    await expect(dialog.getByText('Email is required.')).toBeVisible();
    await expect(dialog.getByText('Set a password for the account.')).toBeVisible();
  });

  test('a member is created with their year, college and an affiliate id in the new format', async ({ page }) => {
    const email = uniqueEmail('newmember');
    await signIn(page, admin);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /Create New User|Create User/i }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Full Name/).fill('Ravi Kumar');
    await dialog.getByLabel(/^Email/).fill(email);
    await dialog.getByLabel(/Year of Study/).selectOption('3');
    await dialog.getByLabel(/Branch/).selectOption('ECE');
    await dialog.getByLabel(/Platform Role/).selectOption('AFFILIATE');
    await dialog.getByLabel(/Affiliate ID/).fill('21cca041');
    await dialog.getByLabel(/^Password/).fill('AdminSet#2026');
    // a college that is not in the list
    await dialog.getByLabel(/^College/).click();
    await page.getByRole('button', { name: /My college is not listed/ }).click();
    await dialog.getByLabel('College name').fill('Village Polytechnic');
    await dialog.getByRole('button', { name: 'Save User Account' }).click();
    await expect(page.getByText('Account Created')).toBeVisible({ timeout: 30_000 });

    const saved = profile(email)!;
    expect(saved).toMatchObject({ role: 'AFFILIATE', year: 3, branch: 'ECE', club_id: '21CCA041', other_college: 'Village Polytechnic', college: null, first_name: 'Ravi', last_name: 'Kumar' });
  });

  test('a college left alone is the club\'s own, and the server\'s complaints land under their fields', async ({ page }) => {
    const email = uniqueEmail('plain');
    helper('create_user', uniqueEmail('taken'), '--verified');   // another account, to make a duplicate below
    await signIn(page, admin);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /Create New User|Create User/i }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Full Name/).fill('Plain Person');
    await dialog.getByLabel(/^Email/).fill(email);
    await dialog.getByLabel(/^Password/).fill('AdminSet#2026');
    await expect(dialog.getByText(/created under SRKR Engineering College/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Save User Account' }).click();
    await expect(page.getByText('Account Created')).toBeVisible({ timeout: 30_000 });
    expect(profile(email)).toMatchObject({ year: 1, other_college: '' });
    expect(profile(email)!.college).toContain('SRKR');

    // the same address again: the message sits under Email and the typed values stay
    await page.getByRole('button', { name: /Create New User|Create User/i }).first().click();
    const again = page.getByRole('dialog');
    await again.getByLabel(/Full Name/).fill('Plain Person');
    await again.getByLabel(/^Email/).fill(email);
    await again.getByLabel(/^Password/).fill('AdminSet#2026');
    await again.getByRole('button', { name: 'Save User Account' }).click();
    await expect(again.getByText(/already exists/)).toBeVisible({ timeout: 30_000 });
    await expect(again.getByLabel(/Full Name/)).toHaveValue('Plain Person');
  });

  test('a club id in the wrong format is refused with the accepted formats', async ({ page }) => {
    await signIn(page, admin);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /Create New User|Create User/i }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Full Name/).fill('Bad Id');
    await dialog.getByLabel(/^Email/).fill(uniqueEmail('badid'));
    await dialog.getByLabel(/^Password/).fill('AdminSet#2026');
    await dialog.getByLabel(/Platform Role/).selectOption('AFFILIATE');
    await dialog.getByLabel(/Affiliate ID/).fill('25XYZ123');
    await dialog.getByRole('button', { name: 'Save User Account' }).click();
    await expect(dialog.getByText(/25SCC277 or 21CCA041/).first()).toBeVisible();
  });
});

test.describe('deleting a round', () => {
  test('deleting the selected round leaves the other one showing and no error', async ({ page }) => {
    await signIn(page, admin);
    await page.goto(`/hackathons/${SLUG}/manage?tab=rounds`);
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete round', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete round' }).click();
    await expect(page.getByText('Round deleted')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.getByText('No Round matches the given query.')).toHaveCount(0);
    expect(team().rounds).toEqual(['Round 1']);
  });
});

test.describe('team finder and join requests', () => {
  test('the dashboard shows who needs people and who is available', async ({ page }) => {
    await signIn(page, seekerA);
    await page.goto(`/hackathons/${SLUG}/finder`);
    await page.getByLabel('Your skills').fill('React, design');
    await page.getByRole('button', { name: 'List me' }).click();
    await expect(page.getByText('You are listed in the team finder')).toBeVisible();

    await page.goto(`/hackathons/${SLUG}/dashboard`);
    const card = page.getByRole('region', { name: 'Teams and people' });
    await expect(card.getByText('Looking for: a designer')).toBeVisible();
    await expect(card.getByText('Teams that need people (1)')).toBeVisible();
    await expect(card.getByText('People looking for a team (1)')).toBeVisible();
  });

  test('asking a team: the leader is notified, and accepting from the notification adds the person', async ({ page, browser }) => {
    await signIn(page, seekerA);
    await page.goto(`/hackathons/${SLUG}/finder`);
    await page.getByRole('button', { name: /Ask to join/ }).click();
    await page.getByLabel(/short message/i).fill('I can do the UI');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText(/Request sent: waiting for the leader/)).toBeVisible();
    expect(team().requests).toEqual(['PENDING']);

    const lead = await browser.newContext();
    const tab = await lead.newPage();
    await signIn(tab, leader);
    await tab.goto(`/hackathons/${SLUG}/dashboard`);
    await tab.getByRole('button', { name: /notifications/i }).first().click();
    await expect(tab.getByText('Sita wants to join Open Door')).toBeVisible({ timeout: 30_000 });
    await tab.getByRole('button', { name: /Accept: Sita/ }).click();
    await expect(tab.getByText('Accepted', { exact: true })).toBeVisible({ timeout: 30_000 });

    const after = team();
    expect(after.requests).toEqual(['ACCEPTED']);
    expect(after.members).toContain(seekerA.toLowerCase());
    expect(after.status).toBe('REGISTERED');            // two members: the minimum
    await page.reload();
    await expect(page.getByText(/Open Door/).first()).toBeVisible();
    await lead.close();
  });

  test('the leader answers a second request from the dashboard card: decline, and the person is told', async ({ page, browser }) => {
    await signIn(page, seekerB);
    await page.goto(`/hackathons/${SLUG}/finder`);
    await page.getByRole('button', { name: /Ask to join/ }).click();
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText(/Request sent: waiting for the leader/)).toBeVisible();

    const lead = await browser.newContext();
    const tab = await lead.newPage();
    await signIn(tab, leader);
    await tab.goto(`/hackathons/${SLUG}/dashboard`);
    const card = tab.getByRole('region', { name: 'Teams and people' });
    await expect(card.getByText(/Waiting for your answer \(1\)/)).toBeVisible({ timeout: 30_000 });
    await card.getByRole('button', { name: /Decline Gita/ }).click();
    await expect(card.getByText(/Waiting for your answer/)).toHaveCount(0);
    expect(team().requests).toEqual(['ACCEPTED', 'DECLINED']);
    expect(team().members).not.toContain(seekerB.toLowerCase());

    await page.reload();
    await page.getByRole('button', { name: /notifications/i }).first().click();
    await expect(page.getByText(/declined your request/)).toBeVisible({ timeout: 30_000 });
    await lead.close();
  });
});
