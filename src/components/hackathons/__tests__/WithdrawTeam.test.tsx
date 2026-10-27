import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WithdrawTeamModal } from '../WithdrawTeamModal';
import { WithdrawalNotice } from '../WithdrawalNotice';

afterEach(() => cleanup());

const setup = (props: Record<string, unknown> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<WithdrawTeamModal isOpen onClose={onClose} onSubmit={onSubmit} needsApproval={false} {...props} />);
  return { onSubmit, onClose };
};

describe('WithdrawTeamModal', () => {
  it('will not send an empty or blank reason and says why', async () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw team' }));
    expect(await screen.findByText('Tell the organizers why you are withdrawing.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Why are you withdrawing/), { target: { value: '    ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw team' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Why are you withdrawing/).getAttribute('aria-invalid')).toBe('true');
  });

  it('sends the trimmed reason', async () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText(/Why are you withdrawing/), { target: { value: '  We found no teammates  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw team' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('We found no teammates'));
  });

  it('shows the server message and stays open when the request fails', async () => {
    const { onClose } = setup({ onSubmit: vi.fn().mockRejectedValue(new Error('The team can no longer be changed.')) });
    fireEvent.change(screen.getByLabelText(/Why are you withdrawing/), { target: { value: 'Plans changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw team' }));
    expect(await screen.findByText('The team can no longer be changed.')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Withdraw team' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('explains approval, and offers to "ask" instead of "withdraw", for a team that holds a place', () => {
    setup({ needsApproval: true });
    expect(screen.getByText(/organizers have to approve this/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ask to withdraw' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Withdraw team' })).toBeNull();
  });

  it('says what withdrawing costs when the limit is known, and keeps the team on Keep', () => {
    const { onClose } = setup({ maxTeams: 2 });
    expect(screen.getByText(/Each person can create 2 teams/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep my team' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('counts the characters and caps the reason at 300', () => {
    setup();
    const box = screen.getByLabelText(/Why are you withdrawing/) as HTMLTextAreaElement;
    expect(box.maxLength).toBe(300);
    fireEvent.change(box, { target: { value: 'abc' } });
    expect(screen.getByText('3/300')).toBeTruthy();
  });

  it('starts empty every time it opens', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<WithdrawTeamModal isOpen onClose={vi.fn()} onSubmit={onSubmit} needsApproval={false} />);
    fireEvent.change(screen.getByLabelText(/Why are you withdrawing/), { target: { value: 'old text' } });
    rerender(<WithdrawTeamModal isOpen={false} onClose={vi.fn()} onSubmit={onSubmit} needsApproval={false} />);
    rerender(<WithdrawTeamModal isOpen onClose={vi.fn()} onSubmit={onSubmit} needsApproval={false} />);
    expect((screen.getByLabelText(/Why are you withdrawing/) as HTMLTextAreaElement).value).toBe('');
  });
});

const request = (over: Record<string, unknown> = {}) => ({ id: 1, status: 'PENDING', reason: 'Our laptop broke', created_at: '2026-11-01T04:00:00Z', decision_note: '', decided_at: null, ...over }) as any;

describe('WithdrawalNotice', () => {
  it('tells the leader the request is waiting and lets them take it back', () => {
    const onCancel = vi.fn();
    render(<WithdrawalNotice request={request()} canCancel busy={false} onCancel={onCancel} />);
    expect(screen.getByText(/waiting for the organizers/)).toBeTruthy();
    expect(screen.getByText(/Our laptop broke/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not offer cancelling to a teammate, and disables it while cancelling', () => {
    const { rerender } = render(<WithdrawalNotice request={request()} canCancel={false} busy={false} onCancel={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Cancel/ })).toBeNull();
    rerender(<WithdrawalNotice request={request()} canCancel busy onCancel={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Cancelling…' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the organizers note when the request was denied, with a fallback when there is none', () => {
    const { rerender } = render(<WithdrawalNotice request={request({ status: 'DENIED', decision_note: 'Please stay, we have a spot' })} canCancel busy={false} onCancel={vi.fn()} />);
    expect(screen.getByText('The organizers kept your team')).toBeTruthy();
    expect(screen.getByText('Please stay, we have a spot')).toBeTruthy();
    rerender(<WithdrawalNotice request={request({ status: 'DENIED', decision_note: '' })} canCancel busy={false} onCancel={vi.fn()} />);
    expect(screen.getByText('Your withdrawal request was denied.')).toBeTruthy();
  });

  it('shows nothing for an approved request (the team is gone by then)', () => {
    const { container } = render(<WithdrawalNotice request={request({ status: 'APPROVED' })} canCancel busy={false} onCancel={vi.fn()} />);
    expect(container.textContent).toBe('');
  });
});
