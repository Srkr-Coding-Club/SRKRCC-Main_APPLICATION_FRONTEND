import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { create: vi.fn(), remove: vi.fn(), update: vi.fn(), sessions: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    checkIn: { sessions: (...a: unknown[]) => api.sessions(...a) },
    admin: {
      createCheckInSession: (...a: unknown[]) => api.create(...a), deleteCheckInSession: (...a: unknown[]) => api.remove(...a),
      updateCheckInSession: (...a: unknown[]) => api.update(...a), update: vi.fn(),
    },
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.body?.detail || err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/FormSelect', () => ({
  FormSelect: ({ value, options, onChange, 'aria-labelledby': labelledBy }: any) => (
    <select aria-labelledby={labelledBy} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

import { CheckInSessionForm, eventDays } from '../CheckInSessionForm';
import { CheckInSessionsManager } from '../CheckInSessionsManager';

const hackathon = { slug: 'demo', start_date: '2026-11-01T04:00:00Z', end_date: '2026-11-02T10:00:00Z', check_in_days: 2, check_in_slots_per_day: 1 } as any;
const session = (over: Record<string, unknown> = {}) => ({
  id: 1, day_index: 0, slot: 'MORNING', is_custom: false, date: '2026-11-01', name: 'Check-in', opens_at: null, closes_at: null, is_main: true,
  needs_arrival: false, counts_for_certificate: true, scan_mode: 'BOTH', is_active: true, outside_schedule: false, window: 'OPEN', checked_in: 0, ...over,
});

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  api.create.mockResolvedValue(session({ id: 9, is_custom: true, slot: null, name: 'Lunch', is_main: false }));
});
afterEach(() => cleanup());

describe('eventDays', () => {
  it('lists every day the event runs in the event time zone', () => {
    expect(eventDays('2026-11-01T04:00:00Z', '2026-11-02T10:00:00Z')).toEqual(['2026-11-01', '2026-11-02']);
    expect(eventDays('2026-11-01T20:00:00Z', '2026-11-01T22:00:00Z')).toEqual(['2026-11-02']);
    expect(eventDays(undefined, undefined)).toEqual([]);
  });
});

describe('CheckInSessionForm', () => {
  it('adds a session with its title, day, times and who is checked in', async () => {
    const onAdded = vi.fn();
    render(<CheckInSessionForm hackathon={hackathon} onAdded={onAdded} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '  Lunch ' } });
    fireEvent.change(screen.getByLabelText('Starts (optional)'), { target: { value: '13:00' } });
    fireEvent.change(screen.getByLabelText('Ends (optional)'), { target: { value: '14:00' } });
    fireEvent.change(document.querySelector('select[aria-labelledby="new-session-who"]') as Element, { target: { value: 'TEAMS' } });
    fireEvent.click(screen.getByRole('button', { name: /Add session/ }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith('demo', {
      name: 'Lunch', date: '2026-11-01', opens_at: '2026-11-01T07:30:00.000Z', closes_at: '2026-11-01T08:30:00.000Z',
      scan_mode: 'TEAMS', needs_arrival: true, counts_for_certificate: false,
    });
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('');
  });

  it('sends no times when none are given', async () => {
    render(<CheckInSessionForm hackathon={hackathon} onAdded={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Workshop' } });
    fireEvent.click(screen.getByRole('button', { name: /Add session/ }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('demo', expect.objectContaining({ opens_at: null, closes_at: null, scan_mode: 'BOTH' })));
  });

  it('asks for a title and a sensible end time before calling the server', () => {
    render(<CheckInSessionForm hackathon={hackathon} onAdded={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Add session/ }));
    expect(screen.getByText('Give the session a title.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Starts (optional)'), { target: { value: '15:00' } });
    fireEvent.change(screen.getByLabelText('Ends (optional)'), { target: { value: '14:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Add session/ }));
    expect(screen.getByText('It must end after it starts.')).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('shows the server\'s reason next to the field', async () => {
    api.create.mockRejectedValue({ body: { field: 'name', detail: 'A session with that title already exists on that day.' }, message: 'x' });
    render(<CheckInSessionForm hackathon={hackathon} onAdded={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Lunch' } });
    fireEvent.click(screen.getByRole('button', { name: /Add session/ }));
    expect(await screen.findByText('A session with that title already exists on that day.')).toBeTruthy();
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('CheckInSessionsManager: sessions you added', () => {
  const sessions = [session(), session({ id: 9, is_custom: true, slot: null, name: 'Lunch', is_main: false, needs_arrival: true, counts_for_certificate: false, checked_in: 0 })];

  it('marks them, offers Delete only on them, and deletes after a confirmation', async () => {
    api.sessions.mockResolvedValue(sessions);
    api.remove.mockResolvedValue({ outcome: 'deleted' });
    render(<CheckInSessionsManager hackathon={hackathon} onSaved={vi.fn()} />);
    expect(await screen.findByText('Added by you', { selector: 'span.rounded-full' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Delete/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete session' }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('demo', 9));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Lunch deleted'));
  });

  it('shows the title of a session you added in its Name box and sends it back when saved', async () => {
    api.sessions.mockResolvedValue(sessions);
    api.update.mockResolvedValue(sessions[1]);
    render(<CheckInSessionsManager hackathon={hackathon} onSaved={vi.fn()} />);
    const form = await screen.findByRole('form', { name: 'Settings for Lunch' });
    expect((within(form).getByLabelText('Name') as HTMLInputElement).value).toBe('Lunch');
    fireEvent.click(within(form).getByRole('button', { name: 'Save session' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('demo', 9, expect.objectContaining({ name: 'Lunch' })));
  });

  it('brings a retired session back', async () => {
    api.sessions.mockResolvedValue([session(), session({ id: 9, is_custom: true, slot: null, name: 'Lunch', is_main: false, outside_schedule: true, checked_in: 2 })]);
    api.update.mockResolvedValue(sessions[1]);
    render(<CheckInSessionsManager hackathon={hackathon} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bring it back' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('demo', 9, { outside_schedule: false }));
  });

  it('moves a session you added to another day of the event', async () => {
    api.sessions.mockResolvedValue(sessions);
    api.update.mockResolvedValue(sessions[1]);
    render(<CheckInSessionsManager hackathon={hackathon} onSaved={vi.fn()} />);
    const form = await screen.findByRole('form', { name: 'Settings for Lunch' });
    fireEvent.change(within(form).getAllByRole('combobox').find((el) => (el as HTMLSelectElement).value === '2026-11-01')!, { target: { value: '2026-11-02' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save session' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('demo', 9, expect.objectContaining({ date: '2026-11-02' })));
  });

  it('says a session with check-ins is kept, not deleted', async () => {
    api.sessions.mockResolvedValue([session(), session({ id: 9, is_custom: true, slot: null, name: 'Lunch', is_main: false, checked_in: 5 })]);
    api.remove.mockResolvedValue({ outcome: 'retired' });
    render(<CheckInSessionsManager hackathon={hackathon} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Delete/ }));
    expect(await screen.findByText(/5 people are already checked in/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete session' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Lunch kept, switched off'));
  });
});
