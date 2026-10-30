import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { payments: vi.fn(), paymentAction: vi.fn(), paymentLink: vi.fn(), update: vi.fn(), ideaQrRemove: vi.fn(), exportFile: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    paymentLink: (...a: unknown[]) => api.paymentLink(...a), exportFile: (...a: unknown[]) => api.exportFile(...a), ideaQrRemove: (...a: unknown[]) => api.ideaQrRemove(...a),
    admin: { payments: (...a: unknown[]) => api.payments(...a), paymentAction: (...a: unknown[]) => api.paymentAction(...a), update: (...a: unknown[]) => api.update(...a) },
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.body?.detail || err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/forms/FileUploadField', () => ({ default: () => <div>file field</div> }));
vi.mock('@/components/hackathons/PaymentQr', () => ({ PaymentQr: () => <div data-testid="qr" /> }));
vi.mock('@/lib/ideaUpload', () => ({ IDEA_FILE_RULES: { PAYMENT: { allowedFileTypes: '.png', maxFileSizeMB: 5, label: 'x' } }, uploadIdeaQr: vi.fn() }));
vi.mock('@/components/hackathons/IdeaFileActions', () => ({
  IdeaFileActions: ({ file, label }: any) => <div>{label}: {file.name}</div>,
}));

import { PaymentsAdminTab } from '../PaymentsAdminTab';

const row = (over: Record<string, unknown> = {}) => ({
  id: 1, team_id: 11, team_name: 'Alpha', team_status: 'PAYMENT_PENDING', leader_name: 'Asha Rao', leader_email: 'asha@x.io', leader_phone: '99999',
  members: 1, amount: 200, transaction_id: 'UPI-1', status: 'PENDING', reason: '', submitted_at: '2026-11-01T04:00:00Z', reviewed_by: null, reviewed_at: null,
  screenshot: { id: 's1', name: 'pay.png', size: 10, type: 'image/png', state: 'ATTACHED' }, problem: 'PS-01', ...over,
});
const queue = (payments = [row()], counts = { PENDING: 1, VERIFIED: 0, REJECTED: 0 }) => ({ counts, fee_amount: 200, stage: 'REGISTRATION', payments });
const hackathon = (over: Record<string, unknown> = {}) => ({ slug: 'demo', payment_stage: 'REGISTRATION', idea_fee_amount: 200, idea_payment_note: '', payment_qr_id: null, ...over }) as any;

const show = (props: Record<string, unknown> = {}) => render(<PaymentsAdminTab hackathon={hackathon()} onSaved={vi.fn()} canEditSettings={false} {...props} />);

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  api.payments.mockResolvedValue(queue());
  api.paymentAction.mockResolvedValue({ payment: row({ status: 'VERIFIED' }) });
});
afterEach(() => cleanup());

describe('PaymentsAdminTab queue', () => {
  it('lists the payments waiting for a check with everything needed to decide', async () => {
    show();
    expect(await screen.findByText('Alpha')).toBeTruthy();
    expect(api.payments).toHaveBeenCalledWith('demo', { status: 'PENDING', search: undefined });
    expect(screen.getByText('₹200')).toBeTruthy();
    expect(screen.getByText('UPI-1')).toBeTruthy();
    expect(screen.getByText('Screenshot: pay.png')).toBeTruthy();
    expect(screen.getByRole('link', { name: /asha@x.io/ }).getAttribute('href')).toBe('mailto:asha@x.io');
    expect(screen.getByRole('tab', { name: /To check \(1\)/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('verifies after confirming', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Verify payment' }));
    await waitFor(() => expect(api.paymentAction).toHaveBeenCalledWith('demo', 1, 'verify', {}));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Alpha is registered'));
  });

  it('does nothing when the verification is cancelled', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));
    fireEvent.click(await screen.findByRole('button', { name: /Cancel/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Verify payment' })).toBeNull());
    expect(api.paymentAction).not.toHaveBeenCalled();
  });

  it('rejects with a reason that only organizers see', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    expect(screen.getByText(/The team leader is only told to contact the club representatives/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Why is it being rejected/), { target: { value: 'Amount does not match' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject payment' }));
    await waitFor(() => expect(api.paymentAction).toHaveBeenCalledWith('demo', 1, 'reject', { reason: 'Amount does not match' }));
    await waitFor(() => expect(screen.queryByLabelText(/Why is it being rejected/)).toBeNull());
  });

  it('shows who handled a payment already when another organizer got there first, and reloads', async () => {
    api.paymentAction.mockRejectedValueOnce(Object.assign(new Error('x'), { body: { detail: 'This payment was already verified by Vik Org.', code: 'PAYMENT_ALREADY_HANDLED' } }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Verify payment' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not complete that', 'This payment was already verified by Vik Org.'));
    await waitFor(() => expect(api.payments.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('shows the no-seats refusal as an error and keeps the team in the queue', async () => {
    api.paymentAction.mockRejectedValueOnce(Object.assign(new Error('x'), { body: { detail: 'No seats are left and the waitlist is off.', code: 'NO_SEATS' } }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Verify payment' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not complete that', 'No seats are left and the waitlist is off.'));
    expect(screen.getByText('Alpha')).toBeTruthy();
  });

  it('reopens a rejected payment and shows the reason to organizers', async () => {
    api.payments.mockResolvedValue(queue([row({ status: 'REJECTED', reason: 'Blurry', reviewed_by: 'Vik Org', reviewed_at: '2026-11-01T05:00:00Z', team_status: 'PAYMENT_REJECTED' })], { PENDING: 0, VERIFIED: 0, REJECTED: 1 }));
    show();
    expect(await screen.findByText(/Reason \(only organizers see this\): Blurry/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Reopen/ }));
    await waitFor(() => expect(api.paymentAction).toHaveBeenCalledWith('demo', 1, 'reopen', {}));
    expect(screen.queryByRole('button', { name: 'Verify' })).toBeNull();
  });

  it('removes a team only after confirming, and never offers it for a verified payment', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Remove team/ }));
    expect(await screen.findByText(/transaction ID can be used again/)).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove team' }));
    await waitFor(() => expect(api.paymentAction).toHaveBeenCalledWith('demo', 1, 'remove', {}));
    cleanup();
    api.payments.mockResolvedValue(queue([row({ status: 'VERIFIED', reviewed_by: 'Vik Org' })], { PENDING: 0, VERIFIED: 1, REJECTED: 0 }));
    show();
    await screen.findByText(/Verified by Vik Org/);
    expect(screen.queryByRole('button', { name: /Remove team/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull();
  });

  it('filters by state and searches, asking the server each time', async () => {
    show();
    await screen.findByText('Alpha');
    fireEvent.click(screen.getByRole('tab', { name: /Rejected/ }));
    await waitFor(() => expect(api.payments).toHaveBeenLastCalledWith('demo', { status: 'REJECTED', search: undefined }));
    fireEvent.click(screen.getByRole('tab', { name: /All/ }));
    fireEvent.change(screen.getByLabelText('Search payments'), { target: { value: ' upi-9 ' } });
    await waitFor(() => expect(api.payments).toHaveBeenLastCalledWith('demo', { status: undefined, search: 'upi-9' }));
  });

  it('ignores a slow answer for a tab the organizer has already left', async () => {
    show();
    await screen.findByText('Alpha');
    let release: (value: unknown) => void = () => undefined;
    api.payments.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    fireEvent.click(screen.getByRole('tab', { name: /Rejected/ }));
    api.payments.mockResolvedValueOnce(queue([row({ id: 2, team_name: 'Beta', status: 'VERIFIED' })], { PENDING: 0, VERIFIED: 1, REJECTED: 0 }));
    fireEvent.click(screen.getByRole('tab', { name: /All/ }));
    expect(await screen.findByText('Beta')).toBeTruthy();
    release(queue([row({ id: 3, team_name: 'Stale' })]));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText('Stale')).toBeNull();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('refreshes the tab the organizer is on when an action finishes, not the one it started from', async () => {
    api.payments.mockResolvedValue(queue([row({ status: 'REJECTED', team_status: 'PAYMENT_REJECTED', reviewed_by: 'Vik' })], { PENDING: 0, VERIFIED: 0, REJECTED: 1 }));
    show();
    fireEvent.click(await screen.findByRole('tab', { name: /Rejected/ }));
    let finish: (value: unknown) => void = () => undefined;
    api.paymentAction.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(await screen.findByRole('button', { name: /Reopen/ }));
    api.payments.mockResolvedValue(queue([row({ team_name: 'Alpha' })]));
    fireEvent.click(screen.getByRole('tab', { name: /To check/ }));
    await screen.findByRole('button', { name: 'Verify' });
    api.payments.mockClear();
    finish({ payment: row() });
    await waitFor(() => expect(api.payments).toHaveBeenCalledWith('demo', { status: 'PENDING', search: undefined }));
    expect(await screen.findByRole('button', { name: 'Verify' })).toBeTruthy();
  });

  it('says so when nothing is waiting', async () => {
    api.payments.mockResolvedValue(queue([], { PENDING: 0, VERIFIED: 2, REJECTED: 0 }));
    show();
    expect(await screen.findByText('Nothing is waiting for a check.')).toBeTruthy();
  });

  it('downloads every payment, including those of deleted teams, in the chosen format', async () => {
    api.exportFile.mockResolvedValue(undefined);
    show();
    await screen.findByText('Alpha');
    fireEvent.click(screen.getByRole('button', { name: 'Export payments' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Excel/ }));
    await waitFor(() => expect(api.exportFile).toHaveBeenCalledWith('demo', 'payments', 'xlsx'));
  });

  it('shows a load error with retry', async () => {
    api.payments.mockRejectedValueOnce(new Error('Server error'));
    show();
    expect(await screen.findByText(/Server error/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /Retry|Try again|Refresh/ })[0]);
    expect(await screen.findByText('Alpha')).toBeTruthy();
  });
});

describe('PaymentsAdminTab when no fee is paid at registration', () => {
  it('explains where to find idea payments and does not load the queue', () => {
    show({ hackathon: hackathon({ payment_stage: 'IDEA' }) });
    expect(screen.getByText(/checked in the Ideas tab/)).toBeTruthy();
    expect(api.payments).not.toHaveBeenCalled();
  });

  it('points to the setting when there is no fee', () => {
    show({ hackathon: hackathon({ payment_stage: 'NONE', idea_fee_amount: 0 }), canEditSettings: true });
    expect(screen.getByText(/No fee is collected/)).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Payment settings' })).toBeTruthy();
  });
});

describe('PaymentSettingsPanel', () => {
  const open = (over: Record<string, unknown> = {}) => {
    const onSaved = vi.fn();
    show({ hackathon: hackathon({ payment_stage: 'NONE', idea_fee_amount: 0, ...over }), canEditSettings: true, onSaved });
    return { onSaved, form: screen.getByRole('form', { name: 'Payment settings' }) };
  };

  it('is only shown to people who may change settings', () => {
    show();
    expect(screen.queryByRole('form', { name: 'Payment settings' })).toBeNull();
  });

  it('hides the amount, note and QR while there is no fee', () => {
    const { form } = open();
    expect(within(form).queryByLabelText(/Amount/)).toBeNull();
    expect(within(form).queryByText('Payment QR code')).toBeNull();
  });

  it('saves the stage, amount and note, and sends no amount for "no fee"', async () => {
    api.update.mockResolvedValue(hackathon());
    const { form, onSaved } = open();
    fireEvent.click(within(form).getByRole('button', { name: /When teams pay/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Paid when the team is created/ }));
    fireEvent.change(within(form).getByLabelText(/Amount/), { target: { value: '250' } });
    fireEvent.change(within(form).getByLabelText('How to pay'), { target: { value: 'UPI: club@upi' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save fee settings' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('demo', { payment_stage: 'REGISTRATION', idea_fee_amount: 250, idea_payment_note: 'UPI: club@upi' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('sends a fee of 0 when the stage is switched back to no fee', async () => {
    api.update.mockResolvedValue(hackathon());
    const { form } = open({ payment_stage: 'IDEA', idea_fee_amount: 300 });
    fireEvent.click(within(form).getByRole('button', { name: /When teams pay/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'No fee' }));
    fireEvent.click(within(form).getByRole('button', { name: 'Save fee settings' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('demo', expect.objectContaining({ payment_stage: 'NONE', idea_fee_amount: 0 })));
  });

  it('shows the server refusal for leaving registration while payments wait', async () => {
    api.update.mockRejectedValue(Object.assign(new Error('x'), { body: { payment_stage: ['2 teams are waiting for a payment check.'] } }));
    const { form } = open({ payment_stage: 'REGISTRATION', idea_fee_amount: 200 });
    fireEvent.click(within(form).getByRole('button', { name: 'Save fee settings' }));
    expect(await screen.findByText('2 teams are waiting for a payment check.')).toBeTruthy();
  });

  it('shows the uploaded QR code and can remove it', async () => {
    api.ideaQrRemove.mockResolvedValue(undefined);
    const { form } = open({ payment_stage: 'REGISTRATION', idea_fee_amount: 200, payment_qr_id: 'qr-1' });
    expect(within(form).getByTestId('qr')).toBeTruthy();
    fireEvent.click(within(form).getByRole('button', { name: 'Remove the QR code' }));
    await waitFor(() => expect(api.ideaQrRemove).toHaveBeenCalledWith('demo'));
    await waitFor(() => expect(within(form).queryByTestId('qr')).toBeNull());
  });
});
