import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ me: vi.fn(), request: vi.fn(), cancel: vi.fn(), queue: vi.fn(), approve: vi.fn(), reject: vi.fn(), bulkApprove: vi.fn() }));
vi.mock('@/lib/clubMembership', () => ({ membershipApi: api }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/hooks/useCelebrations', () => ({ requestCelebrationCheck: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));

import { ClubMembershipCard } from '../../../profile/ClubMembershipCard';
import { RequestsTab } from '../RequestsTab';

const mine = (over: Record<string, unknown> = {}) => ({ club_id: null, role: 'NON_AFFILIATE', request: null, can_request: true, blockers: [], ...over });
const entry = (over: Record<string, unknown> = {}) => ({ id: 1, status: 'PENDING', status_label: 'Waiting', message: '', note: '', club_id: '', created_at: '2026-10-20T10:00:00Z', decided_at: null, ...over });

describe('ClubMembershipCard', () => {
  beforeEach(() => { Object.values(api).forEach((fn) => fn.mockReset()); toast.success.mockReset(); toast.error.mockReset(); });
  afterEach(cleanup);

  it('lets a person who can ask do so, with an optional message', async () => {
    api.me.mockResolvedValue(mine());
    api.request.mockResolvedValue({ request: entry(), auto_approved: false });
    render(<ClubMembershipCard />);
    fireEvent.change(await screen.findByLabelText(/Anything the organizers/), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask to join the club' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith('Hello'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Request sent. An organizer will look at it.'));
  });

  it('says exactly what stops someone, with where to fix it, and offers no button', async () => {
    api.me.mockResolvedValue(mine({ can_request: false, blockers: [
      { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email address first.', fix: '/profile' },
      { code: 'PROFILE_INCOMPLETE', message: 'Complete your profile: Roll number, College.', fix: '/profile', missing: ['Roll number', 'College'] },
    ] }));
    render(<ClubMembershipCard />);
    expect(await screen.findByText(/Verify your email address first/)).toBeTruthy();
    expect(screen.getByText(/Roll number, College/)).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Fix this' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Ask to join the club' })).toBeNull();
  });

  it('shows a waiting request and lets the person withdraw it', async () => {
    api.me.mockResolvedValue(mine({ can_request: false, request: entry({ message: 'Please' }), blockers: [{ code: 'PENDING', message: 'waiting' }] }));
    api.cancel.mockResolvedValue({ request: entry({ status: 'CANCELLED' }) });
    render(<ClubMembershipCard />);
    expect(await screen.findByText(/is waiting for an organizer/)).toBeTruthy();
    expect(screen.getByText('You wrote: “Please”')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw the request' }));
    await waitFor(() => expect(api.cancel).toHaveBeenCalled());
  });

  it('shows why a request was not approved and when to ask again', async () => {
    api.me.mockResolvedValue(mine({ can_request: false, request: entry({ status: 'REJECTED', note: 'Attend a workshop first' }), blockers: [{ code: 'COOLDOWN', message: 'You can ask again after a short wait.', until: '2026-11-10T10:00:00Z' }] }));
    render(<ClubMembershipCard />);
    expect(await screen.findByText('Attend a workshop first')).toBeTruthy();
    expect(screen.getByText(/You can ask again after a short wait/)).toBeTruthy();
  });

  it('shows a member their Club ID and nothing to ask for', async () => {
    api.me.mockResolvedValue(mine({ club_id: '25SCC010', can_request: false, blockers: [{ code: 'ALREADY_MEMBER', message: 'x' }] }));
    render(<ClubMembershipCard />);
    expect(await screen.findByText('25SCC010')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows nothing when the state cannot be loaded', async () => {
    api.me.mockRejectedValue(new Error('offline'));
    const { container } = render(<ClubMembershipCard />);
    await waitFor(() => expect(api.me).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});

const row = (over: Record<string, unknown> = {}) => ({
  ...entry(), person: { id: 5, name: 'Asha Devi', email: 'asha@x.io', email_verified: true, phone: '99999', roll_number: 'R1', branch: 'CSE', year: 2, college: 'SRKR', role: 'NON_AFFILIATE', membership_status: 'ACTIVE', club_id: null, joined: '2026-09-01T00:00:00Z' }, decided_by: '', ...over,
});
const queue = (rows: unknown[], counts = { PENDING: rows.length, APPROVED: 0, REJECTED: 0, CANCELLED: 0 }) => ({ count: rows.length, next: null, previous: null, results: rows, counts });

describe('RequestsTab', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    toast.success.mockReset();
    toast.error.mockReset();
    api.queue.mockResolvedValue(queue([row(), row({ id: 2, person: { ...row().person, id: 6, name: 'Kiran Babu', email: 'kiran@x.io', email_verified: false } })]));
    api.approve.mockResolvedValue(row({ status: 'APPROVED' }));
    api.reject.mockResolvedValue(row({ status: 'REJECTED' }));
    api.bulkApprove.mockResolvedValue({ done: 2, failed: [] });
  });
  afterEach(cleanup);

  it('shows who is waiting with their details and whether the email is verified', async () => {
    render(<RequestsTab isAdmin onChanged={vi.fn()} refreshKey={0} />);
    expect(await screen.findByText('Asha Devi')).toBeTruthy();
    expect(screen.getByText('Email verified')).toBeTruthy();
    expect(screen.getByText('Email not verified')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Waiting \(2\)/ })).toBeTruthy();
  });

  it('approves one only after a confirmation and tells the panel something changed', async () => {
    const changed = vi.fn();
    render(<RequestsTab isAdmin onChanged={changed} refreshKey={0} />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Approve' }))[0]);
    expect(api.approve).not.toHaveBeenCalled();
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith(1));
    await waitFor(() => expect(changed).toHaveBeenCalled());
  });

  it('declines only with a reason, which is sent', async () => {
    render(<RequestsTab isAdmin onChanged={vi.fn()} refreshKey={0} />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Decline/ }))[0]);
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Decline and tell them' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'Not yet' } });
    fireEvent.click(submit);
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith(1, 'Not yet'));
  });

  it('approves the selected people together and reports the ones that could not be', async () => {
    api.bulkApprove.mockResolvedValue({ done: 1, failed: [{ id: 2, error: 'This request was already approved.', code: 'NOT_PENDING' }] });
    render(<RequestsTab isAdmin onChanged={vi.fn()} refreshKey={0} />);
    fireEvent.click(await screen.findByLabelText('Select everybody waiting on this page'));
    fireEvent.click(screen.getByRole('button', { name: /Approve 2 selected/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Approve 2 people?')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve 2' }));
    await waitFor(() => expect(api.bulkApprove).toHaveBeenCalledWith([1, 2]));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('1 approved, 1 could not be', 'This request was already approved.'));
  });

  it('gives a Club Lead the requests with no way to decide', async () => {
    render(<RequestsTab isAdmin={false} onChanged={vi.fn()} refreshKey={0} />);
    await screen.findByText('Asha Devi');
    expect(screen.queryByRole('button', { name: /Approve/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Decline/ })).toBeNull();
    expect(screen.queryByLabelText(/^Select /)).toBeNull();
  });

  it('shows why a decided request was decided', async () => {
    api.queue.mockResolvedValue(queue([row({ status: 'REJECTED', note: 'Please verify first', decided_by: 'boss@x.io', decided_at: '2026-10-21T00:00:00Z' }), row({ id: 3, status: 'APPROVED', club_id: '26SCC001', decided_by: 'boss@x.io', decided_at: '2026-10-21T00:00:00Z' })], { PENDING: 0, APPROVED: 1, REJECTED: 1, CANCELLED: 0 }));
    render(<RequestsTab isAdmin onChanged={vi.fn()} refreshKey={0} />);
    expect(await screen.findByText(/Please verify first/)).toBeTruthy();
    expect(screen.getByText('26SCC001')).toBeTruthy();
  });
});
