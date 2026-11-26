import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: { myPaymentSteps: vi.fn(), payStep: vi.fn(), paymentStepQrLink: vi.fn() } }));
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (api as any)[name](...args) }),
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
// The upload field is tested on its own; here it hands back an uploaded screenshot when clicked.
vi.mock('@/components/forms/FileUploadField', () => ({
  default: ({ onChange, inputId }: any) => (
    <button type="button" id={inputId} onClick={() => onChange({ upload_id: 'file-1', name: 'paid.png', size: 10, type: 'image/png' })}>pick screenshot</button>
  ),
}));

import { StepPayments } from '../StepPayments';

const members = [
  { user_id: 1, name: 'Asha', affiliate: true, fee: 100 },
  { user_id: 2, name: 'Meena', affiliate: false, fee: 200 },
];
const step = (over: Record<string, unknown> = {}) => ({
  id: 3, name: 'Phase 2 fee', round_name: 'Idea round', deadline: null, payment_note: 'UPI: club@upi', has_qr: false, required_for_projects: true,
  fee_per_person: 200, affiliate_fee_per_person: 100, quote: { members, total: 300 }, payment: null, is_leader: true, can_pay: true, ...over,
});
const paid = (over: Record<string, unknown> = {}) => ({
  id: 9, status: 'PENDING', amount: 300, breakdown: members, transaction_id: 'UPI-1', reason: '', submitted_at: '2026-11-26T10:00:00Z', reviewed_at: null, ...over,
});

beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()));
afterEach(() => cleanup());

describe('StepPayments', () => {
  it('shows nothing when the team owes nothing', async () => {
    api.myPaymentSteps.mockResolvedValue([]);
    const { container } = render(<StepPayments hackathon={{ slug: 'demo' } as any} />);
    await waitFor(() => expect(api.myPaymentSteps).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('shows each member fee and the total, and lets the leader pay', async () => {
    api.myPaymentSteps.mockResolvedValue([step()]);
    api.payStep.mockResolvedValue([step({ can_pay: false, payment: paid() })]);
    render(<StepPayments hackathon={{ slug: 'demo' } as any} />);
    expect(await screen.findByText('Asha')).toBeTruthy();
    expect(screen.getByText('club affiliate')).toBeTruthy();
    expect(screen.getByText('₹300')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Submit payment of ₹300/ }));
    expect(await screen.findByText('Add the screenshot of your payment.')).toBeTruthy();
    fireEvent.click(screen.getByText('pick screenshot'));
    fireEvent.change(screen.getByLabelText(/Transaction ID/), { target: { value: ' UPI-1 ' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit payment of ₹300/ }));
    await waitFor(() => expect(api.payStep).toHaveBeenCalledWith('demo', 3, { transaction_id: 'UPI-1', payment_file_id: 'file-1' }));
    expect(await screen.findByText('Waiting for the organizers')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Submit payment/ })).toBeNull();
  });

  it('shows the reason after a rejection and lets the leader pay again', async () => {
    api.myPaymentSteps.mockResolvedValue([step({ payment: paid({ status: 'REJECTED', reason: 'Amount does not match.' }) })]);
    render(<StepPayments hackathon={{ slug: 'demo' } as any} />);
    expect(await screen.findByText(/Amount does not match\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Submit payment/ })).toBeTruthy();
  });

  it('tells the other members that the leader pays', async () => {
    api.myPaymentSteps.mockResolvedValue([step({ is_leader: false, can_pay: false })]);
    render(<StepPayments hackathon={{ slug: 'demo' } as any} />);
    expect(await screen.findByText('Only your team leader can pay this.')).toBeTruthy();
  });
});
