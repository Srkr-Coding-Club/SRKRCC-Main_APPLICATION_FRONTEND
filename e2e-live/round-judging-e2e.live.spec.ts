import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { PASSWORD, SITE_URL, helper, mailTo, signIn, stateDir, uniqueEmail } from './live';

/**
 * Judging a round from start to finish, with the awkward cases, in one story: real backend, real site, real emails.
 *
 *   1  The organizer sets a round up for judging
 *   2  Inviting judges: a participant, a duplicate and a bad address are refused
 *   3  A brand-new judge: expired link, resend, weak password, strong password, sign in
 *   4  The panel is chosen and judging starts
 *   5  Someone who is a judge of the hackathon but not of this round is turned away
 *   6  Two judges score the same team at the same moment; scores outside the range cannot be sent
 *   7  The scoring deadline passes in the middle of judging, then the organizer moves it
 *   8  Closing with teams under-reviewed needs a reason
 *   9  Reopening, finishing the scores, closing cleanly, and a tie
 *  10  The round's own scores pick the shortlist
 *  11  Once results are published the round cannot be reopened
 *  12  Revoking a judge cuts their access at once
 *
 * Watch it:  LIVE_SLOWMO=400 LIVE_VIDEO=1 pnpm test:e2e:live --headed e2e-live/round-judging-e2e.live.spec.ts
 * (screenshots: test-results/live/round-judging-e2e/)
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'rj-e2e-fest';
const ROUND = 'Semi-final';
const SHOTS = join(stateDir, 'round-judging-e2e');
const WAIT = { timeout: 30_000 };
const STRONG = 'Judge#Pass2026';

let admin = '';
let asha = '';
let ben = '';
let roundId = 0;
const cara = uniqueEmail('cara');
const outsider = uniqueEmail('outsider');
const participant = `${SLUG}-lead0@example.org`;
const TEAMS = ['Team A', 'Team B', 'Team C', 'Team D'];

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}
const openAdmin = async (page: Page) => {
  await page.goto(`/admin/hackathons/${SLUG}?tab=rounds`);
  await page.getByRole('button', { name: new RegExp(`R1 · ${ROUND}`) }).click();
  await expect(panel(page)).toBeVisible(WAIT);
};
const panel = (page: Page) => page.getByRole('region', { name: 'Judging this round' });
const state = () => helper<{ status: string; ranks: Record<string, number | null>; statuses: Record<string, string>; published: boolean; panel: number }>('round_state', SLUG, ROUND);
const assignments = () => helper<Record<string, { entry_id: number; team: string; recused: boolean }[]>>('round_assignments', SLUG, ROUND);
const entryOf = (email: string, team: string) => assignments()[email].find((a) => a.team === team)!.entry_id;
const judgeUrl = (id = roundId) => `/hackathons/${SLUG}/judging/rounds/${id}`;
const asJudge = async (browser: Browser, email: string, password = PASSWORD) => {
  const context = await browser.newContext({ baseURL: SITE_URL });
  const page = await context.newPage();
  await signIn(page, email, password);
  return { context, page };
};
const asAdmin = async (browser: Browser) => {
  const context = await browser.newContext({ baseURL: SITE_URL });
  const page = await context.newPage();
  await signIn(page, admin);
  return { context, page };
};
const score = async (page: Page, idea: string, demo: string) => {
  await page.getByLabel(/^Idea/).fill(idea);
  await page.getByLabel(/^Demo/).fill(demo);
  await page.getByRole('button', { name: /Save my scores|Update my scores/ }).click();
};
/** The newest set-password link mailed to this person, waiting a moment for the email to be written. */
async function setupLink(email: string, alreadySeen = 0) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const mails = mailTo(email).filter((mail) => /setup-password\?token=/.test(mail.text));
    if (mails.length > alreadySeen) return mails.at(-1)!.text.match(/https?:\/\/\S+\/account\/setup-password\?token=[\w-]+/)![0];
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No set-password email arrived for ${email}.`);
}
const pathOf = (link: string) => new URL(link).pathname + new URL(link).search;

const invite = async (page: Page, name: string, email: string) => {
  const form = panel(page).getByRole('form', { name: 'Invite judges' });
  await form.getByLabel('Name').fill(name);
  await form.getByLabel('Email').fill(email);
  await form.getByRole('button', { name: /Send invitation/ }).click();
};

test.beforeAll(() => {
  admin = uniqueEmail('boss');
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
  const made = helper<{ round_id: number; judges: { email: string }[] }>('make_round_judging_hackathon', SLUG, '--teams', '4');
  roundId = made.round_id;
  [asha, ben] = made.judges.map((j) => j.email);
  helper('create_user', outsider, '--verified', '--first-name', 'Olive');
  helper('staff_perms', SLUG, outsider, '--perms', 'judge');
});

test.beforeEach(() => { helper('clear_cache'); });

// ------------------------------------------------------------------------------------------------ 1
test('1. the organizer sets a round up for judging', async ({ page }) => {
  await signIn(page, admin);
  await openAdmin(page);
  await panel(page).getByRole('switch', { name: /Judge this round with a panel/ }).click();
  const settings = panel(page).getByRole('form', { name: 'How this round is judged' });
  await expect(settings).toBeVisible(WAIT);
  await settings.getByRole('button', { name: /Sharing teams out/ }).click();
  await page.getByRole('option', { name: /Every judge scores every team/ }).click();
  await settings.getByLabel('Least reviews a team needs').fill('2');
  await settings.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible(WAIT);

  const criteria = panel(page).getByRole('region', { name: 'Judging criteria' });
  await criteria.getByRole('button', { name: /Write this round's own criteria/ }).click();
  await criteria.getByLabel('Criterion').first().fill('Idea');
  await criteria.getByLabel('Weight (1-10)').first().fill('3');
  await criteria.getByRole('button', { name: 'Add criterion' }).click();
  await criteria.getByLabel('Criterion').nth(1).fill('Demo');
  await criteria.getByLabel('Weight (1-10)').nth(1).fill('1');
  await criteria.getByRole('button', { name: 'Save criteria' }).click();
  await expect(criteria).toContainText('has its own criteria', WAIT);
  await shot(page, '01-set-up');
  expect(state().status).toBe('NOT_STARTED');
});

// ------------------------------------------------------------------------------------------------ 2
test('2. inviting judges: a participant, a duplicate and a bad address are refused', async ({ page }) => {
  await signIn(page, admin);
  await openAdmin(page);
  await panel(page).getByRole('button', { name: /Round settings, criteria and judges/ }).click();
  await panel(page).getByText('Invite a judge who is not on the list').click();

  await invite(page, 'Lead Zero', participant);
  await expect(panel(page).getByRole('alert')).toContainText(/participant/i, WAIT);
  await shot(page, '02-participant-refused');

  await invite(page, 'Cara Guest', cara);
  await expect(panel(page).getByRole('list', { name: 'Invitations' })).toContainText(cara, WAIT);
  await invite(page, 'Cara Guest', cara);
  await expect(panel(page).getByRole('alert')).toContainText(/already invited/i, WAIT);

  await panel(page).getByRole('button', { name: 'Invite several at once' }).click();
  await panel(page).getByLabel('One judge per line').fill('Nobody, not-an-address');
  await panel(page).getByRole('button', { name: /Send invitation/ }).click();
  await expect(panel(page).getByRole('alert')).toContainText(/valid email/i, WAIT);
  expect(helper<{ ok: boolean }>('age_judge_invite', SLUG, cara)).toBeTruthy();
});

// ------------------------------------------------------------------------------------------------ 3
test('3. a new judge: the old link dies, the new one works, a weak password is not accepted', async ({ page, browser }) => {
  const firstLink = await setupLink(cara);
  expect(mailTo(cara).at(-1)!.text.toLowerCase()).not.toContain('password:');

  helper('expire_setup_link', cara);
  const guest = await browser.newContext({ baseURL: SITE_URL });
  const guestPage = await guest.newPage();
  await guestPage.goto(pathOf(firstLink));
  await expect(guestPage.getByText('Link Expired or Invalid')).toBeVisible(WAIT);
  await expect(guestPage.locator('input[autocomplete="new-password"]')).toHaveCount(0);
  await shot(guestPage, '03-expired-link');

  await signIn(page, admin);
  await openAdmin(page);
  await panel(page).getByRole('button', { name: /Round settings, criteria and judges/ }).click();
  await panel(page).getByText('Invite a judge who is not on the list').click();
  await panel(page).getByRole('button', { name: `Resend the link to ${cara}` }).click();
  await expect(page.getByText(`Sent a new link to ${cara}`)).toBeVisible(WAIT);
  const newLink = await setupLink(cara, 1);
  expect(newLink).not.toBe(firstLink);

  await guestPage.goto(pathOf(firstLink));
  await expect(guestPage.getByText('Link Expired or Invalid')).toBeVisible(WAIT);       // the old link stays dead
  await guestPage.goto(pathOf(newLink));
  const [password, confirm] = [guestPage.locator('input[autocomplete="new-password"]').nth(0), guestPage.locator('input[autocomplete="new-password"]').nth(1)];
  const submit = guestPage.getByRole('button', { name: /Set Password & Activate/ });
  await expect(password).toBeVisible(WAIT);
  await password.fill('short');
  await confirm.fill('short');
  await expect(submit).toBeDisabled();                                                    // too weak
  await password.fill(STRONG);
  await confirm.fill(`${STRONG}x`);
  await expect(submit).toBeDisabled();                                                    // does not match
  await confirm.fill(STRONG);
  await expect(submit).toBeEnabled();
  await shot(guestPage, '04-password-form');
  await submit.click();
  await expect(guestPage.getByText(/Password Established|account is now active/i).first()).toBeVisible(WAIT);

  await signIn(guestPage, cara, STRONG);                                                  // no club role, only the invitation
  await guestPage.goto(`/hackathons/${SLUG}/judging`);
  await expect(guestPage.getByRole('heading', { name: 'Judging', level: 1 })).toBeVisible(WAIT);
  await expect(guestPage.getByText('Rounds you judge')).toHaveCount(0);                   // not on a panel yet
  await shot(guestPage, '05-new-judge-no-rounds-yet');
  await guest.close();
});

// ------------------------------------------------------------------------------------------------ 4
test('4. the panel is chosen and judging starts', async ({ page }) => {
  await signIn(page, admin);
  await openAdmin(page);
  const judges = panel(page).getByRole('region', { name: 'Judges for this round' });
  for (const name of ['Asha Rao', 'Ben Roy', 'Cara Guest']) await judges.getByRole('checkbox', { name: new RegExp(name) }).check();
  await judges.getByRole('button', { name: 'Save judges (3)' }).click();
  await expect(panel(page).getByRole('list', { name: 'Checklist' }).getByLabel('Done')).toHaveCount(5, WAIT);
  await panel(page).getByRole('button', { name: 'Start judging' }).click();
  await page.getByRole('button', { name: 'Start judging' }).last().click();
  await expect(panel(page).getByText('0 of 12 scores in (0%)')).toBeVisible(WAIT);
  await shot(page, '06-started');
  expect(state().status).toBe('IN_PROGRESS');
});

// ------------------------------------------------------------------------------------------------ 5
test('5. a judge of the hackathon who is not on this round is turned away', async ({ browser }) => {
  const { context, page } = await asJudge(browser, outsider);
  await page.goto(judgeUrl());
  await expect(page.getByRole('alert').filter({ hasText: /not a judge for this round/i })).toBeVisible(WAIT);
  await expect(page.getByRole('list', { name: 'Your teams' })).toHaveCount(0);
  await page.goto(`/hackathons/${SLUG}/judging`);
  await expect(page.getByText('Rounds you judge')).toHaveCount(0);
  await shot(page, '07-not-on-the-panel');
  await context.close();
});

// ------------------------------------------------------------------------------------------------ 6
test('6. two judges score the same team at once; a score outside the range cannot be sent', async ({ browser }) => {
  const a = await asJudge(browser, asha);
  const b = await asJudge(browser, ben);
  const teamA = (email: string) => `${judgeUrl()}/teams/${entryOf(email, 'Team A')}`;
  await Promise.all([a.page.goto(teamA(asha)), b.page.goto(teamA(ben))]);
  await expect(a.page.getByLabel(/^Idea/)).toBeVisible(WAIT);
  await expect(b.page.getByLabel(/^Idea/)).toBeVisible(WAIT);

  // A score above the maximum is stopped by the page before anything is sent.
  const sent: string[] = [];
  a.page.on('request', (request) => { if (request.method() === 'PUT' && request.url().includes('/my-judging/')) sent.push(request.url()); });
  await a.page.getByLabel(/^Idea/).fill('11');
  await a.page.getByLabel(/^Demo/).fill('5');
  expect(await a.page.getByLabel(/^Idea/).evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false);
  await a.page.getByRole('button', { name: 'Save my scores' }).click();
  await a.page.waitForTimeout(500);
  expect(sent).toHaveLength(0);
  await shot(a.page, '08-out-of-range');

  await Promise.all([score(a.page, '9', '7'), score(b.page, '10', '8')]);
  await expect(a.page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible(WAIT);
  await expect(b.page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible(WAIT);
  await a.context.close();
  await b.context.close();

  const admins = await asAdmin(browser);
  await openAdmin(admins.page);
  const grid = panel(admins.page).getByRole('table', { name: 'Who has scored which team' });
  await expect(grid.getByRole('row', { name: /^Team A Scored Scored Still to score/ })).toBeVisible(WAIT);   // Asha and Ben both saved; Cara has not scored yet
  await shot(admins.page, '09-both-scored-team-a');
  await admins.context.close();
});

// ------------------------------------------------------------------------------------------------ 7
test('7. the deadline passes in the middle of judging, then the organizer moves it', async ({ browser }) => {
  const b = await asJudge(browser, ben);
  await b.page.goto(`${judgeUrl()}/teams/${entryOf(ben, 'Team B')}`);
  await expect(b.page.getByLabel(/^Idea/)).toBeVisible(WAIT);
  helper('set_round_deadline', SLUG, ROUND, '--hours', '-1');                             // the deadline passes while Ben is on the page
  await score(b.page, '8', '8');
  await expect(b.page.getByRole('alert').filter({ hasText: /deadline has passed/i })).toBeVisible(WAIT);
  await shot(b.page, '10-deadline-passed');

  const admins = await asAdmin(browser);
  await openAdmin(admins.page);
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  const local = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T12:00`;
  await panel(admins.page).getByRole('button', { name: /Round settings, criteria and judges/ }).click();
  const settings = panel(admins.page).getByRole('form', { name: 'How this round is judged' });
  await settings.getByLabel('Scoring deadline (optional)').fill(local);
  await settings.getByRole('button', { name: 'Save deadline' }).click();
  await expect(admins.page.getByText('Saved', { exact: true }).first()).toBeVisible(WAIT);
  await admins.context.close();

  await score(b.page, '8', '8');
  await expect(b.page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible(WAIT);
  await b.context.close();
});

// ------------------------------------------------------------------------------------------------ 8
test('8. closing with teams under-reviewed needs a reason, and those teams stay unranked', async ({ page }) => {
  await signIn(page, admin);
  await openAdmin(page);
  await panel(page).getByRole('button', { name: 'Close judging' }).click();
  await page.getByRole('button', { name: 'Close judging' }).last().click();
  await expect(panel(page).getByRole('alert')).toContainText(/fewer than 2 review/i, WAIT);
  const anyway = panel(page).getByRole('button', { name: 'Close anyway' });
  await expect(anyway).toBeDisabled();
  await shot(page, '11-under-reviewed');
  await panel(page).getByLabel('Close anyway: why?').fill('Two judges were unavailable');
  await anyway.click();
  const results = panel(page).getByRole('table', { name: 'Round results' });
  await expect(results).toBeVisible(WAIT);
  await shot(page, '12-closed-with-gaps');
  const ranks = state().ranks;
  expect(ranks['Team A']).toBe(1);
  expect(ranks['Team C']).toBeNull();
  expect(ranks['Team D']).toBeNull();
});

// ------------------------------------------------------------------------------------------------ 9
test('9. reopen, finish the scores, close cleanly: a tie shares a rank', async ({ page }) => {
  await signIn(page, admin);
  await openAdmin(page);
  await panel(page).getByLabel('Reopen judging: why?').fill('Everyone is back, finish the scoring');
  await panel(page).getByRole('button', { name: 'Reopen' }).click();
  await expect(panel(page).getByText('Judges are scoring').first()).toBeVisible(WAIT);

  for (const judge of [asha, ben, cara]) {
    for (const [team, percent] of [['Team A', 100], ['Team B', 80], ['Team C', 80], ['Team D', 40]] as const) {
      helper('score_round', SLUG, ROUND, judge, '--percent', String(percent), '--team', team);
    }
  }
  await panel(page).getByRole('button', { name: 'Refresh' }).click();
  await expect(panel(page).getByText('12 of 12 scores in (100%)')).toBeVisible(WAIT);
  await panel(page).getByRole('button', { name: 'Close judging' }).click();
  await page.getByRole('button', { name: 'Close judging' }).last().click();
  const results = panel(page).getByRole('table', { name: 'Round results' });
  await expect(results).toBeVisible(WAIT);
  await shot(page, '13-closed-cleanly');
  expect(state().ranks).toEqual({ 'Team A': 1, 'Team B': 2, 'Team C': 2, 'Team D': 4 });
  const rows = results.getByRole('row');
  await expect(rows.nth(2)).toContainText('Team B');
  await expect(rows.nth(3)).toContainText('Team C');
  await expect(rows.nth(3).getByRole('cell').first()).toHaveText('2');
  await expect(rows.nth(4).getByRole('cell').first()).toHaveText('4');
});

// ------------------------------------------------------------------------------------------------ 10
test("10. the round's own scores pick the shortlist; a tie at the cut-off stays together", async ({ page }) => {
  await signIn(page, admin);
  await openAdmin(page);
  await expect(page.getByText('Best scores in this round', { exact: true })).toBeVisible(WAIT);     // offered now that the round is closed
  await page.locator('#rule-value').fill('2');
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByText(/3 of 4 teams match/)).toBeVisible(WAIT);
  for (const team of ['Team A', 'Team B', 'Team C']) await expect(page.getByRole('listitem').filter({ hasText: new RegExp(`^${team} ·`) })).toBeVisible();
  await shot(page, '14-shortlist-preview');
  await page.getByRole('button', { name: /Shortlist 3 teams/ }).click();
  await expect(page.getByText('3 teams shortlisted')).toBeVisible(WAIT);
  expect(state().statuses).toMatchObject({ 'Team A': 'SHORTLISTED', 'Team B': 'SHORTLISTED', 'Team C': 'SHORTLISTED', 'Team D': 'PENDING' });
});

// ------------------------------------------------------------------------------------------------ 11
test('11. once the results are published the round cannot be reopened', async ({ page }) => {
  helper('publish_round', SLUG, ROUND);
  await signIn(page, admin);
  await openAdmin(page);
  await expect(panel(page).getByText(/cannot be reopened/)).toBeVisible(WAIT);
  await expect(panel(page).getByRole('button', { name: 'Reopen' })).toHaveCount(0);
  await shot(page, '15-published-locked');
});

// ------------------------------------------------------------------------------------------------ 12
test('12. revoking a judge cuts their access at once, and the invitation shows it', async ({ page, browser }) => {
  const guest = await asJudge(browser, cara, STRONG);       // Cara chose her own password in chapter 3
  await guest.page.goto(judgeUrl());
  await expect(guest.page.getByRole('list', { name: 'Your teams' })).toBeVisible(WAIT);       // still a judge: closed, read-only
  await expect(guest.page.getByText('Closed', { exact: true }).first()).toBeVisible();

  await signIn(page, admin);
  await openAdmin(page);
  await panel(page).getByRole('button', { name: /Round settings, criteria and judges/ }).click();
  await panel(page).getByText('Invite a judge who is not on the list').click();
  await panel(page).getByRole('button', { name: `Revoke ${cara}` }).click();
  await page.getByRole('button', { name: 'Revoke', exact: true }).click();
  await expect(panel(page).getByRole('list', { name: 'Invitations' })).toContainText('Revoked', WAIT);

  await guest.page.goto(judgeUrl());
  await expect(guest.page.getByRole('alert').filter({ hasText: /not a judge/i })).toBeVisible(WAIT);
  await expect(guest.page.getByRole('list', { name: 'Your teams' })).toHaveCount(0);
  await shot(guest.page, '16-revoked');
  await guest.context.close();
});
