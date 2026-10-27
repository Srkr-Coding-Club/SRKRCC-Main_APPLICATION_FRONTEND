import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { withdrawals: vi.fn(), decideWithdrawal: vi.fn(), allowMoreTeams: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { admin: { withdrawals: (...a: unknown[]) => api.withdrawals(...a), decideWithdrawal: (...a: unknown[]) => api.decideWithdrawal(...a), allowMoreTeams: (...a: unknown[]) => api.allowMoreTeams(...a) } },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.body?.detail || err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { WithdrawalsPanel } from '../WithdrawalsPanel';

const row = (over: Record<string, unknown> = {}) => ({
  id: 1, status: 'PENDING', reason: 'Our laptop broke', created_at: '2026-11-01T04:00:00Z', team_id: 5, team_name: 'Solo', team_status: 'REGISTERED',
  is_waitlisted: false, requested_by: 'Asha Rao', requested_by_email: 'asha@x.io', decided_by: null, decided_at: null, decision_note: '', ...over,
});
const overview = (over: Record<string, unknown> = {}) => ({ pending: [row()], decided: [], repeaters: [], limits: { max_teams: 2, cooldown_minutes: 10 }, ...over });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  api.withdrawals.mockResolvedValue(overview());
});
afterEach(() => cleanup());

describe('WithdrawalsPanel', () => {
  it('shows nothing at all when there is nothing to decide, no repeat creators and no history', async () => {
    api.withdrawals.mockResolvedValue(overview({ pending: [] }));
    const { container } = render(<WithdrawalsPanel slug="demo" onChanged={vi.fn()} />);
    await waitFor(() => expect(api.withdrawals).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('lists a waiting request with who, why and the limits that apply', async () => {
    render(<WithdrawalsPanel slug="demo" onChanged={vi.fn()} />);
    expect(await screen.findByText('Solo')).toBeTruthy();
    expect(screen.getByText(/Our laptop broke/)).toBeTruthy();
    expect(screen.getByText(/asha@x.io/)).toBeTruthy();
    expect(screen.getByText('1 waiting')).toBeTruthy();
    expect(screen.getByText(/Each person can create 2 teams and must wait 10 minutes/)).toBeTruthy();
  });

  it('approves with a note, tells the team list to refresh and reloads', async () => {
    api.decideWithdrawal.mockResolvedValue({ id: 1, status: 'APPROVED' });
    const onChanged = vi.fn();
    render(<WithdrawalsPanel slug="demo" onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve withdrawal' }));
    fireEvent.change(screen.getByLabelText(/Note for the leader/), { target: { value: 'Thanks for telling us' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw the team' }));
    await waitFor(() => expect(api.decideWithdrawal).toHaveBeenCalledWith('demo', 1, { approve: true, note: 'Thanks for telling us' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Team withdrawn', 'The leader was notified.');
    expect(api.withdrawals).toHaveBeenCalledTimes(2);
  });

  it('denies without a note and says the team stays', async () => {
    api.decideWithdrawal.mockResolvedValue({ id: 1, status: 'DENIED' });
    render(<WithdrawalsPanel slug="demo" onChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Keep team' }));
    expect(screen.getByText(/The team stays as it is/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Deny the request' }));
    await waitFor(() => expect(api.decideWithdrawal).toHaveBeenCalledWith('demo', 1, { approve: false, note: '' }));
  });

  it('reports a refused decision, such as a team that gained members, and keeps the dialog open', async () => {
    api.decideWithdrawal.mockRejectedValue(Object.assign(new Error('x'), { body: { detail: 'The team has other members now.' } }));
    const onChanged = vi.fn();
    render(<WithdrawalsPanel slug="demo" onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve withdrawal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw the team' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not save the decision', 'The team has other members now.'));
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('cancelling the dialog decides nothing', async () => {
    render(<WithdrawalsPanel slug="demo" onChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve withdrawal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.decideWithdrawal).not.toHaveBeenCalled();
  });

  it('flags people who created several teams and lets an organizer allow one more', async () => {
    api.withdrawals.mockResolvedValue(overview({ pending: [], repeaters: [
      { user_id: 9, name: 'Rep Eater', email: 'rep@x.io', teams_created: 2, teams_withdrawn: 2, extra_allowed: 1, at_limit: true },
    ] }));
    api.allowMoreTeams.mockResolvedValue({ user_id: 9, extra: 2 });
    render(<WithdrawalsPanel slug="demo" onChanged={vi.fn()} />);
    expect(await screen.findByText(/created 2, withdrew 2 · 1 extra allowed · at the limit/)).toBeTruthy();
    expect(screen.getByText('No requests are waiting.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Allow one more team' }));
    await waitFor(() => expect(api.allowMoreTeams).toHaveBeenCalledWith('demo', { user_id: 9, extra: 2, reason: 'Allowed by an organizer' }));
    expect(toast.success).toHaveBeenCalledWith('Rep Eater can create one more team');
  });

  it('shows recent decisions on request and hides them again', async () => {
    api.withdrawals.mockResolvedValue(overview({ pending: [], decided: [row({ status: 'DENIED', decided_by: 'Ada Min', decided_at: '2026-11-01T05:00:00Z', decision_note: 'We need you' })] }));
    render(<WithdrawalsPanel slug="demo" onChanged={vi.fn()} />);
    const toggle = await screen.findByRole('button', { name: /Show recent decisions \(1\)/ });
    expect(screen.queryByText('We need you')).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText('We need you')).toBeTruthy();
    expect(screen.getByText(/denied by Ada Min/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Hide recent decisions/ }));
    expect(screen.queryByText('We need you')).toBeNull();
  });

  it('shows a load error with a retry that recovers', async () => {
    api.withdrawals.mockRejectedValueOnce(new Error('Server error')).mockResolvedValueOnce(overview());
    render(<WithdrawalsPanel slug="demo" onChanged={vi.fn()} />);
    expect(await screen.findByText(/Server error/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Retry|Try again/ }));
    expect(await screen.findByText('Solo')).toBeTruthy();
  });
});
