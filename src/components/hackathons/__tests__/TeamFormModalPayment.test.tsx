import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createTeam = vi.hoisted(() => ({ calls: [] as unknown[][], impl: async (..._args: unknown[]): Promise<unknown> => ({}) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    createTeam: (...args: unknown[]) => { createTeam.calls.push(args); return createTeam.impl(...args); },
    updateTeam: vi.fn(), paymentFileDiscard: vi.fn().mockResolvedValue(null),
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.body?.detail || err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/ideaUpload', () => ({
  IDEA_FILE_RULES: { PAYMENT: { allowedFileTypes: '.png', maxFileSizeMB: 5, label: 'payment screenshot' } },
  uploadRegistrationPayment: vi.fn(),
}));
// The real picker talks to storage; this stand-in just hands over a finished upload when asked.
vi.mock('@/components/forms/FileUploadField', () => ({
  default: ({ onChange, onBusyChange, value }: any) => (
    <div>
      <button type="button" onClick={() => onChange({ upload_id: 'file-1', name: 'pay.png', size: 10, type: 'image/png' })}>Attach screenshot</button>
      <button type="button" onClick={() => onBusyChange(true)}>Start uploading</button>
      <button type="button" onClick={() => onBusyChange(false)}>Finish uploading</button>
      {value && <span>Attached {value.name}</span>}
    </div>
  ),
}));
vi.mock('../PaymentQr', () => ({ PaymentQr: ({ version }: { version?: string }) => <div data-testid="qr">{version}</div> }));

import { TeamFormModal } from '../TeamFormModal';

const problems = [
  { id: 1, code: 'PS-01', title: 'Offline telemedicine', description: '', domain: 'HealthTech', tags: [], max_teams: 5, is_active: true, order: 1, team_count: 0, slots_left: 5 },
] as any;
const terms = { fee: 200, note: 'UPI: club@upi', qrId: 'qr-1' };

const open = (props: Record<string, unknown> = {}) => {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<TeamFormModal isOpen onClose={onClose} slug="demo" problemStatements={problems} allowOpenInnovation={false} initialProblemId="1" payment={terms} onSaved={onSaved} {...props} />);
  return { onSaved, onClose };
};
const toPayment = () => {
  fireEvent.change(screen.getByLabelText(/Team name/), { target: { value: 'Alpha' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
};

beforeEach(() => { createTeam.calls = []; createTeam.impl = async () => ({}); toast.success.mockReset(); toast.error.mockReset(); });
afterEach(() => cleanup());

describe('TeamFormModal with a registration fee', () => {
  it('adds a payment step after the team step', () => {
    open();
    const steps = screen.getByRole('list', { name: 'Progress' });
    expect(steps.textContent).toContain('Team');
    expect(steps.textContent).toContain('Payment');
    expect(screen.queryByLabelText(/Transaction ID/)).toBeNull();
    toPayment();
    expect(screen.getByText('Pay ₹200 to register your team')).toBeTruthy();
    expect(screen.getByTestId('qr').textContent).toBe('qr-1');
    expect(screen.getByText('UPI: club@upi')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pay and create team' })).toBeTruthy();
  });

  it('shows no payment step when nothing is paid at registration', () => {
    open({ payment: undefined });
    expect(screen.queryByRole('list', { name: 'Progress' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Create team' })).toBeTruthy();
  });

  it('does not move on from the team step without a team name', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Team name is required.')).toBeTruthy();
    expect(screen.queryByText('Pay ₹200 to register your team')).toBeNull();
  });

  it('asks for the screenshot and the transaction id before creating anything', () => {
    open();
    toPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Pay and create team' }));
    expect(screen.getByText('Upload the screenshot of your payment.')).toBeTruthy();
    expect(screen.getByText('Enter the transaction ID of your payment.')).toBeTruthy();
    expect(createTeam.calls).toHaveLength(0);
  });

  it('creates the team with the screenshot and the trimmed transaction id', async () => {
    const { onSaved, onClose } = open();
    toPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Attach screenshot' }));
    fireEvent.change(screen.getByLabelText(/Transaction ID/), { target: { value: '  UPI 123  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pay and create team' }));
    await waitFor(() => expect(createTeam.calls).toHaveLength(1));
    expect(createTeam.calls[0][1]).toEqual(expect.objectContaining({ name: 'Alpha', problem_statement: 1, transaction_id: 'UPI 123', payment_file_id: 'file-1' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Payment received', expect.stringContaining('verify'));
  });

  it('will not submit while the screenshot is still uploading', async () => {
    open();
    toPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Attach screenshot' }));
    fireEvent.change(screen.getByLabelText(/Transaction ID/), { target: { value: 'R1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start uploading' }));
    const submit = screen.getByRole('button', { name: 'Uploading…' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Finish uploading' }));
    expect((screen.getByRole('button', { name: 'Pay and create team' }) as HTMLButtonElement).disabled).toBe(false);
    expect(createTeam.calls).toHaveLength(0);
  });

  it('keeps what was typed and shows a reused transaction id on its field', async () => {
    createTeam.impl = async () => { throw Object.assign(new Error('x'), { body: { field: 'transaction_id', code: 'TRANSACTION_REUSED', detail: 'This transaction ID has already been used.' } }); };
    open();
    toPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Attach screenshot' }));
    fireEvent.change(screen.getByLabelText(/Transaction ID/), { target: { value: 'DUP' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pay and create team' }));
    expect(await screen.findByText('This transaction ID has already been used.')).toBeTruthy();
    expect((screen.getByLabelText(/Transaction ID/) as HTMLInputElement).value).toBe('DUP');
    expect(screen.getByText('Attached pay.png')).toBeTruthy();
  });

  it('asks for the screenshot again when the server no longer has it', async () => {
    createTeam.impl = async () => { throw Object.assign(new Error('x'), { body: { field: 'payment_file_id', code: 'FILE_NOT_FOUND', detail: 'The payment screenshot is no longer available. Please add it again.' } }); };
    open();
    toPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Attach screenshot' }));
    fireEvent.change(screen.getByLabelText(/Transaction ID/), { target: { value: 'R2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pay and create team' }));
    expect(await screen.findByText('The payment screenshot is no longer available. Please add it again.')).toBeTruthy();
    expect(screen.queryByText('Attached pay.png')).toBeNull();
  });

  it('goes back to the team step for a name that is taken', async () => {
    createTeam.impl = async () => { throw Object.assign(new Error('x'), { body: { field: 'name', detail: 'That team name is already taken.' } }); };
    open();
    toPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Attach screenshot' }));
    fireEvent.change(screen.getByLabelText(/Transaction ID/), { target: { value: 'R3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pay and create team' }));
    expect(await screen.findByText('That team name is already taken.')).toBeTruthy();
    expect(screen.getByLabelText(/Team name/)).toBeTruthy();
  });

  it('can go back from the payment step', () => {
    open();
    toPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect((screen.getByLabelText(/Team name/) as HTMLInputElement).value).toBe('Alpha');
  });

  it('is not shown when editing a team', () => {
    open({ team: { id: 5, name: 'Alpha', problem_statement: { id: 1, code: 'PS-01', title: 'x', domain: 'y' }, open_innovation: null } });
    expect(screen.queryByRole('list', { name: 'Progress' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('starts empty when it is opened again', () => {
    const { onClose } = open();
    toPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Attach screenshot' }));
    cleanup();
    render(<TeamFormModal isOpen onClose={onClose} slug="demo" problemStatements={problems} allowOpenInnovation={false} initialProblemId="1" payment={terms} onSaved={vi.fn()} />);
    toPayment();
    expect(screen.queryByText('Attached pay.png')).toBeNull();
  });
});
