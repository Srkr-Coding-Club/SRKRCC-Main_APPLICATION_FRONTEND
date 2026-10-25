import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/useFocusTrap', () => ({ useFocusTrap: () => undefined }));
vi.mock('@/components/ui/Portal', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/CollegeSelect', () => ({
  CollegeSelect: ({ id, value, onChange, 'aria-describedby': described }: any) => (
    <div>
      <button id={id} type="button" aria-describedby={described} onClick={() => onChange({ college: { id: 7, code: 'C-7', name: 'Godavari Institute', district: 'East Godavari', state: 'AP' }, otherName: null })}>
        {value.college?.name ?? (value.otherName !== null ? `typed: ${value.otherName}` : 'Choose a college')}
      </button>
      <button type="button" onClick={() => onChange({ college: null, otherName: 'Village Polytechnic' })}>Type my own</button>
      <button type="button" onClick={() => onChange({ college: null, otherName: 'x' })}>Type a bad one</button>
    </div>
  ),
}));

import { CreateUserModal } from '../CreateUserModal';
import { EMPTY_NEW_USER, type NewUserForm } from '@/lib/adminUserForm';

function Harness({ onSubmit, initial }: { onSubmit: (form: NewUserForm) => Promise<void>; initial?: Partial<NewUserForm> }) {
  const [form, setForm] = useState<NewUserForm>({ ...EMPTY_NEW_USER, ...initial });
  return <CreateUserModal isOpen onClose={() => undefined} onSubmit={() => onSubmit(form)} newUser={form} setNewUser={setForm} />;
}

const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const fillBasics = () => {
  type(/Full Name/, 'Ravi Kumar');
  type(/^Email/, 'ravi@example.org');
  type(/^Password/, 'StrongPass123!');
};
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Save User Account' }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('Create user form', () => {
  it('asks for the year and the college, and shows what the college default is', () => {
    render(<Harness onSubmit={vi.fn()} />);
    const year = screen.getByLabelText(/Year of Study/) as HTMLSelectElement;
    expect(Array.from(year.options).map((o) => o.text)).toEqual(['1st Year', '2nd Year', '3rd Year', '4th Year']);
    expect(screen.getByLabelText(/^College/)).toBeTruthy();
    expect(screen.getByText(/created under SRKR Engineering College/)).toBeTruthy();
  });

  it('sends what was filled in, including the year and college', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSubmit={submit} />);
    fillBasics();
    type(/Year of Study/, '3');
    fireEvent.click(screen.getByLabelText(/^College/));
    send();
    await waitFor(() => expect(submit).toHaveBeenCalled());
    const form = submit.mock.calls[0][0] as NewUserForm;
    expect([form.year, form.college.college?.id, form.email]).toEqual(['3', 7, 'ravi@example.org']);
    expect(screen.queryByText(/created under SRKR/)).toBeNull();
  });

  it('refuses an incomplete form without calling the server, shows each message under its field and focuses the first', async () => {
    const submit = vi.fn();
    render(<Harness onSubmit={submit} />);
    send();
    expect(submit).not.toHaveBeenCalled();
    expect((await screen.findByText('Full name is required.')).getAttribute('role')).toBe('alert');
    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Set a password for the account.')).toBeTruthy();
    expect(document.activeElement?.id).toBe('create-user-name');
    expect(screen.getByLabelText(/Full Name/).getAttribute('aria-invalid')).toBe('true');
  });

  it('checks a typed college name, and clears a complaint as the person fixes it', async () => {
    render(<Harness onSubmit={vi.fn()} />);
    fillBasics();
    fireEvent.click(screen.getByRole('button', { name: 'Type a bad one' }));
    send();
    expect(await screen.findByText(/College name must be at least 3 characters/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Type my own' }));
    expect(screen.queryByText(/College name must be at least/)).toBeNull();
  });

  it('shows the Club ID box only for an affiliate and refuses a bad format', async () => {
    render(<Harness onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/Affiliate ID/)).toBeNull();
    type(/Platform Role/, 'AFFILIATE');
    fillBasics();
    send();
    expect(await screen.findByText(/Affiliate ID is required/)).toBeTruthy();
    type(/Affiliate ID/, '5scc1');
    send();
    expect(await screen.findByText(/Affiliate ID must look like 25SCC277 or 21CCA041/)).toBeTruthy();
    type(/Affiliate ID/, '21cca041');
    expect((screen.getByLabelText(/Affiliate ID/) as HTMLInputElement).value).toBe('21CCA041');
  });

  it('puts the servers messages under the right fields and keeps what was typed', async () => {
    const submit = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { body: { year: ['Year of study must be between 1 and 4.'], college_id: ['Select a college from the list.'], email: ['An account with this email already exists.'] } }));
    render(<Harness onSubmit={submit} />);
    fillBasics();
    send();
    expect(await screen.findByText('Year of study must be between 1 and 4.')).toBeTruthy();
    expect(screen.getByText('Select a college from the list.')).toBeTruthy();
    expect(screen.getByText('An account with this email already exists.')).toBeTruthy();
    expect((screen.getByLabelText(/Full Name/) as HTMLInputElement).value).toBe('Ravi Kumar');
    expect(document.activeElement?.id).toBe('create-user-email');
  });

  it('shows a general failure (no field in it) at the bottom, and lets the person try again', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('The server is busy.')).mockResolvedValueOnce(undefined);
    render(<Harness onSubmit={submit} />);
    fillBasics();
    send();
    expect((await screen.findByText('The server is busy.')).getAttribute('role')).toBe('alert');
    send();
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('The server is busy.')).toBeNull());
  });

  it('cannot be sent twice while it is saving', async () => {
    let finish!: () => void;
    const submit = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<Harness onSubmit={submit} />);
    fillBasics();
    send();
    const saving = await screen.findByRole('button', { name: 'Saving...' }) as HTMLButtonElement;
    expect(saving.disabled).toBe(true);
    fireEvent.submit(saving.closest('form')!);
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it('cleans digits and letters as they are typed', () => {
    render(<Harness onSubmit={vi.fn()} />);
    type(/Phone Number/, '98a76-543 210999');
    expect((screen.getByLabelText(/Phone Number/) as HTMLInputElement).value).toBe('9876543210');
    type(/Roll Number/, '21b91a-0501xyz');
    expect((screen.getByLabelText(/Roll Number/) as HTMLInputElement).value).toBe('21B91A0501');
  });

  it('has no accessibility violations, with and without errors', async () => {
    const { container } = render(<Harness onSubmit={vi.fn()} />);
    const run = async () => (await axe.run(container, { rules: { region: { enabled: false } } })).violations.map((v) => v.id);
    expect(await run()).toEqual([]);
    send();
    await screen.findByText('Full name is required.');
    expect(await run()).toEqual([]);
  });
});
