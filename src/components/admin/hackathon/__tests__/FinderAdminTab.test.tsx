import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { finder: vi.fn(), remove: vi.fn(), stop: vi.fn(), cancel: vi.fn(), place: vi.fn(), remind: vi.fn(), teams: vi.fn(), exportFile: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    exportFile: (...a: unknown[]) => api.exportFile(...a),
    admin: {
      finder: (...a: unknown[]) => api.finder(...a), finderRemoveSeeker: (...a: unknown[]) => api.remove(...a), finderStopRecruiting: (...a: unknown[]) => api.stop(...a),
      finderCancelRequest: (...a: unknown[]) => api.cancel(...a), finderPlace: (...a: unknown[]) => api.place(...a), finderRemind: (...a: unknown[]) => api.remind(...a),
      teams: (...a: unknown[]) => api.teams(...a),
    },
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { FinderAdminTab, waitedFor } from '../FinderAdminTab';

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const payload = (over: Record<string, unknown> = {}) => ({
  enabled: true,
  stats: { seekers_waiting: 2, teams_recruiting: 1, requests_pending: 1, requests_stuck: 1, matched: 1, median_hours_to_match: 30 },
  seekers: [
    { id: 1, user_id: 31, name: 'Sita Rao', email: 'sita@x.io', phone: '99999', profile: 'CSE · Year 3', skills: 'React', note: 'keen', listed_at: ago(5), status: 'WAITING', team: '', pending_requests: 1 },
    { id: 2, user_id: 32, name: 'Meena K', email: 'meena@x.io', phone: '', profile: 'IT', skills: 'Python', note: '', listed_at: ago(0), status: 'WAITING', team: '', pending_requests: 0 },
    { id: 3, user_id: 33, name: 'Ravi T', email: 'ravi@x.io', phone: '', profile: 'ECE', skills: '', note: '', listed_at: ago(6), status: 'MATCHED', team: 'Alpha', pending_requests: 0 },
  ],
  teams: [
    { id: 12, name: 'Alpha', status: 'FORMING', looking_for: 'a designer', members: 2, max_members: 4, seats_open: 2, problem: 'PS-01', leader: 'Lena', leader_email: 'lena@x.io', leader_phone: '', pending_requests: 1 },
    { id: 13, name: 'Beta', status: 'REGISTERED', looking_for: '', members: 4, max_members: 4, seats_open: 0, problem: '', leader: 'Bo', leader_email: '', leader_phone: '', pending_requests: 0 },
  ],
  requests: [
    { id: 5, team_id: 12, team_name: 'Alpha', user_id: 31, name: 'Sita Rao', email: 'sita@x.io', phone: '', profile: 'CSE', status: 'PENDING', message: 'let me in', created_at: ago(3), decided_at: null, decided_by: '', stuck: true },
    { id: 6, team_id: 12, team_name: 'Alpha', user_id: 33, name: 'Ravi T', email: 'ravi@x.io', phone: '', profile: 'ECE', status: 'ACCEPTED', message: '', created_at: ago(6), decided_at: ago(5), decided_by: 'Lena', stuck: false },
  ],
  ...over,
});

const show = () => render(<FinderAdminTab hackathon={{ slug: 'demo', max_team_size: 4 } as any} />);
const panel = () => screen.getByRole('region', { name: 'Team finder' });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  api.finder.mockResolvedValue(payload());
  api.teams.mockResolvedValue([]);
  api.remove.mockResolvedValue({ removed: true });
  api.stop.mockResolvedValue({ stopped: true, requests_closed: 1 });
  api.cancel.mockResolvedValue({ request: {} });
  api.place.mockResolvedValue({ placed: true, team_id: 12 });
  api.remind.mockResolvedValue({ reminded: 2 });
});
afterEach(cleanup);

describe('waitedFor', () => {
  it('says today, yesterday and days', () => {
    expect([waitedFor(ago(0)), waitedFor(ago(1.2)), waitedFor(ago(5.5))]).toEqual(['today', 'yesterday', '5 days ago']);
  });
});

describe('FinderAdminTab', () => {
  it('shows the numbers and, by default, only people who are still looking, with their contact', async () => {
    show();
    expect(await screen.findByText('Sita Rao')).toBeTruthy();
    expect(screen.getByText('Meena K')).toBeTruthy();
    expect(screen.queryByText('Ravi T')).toBeNull();
    expect(screen.getByRole('link', { name: 'sita@x.io' }).getAttribute('href')).toBe('mailto:sita@x.io');
    expect(screen.getByRole('link', { name: '99999' }).getAttribute('href')).toBe('tel:99999');
    expect(screen.getByText('1 older than 48 hours')).toBeTruthy();
    expect(screen.getByText('30 h')).toBeTruthy();
    expect(screen.getByText("1 request waiting for a leader's answer")).toBeTruthy();
  });

  it('filters by status, by long waiting and by search', async () => {
    show();
    await screen.findByText('Sita Rao');
    fireEvent.click(within(panel()).getByRole('tab', { name: 'On a team' }));
    expect(screen.getByText('Ravi T')).toBeTruthy();
    expect(screen.getByText('On Alpha')).toBeTruthy();
    fireEvent.click(within(panel()).getByRole('tab', { name: 'Looking' }));
    fireEvent.click(screen.getByLabelText(/Waiting 3\+ days/));
    expect(screen.getByText('Sita Rao')).toBeTruthy();
    expect(screen.queryByText('Meena K')).toBeNull();
    fireEvent.click(screen.getByLabelText(/Waiting 3\+ days/));
    fireEvent.change(screen.getByLabelText('Search the finder'), { target: { value: 'python' } });
    expect(screen.getByText('Meena K')).toBeTruthy();
    expect(screen.queryByText('Sita Rao')).toBeNull();
  });

  it('removes a listing with an optional reason and refreshes', async () => {
    show();
    await screen.findByText('Sita Rao');
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove listing' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'Spam' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove listing' }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('demo', 1, 'Spam'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sita Rao was removed from the finder'));
    expect(api.finder).toHaveBeenCalledTimes(2);
  });

  it('places a person: the button waits for a team, offers recruiting teams with room, and sends both ids', async () => {
    api.teams.mockResolvedValue([
      { id: 14, name: 'Gamma', status: 'REGISTERED', member_count: 2 }, { id: 15, name: 'Delta', status: 'REGISTERED', member_count: 4 },
      { id: 16, name: 'Out', status: 'WITHDRAWN', member_count: 1 }, { id: 12, name: 'Alpha', status: 'FORMING', member_count: 2 },
    ]);
    show();
    await screen.findByText('Sita Rao');
    fireEvent.click(screen.getAllByRole('button', { name: 'Place on a team' })[0]);
    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: 'Place on team' });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(within(dialog).getAllByRole('option').map((o) => o.textContent)).toEqual(
      ['Choose a team…', 'Alpha · 2/4 · a designer', 'Gamma · 2/4'],
    ));
    fireEvent.change(within(dialog).getByLabelText('Team'), { target: { value: '12' } });
    fireEvent.click(confirmButton);
    await waitFor(() => expect(api.place).toHaveBeenCalledWith('demo', 1, 12));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sita Rao was placed in Alpha'));
  });

  it('keeps the dialog open and says why when the server refuses a placement', async () => {
    api.place.mockRejectedValue(new Error('That team is already full.'));
    show();
    await screen.findByText('Sita Rao');
    fireEvent.click(screen.getAllByRole('button', { name: 'Place on a team' })[0]);
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(within(dialog).getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(within(dialog).getByLabelText('Team'), { target: { value: '12' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Place on team' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not place them', 'That team is already full.'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('lists recruiting teams with seats and contact, and stops one recruiting', async () => {
    show();
    await screen.findByText('Sita Rao');
    fireEvent.click(within(panel()).getByRole('tab', { name: /^Teams/ }));
    expect(screen.getByText(/2 seats free/)).toBeTruthy();
    expect(screen.getByText(/· Full/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Only teams with a free seat'));
    expect(screen.queryByText('Beta')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Stop recruiting' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stop recruiting' }));
    await waitFor(() => expect(api.stop).toHaveBeenCalledWith('demo', 12, ''));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Alpha stopped recruiting · 1 request closed'));
  });

  it('flags stuck requests and closes one only after a confirmation', async () => {
    show();
    await screen.findByText('Sita Rao');
    fireEvent.click(within(panel()).getByRole('tab', { name: /^Requests/ }));
    expect(screen.getByText('Stuck')).toBeTruthy();
    expect(screen.getByText('“let me in”')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close request' }));
    expect(api.cancel).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close request' }));
    await waitFor(() => expect(api.cancel).toHaveBeenCalledWith('demo', 5));
  });

  it('reminds only after a confirmation and reports who was reached', async () => {
    show();
    await screen.findByText('Sita Rao');
    fireEvent.click(screen.getByRole('button', { name: 'Remind people' }));
    expect(api.remind).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Send reminders' }));
    await waitFor(() => expect(api.remind).toHaveBeenCalledWith('demo', 'seekers'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 notified'));
  });

  it('says so when the finder is off and disables every action', async () => {
    api.finder.mockResolvedValue(payload({ enabled: false }));
    show();
    expect(await screen.findByText(/switched off for this hackathon/)).toBeTruthy();
    screen.getAllByRole('button', { name: 'Place on a team' }).forEach((button) => expect((button as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole('button', { name: 'Remind people' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows a calm empty state and a retry when loading fails', async () => {
    api.finder.mockResolvedValue(payload({ seekers: [], stats: { ...payload().stats, seekers_waiting: 0 } }));
    show();
    expect(await screen.findByText('Nobody is looking for a team right now.')).toBeTruthy();
    cleanup();
    api.finder.mockRejectedValue(new Error('boom'));
    show();
    expect(await screen.findByText('boom')).toBeTruthy();
  });
});
