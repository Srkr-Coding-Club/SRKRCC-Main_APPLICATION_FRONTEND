import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckInSessionBar } from '../CheckInSessionBar';

const session = (over: Record<string, unknown> = {}) => ({
  id: 1, day_index: 0, slot: 'MORNING', date: '2026-11-01', name: 'Check-in', opens_at: null, closes_at: null, is_main: true, needs_arrival: false,
  counts_for_certificate: true, scan_mode: 'BOTH', is_active: true, outside_schedule: false, window: 'OPEN', checked_in: 0, ...over,
}) as any;
const lunch = (over: Record<string, unknown> = {}) => session({ id: 2, name: 'Lunch', is_main: false, needs_arrival: true, ...over });

afterEach(() => cleanup());

describe('CheckInSessionBar', () => {
  it('is hidden when there is only one session, so single-session events look as before', () => {
    const { container } = render(<CheckInSessionBar sessions={[session()]} session={session()} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('is hidden until a session is chosen', () => {
    const { container } = render(<CheckInSessionBar sessions={[session(), lunch()]} session={null} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the session name, whether it is open, and what may be scanned', () => {
    render(<CheckInSessionBar sessions={[session(), lunch({ scan_mode: 'TEAMS' })]} session={lunch({ scan_mode: 'TEAMS' })} onSelect={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Session being scanned' }).textContent).toContain('Lunch');
    expect(screen.getByText('Open now')).toBeTruthy();
    expect(screen.getByText(/Scan the team code, then pick who is present · only people who have arrived/)).toBeTruthy();
  });

  it('does not mention arrival for the main session', () => {
    render(<CheckInSessionBar sessions={[session(), lunch()]} session={session()} onSelect={vi.fn()} />);
    expect(screen.queryByText(/only people who have arrived/)).toBeNull();
  });

  it('reports the chosen session and disables the ones that cannot take scans', () => {
    const onSelect = vi.fn();
    render(<CheckInSessionBar sessions={[session(), lunch(), session({ id: 3, name: 'Dinner', is_main: false, is_active: false }), session({ id: 4, name: 'Old', is_main: false, outside_schedule: true })]} session={session()} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /^Session:/ }));
    expect((screen.getByRole('option', { name: /Dinner/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('option', { name: /Old/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('option', { name: /Lunch/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
