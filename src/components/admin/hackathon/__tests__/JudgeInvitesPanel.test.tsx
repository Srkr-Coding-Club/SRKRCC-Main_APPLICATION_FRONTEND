import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { judgeInvites: vi.fn(), inviteJudge: vi.fn(), inviteJudges: vi.fn(), resendJudgeInvite: vi.fn(), revokeJudgeInvite: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { admin: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (api as any)[name](...args) }) },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { JudgeInvitesPanel, parseJudgeLines } from '../JudgeInvitesPanel';

const invite = (over: Record<string, unknown> = {}) => ({
  id: 1, user_id: 7, email: 'asha@x.org', name: 'Asha Rao', state: 'INVITED', account_created: true, last_sent_at: '2026-11-05T08:00:00Z',
  resend_count: 0, link_expires_at: null, accepted_at: null, invited_at: '2026-11-05T08:00:00Z', ...over,
});

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  api.judgeInvites.mockResolvedValue([]);
});
afterEach(() => cleanup());

describe('parseJudgeLines', () => {
  it('reads names and emails in the shapes people paste', () => {
    expect(parseJudgeLines('Asha Rao, asha@x.org\nBen Roy <ben@y.com>\n  \ncara@z.in;\n"Dev Nair" dev@w.io')).toEqual([
      { name: 'Asha Rao', email: 'asha@x.org' }, { name: 'Ben Roy', email: 'ben@y.com' }, { name: 'cara', email: 'cara@z.in' }, { name: 'Dev Nair', email: 'dev@w.io' },
    ]);
  });

  it('keeps a line with no address so the server can say what is wrong with it', () => {
    expect(parseJudgeLines('Just A Name')).toEqual([{ name: 'Just A Name', email: '' }]);
  });
});

describe('JudgeInvitesPanel', () => {
  it('invites one person with a name and an email', async () => {
    api.inviteJudge.mockResolvedValue(invite({ email_sent: true }));
    const onChanged = vi.fn();
    render(<JudgeInvitesPanel slug="demo" onChanged={onChanged} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' Asha Rao ' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'asha@x.org' } });
    fireEvent.click(screen.getByRole('button', { name: /Send invitation/ }));
    await waitFor(() => expect(api.inviteJudge).toHaveBeenCalledWith('demo', { name: 'Asha Rao', email: 'asha@x.org' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Asha Rao invited', 'They got a link to choose their password.');
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('');
  });

  it('says so when someone already had an account', async () => {
    api.inviteJudge.mockResolvedValue(invite({ state: 'ACTIVE', email_sent: true }));
    render(<JudgeInvitesPanel slug="demo" />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Asha' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'asha@x.org' } });
    fireEvent.click(screen.getByRole('button', { name: /Send invitation/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Asha Rao invited', 'They already had an account and can sign in.'));
  });

  it('warns when the invitation was saved but the email did not go out', async () => {
    api.inviteJudge.mockResolvedValue(invite({ email_sent: false }));
    render(<JudgeInvitesPanel slug="demo" />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Asha' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'asha@x.org' } });
    fireEvent.click(screen.getByRole('button', { name: /Send invitation/ }));
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith('Invited, but the email did not go out', 'Use Resend to try again.'));
  });

  it('shows the reason when the server refuses, such as a participant', async () => {
    api.inviteJudge.mockRejectedValue(new Error('That person is a participant, so they cannot judge this hackathon.'));
    render(<JudgeInvitesPanel slug="demo" />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Lena' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lena@x.org' } });
    fireEvent.click(screen.getByRole('button', { name: /Send invitation/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('is a participant');
  });

  it('invites several at once and keeps only the failed lines for another try', async () => {
    api.inviteJudges.mockResolvedValue({ results: [
      { ok: true, ...invite() }, { ok: false, email: 'nope', code: 'INVALID', detail: 'Give a valid email address.' },
    ] });
    render(<JudgeInvitesPanel slug="demo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Invite several at once' }));
    fireEvent.change(screen.getByLabelText('One judge per line'), { target: { value: 'Asha Rao, asha@x.org\nnope' } });
    fireEvent.click(screen.getByRole('button', { name: /Send invitation/ }));
    await waitFor(() => expect(api.inviteJudges).toHaveBeenCalledWith('demo', [{ name: 'Asha Rao', email: 'asha@x.org' }, { name: 'nope', email: '' }]));
    expect((await screen.findByRole('alert')).textContent).toContain('Give a valid email address.');
    expect(toast.success).toHaveBeenCalledWith('1 judge invited');
    expect((screen.getByLabelText('One judge per line') as HTMLTextAreaElement).value).toBe('nope');
  });

  it('lists every invitation with its state', async () => {
    api.judgeInvites.mockResolvedValue([invite(), invite({ id: 2, email: 'ben@y.com', name: 'Ben Roy', state: 'ACTIVE' }), invite({ id: 3, email: 'c@z.in', name: 'Cara', state: 'EXPIRED' }), invite({ id: 4, email: 'd@w.io', name: 'Dev', state: 'REVOKED' })]);
    render(<JudgeInvitesPanel slug="demo" />);
    const list = await screen.findByRole('list', { name: 'Invitations' });
    expect(within(list).getByText('Waiting for them')).toBeTruthy();
    expect(within(list).getByText('Ready')).toBeTruthy();
    expect(within(list).getByText('Link expired')).toBeTruthy();
    expect(within(list).getByText('Revoked')).toBeTruthy();
    expect(within(list).getAllByRole('button', { name: /^Resend/ })).toHaveLength(2);
    expect(within(list).getAllByRole('button', { name: /^Revoke/ })).toHaveLength(3);
  });

  it('resends a link', async () => {
    api.judgeInvites.mockResolvedValue([invite()]);
    api.resendJudgeInvite.mockResolvedValue(invite({ email_sent: true }));
    render(<JudgeInvitesPanel slug="demo" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Resend the link to asha@x.org' }));
    await waitFor(() => expect(api.resendJudgeInvite).toHaveBeenCalledWith('demo', 1));
    expect(toast.success).toHaveBeenCalledWith('Sent a new link to asha@x.org');
  });

  it('revokes only after a confirmation', async () => {
    api.judgeInvites.mockResolvedValue([invite()]);
    api.revokeJudgeInvite.mockResolvedValue(invite({ state: 'REVOKED' }));
    const onChanged = vi.fn();
    render(<JudgeInvitesPanel slug="demo" onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke asha@x.org' }));
    expect(api.revokeJudgeInvite).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(api.revokeJudgeInvite).toHaveBeenCalledWith('demo', 1));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });
});
