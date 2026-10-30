import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/hackathons', () => ({
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));

import { TeamScanSheet } from '../TeamScanSheet';

const session = { id: 1, name: 'Check-in', is_main: true } as any;
const member = (over: Record<string, unknown> = {}) => ({ user_id: 7, name: 'Asha Rao', role: 'LEADER', checked_in: false, checked_in_at: null, checked_in_by: null, via: null, blocked: null, ...over });
const scan = (over: Record<string, unknown> = {}, team: Record<string, unknown> = {}) => ({
  kind: 'team', team: { id: 3, name: 'Alpha', status: 'REGISTERED', placed: true, problem_code: null, problem_title: null, ...team }, session,
  members: [member(), member({ user_id: 8, name: 'Bo Li', role: 'MEMBER' }), member({ user_id: 9, name: 'Cy Doe', role: 'MEMBER' })],
  all_checked_in: false, can_override: false, ...over,
}) as any;
const batch = (over: Record<string, unknown> = {}) => ({
  batch_id: 'b1', team: { id: 3, name: 'Alpha' }, session_id: 1, created: 1, already: 0, refused: 0, results: [{ user_id: 7, name: 'Asha Rao', status: 'created' }], ...over,
}) as any;

afterEach(() => cleanup());

const setup = (scanValue = scan(), onSubmit = vi.fn().mockResolvedValue(batch()), onUndo = vi.fn().mockResolvedValue(undefined)) => {
  const onClose = vi.fn();
  render(<TeamScanSheet scan={scanValue} onClose={onClose} onSubmit={onSubmit} onUndo={onUndo} />);
  return { onSubmit, onUndo, onClose };
};
const submitButton = () => screen.getByRole('button', { name: /Check in selected/ }) as HTMLButtonElement;

describe('TeamScanSheet', () => {
  it('starts with nobody ticked and cannot submit', () => {
    setup();
    expect((screen.getAllByRole('checkbox') as HTMLInputElement[]).map((box) => box.checked)).toEqual([false, false, false]);
    expect(submitButton().disabled).toBe(true);
  });

  it('submits only the people ticked', async () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByLabelText(/Bo Li/));
    expect(submitButton().textContent).toBe('Check in selected (1)');
    fireEvent.click(submitButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ userIds: [8], override: false, reason: '' }));
  });

  it('ticks everyone who can be checked in with one tap', () => {
    setup(scan({ members: [member({ checked_in: true, checked_in_at: '2026-11-01T04:00:00Z', checked_in_by: 'Vik' }), member({ user_id: 8, name: 'Bo Li', role: 'MEMBER' })] }));
    fireEvent.click(screen.getByRole('button', { name: 'Select everyone present' }));
    expect(submitButton().textContent).toBe('Check in selected (1)');
  });

  it('shows who is already in and cannot tick them', () => {
    setup(scan({ members: [member({ checked_in: true, checked_in_at: '2026-11-01T04:00:00Z', checked_in_by: 'Vik' })] }));
    expect(screen.getByText(/Checked in .*by Vik/)).toBeTruthy();
    expect((screen.getByLabelText(/Asha Rao/) as HTMLInputElement).disabled).toBe(true);
  });

  it('says when everyone is already in and offers no select-all', () => {
    setup(scan({ all_checked_in: true, members: [member({ checked_in: true })] }));
    expect(screen.getByText('Everyone on this team is already checked in.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Select everyone present' })).toBeNull();
  });

  it('shows each person\'s outcome after submitting, including refusals', async () => {
    setup(scan(), vi.fn().mockResolvedValue(batch({
      created: 1, refused: 1,
      results: [{ user_id: 7, name: 'Asha Rao', status: 'created' }, { user_id: 8, name: 'Bo Li', status: 'refused', detail: 'Has not checked in on arrival yet' }],
    })));
    fireEvent.click(screen.getByLabelText(/Asha Rao/));
    fireEvent.click(submitButton());
    expect(await screen.findByText('Checked in')).toBeTruthy();
    expect(screen.getByText('Not checked in: Has not checked in on arrival yet')).toBeTruthy();
  });

  it('keeps the ticks and shows the message when the code has expired', async () => {
    setup(scan(), vi.fn().mockRejectedValue(new Error('That QR code has expired.')));
    fireEvent.click(screen.getByLabelText(/Bo Li/));
    fireEvent.click(submitButton());
    expect(await screen.findByText('That QR code has expired.')).toBeTruthy();
    expect((screen.getByLabelText(/Bo Li/) as HTMLInputElement).checked).toBe(true);
  });

  it('takes the batch back and returns to the list', async () => {
    const { onUndo } = setup();
    fireEvent.click(screen.getByLabelText(/Asha Rao/));
    fireEvent.click(submitButton());
    fireEvent.click(await screen.findByRole('button', { name: /Undo this check-in/ }));
    await waitFor(() => expect(onUndo).toHaveBeenCalledWith('b1'));
    expect(await screen.findByRole('list', { name: 'Team members' })).toBeTruthy();
    expect(submitButton().disabled).toBe(true);
  });

  it('offers no undo when nobody new was checked in', async () => {
    setup(scan(), vi.fn().mockResolvedValue(batch({ batch_id: null, created: 0, already: 1, results: [{ user_id: 7, name: 'Asha Rao', status: 'already' }] })));
    fireEvent.click(screen.getByLabelText(/Asha Rao/));
    fireEvent.click(submitButton());
    expect(await screen.findByText('Was already checked in')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Undo this check-in/ })).toBeNull();
  });

  it('closes from the header and after the results', async () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('people who have not arrived', () => {
    const blocked = () => scan({ can_override: true, members: [member({ blocked: 'NOT_ARRIVED' }), member({ user_id: 8, name: 'Bo Li', role: 'MEMBER' })] });

    it('blocks them for a volunteer', () => {
      setup(scan({ members: [member({ blocked: 'NOT_ARRIVED' })] }));
      expect(screen.getByText('Has not checked in on arrival yet')).toBeTruthy();
      expect((screen.getByLabelText(/Asha Rao/) as HTMLInputElement).disabled).toBe(true);
      expect(screen.queryByLabelText(/Let in people/)).toBeNull();
    });

    it('lets an organizer bring them in only with a reason', async () => {
      const { onSubmit } = setup(blocked());
      expect((screen.getByLabelText(/Asha Rao/) as HTMLInputElement).disabled).toBe(true);
      fireEvent.click(screen.getByLabelText(/Let in people who have not arrived/));
      fireEvent.click(screen.getByLabelText(/Asha Rao/));
      expect(submitButton().disabled).toBe(true);
      fireEvent.change(screen.getByLabelText('Reason for letting people in'), { target: { value: '  Late bus ' } });
      fireEvent.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ userIds: [7], override: true, reason: 'Late bus' }));
    });
  });

  it('asks for a reason up front when the team is not registered', async () => {
    const { onSubmit } = setup(scan({ can_override: true }, { placed: false, status: 'WAITLISTED' }));
    expect(screen.getByText(/not registered yet/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Asha Rao/));
    expect(submitButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Reason for letting people in'), { target: { value: 'Moved up on the day' } });
    fireEvent.click(submitButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ userIds: [7], override: true, reason: 'Moved up on the day' }));
  });

  it('starts over when another team is scanned', () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByLabelText(/Asha Rao/));
    cleanup();
    render(<TeamScanSheet scan={scan({}, { id: 4, name: 'Beta' })} onClose={vi.fn()} onSubmit={onSubmit} onUndo={vi.fn()} />);
    expect((screen.getAllByRole('checkbox') as HTMLInputElement[]).every((box) => !box.checked)).toBe(true);
    expect(screen.getByText('Beta')).toBeTruthy();
  });
});
