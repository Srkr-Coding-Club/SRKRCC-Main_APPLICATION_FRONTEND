import React from 'react';
import { cleanup, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { roster: vi.fn(), checkIn: vi.fn(), scan: vi.fn(), sessions: vi.fn(), teamBatch: vi.fn(), undo: vi.fn(), undoBatch: vi.fn(), exportFile: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
let onScan: (code: string) => void = () => undefined;
const torch = { supported: true, apply: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    exportFile: (...a: unknown[]) => api.exportFile(...a),
    checkIn: {
      roster: (...a: unknown[]) => api.roster(...a), checkIn: (...a: unknown[]) => api.checkIn(...a), scan: (...a: unknown[]) => api.scan(...a),
      sessions: (...a: unknown[]) => api.sessions(...a), teamBatch: (...a: unknown[]) => api.teamBatch(...a),
      undo: (...a: unknown[]) => api.undo(...a), undoBatch: (...a: unknown[]) => api.undoBatch(...a),
    },
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    isScanning = true;
    start(_c: unknown, _o: unknown, cb: (text: string) => void) { onScan = cb; return Promise.resolve(); }
    stop() { return Promise.resolve(); }
    clear() { return undefined; }
    getRunningTrackCameraCapabilities() { return { torchFeature: () => ({ isSupported: () => torch.supported, apply: (on: boolean) => torch.apply(on) }) }; }
  },
}));
vi.mock('@/lib/scanFeedback', () => ({ playScanFeedback: vi.fn() }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { CheckInConsole } from '../CheckInConsole';

const roster = { participants: [], total: 0, checked_in: 0 };
const ok = (over: Record<string, unknown> = {}) => ({ kind: 'member', created: true, user_id: 7, name: 'Asha Rao', team_name: 'Alpha', checked_in_at: '2026-01-01T09:00:00Z', checked_in_by: 'Vik', session_id: 1, via: 'MEMBER_QR', ...over });
const session = (over: Record<string, unknown> = {}) => ({
  id: 1, day_index: 0, slot: 'MORNING', date: '2026-11-01', name: 'Check-in', opens_at: null, closes_at: null, is_main: true, needs_arrival: false,
  counts_for_certificate: true, scan_mode: 'BOTH', is_active: true, outside_schedule: false, window: 'OPEN', checked_in: 0, ...over,
});
const lunch = () => session({ id: 2, is_main: false, slot: 'AFTERNOON', name: 'Lunch', needs_arrival: true });
const member = (over: Record<string, unknown> = {}) => ({ user_id: 7, name: 'Asha Rao', role: 'LEADER', checked_in: false, checked_in_at: null, checked_in_by: null, via: null, blocked: null, ...over });
const teamScan = (over: Record<string, unknown> = {}) => ({
  kind: 'team', team: { id: 3, name: 'Alpha', status: 'REGISTERED', placed: true, problem_code: null, problem_title: null }, session: session(),
  members: [member(), member({ user_id: 8, name: 'Bo Li', role: 'MEMBER' })], all_checked_in: false, can_override: false, ...over,
});

beforeEach(() => {
  window.localStorage.clear();
  Object.values(api).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  api.roster.mockResolvedValue(roster);
  api.sessions.mockResolvedValue([session()]);
  torch.supported = true;
  torch.apply.mockReset().mockResolvedValue(undefined);
});
afterEach(() => cleanup());

const startScanning = async () => {
  render(<CheckInConsole slug="demo" />);
  fireEvent.click(await screen.findByRole('button', { name: /Scan QR codes/ }));
  await waitFor(() => expect(typeof onScan).toBe('function'));
};

describe('CheckInConsole scanning', () => {
  it('confirms a fresh check-in and offers undo for it', async () => {
    api.scan.mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok({ user_id: 8, name: 'Bo Li' }));
    await startScanning();
    onScan('code-a');
    expect(await screen.findByText('Asha Rao checked in')).toBeTruthy();
    onScan('code-b');
    expect(await screen.findByText('Bo Li checked in')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Undo/ }));
    await waitFor(() => expect(api.undo).toHaveBeenCalledWith('demo', 7, { session: 1 }));
  });

  it('says who checked a repeat scan in', async () => {
    api.scan.mockResolvedValueOnce(ok({ created: false }));
    await startScanning();
    onScan('code-a');
    expect(await screen.findByText('Asha Rao was already checked in')).toBeTruthy();
    expect(screen.getByText(/by Vik/)).toBeTruthy();
  });

  it('saves a scan on the phone when offline and sends it with its scan time on reconnect', async () => {
    api.scan.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await startScanning();
    onScan('code-a');
    expect(await screen.findByText('Saved on this phone')).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem('hackathon-check-in-queue:demo') || '[]')).toHaveLength(1);

    api.checkIn.mockResolvedValueOnce(ok());
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(api.checkIn).toHaveBeenLastCalledWith('demo', expect.objectContaining({ token: 'code-a', scanned_at: expect.any(String) })));
    await waitFor(() => expect(window.localStorage.getItem('hackathon-check-in-queue:demo')).toBeNull());
  });

  it('shows a server refusal as an error and does not queue it', async () => {
    api.scan.mockRejectedValueOnce(Object.assign(new Error('Check-in has closed.'), { status: 400 }));
    await startScanning();
    onScan('code-a');
    expect(await screen.findByText('Check-in has closed.')).toBeTruthy();
    expect(window.localStorage.getItem('hackathon-check-in-queue:demo')).toBeNull();
  });

  it('asks the server to search and page the roster, and offers more rows', async () => {
    api.roster.mockResolvedValue({ participants: [{ user_id: 1, name: 'A', email: 'a@x.io', team_id: 1, team_name: 'T', role: 'MEMBER', checked_in: false, checked_in_at: null, checked_in_by: null }], total: 250, checked_in: 0, count: 150, limit: 100, offset: 0, held_back: [] });
    render(<CheckInConsole slug="demo" />);
    fireEvent.click(await screen.findByRole('button', { name: /Show more \(149 left\)/ }));
    await waitFor(() => expect(api.roster).toHaveBeenLastCalledWith('demo', expect.objectContaining({ limit: 200 })));
    fireEvent.change(screen.getByLabelText('Search participants'), { target: { value: 'asha' } });
    await waitFor(() => expect(api.roster).toHaveBeenLastCalledWith('demo', expect.objectContaining({ q: 'asha', limit: 100 })));
  });

  it('lets an organizer bring in someone whose team is not registered, with a reason', async () => {
    api.roster.mockResolvedValue({ ...roster, held_back: [{ user_id: 9, name: 'Waiter Last', email: 'w@x.io', team_name: 'Queue', why: 'Waitlisted' }] });
    api.checkIn.mockResolvedValueOnce(ok({ user_id: 9, name: 'Waiter Last' }));
    render(<CheckInConsole slug="demo" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Let in anyway' }));
    fireEvent.change(screen.getByLabelText('Reason for letting in Waiter Last'), { target: { value: 'Teammate arrived late' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check in' }));
    await waitFor(() => expect(api.checkIn).toHaveBeenCalledWith('demo', expect.objectContaining({ user_id: 9, override: true, reason: 'Teammate arrived late' })));
    expect(await screen.findByText('Waiter Last checked in')).toBeTruthy();
  });

  it('retries a scan that hit a gateway error but drops one the server refused, without blocking the rest', async () => {
    api.scan.mockRejectedValueOnce(Object.assign(new Error('Bad gateway'), { status: 502 }));
    await startScanning();
    onScan('code-a');
    expect(await screen.findByText('Saved on this phone')).toBeTruthy();

    window.localStorage.setItem('hackathon-check-in-queue:demo', JSON.stringify([
      { code: 'code-a', scannedAt: '2026-01-01T09:00:00Z' }, { code: 'code-b', scannedAt: '2026-01-01T09:01:00Z' },
    ]));
    api.checkIn
      .mockRejectedValueOnce(Object.assign(new Error('That QR code has expired.'), { status: 400 }))
      .mockResolvedValueOnce(ok({ user_id: 5, name: 'Cy Doe' }));
    window.dispatchEvent(new Event('online'));
    expect((await screen.findAllByText('That QR code has expired.')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Cy Doe synced/)).length).toBeGreaterThan(0);
    await waitFor(() => expect(window.localStorage.getItem('hackathon-check-in-queue:demo')).toBeNull());
  });

  it('keeps every queued scan while the connection is still down', async () => {
    window.localStorage.setItem('hackathon-check-in-queue:demo', JSON.stringify([{ code: 'a', scannedAt: 'x' }, { code: 'b', scannedAt: 'y' }]));
    api.checkIn.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<CheckInConsole slug="demo" />);
    await waitFor(() => expect(api.checkIn).toHaveBeenCalledTimes(1));
    expect(JSON.parse(window.localStorage.getItem('hackathon-check-in-queue:demo') || '[]')).toHaveLength(2);
    expect(await screen.findByText(/2 waiting/)).toBeTruthy();
  });

  it('checks in a typed or pasted code, trims it and ignores an empty box', async () => {
    api.scan.mockResolvedValue(ok());
    render(<CheckInConsole slug="demo" />);
    const box = screen.getByLabelText('Enter or paste a QR code');
    const submit = screen.getByRole('button', { name: 'Check in code' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(box, { target: { value: '   ' } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(box, { target: { value: '  pasted-code \n' } });
    fireEvent.submit(box.closest('form') as HTMLFormElement);
    await waitFor(() => expect(api.scan).toHaveBeenCalledWith('demo', expect.objectContaining({ token: 'pasted-code' })));
    expect((box as HTMLInputElement).value).toBe('');
    expect(await screen.findByText('Asha Rao checked in')).toBeTruthy();
  });

  it('offers the torch only when the camera supports it, and survives it failing', async () => {
    torch.supported = false;
    await startScanning();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Torch/ })).toBeNull());
    cleanup();

    torch.supported = true;
    await startScanning();
    fireEvent.click(await screen.findByRole('button', { name: 'Torch on' }));
    await waitFor(() => expect(torch.apply).toHaveBeenCalledWith(true));
    expect(await screen.findByRole('button', { name: 'Torch off' })).toBeTruthy();

    torch.apply.mockRejectedValueOnce(new Error('no torch'));
    fireEvent.click(screen.getByRole('button', { name: 'Torch off' }));
    expect(await screen.findByText('The torch could not be switched on this phone.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Torch/ })).toBeNull();
  });

  it('opens and closes the big screen counter', async () => {
    api.roster.mockResolvedValue({ ...roster, total: 80, checked_in: 20, count: 80 });
    render(<CheckInConsole slug="demo" />);
    fireEvent.click(await screen.findByRole('button', { name: /Big screen/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Check-in progress' });
    expect(dialog.textContent).toContain('20');
    expect(dialog.textContent).toContain('25%');
    fireEvent.click(screen.getByRole('button', { name: /Close/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('downloads the server-rendered check-in list in the chosen format', async () => {
    api.roster.mockResolvedValue({ ...roster, total: 600, count: 600 });
    api.exportFile.mockResolvedValue(undefined);
    render(<CheckInConsole slug="demo" />);
    const button = await screen.findByRole('button', { name: 'Export check-in list' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitem', { name: /Excel/ }));
    await waitFor(() => expect(api.exportFile).toHaveBeenCalledWith('demo', 'check-in', 'xlsx', {}));
  });

  it('hides the roster fetch error while offline but shows it when online', async () => {
    api.roster.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<CheckInConsole slug="demo" />);
    expect(await screen.findByText('Failed to fetch')).toBeTruthy();
    window.dispatchEvent(new Event('offline'));
    await waitFor(() => expect(screen.queryByText('Failed to fetch')).toBeNull());
    expect(screen.getByText(/You are offline/)).toBeTruthy();
  });
});

describe('CheckInConsole sessions and team codes', () => {
  const teamBatch = (over: Record<string, unknown> = {}) => ({
    batch_id: 'batch-1', team: { id: 3, name: 'Alpha' }, session_id: 1, created: 2, already: 0, refused: 0,
    results: [{ user_id: 7, name: 'Asha Rao', status: 'created' }, { user_id: 8, name: 'Bo Li', status: 'created' }], ...over,
  });

  it('shows which session is being scanned and sends every scan to it', async () => {
    api.sessions.mockResolvedValue([session(), lunch()]);
    api.scan.mockResolvedValue(ok({ session_id: 1 }));
    await startScanning();
    expect(await screen.findByRole('group', { name: 'Session being scanned' })).toBeTruthy();
    await waitFor(() => expect(api.roster).toHaveBeenLastCalledWith('demo', expect.objectContaining({ session: 1 })));
    onScan('code-a');
    await waitFor(() => expect(api.scan).toHaveBeenCalledWith('demo', { token: 'code-a', session: 1 }));
  });

  it('switches session, remembers the choice and loads the list for that session', async () => {
    api.sessions.mockResolvedValue([session(), lunch()]);
    render(<CheckInConsole slug="demo" />);
    fireEvent.click(await screen.findByRole('button', { name: /^Session:/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Lunch/ }));
    await waitFor(() => expect(api.roster).toHaveBeenLastCalledWith('demo', expect.objectContaining({ session: 2 })));
    expect(window.localStorage.getItem('hackathon-check-in-session:demo')).toBe('2');
    expect(screen.getAllByText(/Lunch/).length).toBeGreaterThan(0);
  });

  it('exports the list of the session being scanned', async () => {
    api.sessions.mockResolvedValue([session(), lunch()]);
    api.roster.mockResolvedValue({ ...roster, total: 600, count: 600 });
    api.exportFile.mockResolvedValue(undefined);
    render(<CheckInConsole slug="demo" />);
    fireEvent.click(await screen.findByRole('button', { name: /^Session:/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Lunch/ }));
    await waitFor(() => expect(api.roster).toHaveBeenLastCalledWith('demo', expect.objectContaining({ session: 2 })));
    const button = await screen.findByRole('button', { name: 'Export check-in list' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitem', { name: /Excel/ }));
    await waitFor(() => expect(api.exportFile).toHaveBeenCalledWith('demo', 'check-in', 'xlsx', { session: 2 }));
  });

  it('opens a team code as a list with nobody ticked, and checks in only the picked people', async () => {
    api.scan.mockResolvedValueOnce(teamScan());
    api.teamBatch.mockResolvedValueOnce(teamBatch({ created: 1, results: [{ user_id: 8, name: 'Bo Li', status: 'created' }] }));
    await startScanning();
    onScan('team-code');
    const sheet = await screen.findByRole('region', { name: 'Team check-in: Alpha' });
    const boxes = (await within(sheet).findAllByRole('checkbox')) as HTMLInputElement[];
    expect(boxes.map((box) => box.checked)).toEqual([false, false]);
    expect(((await within(sheet).findByRole('button', { name: /Check in selected/ })) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(await within(sheet).findByLabelText(/Bo Li/));
    fireEvent.click(await within(sheet).findByRole('button', { name: 'Check in selected (1)' }));
    await waitFor(() => expect(api.teamBatch).toHaveBeenCalledWith('demo', expect.objectContaining({ token: 'team-code', user_ids: [8], override: false })));
    expect(await within(sheet).findByText('Checked in')).toBeTruthy();
    expect(screen.getByText('Alpha: 1 checked in')).toBeTruthy();
  });

  it('takes a whole team check-in back with one tap', async () => {
    api.scan.mockResolvedValueOnce(teamScan());
    api.teamBatch.mockResolvedValueOnce(teamBatch());
    api.undoBatch.mockResolvedValueOnce({ removed: 2 });
    await startScanning();
    onScan('team-code');
    const sheet = await screen.findByRole('region', { name: 'Team check-in: Alpha' });
    fireEvent.click(await within(sheet).findByRole('button', { name: 'Select everyone present' }));
    fireEvent.click(await within(sheet).findByRole('button', { name: 'Check in selected (2)' }));
    fireEvent.click(await within(sheet).findByRole('button', { name: /Undo this check-in/ }));
    await waitFor(() => expect(api.undoBatch).toHaveBeenCalledWith('demo', 'batch-1'));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Team check-in: Alpha' })).toBeNull());
  });

  it('ticks a person off in the open team when their own code is scanned', async () => {
    api.scan.mockResolvedValueOnce(teamScan()).mockResolvedValueOnce(ok({ user_id: 8, name: 'Bo Li' }));
    await startScanning();
    onScan('team-code');
    const sheet = await screen.findByRole('region', { name: 'Team check-in: Alpha' });
    onScan('bo-code');
    expect(await within(sheet).findByText(/Checked in/)).toBeTruthy();
    expect((within(sheet).getByLabelText(/Bo Li/) as HTMLInputElement).disabled).toBe(true);
  });

  it('closes the open team when the session changes', async () => {
    api.sessions.mockResolvedValue([session(), lunch()]);
    api.scan.mockResolvedValueOnce(teamScan());
    await startScanning();
    onScan('team-code');
    await screen.findByRole('region', { name: 'Team check-in: Alpha' });
    fireEvent.click(await screen.findByRole('button', { name: /^Session:/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Lunch/ }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Team check-in: Alpha' })).toBeNull());
  });

  it('keeps a team code scanned offline as an error to redo, not as a person', async () => {
    window.localStorage.setItem('hackathon-check-in-queue:demo', JSON.stringify([{ code: 'team-code', scannedAt: '2026-01-01T09:00:00Z' }]));
    api.checkIn.mockRejectedValueOnce(Object.assign(new Error('That is a team code.'), { status: 400, body: { code: 'TEAM_CODE' } }));
    render(<CheckInConsole slug="demo" />);
    expect((await screen.findAllByText(/A team code was scanned while offline/)).length).toBeGreaterThan(0);
    await waitFor(() => expect(window.localStorage.getItem('hackathon-check-in-queue:demo')).toBeNull());
  });

  it('queues an offline scan for the session it was made in', async () => {
    api.sessions.mockResolvedValue([session(), lunch()]);
    api.scan.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await startScanning();
    await waitFor(() => expect(api.sessions).toHaveBeenCalled());
    await screen.findByRole('group', { name: 'Session being scanned' });
    onScan('code-a');
    await screen.findByText('Saved on this phone');
    expect(JSON.parse(window.localStorage.getItem('hackathon-check-in-queue:demo') || '[]')).toEqual([expect.objectContaining({ code: 'code-a', session: 1 })]);
  });
});
