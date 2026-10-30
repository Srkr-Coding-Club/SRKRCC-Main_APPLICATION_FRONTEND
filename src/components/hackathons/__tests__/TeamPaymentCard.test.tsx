import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TeamPaymentCard } from '../TeamPaymentCard';

const hackathon = (over: Record<string, unknown> = {}) => ({
  title: 'HackOverflow',
  contacts: [{ name: 'Ravi', role: 'Club lead', email: 'ravi@club.org', phone: '+91 90000 00000' }, { name: '', role: '', email: '', phone: '' }],
  ...over,
}) as any;
const team = (status: string) => ({ id: 3, name: 'Alpha', status }) as any;
const payment = { id: 1, status: 'PENDING', amount: 200, transaction_id: 'UPI-123', submitted_at: '2026-11-01T04:00:00Z', reviewed_at: null } as any;

afterEach(() => cleanup());

const show = (status: string, over: Record<string, unknown> = {}) => {
  const onCancel = vi.fn();
  render(<TeamPaymentCard hackathon={hackathon()} team={team(status)} payment={payment} isLeader busy={false} onCancel={onCancel} {...over} />);
  return { onCancel };
};

describe('TeamPaymentCard', () => {
  it('tells a leader the payment is waiting and that no place is held yet', () => {
    show('PAYMENT_PENDING');
    expect(screen.getByText('Waiting for the organizers')).toBeTruthy();
    expect(screen.getByText(/does not hold a place until the payment is verified/)).toBeTruthy();
    expect(screen.getByText('₹200')).toBeTruthy();
    expect(screen.getByText('UPI-123')).toBeTruthy();
    expect(screen.getByText(/1 Nov 2026/)).toBeTruthy();
  });

  it('lets only the leader cancel a pending team', () => {
    const { onCancel } = show('PAYMENT_PENDING');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and start again' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    cleanup();
    show('PAYMENT_PENDING', { isLeader: false });
    expect(screen.queryByRole('button', { name: 'Cancel and start again' })).toBeNull();
  });

  it('disables cancelling while something else is running', () => {
    show('PAYMENT_PENDING', { busy: true });
    expect((screen.getByRole('button', { name: 'Cancel and start again' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends a rejected payment to the club representatives, with their contacts, and never mentions a refund', () => {
    show('PAYMENT_REJECTED');
    expect(screen.getByText('Your payment could not be verified. Please contact the club representatives.')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Club representatives' }).textContent).toContain('Ravi');
    expect(screen.getByRole('link', { name: /ravi@club.org/ }).getAttribute('href')).toBe('mailto:ravi@club.org');
    expect(screen.getByRole('link', { name: /90000 00000/ }).getAttribute('href')).toBe('tel:+91 90000 00000');
    expect(document.body.textContent?.toLowerCase()).not.toContain('refund');
    expect(screen.queryByRole('button', { name: 'Cancel and start again' })).toBeNull();
  });

  it('skips the blank contact rows and falls back when there are none', () => {
    show('PAYMENT_REJECTED');
    expect(screen.getByRole('list', { name: 'Club representatives' }).querySelectorAll('li')).toHaveLength(1);
    cleanup();
    show('PAYMENT_REJECTED', { hackathon: hackathon({ contacts: [] }) });
    expect(screen.getByText('Ask the organizers of HackOverflow.')).toBeTruthy();
  });

  it('still renders when the payment details are not there', () => {
    show('PAYMENT_PENDING', { payment: null });
    expect(screen.queryByText('Transaction ID')).toBeNull();
    expect(screen.getByText('Waiting for the organizers')).toBeTruthy();
  });
});
