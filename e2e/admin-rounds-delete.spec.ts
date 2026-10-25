import { expect, test } from '@playwright/test';
import { openAdmin } from './admin-helpers';

const hackathon = {
  id: 1, title: 'Hackoverflow-2k26', slug: 'hack', theme: 'Code the Future', description: 'd', prize_pool: '₹60,000', status: 'LIVE',
  start_date: '2026-12-01T09:00:00Z', end_date: '2026-12-02T09:00:00Z', features: { ideas: true }, is_registration_open: true, is_hidden: false,
};
const permissions = {
  permissions: ['settings', 'rounds', 'teams', 'ideas', 'content', 'insights'], is_site_organizer: true, roles: [], catalog: [],
  presets: { ORGANIZER: [], JUDGE: [], VOLUNTEER: [] },
};
const round = (id: number, over: Record<string, unknown> = {}) => ({
  id, order: id, name: `Round ${id}`, kind: 'GENERAL', shortlist_limit: null, description: '', starts_at: null, ends_at: null, status: 'ACTIVE', effective_status: 'ACTIVE',
  details_form: null, results_published: false, entry_counts: { total: 0, SHORTLISTED: 0, REJECTED: 0, PENDING: 0, details_submitted: 0 },
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', ...over,
});

/** The rounds the "server" currently has; deleting one removes it, and asking for its teams afterwards is a 404 like the real API. */
function setup(initial: number[]) {
  const alive = new Set(initial);
  const asked: string[] = [];
  return {
    alive, asked,
    handlers: {
      'GET ^/hackathons/hack/$': () => hackathon,
      'GET ^/hackathons/hack/my-permissions/': () => permissions,
      'GET ^/hackathons/hack/rounds/$': () => [...alive].map((id) => round(id)),
      'GET ^/hackathons/hack/rounds/\\d+/entries/': (call: { path: string }) => {
        const id = Number(call.path.match(/rounds\/(\d+)\//)![1]);
        asked.push(String(id));
        return alive.has(id) ? [] : { __status: 404, detail: 'No Round matches the given query.' };
      },
      'DELETE ^/hackathons/hack/rounds/\\d+/$': (call: { path: string }) => {
        alive.delete(Number(call.path.match(/rounds\/(\d+)\//)![1]));
        return { __status: 204 };
      },
      'GET ^/forms/': () => [],
      'GET ^/hackathons/hack/teams/': () => [],
    },
  };
}

async function open(page: import('@playwright/test').Page, context: any, initial: number[]) {
  const server = setup(initial);
  await openAdmin(page, context, '/hackathons/hack/manage?tab=rounds', server.handlers);
  await expect(page.getByRole('heading', { name: /Round \d/ }).first()).toBeVisible();
  return server;
}

const deleteSelected = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'Delete round', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete round' }).click();
};

test.describe('deleting a round', () => {
  test('deleting the selected round shows the next one with no error and never asks for the deleted one', async ({ page, context }) => {
    const server = await open(page, context, [1, 2]);
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible();   // the last round starts selected
    server.asked.length = 0;
    await deleteSelected(page);
    await expect(page.getByText('Round deleted')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.getByText('No Round matches the given query.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
    expect(server.asked).not.toContain('2');
    await expect(page.getByRole('button', { name: /R2/ })).toHaveCount(0);
  });

  test('deleting the only round leaves an empty list and no error', async ({ page, context }) => {
    const server = await open(page, context, [1]);
    await deleteSelected(page);
    await expect(page.getByText('Round deleted')).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.getByText('No Round matches the given query.')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Round 1' })).toHaveCount(0);
    expect(server.alive.size).toBe(0);
  });

  test('a leftover error from an earlier failed load goes away once something loads fine', async ({ page, context }) => {
    const server = setup([1, 2]);
    let failFirst = true;
    const handlers = { 'GET ^/hackathons/hack/rounds/2/entries/': () => (failFirst ? (failFirst = false, { __status: 500, detail: 'boom' }) : []), ...server.handlers };
    await openAdmin(page, context, '/hackathons/hack/manage?tab=rounds', handlers);
    await expect(page.getByText('boom')).toBeVisible();
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('boom')).toHaveCount(0);
  });

  test('a failed delete says so and leaves the round', async ({ page, context }) => {
    const server = setup([1, 2]);
    const handlers = { ...server.handlers, 'DELETE ^/hackathons/hack/rounds/\\d+/$': () => ({ __status: 409, detail: 'Cannot delete.' }) };
    await openAdmin(page, context, '/hackathons/hack/manage?tab=rounds', handlers);
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible();
    await deleteSelected(page);
    await expect(page.getByText('Could not delete the round')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible();
  });
});
