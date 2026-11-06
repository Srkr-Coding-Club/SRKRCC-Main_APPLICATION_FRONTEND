import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { helper, mailTo, signIn, stateDir, uniqueEmail } from './live';

/**
 * Judging a round, from the organizer's side: real backend, real site.
 * Switch a round to judged, set it up, invite a judge, start, watch scores arrive, close into a ranking, reopen.
 * Watch it:  pnpm test:e2e:live --headed e2e-live/round-judging-admin.live.spec.ts
 * (screenshots: test-results/live/round-judging-admin/)
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'round-judging-fest';
const ROUND = 'Semi-final';
const SHOTS = join(stateDir, 'round-judging-admin');
const WAIT = { timeout: 30_000 };

let admin = '';
let judges: { email: string; name: string }[] = [];
const newJudge = uniqueEmail('guest');

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

const open = async (page: Page) => {
  await page.goto(`/admin/hackathons/${SLUG}?tab=rounds`);
  await page.getByRole('button', { name: new RegExp(`R1 · ${ROUND}`) }).click();
  await expect(page.getByRole('region', { name: 'Judging this round' })).toBeVisible(WAIT);
};
const panel = (page: Page) => page.getByRole('region', { name: 'Judging this round' });
const state = () => helper<{ mode: string; status: string; panel: number; ranks: Record<string, number | null> }>('round_state', SLUG, ROUND);

test.beforeAll(() => {
  admin = uniqueEmail('boss');
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
  judges = helper<{ judges: { email: string; name: string }[] }>('make_round_judging_hackathon', SLUG, '--teams', '4').judges;
});

test.beforeEach(() => { helper('clear_cache'); });

test('a plain round is switched to judged and set up', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  const toggle = panel(page).getByRole('switch', { name: /Judge this round with a panel/ });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(panel(page).getByRole('form', { name: 'How this round is judged' })).toBeVisible(WAIT);

  const settings = panel(page).getByRole('form', { name: 'How this round is judged' });
  await settings.getByRole('button', { name: /Sharing teams out/ }).click();
  await page.getByRole('option', { name: /Every judge scores every team/ }).click();
  await settings.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible(WAIT);

  const criteria = panel(page).getByRole('region', { name: 'Judging criteria' });
  await expect(criteria).toContainText('has no criteria yet');
  await criteria.getByRole('button', { name: /Write this round's own criteria/ }).click();
  await criteria.getByLabel('Criterion').first().fill('Overall quality');
  await criteria.getByRole('button', { name: 'Save criteria' }).click();
  await expect(criteria).toContainText('has its own criteria', WAIT);

  const judgesBox = panel(page).getByRole('region', { name: 'Judges for this round' });
  for (const judge of judges) await judgesBox.getByRole('checkbox', { name: new RegExp(judge.name) }).check();
  await judgesBox.getByRole('button', { name: 'Save judges (2)' }).click();
  await expect(panel(page).getByRole('list', { name: 'Checklist' }).getByLabel('Not done')).toHaveCount(0, WAIT);
  await shot(page, '1-set-up');
  expect(state()).toMatchObject({ mode: 'JUDGED', status: 'NOT_STARTED', panel: 2 });
});

test('a judge with no account is invited and gets a one-time link, never a password', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  await panel(page).getByText('Invite a judge who is not on the list').click();
  const form = panel(page).getByRole('form', { name: 'Invite judges' });
  await form.getByLabel('Name').fill('Guest Judge');
  await form.getByLabel('Email').fill(newJudge);
  await form.getByRole('button', { name: /Send invitation/ }).click();
  const invitations = panel(page).getByRole('list', { name: 'Invitations' });
  await expect(invitations).toContainText(newJudge, WAIT);
  await expect(invitations).toContainText('Waiting for them');
  await shot(page, '2-invited');

  const mail = mailTo(newJudge).at(-1)!;
  expect(mail.subject).toContain('invited to judge');
  expect(mail.text).toMatch(/\/account\/setup-password\?token=[\w-]+/);
  expect(mail.text.toLowerCase()).not.toContain('password:');

  await invitations.getByRole('button', { name: `Revoke ${newJudge}` }).click();
  await page.getByRole('button', { name: 'Revoke', exact: true }).click();
  await expect(invitations).toContainText('Revoked', WAIT);
});

test('judging starts and the grid fills as scores arrive', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  const checklist = panel(page).getByRole('list', { name: 'Checklist' });
  await expect(checklist.getByLabel('Done')).toHaveCount(5);
  await panel(page).getByRole('button', { name: 'Start judging' }).click();
  await page.getByRole('button', { name: 'Start judging' }).last().click();
  await expect(panel(page).getByText('Judges are scoring').first()).toBeVisible(WAIT);
  await expect(panel(page).getByText('0 of 8 scores in (0%)')).toBeVisible(WAIT);
  await shot(page, '3-started');
  expect(state().status).toBe('IN_PROGRESS');

  for (const judge of judges) {
    for (const [team, percent] of [['Team A', 100], ['Team B', 80], ['Team C', 60], ['Team D', 40]] as const) {
      helper('score_round', SLUG, ROUND, judge.email, '--percent', String(percent), '--team', team);
    }
  }
  await panel(page).getByRole('button', { name: 'Refresh' }).click();
  await expect(panel(page).getByText('8 of 8 scores in (100%)')).toBeVisible(WAIT);
  await shot(page, '4-all-scored');
});

test('closing ranks the teams and the round scores drive the shortlist; reopening needs a reason', async ({ page }) => {
  await signIn(page, admin);
  await open(page);
  await panel(page).getByRole('button', { name: 'Close judging' }).click();
  await page.getByRole('button', { name: 'Close judging' }).last().click();
  const results = panel(page).getByRole('table', { name: 'Round results' });
  await expect(results).toBeVisible(WAIT);
  const rows = results.getByRole('row');
  await expect(rows.nth(1)).toContainText('Team A');
  await expect(rows.nth(1)).toContainText('100.0');
  await expect(rows.nth(4)).toContainText('Team D');
  await shot(page, '5-closed');
  expect(state()).toMatchObject({ status: 'CLOSED', ranks: { 'Team A': 1, 'Team B': 2, 'Team C': 3, 'Team D': 4 } });

  // The shortlist tools now offer this round's own scores.
  await expect(page.getByText('Best scores in this round')).toBeVisible(WAIT);

  const reopen = panel(page).getByRole('button', { name: 'Reopen' });
  await expect(reopen).toBeDisabled();
  await panel(page).getByLabel('Reopen judging: why?').fill('A judge found a mistake');
  await reopen.click();
  await expect(panel(page).getByText('Judges are scoring').first()).toBeVisible(WAIT);
  expect(state().status).toBe('IN_PROGRESS');
});

for (const width of [320, 375]) {
  test(`the judging panel fits a ${width}px phone and its controls are easy to hit`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await signIn(page, admin);
    await open(page);
    await expect(panel(page).getByRole('table', { name: 'Who has scored which team' })).toBeVisible(WAIT);
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const wide = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => {
          if (el.getBoundingClientRect().right <= limit + 1) return false;
          // Only what really pushes the page: nothing between it and the body scrolls or clips it.
          for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) {
            if (getComputedStyle(up).overflowX !== 'visible') return false;
          }
          return true;
        })
        .slice(0, 8).map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute('aria-label') ?? ''}].${String(el.className).slice(0, 50)} pos=${getComputedStyle(el).position} right=${Math.round(el.getBoundingClientRect().right)} text="${(el.textContent || '').trim().slice(0, 40)}"`);
    });
    // Is it this panel, or was the page already wider than the screen? Hide the panel and measure again.
    const culprits = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('section[aria-label="Judging this round"]')!;
      const out: string[] = [];
      const deep: string[] = [];
      const pageW = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
      // Keep going into whichever child hides the overflow, until it is a single element.
      let node: HTMLElement = section;
      for (let depth = 0; depth < 8; depth++) {
        const hit = ([...node.children] as HTMLElement[]).find((kid) => {
          const before = kid.style.display; kid.style.display = 'none';
          const fixed = pageW() <= 0; kid.style.display = before; return fixed;
        });
        if (!hit) break;
        deep.push(`${hit.tagName.toLowerCase()}[${hit.getAttribute('aria-label') ?? ''}].${String(hit.className).slice(0, 60)} w=${Math.round(hit.getBoundingClientRect().width)} sw=${hit.scrollWidth}`);
        node = hit;
      }
      const page = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
      for (const child of [...section.children] as HTMLElement[]) {
        const before = child.style.display;
        child.style.display = 'none';
        if (page() <= 0) out.push(`child <${child.tagName.toLowerCase()} aria-label="${child.getAttribute('aria-label') ?? ''}" class="${String(child.className).slice(0, 40)}"> text="${(child.textContent || '').trim().slice(0, 30)}" width=${Math.round(child.getBoundingClientRect().width)} scrollWidth=${child.scrollWidth}`);
        child.style.display = before;
      }
      const chain: string[] = [];
      for (let up: HTMLElement | null = section; up; up = up.parentElement) chain.push(`${up.tagName.toLowerCase()}:${Math.round(up.getBoundingClientRect().width)}/${up.scrollWidth}:${getComputedStyle(up).overflowX}`);
      return `${deep.join(' => ')} || ${out.join(' ; ') || 'no single child'} | chain ${chain.join(' > ')}`;
    });
    const withoutPanel = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('section[aria-label="Judging this round"]')!;
      section.style.display = 'none';
      const left = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      section.style.display = '';
      return left;
    });
    expect(sideways, `${sideways}px too wide, ${withoutPanel}px without the judging panel; culprit: ${culprits}; sticking out: ${wide.join(' | ')}`).toBeLessThanOrEqual(0);
    const small = await page.evaluate(() => {
      const root = document.querySelector('section[aria-label="Judging this round"]');
      const bad: string[] = [];
      for (const el of root?.querySelectorAll<HTMLElement>('button:not([role=switch]):not([role=option]), input:not([type=checkbox])') ?? []) {
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        if (box.height < 36) bad.push(`${(el.getAttribute('aria-label') || el.textContent || el.id).trim().slice(0, 40)}: ${Math.round(box.height)}px`);
      }
      return bad;
    });
    expect(small).toEqual([]);
    await shot(page, `phone-${width}`);
  });
}
