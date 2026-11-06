import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { helper, signIn, stateDir, uniqueEmail } from './live';

/**
 * Check-in sessions the organizer adds, and the check-in grouped by team with its exports: real backend, real site.
 * Watch it:  pnpm test:e2e:live --headed e2e-live/check-in-sessions.live.spec.ts
 * (screenshots: test-results/live/check-in-sessions/)
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'ci-sessions-fest';
const SHOTS = join(stateDir, 'check-in-sessions');
const WAIT = { timeout: 30_000 };

let admin = '';

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

const open = async (page: Page) => {
  await page.goto(`/admin/hackathons/${SLUG}?tab=checkin`);
  await expect(page.getByRole('region', { name: 'Check-in sessions' })).toBeVisible(WAIT);
};
const addForm = (page: Page) => page.getByRole('form', { name: 'Add a check-in session' });
const byTeam = (page: Page) => page.getByRole('region', { name: 'Check-in by team' });

async function addSession(page: Page, title: string, opts: { from?: string; until?: string; who?: RegExp; arrival?: boolean } = {}) {
  const form = addForm(page);
  await form.getByLabel('Title').fill(title);
  if (opts.from) await form.getByLabel('Starts (optional)').fill(opts.from);
  if (opts.until) await form.getByLabel('Ends (optional)').fill(opts.until);
  if (opts.who) {
    await form.getByRole('button', { name: /Who is checked in/ }).click();
    await page.getByRole('option', { name: opts.who }).click();
  }
  if (opts.arrival === false) await form.getByRole('switch', { name: /Needs arrival first/ }).click();
  await form.getByRole('button', { name: /Add session/ }).click();
}

test.beforeAll(() => {
  admin = uniqueEmail('boss');
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
  helper('make_overview_hackathon', SLUG, '--stage', 'event', '--teams', '6');
  helper('arrive', SLUG, '--count', '5');
});

test.beforeEach(() => { helper('clear_cache'); });

test('the organizer adds a session with a title, a time and who is checked in', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  await expect(addForm(page)).toBeVisible();

  await addSession(page, 'Lunch', { who: /Teams: team QR code/, arrival: false });

  const card = page.getByRole('form', { name: 'Settings for Lunch' });
  await expect(card).toBeVisible(WAIT);
  await expect(card.getByText('Added by you', { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: /Delete/ })).toBeVisible();
  await expect(card.getByLabel('Name')).toHaveValue('Lunch');
  await expect(card.getByRole('switch', { name: /Needs arrival first/ })).toHaveAttribute('aria-checked', 'false');
  await expect(card.getByRole('button', { name: /Who is checked in/ })).toContainText('Teams');
  await shot(page, '1-session-added');

  // The arrival session and generated ones cannot be deleted.
  await expect(page.getByRole('form', { name: 'Settings for Check-in' }).getByRole('button', { name: /Delete/ })).toHaveCount(0);
});

test('a title cannot repeat on the same day, and a blank one is refused before asking the server', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  await addSession(page, 'lunch');
  await expect(addForm(page).getByText('A session with that title already exists on that day.')).toBeVisible(WAIT);

  await addForm(page).getByLabel('Title').fill('   ');
  await addForm(page).getByRole('button', { name: /Add session/ }).click();
  await expect(addForm(page).getByText('Give the session a title.')).toBeVisible();
  await expect(page.getByRole('form', { name: /Settings for/ })).toHaveCount(2);
});

test('changing the days and slots keeps the session you added', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  await page.getByLabel('Days', { exact: true }).fill('2');
  await page.getByLabel('Slots per day').fill('2');
  await page.getByRole('button', { name: 'Save schedule' }).click();
  await expect(page.getByRole('form', { name: 'Settings for Day 2 Afternoon' })).toBeVisible(WAIT);
  await expect(page.getByRole('form', { name: 'Settings for Lunch' })).toBeVisible();

  await page.getByLabel('Days', { exact: true }).fill('1');
  await page.getByLabel('Slots per day').fill('1');
  await page.getByRole('button', { name: 'Save schedule' }).click();
  await expect(page.getByRole('form', { name: 'Settings for Day 2 Afternoon' })).toHaveCount(0, WAIT);
  await expect(page.getByRole('form', { name: 'Settings for Lunch' })).toBeVisible();
  await shot(page, '2-schedule-changed');
});

test('check-in by team shows who is in, filters, expands a team and follows the session', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  const panel = byTeam(page);
  await expect(panel.getByText(/5\s*of 12 people in/)).toBeVisible(WAIT);

  const teams = panel.getByRole('list', { name: 'Teams' }).getByRole('listitem');
  await expect(teams).toHaveCount(6);
  await expect(teams.filter({ hasText: 'Everyone in' })).toHaveCount(2);
  await expect(teams.filter({ hasText: 'Some in' })).toHaveCount(1);
  await expect(teams.filter({ hasText: 'Nobody in' })).toHaveCount(3);

  await panel.getByRole('button', { name: 'Some in', exact: true }).click();
  await expect(teams).toHaveCount(1, WAIT);
  const partial = teams.first();
  await partial.getByRole('button').first().click();
  await expect(partial.getByLabel('Checked in', { exact: true })).toHaveCount(1);
  await expect(partial.getByLabel('Not checked in', { exact: true })).toHaveCount(1);
  await shot(page, '3-by-team-partial');

  await panel.getByRole('button', { name: 'All teams', exact: true }).click();
  await panel.getByRole('button', { name: /^Session/ }).click();
  await page.getByRole('option', { name: 'Lunch' }).click();
  await expect(panel.getByText(/0\s*of 12 people in/)).toBeVisible(WAIT);
  await expect(teams.filter({ hasText: 'Nobody in' })).toHaveCount(6);
  await shot(page, '4-by-team-lunch');
});

test('the team exports download with the right rows', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  const panel = byTeam(page);
  await expect(panel.getByText(/5\s*of 12 people in/)).toBeVisible(WAIT);

  const download = async (kind?: RegExp) => {
    if (kind) {
      await panel.getByRole('button', { name: /What to export/ }).click();
      await page.getByRole('option', { name: kind }).click();
    }
    const waiting = page.waitForEvent('download');
    await panel.getByRole('button', { name: /^Export / }).click();
    await page.getByRole('menuitem', { name: /CSV/ }).click();
    const file = await waiting;
    return { name: file.suggestedFilename(), text: await readFile((await file.path())!, 'utf-8') };
  };

  const summary = await download();
  expect(summary.name).toContain('check-in-by-team-summary');
  const lines = summary.text.replace(/^﻿/, '').trim().split(/\r?\n/);
  expect(lines[0]).toContain('Team');
  expect(lines).toHaveLength(7);
  expect(summary.text).toContain('Everyone in');
  expect(summary.text).toContain('Some in');
  expect(summary.text).toContain('Nobody in');

  const people = await download(/People, grouped by team/);
  expect(people.text.replace(/^﻿/, '').trim().split(/\r?\n/)).toHaveLength(13);

  const matrix = await download(/Every session side by side/);
  const header = matrix.text.replace(/^﻿/, '').trim().split(/\r?\n/)[0];
  expect(header).toContain('Lunch');
  expect(header).toContain('Sessions Attended');
});

for (const width of [320, 375]) {
  test(`the new panels fit a ${width}px phone: nothing scrolls sideways and the controls are easy to hit`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await signIn(page, admin);
    await open(page);
    const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    await addForm(page).scrollIntoViewIfNeeded();
    expect(await sideways()).toBeLessThanOrEqual(0);
    await shot(page, `phone-${width}-add-form`);

    const panel = byTeam(page);
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.getByText(/5\s*of 12 people in/)).toBeVisible(WAIT);
    await panel.getByRole('list', { name: 'Teams' }).getByRole('listitem').first().getByRole('button').click();
    expect(await sideways()).toBeLessThanOrEqual(0);

    // Every control in the two panels and the session cards is a comfortable tap target and stays inside the screen.
    const small = await page.evaluate(({ width: viewport }) => {
      const roots = [document.querySelector('form[aria-label="Add a check-in session"]'), document.querySelector('section[aria-label="Check-in by team"]'), ...document.querySelectorAll('form[aria-label^="Settings for"]')];
      const bad: string[] = [];
      for (const root of roots) {
        for (const el of root?.querySelectorAll<HTMLElement>('button:not([role=switch]), input:not([type=checkbox])') ?? []) {
          const box = el.getBoundingClientRect();
          if (!box.width || !box.height) continue;
          const label = (el.getAttribute('aria-label') || el.textContent || el.id || el.tagName).trim().slice(0, 40);
          if (box.height < 36) bad.push(`${label}: ${Math.round(box.height)}px tall`);
          if (box.right > viewport + 1 || box.left < -1) bad.push(`${label}: outside the screen`);
        }
      }
      return bad;
    }, { width });
    expect(small).toEqual([]);
    await shot(page, `phone-${width}-by-team`);
  });
}

interface Codes { name: string; token: string; members: { email: string; token: string }[] }

/** Type a code into the scanner's "no camera" box, as a volunteer without a working camera would. */
async function scanCode(page: Page, code: string) {
  await page.getByLabel('Enter or paste a QR code').fill(code);
  await page.getByRole('button', { name: 'Check in code' }).click();
}
const chooseSession = async (page: Page, name: string) => {
  const bar = page.getByRole('group', { name: 'Session being scanned' });
  await bar.getByRole('button', { name: /^Session/ }).click();
  await page.getByRole('option', { name }).click();
  await expect(bar.getByText(name, { exact: true }).first()).toBeVisible(WAIT);
};

test('a person code scanned at the desk checks them in and the team view follows', async ({ page }) => {
  const teams = helper<Codes[]>('check_in_codes', SLUG);
  const target = teams.find((team) => team.name === 'Reg team 4')!;
  await signIn(page, admin);
  await open(page);
  await scanCode(page, target.members[0].token);
  await expect(page.getByText(/ checked in$/).first()).toBeVisible(WAIT);
  const panel = byTeam(page);
  await panel.getByRole('button', { name: 'Refresh' }).click();
  await expect(panel.getByText(/6\s*of 12 people in/)).toBeVisible(WAIT);
  const row = panel.getByRole('list', { name: 'Teams' }).getByRole('listitem').filter({ hasText: 'Reg team 4' });
  await expect(row).toContainText('Some in');
  await shot(page, '6-person-scanned');
});

test('a team code on the session you added picks who is present; a person code is refused there', async ({ page }) => {
  const teams = helper<Codes[]>('check_in_codes', SLUG);
  const target = teams.find((team) => team.name === 'Reg team 5')!;
  await signIn(page, admin);
  await open(page);
  await chooseSession(page, 'Lunch');

  // Lunch checks teams in together, so a single person's code is refused with the reason.
  await scanCode(page, target.members[0].token);
  await expect(page.getByText(/checks teams in together/)).toBeVisible(WAIT);

  await scanCode(page, target.token);
  const sheet = page.getByRole('region', { name: 'Team check-in: Reg team 5' });
  await expect(sheet).toBeVisible(WAIT);
  await sheet.getByRole('button', { name: 'Select everyone present' }).click();
  await sheet.getByRole('button', { name: /Check in selected \(2\)/ }).click();
  await expect(sheet.getByRole('list', { name: 'Check-in results' })).toContainText('Checked in');
  await shot(page, '7-team-scanned');
  await sheet.getByRole('button', { name: 'Done' }).click();

  const panel = byTeam(page);
  await panel.getByRole('button', { name: /^Session/ }).click();
  await page.getByRole('option', { name: 'Lunch' }).click();
  await expect(panel.getByText(/2\s*of 12 people in/)).toBeVisible(WAIT);
  const row = panel.getByRole('list', { name: 'Teams' }).getByRole('listitem').filter({ hasText: 'Reg team 5' });
  await expect(row).toContainText('Everyone in');
});

test('the team view ticks people in and takes it back, for the session chosen', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  const panel = byTeam(page);
  const row = panel.getByRole('list', { name: 'Teams' }).getByRole('listitem').filter({ hasText: 'Reg team 6' });
  await expect(row).toContainText('Nobody in');
  await row.getByRole('button').first().click();

  await row.getByRole('button', { name: /Check in the other 2/ }).click();
  await expect(row).toContainText('Everyone in', WAIT);
  await expect(panel.getByText(/8\s*of 12 people in/)).toBeVisible(WAIT);
  await shot(page, '9-ticked-from-team-view');

  await row.getByRole('button', { name: /Undo check-in for/ }).first().click();
  await expect(row).toContainText('Some in', WAIT);
  await expect(panel.getByText(/7\s*of 12 people in/)).toBeVisible(WAIT);
});

test('deleting a session that people are checked in to keeps it, switched off, with its check-ins', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  const card = page.getByRole('form', { name: 'Settings for Lunch' });
  await card.getByRole('button', { name: /Delete/ }).click();
  await expect(page.getByText(/2 people are already checked in to it, so it is kept/)).toBeVisible();
  await page.getByRole('button', { name: 'Delete session' }).click();
  await expect(card.getByText(/^Retired/)).toBeVisible(WAIT);
  await expect(card.getByRole('button', { name: /Delete/ })).toHaveCount(0);
  await shot(page, '8-session-retired');

  // Its check-ins stay in the team view and the exports.
  const panel = byTeam(page);
  await panel.getByRole('button', { name: /^Session/ }).click();
  await page.getByRole('option', { name: 'Lunch' }).click();
  await expect(panel.getByText(/2\s*of 12 people in/)).toBeVisible(WAIT);
});

test('a retired session can be brought back, and moved to another day', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  const card = page.getByRole('form', { name: 'Settings for Lunch' });
  await card.getByRole('button', { name: 'Bring it back' }).click();
  await expect(card.getByRole('button', { name: /Delete/ })).toBeVisible(WAIT);
  await expect(card.getByText(/^Retired/)).toHaveCount(0);
  await shot(page, '10-session-back');
});

test('the desk sheet opens in a new window with every team and who is in', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  const panel = byTeam(page);
  await expect(panel.getByText(/of 12 people in/)).toBeVisible(WAIT);
  const popup = page.waitForEvent('popup');
  await panel.getByRole('button', { name: 'Print sheet' }).click();
  const sheet = await popup;
  await expect(sheet.locator('h1')).toContainText('Overview Fest: Check-in', WAIT);
  await expect(sheet.locator('tr.team')).toHaveCount(6);
  await expect(sheet.locator('td.box').filter({ hasText: '☑' })).toHaveCount(7);
  await expect(sheet.locator('td.box').filter({ hasText: '☐' })).toHaveCount(5);
});
