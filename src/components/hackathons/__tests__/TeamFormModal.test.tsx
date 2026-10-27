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

const rules = { rules: 'Be kind and ship code.', require_rules_acceptance: true, registration_questions: [] };
const fillTeam = (name = 'Bug Slayers') => {
  fireEvent.change(screen.getByLabelText(/Team name/), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
  fireEvent.click(screen.getByRole('option', { name: /PS-01/ }));
};

describe('TeamFormModal steps', () => {
  it('is a single step without rules or questions: no progress list and a Create team button', () => {
    open();
    expect(screen.queryByRole('list', { name: 'Progress' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Create team' })).toBeTruthy();
  });

  it('asks for rules on a second step, keeps what was typed when going back, and creates the team from step 2', async () => {
    createTeam.impl = async () => ({ id: 1 });
    const { onSaved } = open({ registration: rules });
    expect(screen.getByRole('list', { name: 'Progress' })).toBeTruthy();
    expect(screen.queryByText(/read and accept the rules/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Team name is required.')).toBeTruthy();
    expect(screen.queryByText(/read and accept the rules/)).toBeNull();

    fillTeam();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/read and accept the rules/)).toBeTruthy();
    expect(screen.getByRole('listitem', { current: 'step' }).textContent).toContain('Details');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect((screen.getByLabelText(/Team name/) as HTMLInputElement).value).toBe('Bug Slayers');
    expect(screen.getByRole('button', { name: /Problem statement: PS-01/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.click(screen.getByRole('button', { name: 'Create team' }));
    expect(await screen.findByText('Please accept the rules to continue.')).toBeTruthy();
    expect(createTeam.calls).toBe(0);

    fireEvent.click(screen.getByLabelText(/read and accept the rules/));
    fireEvent.click(screen.getByRole('button', { name: 'Create team' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(createTeam.calls).toBe(1);
  });

  it('Enter in the team name goes to the next step instead of submitting', () => {
    open({ registration: rules, initialProblemId: '1' });
    const name = screen.getByLabelText(/Team name/);
    fireEvent.change(name, { target: { value: 'Bug Slayers' } });
    fireEvent.submit(name.closest('form') as HTMLFormElement);
    expect(screen.getByText(/read and accept the rules/)).toBeTruthy();
    expect(createTeam.calls).toBe(0);
  });

  it('returns to step 1 when the server rejects the team name on step 2', async () => {
    createTeam.impl = async () => { throw Object.assign(new Error('Conflict'), { body: { field: 'name', detail: 'A team with this name already exists.' } }); };
    open({ registration: rules, initialProblemId: '1' });
    fireEvent.change(screen.getByLabelText(/Team name/), { target: { value: 'Taken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByLabelText(/read and accept the rules/));
    fireEvent.click(screen.getByRole('button', { name: 'Create team' }));
    await waitFor(() => expect(screen.getByText('A team with this name already exists.')).toBeTruthy());
    expect(screen.getByLabelText(/Team name/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('edit mode is always one step and keeps the problem the team already holds', () => {
    const team = { id: 4, name: 'Old name', problem_statement: { id: 9, code: 'PS-09', title: 'Deactivated one', domain: 'IoT' }, open_innovation: null } as any;
    open({ team, registration: rules });
    expect(screen.queryByRole('list', { name: 'Progress' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Problem statement: PS-09 Deactivated one/ })).toBeTruthy();
  });

  it('keeps the form open when Escape closes the problem sheet, and closes it on the next Escape', () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
    fireEvent.keyDown(screen.getByRole('option', { name: /PS-01/ }), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the pinned Cancel and Create buttons outside the scrolling form body', () => {
    open();
    const create = screen.getByRole('button', { name: 'Create team' });
    expect(create.getAttribute('form')).toBe('team-form');
    expect(document.getElementById('team-form')?.contains(create)).toBe(false);
  });

  it('copes with a long list of statements and with open innovation as the only choice', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...problems[0], id: i + 1, code: 'PS-' + String(i + 1).padStart(2, '0'), title: 'Statement ' + (i + 1) }));
    open({ problemStatements: many });
    fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
    expect(screen.getAllByRole('option')).toHaveLength(30);
    cleanup();
    open({ problemStatements: [] });
    expect(screen.queryByRole('button', { name: /Problem statement/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Open innovation/ })).toBeTruthy();
  });
});
