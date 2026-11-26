import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { admin, toast } = vi.hoisted(() => ({
  admin: { paymentSteps: vi.fn(), rounds: vi.fn(), paymentStepQueue: vi.fn(), verifyStepPayment: vi.fn(), rejectStepPayment: vi.fn(), remindPaymentStep: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { admin, exportFile: vi.fn(), stepPaymentScreenshotLink: vi.fn(), paymentStepQrLink: vi.fn() },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { PaymentStepsPanel } from '../PaymentStepsPanel';

const counts = { due: 2, unpaid: 1, pending: 1, verified: 0, rejected: 0 };
const stepInfo = {
  id: 3, name: 'Phase 2 fee', round: 7, round_name: 'Idea round', round_published: true, fee_per_person: 200, affiliate_fee_per_person: 100,
  deadline: null, payment_note: '', required_for_projects: true, is_active: true, order: 1, qr: null, counts,
};
const quote = { members: [{ user_id: 1, name: 'Asha', affiliate: true, fee: 100 }, { user_id: 2, name: 'Meena', affiliate: false, fee: 200 }], total: 300 };
const queue = {
  step: stepInfo,
  rows: [
    {
      team_id: 1, team_name: 'Alpha', leader_name: 'Asha', leader_email: 'a@x.io', leader_phone: '', quote, due: false,
      payment: {
        id: 9, status: 'PENDING', amount: 300, breakdown: quote.members, transaction_id: 'UPI-1', reason: '', submitted_at: '', reviewed_at: null,
        screenshot: null, reviewed_by: null, duplicate_reference: true,
      },
    },
    { team_id: 2, team_name: 'Beta', leader_name: 'Ravi', leader_email: '', leader_phone: '', quote, due: true, payment: null },
  ],
};

beforeEach(() => {
  Object.values(admin).forEach((fn) => fn.mockReset());
  admin.paymentSteps.mockResolvedValue([stepInfo]);
  admin.rounds.mockResolvedValue([]);
  admin.paymentStepQueue.mockResolvedValue(queue);
});
afterEach(() => cleanup());

describe('PaymentStepsPanel', () => {
  it('lists the teams that have to pay with what they owe and flags a reused reference', async () => {
    render(<PaymentStepsPanel slug="demo" canEdit={false} />);
    expect(await screen.findByText('Alpha')).toBeTruthy();
    expect(screen.getAllByText(/2 members, 1 affiliate · owes ₹300/)).toHaveLength(2);
    expect(screen.getByText('also used on another payment')).toBeTruthy();
    expect(screen.getByText('Not paid')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add payment step/ })).toBeNull();
  });

  it('marks a waiting payment from a team that no longer owes the step', async () => {
    render(<PaymentStepsPanel slug="demo" canEdit={false} />);
    expect(await screen.findByText(/No longer owes this step/)).toBeTruthy();
  });

  it('reloads the list when a decision fails, e.g. another organizer decided first', async () => {
    admin.verifyStepPayment.mockRejectedValue(new Error('This payment was already verified.'));
    render(<PaymentStepsPanel slug="demo" canEdit />);
    fireEvent.click(await screen.findByRole('button', { name: /Verify/ }));
    await waitFor(() => expect(admin.paymentStepQueue).toHaveBeenCalledTimes(2));
  });

  it('offers a retry when the payments cannot be loaded', async () => {
    admin.paymentStepQueue.mockRejectedValueOnce(new Error('Network down')).mockResolvedValue(queue);
    render(<PaymentStepsPanel slug="demo" canEdit={false} />);
    fireEvent.click(await screen.findByRole('button', { name: /Try again|Retry/ }));
    expect(await screen.findByText('Alpha')).toBeTruthy();
  });

  it('verifies a payment', async () => {
    admin.verifyStepPayment.mockResolvedValue(queue);
    render(<PaymentStepsPanel slug="demo" canEdit />);
    fireEvent.click(await screen.findByRole('button', { name: /Verify/ }));
    await waitFor(() => expect(admin.verifyStepPayment).toHaveBeenCalledWith('demo', 9));
  });

  it('needs a reason to reject', async () => {
    admin.rejectStepPayment.mockResolvedValue(queue);
    render(<PaymentStepsPanel slug="demo" canEdit />);
    fireEvent.click(await screen.findByRole('button', { name: /^Reject$/ }));
    const reject = screen.getByRole('button', { name: 'Reject payment' }) as HTMLButtonElement;
    expect(reject.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Why is it being rejected/), { target: { value: 'Blurry' } });
    fireEvent.click(reject);
    await waitFor(() => expect(admin.rejectStepPayment).toHaveBeenCalledWith('demo', 9, 'Blurry'));
  });
});
