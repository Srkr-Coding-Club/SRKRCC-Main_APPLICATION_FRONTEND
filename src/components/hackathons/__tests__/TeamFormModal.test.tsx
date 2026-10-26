import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A plain function rather than vi.fn(): the spy re-throws a rejected promise it records, which vitest then reports as an unhandled error.
const createTeam = vi.hoisted(() => ({ calls: 0, impl: async (..._args: unknown[]): Promise<unknown> => ({}) }));
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { createTeam: (...args: unknown[]) => { createTeam.calls += 1; return createTeam.impl(...args); }, updateTeam: vi.fn() },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.body?.detail || err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

import { TeamFormModal } from '../TeamFormModal';

const problems = [
  { id: 1, code: 'PS-01', title: 'Offline telemedicine', description: '', domain: 'HealthTech', tags: [], max_teams: 5, is_active: true, order: 1, team_count: 0, slots_left: 5 },
] as any;

const open = (props: Record<string, unknown> = {}) => {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<TeamFormModal isOpen onClose={onClose} slug="demo" problemStatements={problems} allowOpenInnovation onSaved={onSaved} {...props} />);
  return { onSaved, onClose };
};

beforeEach(() => { createTeam.calls = 0; createTeam.impl = async () => ({}); });
afterEach(() => cleanup());

describe('TeamFormModal validation feedback', () => {
  it('announces the missing team name and ties it to the field, without calling the API', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Create team' }));
    const name = screen.getByLabelText(/Team name/);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    const message = document.getElementById(name.getAttribute('aria-describedby') ?? '');
    expect(message?.textContent).toBe('Team name is required.');
    expect(message?.getAttribute('role')).toBe('alert');
    expect(createTeam.calls).toBe(0);
  });

  it('keeps a server-side name clash next to the name field', async () => {
    const clash = Object.assign(new Error('Conflict'), { body: { field: 'name', detail: 'A team with this name already exists.' } });
    createTeam.impl = async () => { throw clash; };
    open({ initialProblemId: '1' });
    fireEvent.change(screen.getByLabelText(/Team name/), { target: { value: 'Taken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create team' }));
    await waitFor(() => expect(screen.getByText('A team with this name already exists.')).toBeTruthy());
    const name = screen.getByLabelText(/Team name/);
    expect(document.getElementById(name.getAttribute('aria-describedby') ?? '')?.textContent).toBe('A team with this name already exists.');
  });

  it('names the problem-statement picker for screen readers', () => {
    open();
    expect(screen.getByRole('button', { name: /Problem statement/ })).toBeTruthy();
  });

  it('Escape inside the open problem list closes the list, not the dialog', () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
    fireEvent.keyDown(screen.getByRole('option', { name: /PS-01/ }), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
