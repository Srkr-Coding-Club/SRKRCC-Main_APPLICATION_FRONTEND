import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { BACKEND_URL, PASSWORD, SITE_URL, helper, mailTo, signIn, stateDir, uniqueEmail } from './live';

/**
 * Member management end to end: real backend, real site, real files.
 * The Users and Members directory (verification, filters), the Club ID panel (look-up, assign, reserve and claim, move, clear,
 * counters, history), comparing a real .xlsx of past members, and club membership requests from the profile to the approval.
 * Watch it:  pnpm test:e2e:live --headed e2e-live/member-management.live.spec.ts   (screenshots: test-results/live/member-management/)
 */
test.describe.configure({ mode: 'serial' });

const SHOTS = join(stateDir, 'member-management');
const WAIT = { timeout: 40_000 };

interface UserState { club_id: string | null; role: string; membership_status: string; verified: boolean; days_left: number | null }
interface IdState { holder: string | null; reservation: { email: string; status: string } | null; events: string[] }
const stateOf = (email: string) => helper<UserState>('user_state', email);
const idState = (clubId: string) => helper<IdState>('club_id_state', clubId);

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

async function as(browser: Browser, email: string, options: Parameters<Browser['newContext']>[0] = {}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options, baseURL: SITE_URL });
  // These scenarios are about people and ids, so the home opening film (and any celebration it would hold back) is skipped, as for a returning member.
  await context.addInitScript(() => { try { window.localStorage.setItem('srkrcc_intro_seen_at', String(Date.now())); } catch { /* storage blocked */ } });
  const page = await context.newPage();
  await signIn(page, email);
  return { context, page };
}

async function register(email: string, firstName: string) {
  const reply = await fetch(`${BACKEND_URL}/api/auth/register/`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, first_name: firstName, last_name: 'Returning', branch: 'CSE', year: 2, roll_number: `22B9${Math.random().toString(36).slice(2, 8).toUpperCase()}` }),
  });
  expect(reply.status, await reply.clone().text()).toBe(201);
}

let admin = '';
let lead = '';
const who: Record<string, string> = {};
const NAMES = ['veronica', 'una', 'olga', 'dana', 'plain', 'holder', 'meena', 'nora'] as const;

test.beforeAll(() => {
  admin = uniqueEmail('boss');
  lead = uniqueEmail('lead');
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN', '--first-name', 'Boss', '--complete');
  helper('create_user', lead, '--verified', '--role', 'CLUB_LEAD', '--first-name', 'Leader', '--complete');
  for (const key of NAMES) who[key] = uniqueEmail(key);
  helper('create_user', who.veronica, '--verified', '--first-name', 'Veronica', '--last-name', 'Verified', '--complete', '--role', 'AFFILIATE', '--club-id', '25SCC031');
  helper('create_user', who.una, '--first-name', 'Una', '--last-name', 'Unverified', '--complete');
  helper('create_user', who.olga, '--first-name', 'Olga', '--last-name', 'Overdue', '--complete');
  helper('create_user', who.dana, '--first-name', 'Dana', '--last-name', 'Disputed', '--complete');
  helper('create_user', who.plain, '--verified', '--first-name', 'Plainly', '--last-name', 'Notmember', '--complete');
  helper('create_user', who.holder, '--verified', '--first-name', 'Hana', '--last-name', 'Holder', '--complete', '--role', 'AFFILIATE', '--club-id', '25SCC010');
  helper('create_user', who.meena, '--verified', '--first-name', 'Meena', '--last-name', 'Nomember', '--complete');
  helper('create_user', who.nora, '--verified', '--first-name', 'Nora', '--last-name', 'Newholder', '--complete');
  helper('set_verification', who.una, '--state', 'unverified');
  helper('set_verification', who.olga, '--state', 'overdue');
  helper('set_verification', who.dana, '--state', 'disputed');
});

test.beforeEach(() => { helper('clear_cache'); });

// ---------------------------------------------------------------------------------------------------------------------
test.describe('Users and Members', () => {
  test('every person shows whether their email is verified, and the tiles are filters that survive a refresh', async ({ browser }) => {
    const { context, page } = await as(browser, admin);
    await page.goto('/admin/users');
    const list = page.getByRole('region', { name: 'Users' });
    const row = (name: string) => list.getByRole('row').filter({ hasText: name });
    await expect(row('Veronica Verified').getByText('Verified', { exact: true })).toBeVisible(WAIT);
    await expect(row('Una Unverified')).toContainText(/Unverified/);
    await expect(row('Olga Overdue').getByText('Overdue', { exact: true })).toBeVisible();
    await expect(row('Dana Disputed').getByText('Disputed', { exact: true })).toBeVisible();
    await shot(page, '01-users');

    await page.getByRole('button', { name: /Verification overdue/ }).click();
    await expect(page).toHaveURL(/email=overdue/);
    await expect(row('Olga Overdue')).toBeVisible(WAIT);
    await expect(list.getByRole('row').filter({ hasText: 'Veronica Verified' })).toHaveCount(0);
    await page.reload();
    await expect(page).toHaveURL(/email=overdue/);
    await expect(row('Olga Overdue')).toBeVisible(WAIT);
    await page.getByRole('button', { name: 'Clear filters' }).first().click();

    await page.getByRole('searchbox', { name: 'Search people' }).fill('veronica verified');
    await expect(row('Veronica Verified')).toBeVisible(WAIT);
    await expect(list.getByRole('row').filter({ hasText: 'Plainly' })).toHaveCount(0);
    await page.getByRole('searchbox', { name: 'Search people' }).fill(who.plain.slice(0, 14));
    await expect(row('Plainly Notmember')).toBeVisible(WAIT);
    await context.close();
  });

  test('an admin can mark someone verified (after a confirmation), give more time and resend the link', async ({ browser }) => {
    const { context, page } = await as(browser, admin);
    await page.goto('/admin/users');
    await page.getByRole('searchbox', { name: 'Search people' }).fill('Una Unverified');
    await page.getByRole('button', { name: 'View Una Unverified' }).first().click();
    const section = page.getByRole('region', { name: 'Email verification' });
    await expect(section.getByRole('button', { name: 'Mark as verified' })).toBeVisible(WAIT);

    await section.getByRole('button', { name: /Resend link/ }).click();
    await expect.poll(() => mailTo(who.una).some((mail) => mail.verify), WAIT).toBe(true);

    const before = stateOf(who.una).days_left ?? 0;
    await page.getByRole('region', { name: 'Email verification' }).getByLabel('Give more time').selectOption('30');
    await page.getByRole('region', { name: 'Email verification' }).getByRole('button', { name: 'Extend' }).click();
    await expect.poll(() => stateOf(who.una).days_left ?? 0, WAIT).toBeGreaterThan(before + 20);

    await page.getByRole('region', { name: 'Email verification' }).getByRole('button', { name: 'Mark as verified' }).click();
    await page.getByRole('dialog').last().getByRole('button', { name: 'Mark as verified' }).click();
    await expect.poll(() => stateOf(who.una).verified, WAIT).toBe(true);
    await expect(page.getByRole('region', { name: 'Email verification' }).getByText('Verified', { exact: true }).first()).toBeVisible(WAIT);
    await shot(page, '02-verification-drawer');
    await context.close();
  });

  test('a Club Lead sees the verification state but none of the controls', async ({ browser }) => {
    const { context, page } = await as(browser, lead);
    await page.goto('/admin/users');
    await page.getByRole('searchbox', { name: 'Search people' }).fill('Dana Disputed');
    await page.getByRole('button', { name: 'View Dana Disputed' }).first().click();
    await expect(page.getByText('Only an Admin can verify, resend or extend.')).toBeVisible(WAIT);
    await expect(page.getByRole('button', { name: 'Mark as verified' })).toHaveCount(0);
    await context.close();
  });

  test('the Members page lists only people holding a Club ID', async ({ browser }) => {
    const { context, page } = await as(browser, admin);
    await page.goto('/admin/members');
    const list = page.getByRole('region', { name: 'Club members' });
    await expect(list.getByRole('row').filter({ hasText: 'Veronica Verified' })).toBeVisible(WAIT);
    await expect(list.getByRole('row').filter({ hasText: 'Hana Holder' })).toBeVisible();
    await expect(list.getByRole('row').filter({ hasText: 'Plainly Notmember' })).toHaveCount(0);
    await expect(list.getByText('No Club ID')).toHaveCount(0);
    await shot(page, '03-members');
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('Club ID panel', () => {
  const dialog = (page: Page) => page.getByRole('dialog').last();

  test('look up an id, assign a free one, and be refused one somebody holds', async ({ browser }) => {
    const { context, page } = await as(browser, admin);
    await page.goto('/admin/club-ids?tab=registry');
    const lookup = page.getByRole('region', { name: 'Look up' });
    await page.getByLabel(/Look up a Club ID/).fill('25scc010');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(lookup.getByText('Held')).toBeVisible(WAIT);
    await expect(lookup.getByText(new RegExp(who.holder.split('@')[0].slice(0, 10))).first()).toBeVisible();

    await page.getByLabel(/Look up a Club ID/).fill('26SCC700');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(lookup.getByText('Free')).toBeVisible(WAIT);
    await page.getByRole('button', { name: 'Assign this id to someone' }).click();
    await dialog(page).getByLabel('Who gets it').fill('Meena');
    await dialog(page).getByRole('list', { name: 'Matching people' }).getByRole('button').first().click();
    await dialog(page).getByLabel(/Reason/).fill('From the 2023 register');
    await dialog(page).getByRole('button', { name: 'Assign' }).click();
    await expect.poll(() => stateOf(who.meena).club_id, WAIT).toBe('26SCC700');
    expect(idState('26SCC700').events).toEqual(['ASSIGNED']);

    await page.getByRole('button', { name: 'Assign an id' }).click();
    await dialog(page).getByLabel('Who gets it').fill('Nora');
    await dialog(page).getByRole('list', { name: 'Matching people' }).getByRole('button').first().click();
    await dialog(page).getByLabel('Club ID').fill('26SCC700');
    await dialog(page).getByLabel(/Reason/).fill('Again');
    await dialog(page).getByRole('button', { name: 'Assign' }).click();
    await expect(dialog(page).getByRole('alert')).toContainText(/already assigned/, WAIT);
    expect(stateOf(who.nora).club_id).toBeNull();
    await shot(page, '04-assign-refused');
    await context.close();
  });

  test('an id reserved for an email is attached when that person registers, and nobody else can take it', async ({ browser }) => {
    const returning = uniqueEmail('returning');
    const { context, page } = await as(browser, admin);
    await page.goto('/admin/club-ids?tab=reservations');
    await page.getByRole('button', { name: 'Reserve an id' }).first().click();
    await dialog(page).getByLabel('Email of the person').fill(returning);
    await dialog(page).getByLabel('Club ID (optional)').fill('24SCC555');
    await dialog(page).getByLabel(/Reason/).fill('Past member');
    await dialog(page).getByRole('button', { name: 'Reserve' }).click();
    await expect(page.getByRole('region', { name: 'Reservations' }).getByText(returning)).toBeVisible(WAIT);
    expect(idState('24SCC555').reservation).toEqual({ email: returning, status: 'RESERVED' });
    await shot(page, '05-reservations');

    await page.getByRole('button', { name: 'Assign an id' }).click();
    await dialog(page).getByLabel('Who gets it').fill('Nora');
    await dialog(page).getByRole('list', { name: 'Matching people' }).getByRole('button').first().click();
    await dialog(page).getByLabel('Club ID').fill('24SCC555');
    await dialog(page).getByLabel(/Reason/).fill('Trying to take it');
    await dialog(page).getByRole('button', { name: 'Assign' }).click();
    await expect(dialog(page).getByRole('alert')).toContainText(/reserved for/, WAIT);
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();

    await register(returning, 'Returning');
    expect(stateOf(returning).club_id).toBe('24SCC555');
    expect(idState('24SCC555')).toMatchObject({ holder: returning, reservation: { status: 'CLAIMED' } });
    await page.reload();
    await expect(page.getByText(/Reservations/).first()).toBeVisible();
    await context.close();
  });

  test('moving an id needs the id typed again; clearing retires it; the history records both with reasons', async ({ browser }) => {
    const { context, page } = await as(browser, admin);
    await page.goto('/admin/club-ids?tab=registry');
    await page.getByLabel('Search the registry').fill('25SCC010');
    await page.getByRole('button', { name: 'Move 25SCC010' }).click();
    await dialog(page).getByLabel('Who receives it').fill('Nora');
    await dialog(page).getByRole('list', { name: 'Matching people' }).getByRole('button').first().click();
    await dialog(page).getByLabel(/Reason/).fill('Typed under the wrong person');
    await dialog(page).getByLabel(/^Type/).fill('25SCC011');
    await dialog(page).getByRole('button', { name: 'Move the id' }).click();
    await expect(dialog(page).getByRole('alert')).toContainText(/Type the Club ID again/, WAIT);
    await dialog(page).getByLabel(/^Type/).fill('25SCC010');
    await dialog(page).getByRole('button', { name: 'Move the id' }).click();
    await expect.poll(() => stateOf(who.nora).club_id, WAIT).toBe('25SCC010');
    expect(stateOf(who.holder)).toMatchObject({ club_id: null, role: 'NON_AFFILIATE' });
    expect(idState('25SCC010').events).toEqual(['ASSIGNED', 'REASSIGNED_OUT', 'REASSIGNED_IN']);

    await page.getByLabel('Search the registry').fill('26SCC700');
    await page.getByRole('button', { name: 'Clear 26SCC700' }).click();
    await dialog(page).getByLabel(/Reason/).fill('Left the club');
    await dialog(page).getByLabel(/^Type/).fill('26SCC700');
    await shot(page, '06-clear-dialog');
    await dialog(page).getByRole('button', { name: 'Clear and retire' }).click();
    await expect.poll(() => stateOf(who.meena).club_id, WAIT).toBeNull();
    expect(idState('26SCC700').events).toEqual(['ASSIGNED', 'CLEARED']);

    await page.getByLabel(/Look up a Club ID/).fill('26SCC700');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.getByRole('region', { name: 'Look up' }).getByText('Retired', { exact: true })).toBeVisible(WAIT);

    await page.getByRole('tab', { name: 'History' }).click();
    const history = page.getByRole('region', { name: 'History' });
    await expect(history.getByText('Moved away').first()).toBeVisible(WAIT);
    await expect(history.getByText(/“Typed under the wrong person”/).first()).toBeVisible();
    await expect(history.getByText(new RegExp(`by ${admin.split('@')[0].slice(0, 8)}`)).first()).toBeVisible();
    await context.close();
  });

  test('the counter only moves forward, and the next id follows it', async ({ browser }) => {
    const { context, page } = await as(browser, admin);
    await page.goto('/admin/club-ids?tab=counters');
    const year = new Date().getFullYear();
    await page.getByRole('button', { name: 'Move counter' }).first().click();
    await dialog(page).getByLabel('Next number').fill('3');
    await expect(dialog(page).getByRole('button', { name: 'Move the counter' })).toBeDisabled();
    await dialog(page).getByLabel('Next number').fill('800');
    await dialog(page).getByLabel(/Reason/).fill('New intake batch');
    await dialog(page).getByRole('button', { name: 'Move the counter' }).click();
    await expect(page.getByRole('region', { name: 'Counters' }).getByText(`${String(year % 100).padStart(2, '0')}SCC800`).first()).toBeVisible(WAIT);
    await context.close();
  });

  test('a Club Lead can look things up but has no way to change an id', async ({ browser }) => {
    const { context, page } = await as(browser, lead);
    await page.goto('/admin/club-ids');
    await expect(page.getByText(/only an Admin can change an id/)).toBeVisible(WAIT);
    await expect(page.getByRole('button', { name: /Give the next number|Assign an id|Reserve an id/ })).toHaveCount(0);
    await page.getByLabel(/Look up a Club ID/).fill('25SCC031');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.getByRole('region', { name: 'Look up' }).getByText('Held')).toBeVisible(WAIT);
    await expect(page.getByRole('button', { name: /^Move |^Clear / })).toHaveCount(0);
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('Past members from a real Excel file', () => {
  const sheetPath = join(stateDir, 'past-members.xlsx');
  const people = { match: uniqueEmail('match'), link: uniqueEmail('link'), mismatch: uniqueEmail('mismatch'), newcomer: uniqueEmail('newcomer'), garbage: 'not-an-email' };

  test.beforeAll(() => {
    mkdirSync(stateDir, { recursive: true });
    helper('create_user', people.match, '--verified', '--first-name', 'Sita', '--last-name', 'Match', '--complete', '--role', 'AFFILIATE', '--club-id', '25SCC901');
    helper('create_user', people.link, '--verified', '--first-name', 'Lena', '--last-name', 'Linkable', '--complete');
    helper('create_user', people.mismatch, '--verified', '--first-name', 'Mia', '--last-name', 'Mismatch', '--complete', '--role', 'AFFILIATE', '--club-id', '25SCC902');
    helper('make_sheet', sheetPath, '--rows', JSON.stringify([
      ['Sita Match', people.match.toUpperCase(), '25scc901'],        // matches (case and spacing differ)
      ['Lena Linkable', people.link, '26SCC710'],                    // account without an id: link
      ['Mia Mismatch', people.mismatch, '25SCC903'],                 // a different id in the app: the sheet may be right
      ['Nico Newbie', people.newcomer, '26SCC711'],                  // no account: invite
      ['Lena Again', people.link, ''],                               // the same email twice
      ['Broken Row', people.garbage, '25SCC904'],                    // not an email
    ]));
  });

  test('upload a workbook, choose its sheet, check the columns, and see every kind of row', async ({ browser }) => {
    const { context, page } = await as(browser, admin);
    await page.goto('/admin/reconcile');
    await page.getByRole('button', { name: 'Upload a sheet' }).click();
    await page.locator('#reconcile-file').setInputFiles(sheetPath);
    const dialog = page.getByRole('dialog').last();
    await expect(dialog.getByLabel('Which sheet?')).toBeVisible(WAIT);
    await dialog.getByLabel('Which sheet?').selectOption('2023 members');
    await expect(dialog.getByLabel(/^Email/)).toHaveValue('E-mail', WAIT);
    await expect(dialog.getByLabel(/^Name/)).toHaveValue('Student Name');
    await expect(dialog.getByLabel(/^Club ID or Affiliate ID/)).toHaveValue('Affiliate ID');
    await expect(dialog.getByText('Sita Match').first()).toBeVisible();
    await shot(page, '07-upload-wizard');
    await dialog.getByRole('button', { name: /^Compare 6 rows/ }).click();

    await expect(page).toHaveURL(/run=/, WAIT);
    const tile = (name: string) => page.getByRole('button', { name: new RegExp(`^${name}`, 'i') });
    await expect(tile('Matches')).toContainText('1', WAIT);
    await expect(tile('Link a Club ID')).toContainText('1');
    await expect(tile('Mismatches')).toContainText('1');
    await expect(tile('No account')).toContainText('1');
    await expect(tile('Check the sheet')).toContainText('2');
    await shot(page, '08-reconcile-result');
    await context.close();
  });

  test('link, use the sheet’s id, invite, and export; every change is recorded', async ({ browser }) => {
    const { context, page } = await as(browser, admin);
    await page.goto('/admin/reconcile');
    await page.getByText('past-members.xlsx').click();
    const item = (name: string) => page.getByRole('listitem').filter({ hasText: name });
    const tile = (name: string) => page.getByRole('button', { name: new RegExp(`^${name}`, 'i') });

    await expect(item('Lena Linkable').first()).toBeVisible(WAIT);
    await page.getByRole('button', { name: 'Link 26SCC710' }).click();
    await expect.poll(() => stateOf(people.link).club_id, WAIT).toBe('26SCC710');
    expect(idState('26SCC710').events).toEqual(['ASSIGNED']);

    await tile('Mismatches').click();
    await item('Mia Mismatch').getByRole('button', { name: /Use the sheet/ }).click();
    const reason = page.getByRole('dialog').last();
    await expect(reason.getByRole('button', { name: /^Use 25SCC903/ })).toBeDisabled();
    await reason.getByLabel(/Why is the sheet right/).fill('The 2023 register is the original');
    await reason.getByRole('button', { name: /^Use 25SCC903/ }).click();
    await expect.poll(() => stateOf(people.mismatch).club_id, WAIT).toBe('25SCC903');

    await tile('No account').click();
    await item('Nico Newbie').getByRole('button', { name: /Invite and reserve 26SCC711/ }).click();
    await page.getByRole('dialog').last().getByRole('button', { name: 'Invite', exact: true }).click();
    await expect.poll(() => idState('26SCC711').reservation, WAIT).toEqual({ email: people.newcomer, status: 'RESERVED' });
    await expect.poll(() => mailTo(people.newcomer).length, WAIT).toBe(1);
    expect(mailTo(people.newcomer)[0].text).toContain('26SCC711');

    await tile('Matches').click();
    const download = page.waitForEvent('download', WAIT);
    await page.getByRole('button', { name: /Export/ }).first().click();
    await page.getByRole('menuitem', { name: /Excel/ }).click();
    expect((await download).suggestedFilename()).toMatch(/past-members-report.*\.xlsx$/);

    await page.getByRole('button', { name: 'Check again' }).click();
    await expect(page.getByText('Nothing has changed')).toBeVisible(WAIT);
    await shot(page, '09-reconcile-done');

    // The person who was invited gets the id when they register with that address.
    await register(people.newcomer, 'Nico');
    expect(stateOf(people.newcomer).club_id).toBe('26SCC711');
    await page.getByRole('button', { name: 'Check again' }).click();
    await expect(page.getByText(/rows? changed/)).toBeVisible(WAIT);
    await context.close();
  });

  test('a Club Lead can open the comparison and export it, but not change anything', async ({ browser }) => {
    const { context, page } = await as(browser, lead);
    await page.goto('/admin/reconcile');
    await expect(page.getByRole('button', { name: 'Upload a sheet' })).toHaveCount(0);
    await page.getByText('past-members.xlsx').click();
    await expect(page.getByRole('button', { name: 'Check again' })).toBeVisible(WAIT);
    await expect(page.getByRole('button', { name: /^Link (all|\d)|^Invite|^Dismiss|^Delete$|^Follow up/ })).toHaveCount(0);
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('Club membership requests', () => {
  const person = { incomplete: uniqueEmail('rhea'), pia: uniqueEmail('pia'), dax: uniqueEmail('dax') };

  test.beforeAll(() => {
    helper('create_user', person.incomplete, '--verified', '--first-name', 'Rhea');
    helper('create_user', person.pia, '--verified', '--first-name', 'Pia', '--last-name', 'Joiner', '--complete');
    helper('create_user', person.dax, '--verified', '--first-name', 'Dax', '--last-name', 'Decline', '--complete');
  });

  test('someone with an incomplete profile is told exactly what is missing and cannot ask', async ({ browser }) => {
    const { context, page } = await as(browser, person.incomplete);
    await page.goto('/profile');
    const card = page.getByRole('region', { name: 'Club membership' });
    await expect(card.getByText(/Complete your profile/)).toBeVisible(WAIT);
    await expect(card.getByText(/Last name/)).toBeVisible();
    await expect(card.getByRole('button', { name: 'Ask to join the club' })).toHaveCount(0);
    await shot(page, '10-membership-blocked');
    await context.close();
  });

  test('a person asks, an admin approves, and the person becomes a member with a Club ID, a notification, an email and a celebration', async ({ browser }) => {
    const member = await as(browser, person.pia);
    await member.page.goto('/profile');
    const card = member.page.getByRole('region', { name: 'Club membership' });
    await card.getByLabel(/Anything the organizers/).fill('I attended the Git workshop');
    await card.getByRole('button', { name: 'Ask to join the club' }).click();
    await expect(card.getByText(/is waiting for an organizer/)).toBeVisible(WAIT);
    await shot(member.page, '11-membership-waiting');

    const boss = await as(browser, admin);
    await boss.page.goto('/admin/club-ids');
    await expect(boss.page.getByText(/waiting to become club members/)).toBeVisible(WAIT);
    await boss.page.getByRole('button', { name: /Open the requests/ }).click();
    const request = boss.page.getByRole('region', { name: 'Requests' }).getByRole('listitem').filter({ hasText: 'Pia Joiner' });
    await expect(request).toContainText('I attended the Git workshop', WAIT);
    await expect(request.getByText('Email verified')).toBeVisible();
    await shot(boss.page, '12-membership-queue');
    await request.getByRole('button', { name: 'Approve' }).click();
    await boss.page.getByRole('dialog').last().getByRole('button', { name: 'Approve', exact: true }).click();

    await expect.poll(() => stateOf(person.pia).club_id, WAIT).toMatch(/^\d{2}SCC\d{3}$/);
    expect(stateOf(person.pia)).toMatchObject({ role: 'AFFILIATE', membership_status: 'ACTIVE' });
    expect(helper<{ title: string }[]>('notifications', person.pia).map((n) => n.title)).toContain('You are a club member');
    await expect.poll(() => mailTo(person.pia).some((mail) => /Welcome to SRKR Coding Club/.test(mail.subject)), WAIT).toBe(true);

    await member.page.reload();
    await expect(member.page.getByRole('region', { name: 'Club membership' }).getByText(/You are a club member/)).toBeVisible(WAIT);
    await expect(member.page.locator('[data-celebration]')).toBeVisible(WAIT);
    await shot(member.page, '13-membership-approved');
    await member.context.close();
    await boss.context.close();
  });

  test('a declined request shows its reason to the person and makes them wait before asking again', async ({ browser }) => {
    const member = await as(browser, person.dax);
    await member.page.goto('/profile');
    await member.page.getByRole('region', { name: 'Club membership' }).getByRole('button', { name: 'Ask to join the club' }).click();
    await expect(member.page.getByText(/is waiting for an organizer/)).toBeVisible(WAIT);

    const boss = await as(browser, admin);
    await boss.page.goto('/admin/club-ids?tab=requests');
    const request = boss.page.getByRole('region', { name: 'Requests' }).getByRole('listitem').filter({ hasText: 'Dax Decline' });
    await request.getByRole('button', { name: /Decline/ }).click();
    const dialog = boss.page.getByRole('dialog').last();
    await expect(dialog.getByRole('button', { name: 'Decline and tell them' })).toBeDisabled();
    await dialog.getByLabel(/Reason/).fill('Please come to one workshop first');
    await dialog.getByRole('button', { name: 'Decline and tell them' }).click();
    await expect(request).toHaveCount(0, WAIT);

    await member.page.reload();
    const card = member.page.getByRole('region', { name: 'Club membership' });
    await expect(card.getByText('Please come to one workshop first')).toBeVisible(WAIT);
    await expect(card.getByText(/You can ask again after a short wait/)).toBeVisible();
    await expect(card.getByRole('button', { name: 'Ask to join the club' })).toHaveCount(0);
    expect(helper<{ message: string }[]>('notifications', person.dax).some((n) => n.message.includes('Please come to one workshop first'))).toBe(true);
    await shot(member.page, '14-membership-declined');
    await member.context.close();
    await boss.context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe('on a phone', () => {
  test('the people, Club ID, past-member and membership pages fit the screen and have big enough controls', async ({ browser }) => {
    const phone = devices['Pixel 7'];
    const admins = await as(browser, admin, { ...phone });
    for (const path of ['/admin/users', '/admin/members', '/admin/club-ids?tab=registry', '/admin/club-ids?tab=requests', '/admin/reconcile']) {
      await admins.page.goto(path);
      await expect(admins.page.getByRole('heading', { level: 1 }).first()).toBeVisible(WAIT);
      expect(await admins.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(1);
    }
    await admins.page.goto('/admin/users');
    expect((await admins.page.getByRole('searchbox', { name: 'Search people' }).boundingBox())!.height).toBeGreaterThanOrEqual(40);
    await shot(admins.page, '15-phone-users');
    await admins.context.close();

    const member = await as(browser, who.plain, { ...phone });
    await member.page.goto('/profile');
    await expect(member.page.getByRole('region', { name: 'Club membership' })).toBeVisible(WAIT);
    expect(await member.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await shot(member.page, '16-phone-profile');
    await member.context.close();
  });
});
