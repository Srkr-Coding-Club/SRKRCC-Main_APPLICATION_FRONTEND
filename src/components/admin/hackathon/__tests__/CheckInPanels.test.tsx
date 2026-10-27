import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { noShows: vi.fn(), remindNoShows: vi.fn(), withdrawNoShows: vi.fn(), stats: vi.fn(), roster: vi.fn(), update: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    checkIn: {
      noShows: (...a: unknown[]) => api.noShows(...a), remindNoShows: (...a: unknown[]) => api.remindNoShows(...a),
      withdrawNoShows: (...a: unknown[]) => api.withdrawNoShows(...a), stats: (...a: unknown[]) => api.stats(...a),
      roster: (...a: unknown[]) => api.roster(...a),
    },
    admin: { update: (...a: unknown[]) => api.update(...a) },
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.body?.detail || err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/hackathons/CheckInConsole', () => ({ CheckInConsole: () => <div>console</div> }));
vi.mock('./../StaffPanel', () => ({ StaffPanel: () => <div>staff</div> }));

import { CheckInAdminTab } from '../CheckInAdminTab';
import { CheckInNoShows } from '../CheckInNoShows';
import { CheckInStats } from '../CheckInStats';

const hackathon = (over: Record<string, unknown> = {}) => ({ slug: 'demo', features: { check_in: true }, check_in_opens_at: null, check_in_closes_at: null, ...over }) as any;
const noShows = (over: Record<string, unknown> = {}) => ({ window: 'CLOSED', teams: [{ team_id: 1, name: 'Ghosts', members: 3 }, { team_id: 2, name: 'Solo', members: 1 }], absent_participants: 4, waitlisted_teams: 2, ...over });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  api.stats.mockResolvedValue({ total: 0, overrides: 0, volunteers: [], bucket_minutes: 15, timeline: [] });
  api.noShows.mockResolvedValue(noShows());
});
afterEach(() => cleanup());

describe('CheckInAdminTab', () => {
  it('points to the module switch when check-in is off', () => {
    const onEnable = vi.fn();
    render(<CheckInAdminTab hackathon={hackathon({ features: {} })} onEnable={onEnable} onSaved={vi.fn()} />);
    expect(screen.getByText(/Turn this module on/)).toBeTruthy();
    expect(screen.queryByText('Check-in window')).toBeNull();
  });

  it('saves the window, sending empty times as null so there is no limit', async () => {
    const saved = hackathon({ check_in_opens_at: '2026-11-01T03:30:00Z' });
    api.update.mockResolvedValue(saved);
    const onSaved = vi.fn();
    render(<CheckInAdminTab hackathon={hackathon()} onEnable={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Opens'), { target: { value: '2026-11-01T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save window' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('demo', expect.objectContaining({ check_in_closes_at: null })));
    expect(api.update.mock.calls[0][1].check_in_opens_at).toMatch(/^2026-11-01T/);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
  });

  it('shows the server error beside the closing time when it is not after the opening time', async () => {
    api.update.mockRejectedValue(Object.assign(new Error('bad'), { body: { check_in_closes_at: ['Must be after the time check-in opens.'] } }));
    render(<CheckInAdminTab hackathon={hackathon()} onEnable={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save window' }));
    expect(await screen.findByText('Must be after the time check-in opens.')).toBeTruthy();
    expect(screen.getByLabelText('Closes').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('CheckInNoShows', () => {
  it('lists teams with nobody here and reminds absent people', async () => {
    api.remindNoShows.mockResolvedValue({ reminded: 4 });
    render(<CheckInNoShows slug="demo" />);
    expect(await screen.findByText('Ghosts')).toBeTruthy();
    expect(screen.getByText(/4 people have not checked in/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Remind everyone/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Reminded 4 people'));
  });

  it('says so when everyone has arrived and disables the reminder', async () => {
    api.noShows.mockResolvedValue(noShows({ teams: [], absent_participants: 0 }));
    render(<CheckInNoShows slug="demo" />);
    await screen.findByText(/0 people have not checked in/);
    expect((screen.getByRole('button', { name: /Remind everyone/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: /Withdraw selected/ })).toBeNull();
  });

  it('only withdraws the ticked teams, after confirmation', async () => {
    api.withdrawNoShows.mockResolvedValue({ withdrawn: 1 });
    render(<CheckInNoShows slug="demo" />);
    const withdraw = await screen.findByRole('button', { name: /Withdraw selected/ });
    expect((withdraw as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Ghosts/));
    fireEvent.click(withdraw);
    expect(await screen.findByText(/Waitlisted teams \(2\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw teams' }));
    await waitFor(() => expect(api.withdrawNoShows).toHaveBeenCalledWith('demo', [1]));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Withdrew 1 team'));
  });

  it('does nothing when the confirmation is cancelled', async () => {
    render(<CheckInNoShows slug="demo" />);
    fireEvent.click(await screen.findByLabelText(/Solo/));
    fireEvent.click(screen.getByRole('button', { name: /Withdraw selected/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Cancel/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Withdraw teams' })).toBeNull());
    expect(api.withdrawNoShows).not.toHaveBeenCalled();
  });

  it('shows a refusal such as "check-in is still open" as an error toast and keeps the selection', async () => {
    api.withdrawNoShows.mockRejectedValue(Object.assign(new Error('x'), { body: { detail: 'Check-in is still open. Withdraw no-shows after it closes.' } }));
    render(<CheckInNoShows slug="demo" />);
    fireEvent.click(await screen.findByLabelText(/Ghosts/));
    fireEvent.click(screen.getByRole('button', { name: /Withdraw selected/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw teams' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not withdraw the teams', 'Check-in is still open. Withdraw no-shows after it closes.'));
    expect((screen.getByLabelText(/Ghosts/) as HTMLInputElement).checked).toBe(true);
  });

  it('shows a load error with retry when the viewer is not an organizer', async () => {
    api.noShows.mockRejectedValueOnce(new Error('You do not have permission.'));
    render(<CheckInNoShows slug="demo" />);
    expect(await screen.findByText(/You do not have permission/)).toBeTruthy();
  });
});

describe('CheckInStats', () => {
  it('explains an empty event', async () => {
    render(<CheckInStats slug="demo" />);
    expect(await screen.findByText(/Nobody has checked in yet/)).toBeTruthy();
  });

  it('shows the volunteers busiest first with the organizer overrides and an hourly note for long events', async () => {
    api.stats.mockResolvedValue({
      total: 5, overrides: 1, bucket_minutes: 60,
      volunteers: [{ name: 'Vik Vol', count: 4 }, { name: 'Removed account', count: 1 }],
      timeline: [{ at: '2026-11-01T04:00:00Z', count: 4 }, { at: '2026-11-01T05:00:00Z', count: 0 }, { at: '2026-11-01T06:00:00Z', count: 1 }],
    });
    render(<CheckInStats slug="demo" />);
    expect(await screen.findByText(/5 checked in, 1 let in by an organizer/)).toBeTruthy();
    expect(screen.getByText(/Each bar is an hour/)).toBeTruthy();
    const names = screen.getAllByText(/Vik Vol|Removed account/).map((node) => node.textContent);
    expect(names).toEqual(['Vik Vol', 'Removed account']);
  });

  it('shows an error with retry and recovers', async () => {
    api.stats.mockRejectedValueOnce(new Error('Server error')).mockResolvedValueOnce({ total: 0, overrides: 0, volunteers: [], bucket_minutes: 15, timeline: [] });
    render(<CheckInStats slug="demo" />);
    expect(await screen.findByText(/Server error/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /Refresh|Retry|Try again/ })[0]);
    expect(await screen.findByText(/Nobody has checked in yet/)).toBeTruthy();
  });
});
