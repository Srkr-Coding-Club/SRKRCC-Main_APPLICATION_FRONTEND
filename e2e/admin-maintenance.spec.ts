import axe from 'axe-core';
import { expect, test, type Page } from '@playwright/test';
import { audit, report } from './audit';
import { openAdmin } from './admin-helpers';

const run = (over: Record<string, unknown> = {}) => ({ id: 1, status: 'SUCCESS', trigger: 'admin', started_at: new Date(Date.now() - 3 * 3600_000).toISOString(), finished_at: new Date().toISOString(), result: '2 unused uploads removed, 0 old records tidied.', error: '', by: 'Ada Min', ...over });
const task = (key: string, label: string, over: Record<string, unknown> = {}) => ({
  key, label, description: `What ${label} does.`, state: 'ok', unavailable_reason: null, pending: 0, pending_label: 'thing(s) waiting', every_hours: 24, running: false, last_run: null, last_success_at: null, ...over,
});

const overview = (tasks: unknown[], attention?: number) => ({ tasks, attention: attention ?? (tasks as any[]).filter((t) => t.state === 'needed' || t.state === 'due').length });

async function violations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.body, { rules: { region: { enabled: false } } });
    return result.violations.map((v: any) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n: any) => n.target.join(' ')).join(' | ')}`);
  });
}

const mixed = () => overview([
  task('sweep_form_uploads', 'Clear unused uploads', { state: 'needed', pending: 4, pending_label: 'unused upload(s) waiting to be removed', last_run: run() }),
  task('scan_form_uploads', 'Check uploads for viruses', { state: 'unavailable', unavailable_reason: 'Virus scanning is switched off.' }),
  task('backfill_form_uploads', 'Move old files to storage', { state: 'ok', every_hours: null }),
  task('purge_form_drafts', 'Delete abandoned drafts', { state: 'due', every_hours: 168 }),
]);

test.describe('the Maintenance page', () => {
  test('shows each task with its state, what is waiting and when it last ran', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/maintenance', { 'GET ^/admin/maintenance/': () => mixed() });
    await expect(page.getByRole('status').filter({ hasText: /need|up to date/ })).toContainText('2 tasks need running.');
    const sweep = page.getByRole('listitem').filter({ hasText: 'Clear unused uploads' });
    await expect(sweep).toContainText('Needs running');
    await expect(sweep).toContainText('4 unused upload(s) waiting to be removed');
    await expect(sweep).toContainText('Last run 3 hours ago · by Ada Min');
    await expect(sweep).toContainText('2 unused uploads removed');
    const drafts = page.getByRole('listitem').filter({ hasText: 'Delete abandoned drafts' });
    await expect(drafts).toContainText('Run soon');
    await expect(drafts).toContainText('Never run.');
    const scan = page.getByRole('listitem').filter({ hasText: 'Check uploads for viruses' });
    await expect(scan).toContainText('Not in use');
    await expect(scan).toContainText('Virus scanning is switched off.');
    await expect(scan.getByRole('button', { name: /Run .* now/ })).toBeDisabled();
  });

  test('says when everything is up to date', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/maintenance', { 'GET ^/admin/maintenance/': () => overview([task('purge_form_drafts', 'Delete abandoned drafts', { last_run: run() })]) });
    await expect(page.getByRole('status').filter({ hasText: /need|up to date/ })).toContainText('Everything is up to date.');
  });

  test('asks first, starts the task, shows it running, then reports the result', async ({ page, context }) => {
    let phase: 'idle' | 'running' | 'done' = 'idle';
    const backend = await openAdmin(page, context, '/admin/maintenance', {
      'GET ^/admin/maintenance/$': () => {
        const base = task('sweep_form_uploads', 'Clear unused uploads', { state: 'needed', pending: 4, pending_label: 'unused upload(s) waiting to be removed' });
        if (phase === 'running') return overview([{ ...base, running: true, last_run: run({ id: 7, status: 'RUNNING', finished_at: null, result: '' }) }]);
        if (phase === 'done') return overview([{ ...base, state: 'ok', pending: 0, last_run: run({ id: 7, started_at: new Date().toISOString() }) }]);
        return overview([base]);
      },
      'POST /sweep_form_uploads/run/': () => { phase = 'running'; setTimeout(() => { phase = 'done'; }, 3500); return { ...task('sweep_form_uploads', 'Clear unused uploads'), running: true, last_run: run({ id: 7, status: 'RUNNING', finished_at: null }) }; },
    });
    await page.getByRole('button', { name: 'Run Clear unused uploads now' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('deleted for good');
    await expect(dialog).toContainText('4');
    expect(backend.find('POST', '/run/')).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Run now' }).click();
    await expect.poll(() => backend.find('POST', '/sweep_form_uploads/run/').length).toBe(1);
    await expect(page.getByText(/Running since/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Clear unused uploads now' })).toBeDisabled();
    await expect(page.getByText('Last run just now')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('status').filter({ hasText: /need|up to date/ })).toContainText('Everything is up to date.');
      });

  test('cancelling the confirmation runs nothing', async ({ page, context }) => {
    const backend = await openAdmin(page, context, '/admin/maintenance', { 'GET ^/admin/maintenance/$': () => mixed() });
    await page.getByRole('button', { name: 'Run Clear unused uploads now' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    expect(backend.find('POST', '/run/')).toHaveLength(0);
  });

  test('a failed last run is shown with its reason', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/maintenance', { 'GET ^/admin/maintenance/': () => overview([task('purge_form_drafts', 'Delete abandoned drafts', { state: 'due', last_run: run({ status: 'FAILED', error: 'db down', result: '' }) })]) });
    await expect(page.getByText('It failed: db down')).toBeVisible();
  });

  test('a task that is already running elsewhere says so', async ({ page, context }) => {
    await openAdmin(page, context, '/admin/maintenance', {
      'GET ^/admin/maintenance/$': () => overview([task('purge_form_drafts', 'Delete abandoned drafts', { state: 'needed', pending: 1 })]),
      'POST /run/': () => ({ __status: 409, error: 'This task is already running.', code: 'ALREADY_RUNNING' }),
    });
    await page.getByRole('button', { name: 'Run Delete abandoned drafts now' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Run now' }).click();
    await expect(page.getByText('This task is already running.')).toBeVisible();
  });

  test('a load error can be retried', async ({ page, context }) => {
    let calls = 0;
    await openAdmin(page, context, '/admin/maintenance', { 'GET ^/admin/maintenance/$': () => (++calls <= 2 ? { __status: 500, detail: 'boom' } : mixed()) });
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'Clear unused uploads' })).toBeVisible();
  });

  test('the menu shows how many tasks need running', async ({ page, context }) => {
    await openAdmin(page, context, '/admin', { 'GET ^/admin/maintenance/': () => mixed() });
    await expect(page.getByRole('img', { name: '2 maintenance tasks need running' })).toBeVisible();
  });

  test('is accessible and fits a 320px phone', async ({ page, context }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openAdmin(page, context, '/admin/maintenance', { 'GET ^/admin/maintenance/': () => mixed() });
    await expect(page.getByRole('heading', { name: 'Clear unused uploads' })).toBeVisible();
    expect(await violations(page)).toEqual([]);
    expect(report(await audit(page))).toEqual([]);
  });
});
