import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { noShows: vi.fn(), remindNoShows: vi.fn(), withdrawNoShows: vi.fn(), stats: vi.fn(), roster: vi.fn(), update: vi.fn(), sessions: vi.fn(), updateSession: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    checkIn: {
      noShows: (...a: unknown[]) => api.noShows(...a), remindNoShows: (...a: unknown[]) => api.remindNoShows(...a),
      withdrawNoShows: (...a: unknown[]) => api.withdrawNoShows(...a), stats: (...a: unknown[]) => api.stats(...a),
      roster: (...a: unknown[]) => api.roster(...a), sessions: (...a: unknown[]) => api.sessions(...a),
    },
    admin: { update: (...a: unknown[]) => api.update(...a), updateCheckInSession: (...a: unknown[]) => api.updateSession(...a) },
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.body?.detail || err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/hackathons/CheckInConsole', () => ({ CheckInConsole: () => <div>console</div> }));
vi.mock('./../StaffPanel', () => ({ StaffPanel: () => <div>staff</div> }));

import { CheckInAdminTab } from '../CheckInAdminTab';
import { CheckInNoShows } from '../CheckInNoShows';
import { daysBetween } from '../CheckInSessionsManager';
import { CheckInStats } from '../CheckInStats';

const hackathon = (over: Record<string, unknown> = {}) => ({ slug: 'demo', features: { check_in: true }, check_in_opens_at: null, check_in_closes_at: null, ...over }) as any;
const session = (over: Record<string, unknown> = {}) => ({
  id: 1, day_index: 0, slot: 'MORNING', date: '2026-11-01', name: 'Check-in', opens_at: null, closes_at: null, is_main: true, needs_arrival: false,
  counts_for_certificate: true, scan_mode: 'BOTH', is_active: true, outside_schedule: false, window: 'OPEN', checked_in: 0, ...over,
});
const noShows = (over: Record<string, unknown> = {}) => ({ window: 'CLOSED', teams: [{ team_id: 1, name: 'Ghosts', members: 3 }, { team_id: 2, name: 'Solo', members: 1 }], absent_participants: 4, waitlisted_teams: 2, ...over });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  api.stats.mockResolvedValue({ total: 0, overrides: 0, volunteers: [], bucket_minutes: 15, timeline: [], by_via: {}, team_scans: 0 });
  api.sessions.mockResolvedValue([session()]);
  api.noShows.mockResolvedValue(noShows());
});
afterEach(() => cleanup());

describe('CheckInAdminTab', () => {
  it('points to the module switch when check-in is off', () => {
    const onEnable = vi.fn();
    render(<CheckInAdminTab hackathon={hackathon({ features: {} })} onEnable={onEnable} onSaved={vi.fn()} />);
    expect(screen.getByText(/Turn this module on/)).toBeTruthy();
    expect(screen.queryByText('Check-in sessions')).toBeNull();
  });

  it('lists a card for every generated session and the main one cannot be switched off', async () => {
    api.sessions.mockResolvedValue([session(), session({ id: 2, is_main: false, slot: 'AFTERNOON', name: 'Day 1 Afternoon', needs_arrival: true })]);
    render(<CheckInAdminTab hackathon={hackathon()} onEnable={vi.fn()} onSaved={vi.fn()} />);
    expect(await screen.findByRole('form', { name: 'Settings for Check-in' })).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Settings for Day 1 Afternoon' })).toBeTruthy();
    expect(screen.getAllByText('Arrival (main)')).toHaveLength(1);
    expect(within(screen.getByRole('form', { name: 'Settings for Check-in' })).queryByRole('switch')).toBeNull();
  });

  it('saves the arrival window through the session, sending empty times as null so there is no limit', async () => {
    api.updateSession.mockResolvedValue(session());
    render(<CheckInAdminTab hackathon={hackathon()} onEnable={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByRole('form', { name: 'Settings for Check-in' });
    fireEvent.change(screen.getByLabelText('Opens'), { target: { value: '2026-11-01T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save session' }));
    await waitFor(() => expect(api.updateSession).toHaveBeenCalledWith('demo', 1, expect.objectContaining({ closes_at: null, scan_mode: 'BOTH' })));
    expect(api.updateSession.mock.calls[0][2].opens_at).toMatch(/^2026-11-01T/);
    expect(api.updateSession.mock.calls[0][2]).not.toHaveProperty('is_active');
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Check-in saved'));
  });

  it('sends the switches for a session other than the arrival one', async () => {
    api.sessions.mockResolvedValue([session(), session({ id: 2, is_main: false, name: 'Lunch', needs_arrival: true })]);
    api.updateSession.mockResolvedValue(session({ id: 2 }));
    render(<CheckInAdminTab hackathon={hackathon()} onEnable={vi.fn()} onSaved={vi.fn()} />);
    const form = await screen.findByRole('form', { name: 'Settings for Lunch' });
    fireEvent.click(within(form).getByRole('switch', { name: /Needs arrival first/ }));
    fireEvent.click(within(form).getByRole('button', { name: 'Save session' }));
    await waitFor(() => expect(api.updateSession).toHaveBeenCalledWith('demo', 2, expect.objectContaining({ needs_arrival: false, counts_for_certificate: true, is_active: true })));
  });

  it('shows the server error beside the closing time when it is not after the opening time', async () => {
    api.updateSession.mockRejectedValue(Object.assign(new Error('bad'), { body: { closes_at: ['Must be after the time check-in opens.'] } }));
    render(<CheckInAdminTab hackathon={hackathon()} onEnable={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByRole('form', { name: 'Settings for Check-in' });
    fireEvent.click(screen.getByRole('button', { name: 'Save session' }));
    expect(await screen.findByText('Must be after the time check-in opens.')).toBeTruthy();
    expect(screen.getByLabelText('Closes').getAttribute('aria-invalid')).toBe('true');
  });

  it('saves the number of days and slots and reloads the sessions', async () => {
    const saved = hackathon({ check_in_days: 2, check_in_slots_per_day: 3 });
    api.update.mockResolvedValue(saved);
    const onSaved = vi.fn();
    render(<CheckInAdminTab hackathon={hackathon()} onEnable={vi.fn()} onSaved={onSaved} />);
    await screen.findByRole('form', { name: 'Settings for Check-in' });
    fireEvent.change(screen.getByLabelText('Days'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Slots per day'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('demo', { check_in_days: 2, check_in_slots_per_day: 3 }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    await waitFor(() => expect(api.sessions.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('fills the days from the event dates', async () => {
    render(<CheckInAdminTab hackathon={hackathon({ start_date: '2026-11-01T04:00:00Z', end_date: '2026-11-03T10:00:00Z' })} onEnable={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByRole('form', { name: 'Settings for Check-in' });
    fireEvent.click(screen.getByRole('button', { name: 'Match the event dates' }));
    expect((screen.getByLabelText('Days') as HTMLInputElement).value).toBe('3');
  });
});

describe('daysBetween', () => {
  it('counts the first and the last day, within what the schedule allows', () => {
    expect(daysBetween('2026-11-01T04:00:00Z', '2026-11-01T10:00:00Z')).toBe(1);
    expect(daysBetween('2026-11-01T04:00:00Z', '2026-11-03T10:00:00Z')).toBe(3);
    expect(daysBetween('2026-01-01T04:00:00Z', '2026-12-31T10:00:00Z')).toBe(14);
  });

  it('falls back to one day for missing, reversed or broken dates', () => {
    expect(daysBetween(undefined, '2026-11-03T10:00:00Z')).toBe(1);
    expect(daysBetween('2026-11-03T10:00:00Z', '2026-11-01T10:00:00Z')).toBe(1);
    expect(daysBetween('nope', 'nope')).toBe(1);
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

  describe('with several sessions', () => {
    const lunch = () => session({ id: 2, is_main: false, name: 'Lunch' });
    const pick = async () => {
      fireEvent.click(await screen.findByRole('button', { name: /^Session:/ }));
      fireEvent.click(await screen.findByRole('option', { name: /Lunch/ }));
    };

    it('asks about the chosen session and says which one the numbers are for', async () => {
      api.sessions.mockResolvedValue([session(), lunch()]);
      render(<CheckInNoShows slug="demo" />);
      await screen.findByText('Ghosts');
      expect(api.noShows).toHaveBeenLastCalledWith('demo', undefined);
      api.noShows.mockResolvedValue(noShows({ session: lunch(), window: 'OPEN' }));
      await pick();
      await waitFor(() => expect(api.noShows).toHaveBeenLastCalledWith('demo', 2));
      expect(await screen.findByText(/have not checked in to Lunch/)).toBeTruthy();
    });

    it('reminds only for that session and offers no withdrawal', async () => {
      api.sessions.mockResolvedValue([session(), lunch()]);
      api.remindNoShows.mockResolvedValue({ reminded: 3 });
      render(<CheckInNoShows slug="demo" />);
      await screen.findByText('Ghosts');
      api.noShows.mockResolvedValue(noShows({ session: lunch() }));
      await pick();
      await screen.findByText(/only withdrawn for missing the arrival check-in/);
      expect(screen.queryByRole('button', { name: /Withdraw selected/ })).toBeNull();
      expect(screen.queryByLabelText(/Ghosts/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /Remind everyone/ }));
      await waitFor(() => expect(api.remindNoShows).toHaveBeenCalledWith('demo', 2));
    });

    it('has no picker for a single session', async () => {
      render(<CheckInNoShows slug="demo" />);
      await screen.findByText('Ghosts');
      expect(screen.queryByRole('button', { name: /^Session:/ })).toBeNull();
    });
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
    api.stats.mockRejectedValueOnce(new Error('Server error')).mockResolvedValueOnce({ total: 0, overrides: 0, volunteers: [], bucket_minutes: 15, timeline: [], by_via: {}, team_scans: 0 });
    render(<CheckInStats slug="demo" />);
    expect(await screen.findByText(/Server error/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /Refresh|Retry|Try again/ })[0]);
    expect(await screen.findByText(/Nobody has checked in yet/)).toBeTruthy();
  });

  it('shows how people were checked in', async () => {
    api.stats.mockResolvedValue({
      total: 6, overrides: 0, bucket_minutes: 60, volunteers: [{ name: 'Vik Vol', count: 6 }], timeline: [{ at: '2026-11-01T04:00:00Z', count: 6 }],
      by_via: { MEMBER_QR: 2, TEAM_QR: 3, LIST: 1 }, team_scans: 1,
    });
    render(<CheckInStats slug="demo" />);
    expect(await screen.findByText(/2 by their own code, 3 through a team code \(1 scan\), 1 ticked from the list/)).toBeTruthy();
  });

  it('asks for the numbers of the chosen session', async () => {
    api.sessions.mockResolvedValue([session(), session({ id: 2, is_main: false, name: 'Lunch' })]);
    render(<CheckInStats slug="demo" />);
    await waitFor(() => expect(api.stats).toHaveBeenCalledWith('demo', undefined));
    fireEvent.click(await screen.findByRole('button', { name: /^Session:/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Lunch/ }));
    await waitFor(() => expect(api.stats).toHaveBeenLastCalledWith('demo', 2));
  });

  it('has no picker when there is only the arrival session', async () => {
    render(<CheckInStats slug="demo" />);
    await screen.findByText(/Nobody has checked in yet/);
    expect(screen.queryByRole('button', { name: /^Session:/ })).toBeNull();
  });
});
