import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ replace: vi.fn(), query: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }), usePathname: () => '/admin/reconcile', useSearchParams: () => new URLSearchParams(nav.query),
}));
const api = vi.hoisted(() => ({
  inspect: vi.fn(), create: vi.fn(), runs: vi.fn(), summary: vi.fn(), remove: vi.fn(), rows: vi.fn(), missing: vi.fn(), recheck: vi.fn(), act: vi.fn(), bulk: vi.fn(), exportReport: vi.fn(),
}));
vi.mock('@/lib/reconciliation', async (original) => ({ ...(await original<typeof import('@/lib/reconciliation')>()), reconciliationApi: api }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
const stored = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('@/lib/auth', () => ({ getStoredUser: () => ({ id: 1, role: stored.role }) }));

import { ReconcileWorkspace } from '../ReconcileWorkspace';
import { UploadWizard } from '../UploadWizard';

const outcomes = (over: Record<string, number> = {}) => ({
  MATCH: 2, NAME_DIFFERS: 0, ID_MISSING_IN_APP: 2, ID_MISMATCH: 1, ID_HELD_BY_OTHER: 0, EMAIL_MISMATCH: 0, ID_RESERVED: 0, ID_RETIRED: 0, NO_ACCOUNT: 1, NO_ACCOUNT_NO_ID: 0, NO_ID_IN_SHEET: 0, INVALID: 0, DUPLICATE: 0, ...over,
});
const summary = (over: Record<string, unknown> = {}) => ({
  id: 'run-1', filename: 'past.xlsx', sheet: '2023', mapping: { name: 'Name', email: 'Email', club_id: 'ID' }, total: 6, created_at: '2026-10-30T10:00:00Z', created_by: 'boss@x.io',
  by_outcome: outcomes(), by_resolution: {}, open: 4, ...over,
});
const row = (over: Record<string, unknown> = {}) => ({
  id: 11, row_number: 4, name: 'Meena Kumari', email: 'meena@x.io', club_id: '25SCC080', outcome: 'ID_MISSING_IN_APP', outcome_label: 'Account has no Club ID', detail: 'The account exists and has no Club ID; 25SCC080 is free.',
  resolution: 'PENDING', resolution_label: 'Open', note: '', matched_user: { id: 5, name: 'Meena Kumari', email: 'meena@x.io', club_id: null, role: 'NON_AFFILIATE' }, other_user: null,
  resolved_by: '', resolved_at: null, invited_at: null, actions: ['link', 'follow_up', 'dismiss'], ...over,
});
const page = (results: unknown[], count = results.length) => ({ count, next: null, previous: null, results });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  nav.replace.mockReset();
  nav.query = '';
  stored.role = 'ADMIN';
  api.runs.mockResolvedValue({ results: [summary()] });
  api.summary.mockResolvedValue(summary());
  api.rows.mockImplementation(async (_id: string, params: { outcome?: string }) => (params.outcome ? page([], params.outcome === 'ID_MISSING_IN_APP' ? 2 : 1) : page([row()])));
  api.missing.mockResolvedValue(page([], 3));
  api.act.mockResolvedValue(row({ resolution: 'LINKED', outcome: 'MATCH', actions: [] }));
  api.bulk.mockResolvedValue({ done: 2, failed: [] });
  api.recheck.mockResolvedValue({ changed: 0, summary: summary() });
});
afterEach(cleanup);

describe('the list of comparisons', () => {
  it('shows each comparison with how many match and how many need a decision, and opens one into the address', async () => {
    render(<ReconcileWorkspace />);
    fireEvent.click(await screen.findByText('past.xlsx'));
    expect(screen.getByText('4 need a decision')).toBeTruthy();
    expect(nav.replace).toHaveBeenCalledWith('/admin/reconcile?run=run-1', { scroll: false });
  });

  it('invites an Admin to upload the first sheet and tells a Club Lead who can', async () => {
    api.runs.mockResolvedValue({ results: [] });
    render(<ReconcileWorkspace />);
    expect(await screen.findByText('No sheet has been compared yet.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Upload a sheet/ })).toBeTruthy();
    cleanup();
    stored.role = 'CLUB_LEAD';
    render(<ReconcileWorkspace />);
    expect(await screen.findByText(/only an Admin can upload/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Upload a sheet/ })).toBeNull();
  });
});

describe('one comparison', () => {
  beforeEach(() => { nav.query = 'run=run-1'; });

  it('shows the groups with their counts and starts on the rows that can be linked', async () => {
    render(<ReconcileWorkspace />);
    expect(await screen.findByText('Meena Kumari', { selector: 'p' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Matches/i }).textContent).toContain('2');
    expect(screen.getByRole('button', { name: /^Mismatches/i }).textContent).toContain('1');
    expect(await screen.findByRole('button', { name: 'Link all 2…' })).toBeTruthy();
    expect(api.rows).toHaveBeenCalledWith('run-1', expect.objectContaining({ group: 'link', open: true }));
  });

  it('links one row through the server and reloads', async () => {
    render(<ReconcileWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Link 25SCC080' }));
    await waitFor(() => expect(api.act).toHaveBeenCalledWith('run-1', 11, 'link'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('25SCC080 linked to Meena Kumari'));
    expect(api.rows.mock.calls.length).toBeGreaterThan(2);
  });

  it('links all only after a confirmation that names the count, and sends the count it saw', async () => {
    render(<ReconcileWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Link all 2…' }));
    expect(api.bulk).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Link 2 Club IDs?')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Link 2' }));
    await waitFor(() => expect(api.bulk).toHaveBeenCalledWith('run-1', { action: 'link', outcome: 'ID_MISSING_IN_APP', expected: 2 }));
  });

  it('reports the rows that could not be done instead of claiming success', async () => {
    api.bulk.mockResolvedValue({ done: 1, failed: [{ row_number: 5, error: 'Club ID is taken' }] });
    render(<ReconcileWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Link all 2…' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Link 2' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('1 done, 1 could not be', 'row 5: Club ID is taken'));
  });

  it('asks for a reason before using the sheet’s id', async () => {
    api.rows.mockImplementation(async (_id: string, params: { outcome?: string }) => (params.outcome ? page([], 0) : page([row({ outcome: 'ID_MISMATCH', actions: ['use_sheet', 'keep_app', 'follow_up', 'dismiss'], matched_user: { id: 5, name: 'Hana', email: 'h@x.io', club_id: '25SCC010', role: 'AFFILIATE' } })])));
    render(<ReconcileWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: /Use the sheet/ }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: /^Use 25SCC080/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/Why is the sheet right/), { target: { value: 'Original register' } });
    fireEvent.click(submit);
    await waitFor(() => expect(api.act).toHaveBeenCalledWith('run-1', 11, 'use-sheet', { note: 'Original register' }));
  });

  it('confirms before inviting and says what will happen', async () => {
    api.rows.mockImplementation(async (_id: string, params: { outcome?: string }) => (params.outcome ? page([], 0) : page([row({ outcome: 'NO_ACCOUNT', actions: ['invite', 'follow_up', 'dismiss'], matched_user: null })])));
    render(<ReconcileWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: /Invite and reserve 25SCC080/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/reserved for this email/)).toBeTruthy();
    expect(api.act).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Invite' }));
    await waitFor(() => expect(api.act).toHaveBeenCalledWith('run-1', 11, 'invite'));
  });

  it('shows a refusal from the server as a message and reloads the list', async () => {
    api.act.mockRejectedValue(new Error('This row is now "Different Club ID in the app", so that does not apply.'));
    render(<ReconcileWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Link 25SCC080' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not do that', expect.stringContaining('does not apply')));
    await waitFor(() => expect(api.rows.mock.calls.length).toBeGreaterThan(3));
  });

  it('gives a Club Lead the rows without any action', async () => {
    stored.role = 'CLUB_LEAD';
    api.rows.mockImplementation(async (_id: string, params: { outcome?: string }) => (params.outcome ? page([], 0) : page([row()])));
    render(<ReconcileWorkspace />);
    expect(await screen.findByText('Meena Kumari', { selector: 'p' })).toBeTruthy();
    for (const name of [/^Link 25SCC080/, /Follow up later/, /^Dismiss/, /^Delete$/, /Link all/]) expect(screen.queryByRole('button', { name })).toBeNull();
  });

  it('checks again on request and says whether anything changed', async () => {
    api.recheck.mockResolvedValue({ changed: 3, summary: summary() });
    render(<ReconcileWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: /Check again/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3 rows changed'));
  });
});

describe('the upload', () => {
  const inspection = { sheets: [{ name: '2023', rows: 6 }, { name: '2024', rows: 9 }], sheet: '2023', headers: ['Name', 'Email', 'ID'], suggested: { name: 'Name', email: 'Email', club_id: 'ID' }, total_rows: 6, sample: [{ Name: 'Sita', Email: 'sita@x.io', ID: '25SCC001' }] };

  it('suggests the columns, lets you change them and compares with the choice made', async () => {
    api.inspect.mockResolvedValue(inspection);
    api.create.mockResolvedValue(summary());
    const onCreated = vi.fn();
    const { container } = render(<UploadWizard onClose={vi.fn()} onCreated={onCreated} />);
    const file = new File(['x'], 'past.xlsx');
    fireEvent.change(container.ownerDocument.getElementById('reconcile-file')!, { target: { files: [file] } });
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect((within(dialog).getByLabelText(/^Email/) as HTMLSelectElement).value).toBe('Email'));
    expect(within(dialog).getByLabelText('Which sheet?')).toBeTruthy();
    expect(within(dialog).getByText('Sita')).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText('Which sheet?'), { target: { value: '2024' } });
    await waitFor(() => expect(api.inspect).toHaveBeenLastCalledWith(file, '2024'));
    fireEvent.click(within(dialog).getByRole('button', { name: /^Compare/ }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(file, '2023', { name: 'Name', email: 'Email', club_id: 'ID' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it('will not compare without an email or Club ID column, and shows what is wrong with an unreadable file', async () => {
    api.inspect.mockResolvedValueOnce({ ...inspection, sheets: [{ name: '2023', rows: 6 }], suggested: { name: 'Name', email: '', club_id: '' } });
    const { container } = render(<UploadWizard onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(container.ownerDocument.getElementById('reconcile-file')!, { target: { files: [new File(['x'], 'past.csv')] } });
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(/Choose the email column/)).toBeTruthy();
    expect((within(dialog).getByRole('button', { name: /^Compare/ }) as HTMLButtonElement).disabled).toBe(true);
    api.inspect.mockRejectedValueOnce(new Error('Upload an Excel (.xlsx) or CSV (.csv) file.'));
    fireEvent.change(container.ownerDocument.getElementById('reconcile-file')!, { target: { files: [new File(['x'], 'old.xls')] } });
    expect(await within(dialog).findByRole('alert')).toBeTruthy();
  });
});
