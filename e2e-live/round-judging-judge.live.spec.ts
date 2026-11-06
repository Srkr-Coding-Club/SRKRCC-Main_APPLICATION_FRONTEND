import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PASSWORD, helper, signIn, stateDir } from './live';

/**
 * Judging a round, from the judge's side: real backend, real site, real sign-in.
 * Only the teams a judge was given, scoring with a running total, stepping aside, blind rounds, a closed round, phones.
 * Watch it:  pnpm test:e2e:live --headed e2e-live/round-judging-judge.live.spec.ts
 * (screenshots: test-results/live/round-judging-judge/)
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'rj-judge-fest';
const BLIND = 'rj-blind-fest';
const ROUND = 'Semi-final';
const SHOTS = join(stateDir, 'round-judging-judge');
const WAIT = { timeout: 30_000 };

type Assignments = Record<string, { entry_id: number; team: string; recused: boolean }[]>;
let judges: { email: string; name: string }[] = [];
let blindJudges: { email: string; name: string }[] = [];

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}
const given = () => helper<Assignments>('round_assignments', SLUG, ROUND);
const roundUrl = (slug: string, id: number) => `/hackathons/${slug}/judging/rounds/${id}`;
let roundId = 0;
let blindRoundId = 0;

test.beforeAll(() => {
  const made = helper<{ round_id: number; judges: { email: string; name: string }[] }>('make_round_judging_hackathon', SLUG, '--teams', '4');
  roundId = made.round_id;
  judges = made.judges;
  helper('start_round_judging', SLUG, ROUND, '--mode', 'BALANCED', '--per-team', '1');
  const blind = helper<{ round_id: number; judges: { email: string; name: string }[] }>('make_round_judging_hackathon', BLIND, '--teams', '3');
  blindRoundId = blind.round_id;
  blindJudges = blind.judges;
  helper('start_round_judging', BLIND, ROUND, '--mode', 'ALL', '--blind');
});

test.beforeEach(() => { helper('clear_cache'); });

test('a judge sees the round on their judging page and only the teams they were given', async ({ page }) => {
  await signIn(page, judges[0].email, PASSWORD);
  await page.goto(`/hackathons/${SLUG}/judging`);
  const card = page.getByRole('link', { name: /Semi-final: 0 of 2 scored/ });
  await expect(card).toBeVisible(WAIT);
  await expect(page.getByText('Open for scoring')).toBeVisible();
  await shot(page, '1-judging-home');

  await card.click();
  const mine = given()[judges[0].email];
  const list = page.getByRole('list', { name: 'Your teams' });
  await expect(list.getByRole('link')).toHaveCount(2, WAIT);
  for (const team of mine) await expect(list).toContainText(team.team);
  const others = given()[judges[1].email];
  for (const team of others) await expect(list).not.toContainText(team.team);
  await expect(page.getByText('How you score')).toBeVisible();
  await shot(page, '2-my-teams');
});

test('scoring shows a running total, saves, and moves on to the next team', async ({ page }) => {
  await signIn(page, judges[0].email, PASSWORD);
  const [first, second] = given()[judges[0].email];
  await page.goto(`${roundUrl(SLUG, roundId)}/teams/${first.entry_id}`);
  await expect(page.getByRole('heading', { name: first.team, level: 1 })).toBeVisible(WAIT);
  await expect(page.getByText(`Project number ${first.entry_id}`)).toBeVisible();
  await expect(page.getByText(`Idea number ${first.entry_id}`)).toBeVisible();
  await expect(page.getByText('Your total: fill in every score')).toBeVisible();

  await page.getByLabel(/^Idea/).fill('8');
  await page.getByLabel(/^Demo/).fill('6');
  await expect(page.getByText('Your total: 75.0 / 100')).toBeVisible();
  await page.getByLabel(/Comment for the organizers/).fill('Clear and useful');
  await shot(page, '3-scoring');
  await page.getByRole('button', { name: 'Save my scores' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible(WAIT);
  await page.getByRole('link', { name: 'Next team to score' }).click();
  await expect(page.getByRole('heading', { name: second.team, level: 1 })).toBeVisible(WAIT);

  await page.getByLabel(/^Idea/).fill('10');
  await page.getByLabel(/^Demo/).fill('10');
  await page.getByRole('button', { name: 'Save my scores' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible(WAIT);
  await page.getByRole('link', { name: 'Back to my teams' }).click();
  await expect(page.getByText(/2 of 2 scored/).first()).toBeVisible(WAIT);
  await expect(page.getByRole('list', { name: 'Your teams' })).toContainText('you gave 75.0');
  await shot(page, '4-all-scored');

  // The scores are kept: opening a team again shows them, ready to change.
  await page.goto(`${roundUrl(SLUG, roundId)}/teams/${first.entry_id}`);
  await expect(page.getByLabel(/^Idea/)).toHaveValue('8', WAIT);
  await expect(page.getByRole('button', { name: 'Update my scores' })).toBeVisible();
});

test('a draft survives leaving the page', async ({ page }) => {
  await signIn(page, judges[1].email, PASSWORD);
  const [first] = given()[judges[1].email];
  await page.goto(`${roundUrl(SLUG, roundId)}/teams/${first.entry_id}`);
  await page.getByLabel(/^Idea/).fill('7');
  await page.goto(`/hackathons/${SLUG}/judging`);
  await page.goto(`${roundUrl(SLUG, roundId)}/teams/${first.entry_id}`);
  await expect(page.getByLabel(/^Idea/)).toHaveValue('7', WAIT);
  await expect(page.getByText(/A draft is kept on this device/)).toBeVisible();
});

test('a judge cannot open or score a team that was given to someone else', async ({ page }) => {
  await signIn(page, judges[0].email, PASSWORD);
  const theirs = given()[judges[1].email][0];
  await page.goto(`${roundUrl(SLUG, roundId)}/teams/${theirs.entry_id}`);
  await expect(page.getByRole('alert').filter({ hasText: /not found/i })).toBeVisible(WAIT);
  await expect(page.getByLabel(/^Idea/)).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(`Project number ${theirs.entry_id}`);
});

test('stepping aside needs a reason, and the team goes to the other judge', async ({ page, browser }) => {
  await signIn(page, judges[1].email, PASSWORD);
  const [, second] = given()[judges[1].email];
  await page.goto(`${roundUrl(SLUG, roundId)}/teams/${second.entry_id}`);
  await page.getByRole('button', { name: /step aside/i }).click();
  const confirm = page.getByRole('button', { name: 'Step aside from this team' });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Why are you stepping aside?').fill('I mentored this team');
  await confirm.click();
  await expect(page.getByText(/You stepped aside from this team: I mentored this team/)).toBeVisible(WAIT);
  await expect(page.getByLabel(/^Idea/)).toHaveCount(0);
  await shot(page, '5-stepped-aside');

  const after = given();
  expect(after[judges[1].email].find((a) => a.team === second.team)?.recused).toBe(true);
  expect(after[judges[0].email].some((a) => a.team === second.team && !a.recused)).toBe(true);

  const other = await browser.newPage();
  await signIn(other, judges[0].email, PASSWORD);
  await other.goto(roundUrl(SLUG, roundId));
  await expect(other.getByRole('list', { name: 'Your teams' }).getByRole('link')).toHaveCount(3, WAIT);
  await other.close();
});

test('a blind round shows codes and never names a team', async ({ page }) => {
  await signIn(page, blindJudges[0].email, PASSWORD);
  await page.goto(roundUrl(BLIND, blindRoundId));
  await expect(page.getByText(/Blind: team names are hidden/)).toBeVisible(WAIT);
  const list = page.getByRole('list', { name: 'Your teams' });
  await expect(list.getByRole('link')).toHaveCount(3);
  await expect(page.locator('main, body').first()).not.toContainText(/Team [A-C]\b/);
  const first = list.getByRole('link').first();
  await expect(first).toContainText(/Team \d{3}/);
  await first.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Team \d{3}/, WAIT);
  await expect(page.locator('body')).not.toContainText(/Team [A-C]\b/);
  await shot(page, '6-blind');
});

test('once the round is closed the scores are final and read-only', async ({ page }) => {
  helper('close_round', SLUG, ROUND);
  await signIn(page, judges[0].email, PASSWORD);
  await page.goto(roundUrl(SLUG, roundId));
  await expect(page.getByText('Closed', { exact: true }).first()).toBeVisible(WAIT);
  const first = given()[judges[0].email][0];
  await page.goto(`${roundUrl(SLUG, roundId)}/teams/${first.entry_id}`);
  await expect(page.getByText(/Scoring is closed for this round/)).toBeVisible(WAIT);
  await expect(page.getByText(/Your total: 75\.0 \/ 100/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Save my scores|Update my scores/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /step aside/i })).toHaveCount(0);
  await shot(page, '7-closed');
});

for (const width of [320, 375]) {
  test(`the judge pages fit a ${width}px phone and the fields are easy to hit`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await signIn(page, blindJudges[1].email, PASSWORD);
    const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.goto(`/hackathons/${BLIND}/judging`);
    await expect(page.getByRole('link', { name: /Semi-final/ })).toBeVisible(WAIT);
    expect(await sideways()).toBeLessThanOrEqual(0);

    await page.goto(roundUrl(BLIND, blindRoundId));
    const first = page.getByRole('list', { name: 'Your teams' }).getByRole('link').first();
    await expect(first).toBeVisible(WAIT);
    expect(await sideways()).toBeLessThanOrEqual(0);
    expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    await first.click();
    await expect(page.getByLabel(/^Idea/)).toBeVisible(WAIT);
    expect(await sideways()).toBeLessThanOrEqual(0);
    for (const field of [page.getByLabel(/^Idea/), page.getByLabel(/^Demo/), page.getByRole('button', { name: 'Save my scores' })]) {
      expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await shot(page, `phone-${width}`);
  });
}
