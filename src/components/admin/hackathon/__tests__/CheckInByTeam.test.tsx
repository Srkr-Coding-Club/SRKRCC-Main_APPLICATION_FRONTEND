import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { byTeam: vi.fn(), sessions: vi.fn(), exportFile: vi.fn(), checkIn: vi.fn(), undo: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    checkIn: {
      byTeam: (...a: unknown[]) => api.byTeam(...a), sessions: (...a: unknown[]) => api.sessions(...a),
      checkIn: (...a: unknown[]) => api.checkIn(...a), undo: (...a: unknown[]) => api.undo(...a),
    },
    exportFile: (...a: unknown[]) => api.exportFile(...a),
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/ExportMenu', () => ({
  ExportMenu: ({ onExport, disabled }: any) => <button type="button" disabled={disabled} onClick={() => onExport('csv')}>Export</button>,
}));
vi.mock('@/components/ui/FormSelect', () => ({
  FormSelect: ({ value, options, onChange, 'aria-label': label }: any) => (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Arrival</option>
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

const printSheet = vi.fn();
vi.mock('@/lib/attendanceSheet', () => ({ printAttendanceSheet: (...a: unknown[]) => printSheet(...a) }));

import { CheckInByTeam } from '../CheckInByTeam';

const sessionInfo = (over: Record<string, unknown> = {}) => ({ id: 1, name: 'Check-in', is_main: true, outside_schedule: false, ...over });
const member = (over: Record<string, unknown> = {}) => ({
  user_id: 1, name: 'Asha Rao', email: 'asha@x.io', phone: '999', role: 'LEADER', checked_in: true, checked_in_at: '2026-11-01T04:00:00Z',
  checked_in_by: 'Vik', via: 'MEMBER_QR', override_reason: '', ...over,
});
const team = (over: Record<string, unknown> = {}) => ({
  team_id: 1, name: 'Alpha', state: 'present', present: 2, total: 2, first_at: '2026-11-01T04:00:00Z', last_at: '2026-11-01T04:05:00Z',
  leader_name: 'Asha Rao', leader_email: 'asha@x.io', leader_phone: '999', members: [member(), member({ user_id: 2, name: 'Ben Roy', role: 'MEMBER', via: 'TEAM_QR' })], ...over,
});
const payload = (teams = [team(), team({ team_id: 2, name: 'Beta', state: 'partial', present: 1, members: [member({ user_id: 3, name: 'Cara', role: 'MEMBER' }), member({ user_id: 4, name: 'Dev', role: 'MEMBER', checked_in: false, checked_in_at: null, via: null })] })]) => ({
  session: sessionInfo(), totals: { teams: 2, present: 1, partial: 1, absent: 0, people: 4, people_in: 3 }, teams,
});

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.byTeam.mockResolvedValue(payload());
  api.sessions.mockResolvedValue([sessionInfo(), sessionInfo({ id: 2, name: 'Lunch', is_main: false })]);
  api.exportFile.mockResolvedValue(undefined);
  api.checkIn.mockResolvedValue({ created: true });
  api.undo.mockResolvedValue({ deleted: true });
  printSheet.mockReset();
  printSheet.mockReturnValue(true);
  toast.error.mockReset();
});
afterEach(() => cleanup());

describe('CheckInByTeam', () => {
  it('lists the teams with their counts and the totals of the event', async () => {
    render(<CheckInByTeam slug="demo" />);
    expect(await screen.findByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('2 of 2 in', { exact: false })).toBeTruthy();
    expect(screen.getByText(/of 4 people in/)).toBeTruthy();
    expect(screen.getByText('Everyone in', { selector: 'span' })).toBeTruthy();
  });

  it('opens a team to show who is in, how, and who is missing', async () => {
    render(<CheckInByTeam slug="demo" />);
    const beta = await screen.findByRole('button', { name: /Beta/ });
    expect(beta.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(beta);
    expect(beta.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Dev')).toBeTruthy();
    expect(screen.getByLabelText('Not checked in')).toBeTruthy();
    expect(screen.getByText(/own code/)).toBeTruthy();
  });

  it('asks the server again for the chosen session and state', async () => {
    render(<CheckInByTeam slug="demo" />);
    await screen.findByText('Alpha');
    fireEvent.change(screen.getByLabelText('Session'), { target: { value: '2' } });
    await waitFor(() => expect(api.byTeam).toHaveBeenLastCalledWith('demo', { session: 2, state: undefined, q: undefined }));
    fireEvent.click(screen.getByRole('button', { name: 'Some in' }));
    await waitFor(() => expect(api.byTeam).toHaveBeenLastCalledWith('demo', { session: 2, state: 'partial', q: undefined }));
  });

  it('searches after typing stops', async () => {
    render(<CheckInByTeam slug="demo" />);
    await screen.findByText('Alpha');
    fireEvent.change(screen.getByLabelText('Search teams or people'), { target: { value: 'cara' } });
    await waitFor(() => expect(api.byTeam).toHaveBeenLastCalledWith('demo', { session: undefined, state: undefined, q: 'cara' }));
  });

  it('exports what the chosen kind and filters show', async () => {
    render(<CheckInByTeam slug="demo" />);
    await screen.findByText('Alpha');
    fireEvent.click(screen.getByRole('button', { name: 'Some in' }));
    await waitFor(() => expect(api.byTeam).toHaveBeenLastCalledWith('demo', expect.objectContaining({ state: 'partial' })));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(api.exportFile).toHaveBeenCalledWith('demo', 'check-in-teams', 'csv', { state: 'partial' }));
    fireEvent.change(screen.getByLabelText('What to export'), { target: { value: 'check-in-matrix' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(api.exportFile).toHaveBeenLastCalledWith('demo', 'check-in-matrix', 'csv', {}));
  });

  it('says so when no team matches, and offers no export', async () => {
    api.byTeam.mockResolvedValue({ ...payload([]), totals: { teams: 0, present: 0, partial: 0, absent: 0, people: 0, people_in: 0 } });
    render(<CheckInByTeam slug="demo" />);
    expect(await screen.findByText('No registered teams yet.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Export' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows a retry when the teams cannot be loaded', async () => {
    api.byTeam.mockRejectedValueOnce(new Error('Server down')).mockResolvedValue(payload());
    render(<CheckInByTeam slug="demo" />);
    expect(await screen.findByText('Server down')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(await screen.findByText('Alpha')).toBeTruthy();
  });
});

describe('CheckInByTeam: ticking people from the team view', () => {
  const open = async (name: RegExp) => { render(<CheckInByTeam slug="demo" />); fireEvent.click(await screen.findByRole('button', { name })); };

  it('checks a missing person in to the chosen session and asks for fresh numbers', async () => {
    await open(/Beta/);
    const before = api.byTeam.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Check in Dev' }));
    await waitFor(() => expect(api.checkIn).toHaveBeenCalledWith('demo', { user_id: 4, session: 1 }));
    await waitFor(() => expect(api.byTeam.mock.calls.length).toBeGreaterThan(before));
  });

  it('takes a check-in back', async () => {
    await open(/Beta/);
    fireEvent.click(screen.getByRole('button', { name: 'Undo check-in for Cara' }));
    await waitFor(() => expect(api.undo).toHaveBeenCalledWith('demo', 3, { session: 1 }));
  });

  it('shows the reason the server gives when it refuses, and keeps the team open', async () => {
    api.checkIn.mockRejectedValue(new Error('Dev has not checked in on arrival yet.'));
    await open(/Beta/);
    fireEvent.click(screen.getByRole('button', { name: 'Check in Dev' }));
    expect((await screen.findByRole('alert')).textContent).toContain('has not checked in on arrival');
    expect(screen.getByText('Cara')).toBeTruthy();
  });

  it('checks in everyone still missing from a team in one go', async () => {
    api.byTeam.mockResolvedValue(payload([team({ team_id: 7, name: 'Gamma', state: 'absent', present: 0, members: [member({ user_id: 11, name: 'Uma', checked_in: false, checked_in_at: null, via: null }), member({ user_id: 12, name: 'Vik', role: 'MEMBER', checked_in: false, checked_in_at: null, via: null })] })]));
    await open(/Gamma/);
    fireEvent.click(screen.getByRole('button', { name: 'Check in the other 2' }));
    await waitFor(() => expect(api.checkIn).toHaveBeenCalledTimes(2));
    expect(api.checkIn).toHaveBeenCalledWith('demo', { user_id: 11, session: 1 });
    expect(api.checkIn).toHaveBeenCalledWith('demo', { user_id: 12, session: 1 });
  });
});

describe('CheckInByTeam: letting someone in who has not arrived', () => {
  const refuse = () => api.checkIn.mockRejectedValueOnce(Object.assign(new Error('Dev has not checked in on arrival yet.'), { body: { code: 'NOT_ARRIVED' } }));

  it('asks for a reason and then lets them in with the override', async () => {
    refuse();
    render(<CheckInByTeam slug="demo" />);
    fireEvent.click(await screen.findByRole('button', { name: /Beta/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check in Dev' }));
    const reason = await screen.findByLabelText('Why is Dev being let in?');
    expect((screen.getByRole('button', { name: 'Let in anyway' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(reason, { target: { value: 'Came by bus, forgot to scan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Let in anyway' }));
    await waitFor(() => expect(api.checkIn).toHaveBeenLastCalledWith('demo', { user_id: 4, session: 1, override: true, reason: 'Came by bus, forgot to scan' }));
    await waitFor(() => expect(screen.queryByLabelText('Why is Dev being let in?')).toBeNull());
  });

  it('offers no override for other refusals', async () => {
    api.checkIn.mockRejectedValueOnce(new Error('Lunch is switched off.'));
    render(<CheckInByTeam slug="demo" />);
    fireEvent.click(await screen.findByRole('button', { name: /Beta/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check in Dev' }));
    expect((await screen.findByRole('alert')).textContent).toContain('switched off');
    expect(screen.queryByRole('button', { name: 'Let in anyway' })).toBeNull();
  });
});

describe('CheckInByTeam: the desk sheet', () => {
  it('prints every team of the chosen session, whatever the filters', async () => {
    render(<CheckInByTeam slug="demo" title="Demo Hack" />);
    await screen.findByText('Alpha');
    fireEvent.change(screen.getByLabelText('Session'), { target: { value: '2' } });
    await waitFor(() => expect(api.byTeam).toHaveBeenLastCalledWith('demo', expect.objectContaining({ session: 2 })));
    fireEvent.click(screen.getByRole('button', { name: 'Some in' }));
    await waitFor(() => expect(api.byTeam).toHaveBeenLastCalledWith('demo', expect.objectContaining({ state: 'partial' })));
    fireEvent.click(screen.getByRole('button', { name: 'Print sheet' }));
    await waitFor(() => expect(printSheet).toHaveBeenCalledTimes(1));
    expect(api.byTeam).toHaveBeenLastCalledWith('demo', { session: 2 });
    expect(printSheet.mock.calls[0][1]).toBe('Demo Hack');
  });

  it('tells the organizer when the browser blocked the window', async () => {
    printSheet.mockReturnValue(false);
    render(<CheckInByTeam slug="demo" />);
    await screen.findByText('Alpha');
    fireEvent.click(screen.getByRole('button', { name: 'Print sheet' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not open the sheet', expect.stringContaining('pop-ups')));
  });
});
