import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const myCheckIn = vi.fn();
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { myCheckIn: (...a: unknown[]) => myCheckIn(...a) },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} /> }));

import { CheckInCard } from '../ParticipantCards';

const state = (over: Record<string, unknown> = {}) => ({ token: 'tok-1', checked_in: false, checked_in_at: null, window: 'OPEN', opens_at: null, closes_at: null, ...over });

beforeEach(() => myCheckIn.mockReset());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('CheckInCard', () => {
  it('shows the QR code while check-in is open', async () => {
    myCheckIn.mockResolvedValue(state());
    render(<CheckInCard slug="demo" />);
    expect((await screen.findByTestId('qr')).getAttribute('data-value')).toBe('tok-1');
  });

  it('says when check-in opens instead of showing a code', async () => {
    myCheckIn.mockResolvedValue(state({ token: '', window: 'NOT_OPEN', opens_at: '2026-11-01T03:30:00Z' }));
    render(<CheckInCard slug="demo" />);
    expect(await screen.findByText(/Check-in opens .*1 Nov 2026/)).toBeTruthy();
    expect(screen.queryByTestId('qr')).toBeNull();
  });

  it('tells people to find a volunteer once check-in has closed', async () => {
    myCheckIn.mockResolvedValue(state({ token: '', window: 'CLOSED' }));
    render(<CheckInCard slug="demo" />);
    expect(await screen.findByText(/Check-in has closed/)).toBeTruthy();
    expect(screen.queryByTestId('qr')).toBeNull();
  });

  it('shows the arrival confirmation, not a code, once checked in even if the window has closed', async () => {
    myCheckIn.mockResolvedValue(state({ token: '', window: 'CLOSED', checked_in: true, checked_in_at: '2026-11-01T04:00:00Z' }));
    render(<CheckInCard slug="demo" />);
    expect(await screen.findByText('You are checked in')).toBeTruthy();
    expect(screen.queryByText(/Check-in has closed/)).toBeNull();
  });

  it('shows the server message when the team is not registered yet', async () => {
    myCheckIn.mockRejectedValueOnce(new Error('Check-in opens once your team is registered.'));
    render(<CheckInCard slug="demo" />);
    expect(await screen.findByText('Check-in opens once your team is registered.')).toBeTruthy();
  });

  it('picks up the rotated code on the next refresh and keeps the old one if a refresh fails', async () => {
    vi.useFakeTimers();
    myCheckIn.mockResolvedValueOnce(state({ token: 'tok-1' })).mockResolvedValueOnce(state({ token: 'tok-2' })).mockRejectedValueOnce(new Error('offline'));
    render(<CheckInCard slug="demo" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('tok-1');
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('tok-2');
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('tok-2');
  });

  it('stops refreshing after it unmounts', async () => {
    vi.useFakeTimers();
    myCheckIn.mockResolvedValue(state());
    const { unmount } = render(<CheckInCard slug="demo" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    unmount();
    const calls = myCheckIn.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(myCheckIn.mock.calls.length).toBe(calls);
  });

  describe('with several sessions', () => {
    const row = (over: Record<string, unknown> = {}) => ({ id: 1, name: 'Check-in', is_main: true, window: 'OPEN', opens_at: null, closes_at: null, checked_in: false, checked_in_at: null, ...over });
    const several = (over: Record<string, unknown> = {}) => state({
      team_token: 'team-1', team: { id: 3, name: 'Alpha' },
      sessions: [row({ checked_in: true, checked_in_at: '2026-11-01T04:00:00Z' }), row({ id: 2, name: 'Lunch', is_main: false })], ...over,
    });

    it('lists every session with where the person stands in each', async () => {
      myCheckIn.mockResolvedValue(several());
      render(<CheckInCard slug="demo" />);
      const list = await screen.findByRole('list', { name: 'Check-in sessions' });
      expect(within(list).getByText(/Checked in .*1 Nov 2026/)).toBeTruthy();
      expect(within(list).getByText('Lunch')).toBeTruthy();
      expect(within(list).getByText('Open now')).toBeTruthy();
    });

    it('keeps the code on screen after arrival, because the next session needs it', async () => {
      myCheckIn.mockResolvedValue(several());
      render(<CheckInCard slug="demo" />);
      expect((await screen.findByTestId('qr')).getAttribute('data-value')).toBe('tok-1');
      expect(screen.queryByText('You are checked in')).toBeNull();
    });

    it('switches to the team code and back', async () => {
      myCheckIn.mockResolvedValue(several());
      render(<CheckInCard slug="demo" />);
      await screen.findByTestId('qr');
      fireEvent.click(screen.getByRole('tab', { name: 'Team code' }));
      expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('team-1');
      expect(screen.getByText('Alpha')).toBeTruthy();
      fireEvent.click(screen.getByRole('tab', { name: 'My code' }));
      expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('tok-1');
    });

    it('has no tabs for someone without a team code', async () => {
      myCheckIn.mockResolvedValue(several({ team_token: undefined, team: undefined }));
      render(<CheckInCard slug="demo" />);
      await screen.findByTestId('qr');
      expect(screen.queryByRole('tablist')).toBeNull();
    });

    it('names the next session to open when nothing is open now', async () => {
      myCheckIn.mockResolvedValue(several({
        token: '', team_token: undefined,
        sessions: [row({ window: 'CLOSED' }), row({ id: 2, name: 'Day 2 Morning', is_main: false, window: 'NOT_OPEN', opens_at: '2026-11-02T03:30:00Z' })],
      }));
      render(<CheckInCard slug="demo" />);
      expect(await screen.findByText(/Day 2 Morning opens .*2 Nov 2026/)).toBeTruthy();
      expect(screen.queryByTestId('qr')).toBeNull();
    });

    it('says check-in has closed when every session is over', async () => {
      myCheckIn.mockResolvedValue(several({ token: '', team_token: undefined, sessions: [row({ window: 'CLOSED' }), row({ id: 2, name: 'Lunch', is_main: false, window: 'CLOSED' })] }));
      render(<CheckInCard slug="demo" />);
      expect(await screen.findByText(/Check-in has closed/)).toBeTruthy();
    });
  });
});
