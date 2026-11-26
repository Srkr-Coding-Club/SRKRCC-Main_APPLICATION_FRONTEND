import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { round } from './roundJudgingFixtures';

const { api, toast } = vi.hoisted(() => ({
  api: { rounds: vi.fn(), linkIdeaRound: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { admin: { rounds: (...a: unknown[]) => api.rounds(...a), linkIdeaRound: (...a: unknown[]) => api.linkIdeaRound(...a) } },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
// The picker is a custom listbox; a native select stands in so the test can choose a round.
vi.mock('@/components/ui/FormSelect', () => ({
  FormSelect: ({ value, onChange, options, placeholder }: any) => (
    <select aria-label="Idea reviews decide" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

import { IdeaRoundLinkPanel, isCancelled, suggestedIdeaRound, withRoundConfirmations } from '../IdeaRoundLinkPanel';

const ideaRound = round({ id: 7, order: 1, name: 'Idea round', kind: 'IDEA_REVIEW' });
const finals = round({ id: 8, order: 2, name: 'Finals', kind: 'FINAL' });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  api.rounds.mockResolvedValue([finals, ideaRound]);
});
afterEach(() => cleanup());

describe('IdeaRoundLinkPanel', () => {
  it('suggests the first idea review round', () => {
    expect(suggestedIdeaRound([finals, ideaRound])?.id).toBe(7);
    expect(suggestedIdeaRound([finals])).toBeUndefined();
  });

  it('previews what linking copies, asks, then links', async () => {
    api.linkIdeaRound.mockResolvedValueOnce({ round: 7, shortlisted: 4, rejected: 2, published: false }).mockResolvedValueOnce({ round: 7, shortlisted: 4, rejected: 2, published: false });
    const confirm = vi.fn().mockResolvedValue(true);
    const onLinked = vi.fn();
    render(<IdeaRoundLinkPanel hackathon={{ slug: 'demo', idea_round: null } as any} confirm={confirm} onLinked={onLinked} />);
    expect(await screen.findByText(/Not linked: reviews reach the team at once/)).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Idea round (suggested)' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Idea reviews decide'), { target: { value: '7' } });
    await waitFor(() => expect(onLinked).toHaveBeenCalled());
    expect(api.linkIdeaRound).toHaveBeenNthCalledWith(1, 'demo', { round: 7, preview: true });
    expect(api.linkIdeaRound).toHaveBeenNthCalledWith(2, 'demo', { round: 7 });
    expect(confirm.mock.calls[0][0].title).toBe('Link Idea round to idea review?');
  });

  it('links nothing when the organizer cancels', async () => {
    api.linkIdeaRound.mockResolvedValue({ round: 7, shortlisted: 0, rejected: 0, published: false });
    const onLinked = vi.fn();
    render(<IdeaRoundLinkPanel hackathon={{ slug: 'demo', idea_round: null } as any} confirm={vi.fn().mockResolvedValue(false)} onLinked={onLinked} />);
    await screen.findByText(/Not linked: reviews reach/);
    fireEvent.change(screen.getByLabelText('Idea reviews decide'), { target: { value: '7' } });
    await waitFor(() => expect(api.linkIdeaRound).toHaveBeenCalledTimes(1));
    expect(onLinked).not.toHaveBeenCalled();
  });

  it('says the Rounds permission is missing instead of asking to create a round', async () => {
    api.rounds.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
    render(<IdeaRoundLinkPanel hackathon={{ slug: 'demo', idea_round: null } as any} confirm={vi.fn()} onLinked={vi.fn()} />);
    expect(await screen.findByText('Linking a round needs the Rounds & Shortlisting permission as well.')).toBeTruthy();
  });

  it('describes a linked round that is not published yet', async () => {
    render(<IdeaRoundLinkPanel hackathon={{ slug: 'demo', idea_round: 7 } as any} confirm={vi.fn()} onLinked={vi.fn()} />);
    expect(await screen.findByText(/Teams see approvals and rejections when it is published/)).toBeTruthy();
  });
});

describe('withRoundConfirmations', () => {
  const refusal = (body: Record<string, unknown>) => Object.assign(new Error('409'), { body });

  it('asks for each confirmation the server needs and repeats the call with it', async () => {
    const call = vi.fn()
      .mockRejectedValueOnce(refusal({ code: 'RESULTS_PUBLISHED' }))
      .mockRejectedValueOnce(refusal({ code: 'SHORTLIST_LIMIT', limit: 5, would_be: 6 }))
      .mockResolvedValueOnce('done');
    const confirm = vi.fn().mockResolvedValue(true);
    await expect(withRoundConfirmations(call, confirm, 'Idea round')).resolves.toBe('done');
    expect(call).toHaveBeenLastCalledWith({ confirm_published: true, confirm_over_limit: true });
    expect(confirm.mock.calls[1][0].message).toBe('Idea round is meant to take 5 teams and this would make it 6.');
  });

  it('stops when the organizer says no, and passes other errors on', async () => {
    const cancelled = await withRoundConfirmations(vi.fn().mockRejectedValue(refusal({ code: 'RESULTS_PUBLISHED' })), vi.fn().mockResolvedValue(false), 'R')
      .catch((err) => err);
    expect(isCancelled(cancelled)).toBe(true);  // callers skip the error toast for it
    expect(isCancelled(new Error('boom'))).toBe(false);
    await expect(withRoundConfirmations(vi.fn().mockRejectedValue(new Error('boom')), vi.fn(), 'R')).rejects.toThrow('boom');
  });
});
