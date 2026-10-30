import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ replace: vi.fn(), query: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }), usePathname: () => '/admin/club-ids', useSearchParams: () => new URLSearchParams(nav.query),
}));
const api = vi.hoisted(() => ({
  overview: vi.fn(), lookup: vi.fn(), events: vi.fn(), reservations: vi.fn(), reserve: vi.fn(), release: vi.fn(), allocate: vi.fn(), assign: vi.fn(),
  reassign: vi.fn(), clear: vi.fn(), setCounter: vi.fn(), registry: vi.fn(), people: vi.fn(),
}));
vi.mock('@/lib/clubIds', () => ({ clubIdApi: api }));
const membership = vi.hoisted(() => ({ queue: vi.fn() }));
vi.mock('@/lib/clubMembership', () => ({ membershipApi: membership }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
const stored = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('@/lib/auth', () => ({ getStoredUser: () => ({ id: 1, role: stored.role }) }));

import { ClubIdPanel } from '../ClubIdPanel';

const year = new Date().getFullYear();
const holder = { id: 7, name: 'Hana Rao', email: 'hana@x.io', role: 'AFFILIATE', membership_status: 'ACTIVE', club_id: '25SCC010', email_verified: true };
const counter = { prefix: 'SCC', year, next_sequence: 12, next_id: `${String(year % 100).padStart(2, '0')}SCC012`, in_use: 11, highest: 11, gaps: 0, has_counter: true, editable: true };
const row = (over: Record<string, unknown> = {}) => ({
  id: 7, email: 'hana@x.io', full_name: 'Hana Rao', club_id: '25SCC010', role: 'AFFILIATE', membership_status: 'ACTIVE', email_state: 'VERIFIED', email_verified_at: '2026-10-01T00:00:00Z', email_days_left: null, ...over,
});
const person = (over: Record<string, unknown> = {}) => ({ id: 8, email: 'sita@x.io', full_name: 'Sita Rao', club_id: null, ...over });
const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });
const show = () => render(<ClubIdPanel />);

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  nav.replace.mockReset();
  nav.query = '';
  stored.role = 'ADMIN';
  api.overview.mockResolvedValue({ counters: [counter], totals: { holders: 11, reserved: 2, retired: 1 } });
  api.registry.mockResolvedValue(page([row()]));
  api.reservations.mockResolvedValue({ results: [] });
  api.events.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  api.people.mockResolvedValue(page([person()]));
  api.lookup.mockResolvedValue({ kind: 'id', club_id: '25SCC010', holder, reservation: null, retired: false, events: [] });
  membership.queue.mockResolvedValue({ count: 0, next: null, previous: null, results: [], counts: { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 } });
  api.assign.mockResolvedValue({ person: { ...holder, club_id: '25SCC050' } });
  api.clear.mockResolvedValue({ person: holder, club_id: '25SCC010', demoted: true });
});
afterEach(cleanup);

describe('ClubIdPanel', () => {
  it('shows the totals, the next number of the year and the registry', async () => {
    show();
    expect(await screen.findByText('11')).toBeTruthy();
    expect(screen.getByText(counter.next_id)).toBeTruthy();
    expect(await screen.findByText('25SCC010')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Move 25SCC010' })).toBeTruthy();
  });

  it('looks up an id and shows who holds it', async () => {
    show();
    await screen.findByText('25SCC010');
    fireEvent.change(screen.getByLabelText(/Look up a Club ID/), { target: { value: '25scc010' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }));
    const result = await screen.findByRole('region', { name: 'Look up' });
    await waitFor(() => expect(within(result).getByText('Held')).toBeTruthy());
    expect(within(result).getByText('Hana Rao')).toBeTruthy();
    expect(api.lookup).toHaveBeenCalledWith('25scc010');
  });

  it('assigns an id only once a person and a reason are given, and keeps the dialog open with the reason it was refused', async () => {
    api.assign.mockRejectedValueOnce(new Error("Club ID '25SCC050' is already assigned to hana@x.io."));
    show();
    await screen.findByText('25SCC010');
    fireEvent.click(screen.getByRole('button', { name: 'Assign an id' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Assign' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Club ID'), { target: { value: '25scc050' } });
    fireEvent.change(within(dialog).getByLabelText('Who gets it'), { target: { value: 'sita' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: /Sita Rao/ }));
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'Old record' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    expect(await within(dialog).findByRole('alert')).toBeTruthy();
    expect(api.assign).toHaveBeenCalledWith({ user_id: 8, club_id: '25SCC050', reason: 'Old record', allow_retired: false });
    fireEvent.click(submit);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('clears an id only after the id is typed again, and says it is retired', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Clear 25SCC010' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Clear and retire' }) as HTMLButtonElement;
    expect(within(dialog).getByText(/becomes a non-affiliate/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'Left the club' } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/^Type/), { target: { value: '25SCC010' } });
    fireEvent.click(submit);
    await waitFor(() => expect(api.clear).toHaveBeenCalledWith({ user_id: 7, reason: 'Left the club', confirm: '25SCC010' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('25SCC010 was cleared and retired'));
  });

  it('moves the counter only to a number above both the counter and the highest in use', async () => {
    nav.query = 'tab=counters';
    api.setCounter.mockResolvedValue({ prefix: 'SCC', year, next_sequence: 40 });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Move counter' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Move the counter' }) as HTMLButtonElement;
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'New batch' } });
    fireEvent.change(within(dialog).getByLabelText('Next number'), { target: { value: '5' } });
    expect(submit.disabled).toBe(true);
    expect(within(dialog).getByText(/must be higher than 12/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText('Next number'), { target: { value: '40' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(api.setCounter).toHaveBeenCalledWith({ year, next_sequence: 40, reason: 'New batch', prefix: 'SCC' }));
  });

  it('asks before releasing a reservation', async () => {
    nav.query = 'tab=reservations';
    api.reservations.mockResolvedValue({ results: [{ id: 3, club_id: '25SCC060', email: 'back@x.io', reason: 'Past member', source: 'MANUAL', status: 'RESERVED', created_at: '2026-10-01T00:00:00Z', created_by: 'boss@x.io', claimed_at: null, claimed_by: '', released_at: null }] });
    api.release.mockResolvedValue({});
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Release' }));
    expect(api.release).not.toHaveBeenCalled();
    const dialogs = await screen.findAllByRole('dialog');
    fireEvent.click(within(dialogs[dialogs.length - 1]).getByRole('button', { name: 'Release' }));
    await waitFor(() => expect(api.release).toHaveBeenCalledWith(3));
  });

  it('lists the history with who did it and why', async () => {
    nav.query = 'tab=history';
    api.events.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 1, club_id: '25SCC010', kind: 'CLEARED', kind_label: 'Cleared (retired)', user_email: 'hana@x.io', other_email: '', actor_email: 'boss@x.io', reason: 'Left the club', details: {}, created_at: '2026-10-02T00:00:00Z' }] });
    show();
    expect(await screen.findByText('Cleared (retired)')).toBeTruthy();
    expect(screen.getByText(/by boss@x.io/)).toBeTruthy();
    expect(screen.getByText('“Left the club”')).toBeTruthy();
  });

  it('gives a Club Lead the numbers and the look-up but no way to change anything', async () => {
    stored.role = 'CLUB_LEAD';
    show();
    await screen.findByText('25SCC010');
    expect(screen.getByText(/only an Admin can change an id/)).toBeTruthy();
    for (const name of [/Give the next number/, /Assign an id/, /Reserve an id/, /^Move /, /^Clear /]) expect(screen.queryByRole('button', { name })).toBeNull();
    expect(screen.getByLabelText(/Look up a Club ID/)).toBeTruthy();
  });
});
