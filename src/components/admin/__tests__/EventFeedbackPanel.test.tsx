import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const summary = vi.fn();
vi.mock('@/lib/api/events', () => ({ eventFeedbackApi: { summary: (...a: unknown[]) => summary(...a), exportFile: vi.fn() } }));
vi.mock('@/lib/api/hackathons', () => ({ apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

import { EventFeedbackPanel } from '../EventFeedbackPanel';

const data = (over: Record<string, unknown> = {}) => ({
  count: 2, average_rating: 4, recommend_rate: 0.5, distribution: { '1': 0, '2': 0, '3': 1, '4': 0, '5': 1 },
  attendees: 4, response_rate: 0.5, ended: true,
  comments: [{ id: 1, name: 'Asha Rao', rating: 5, would_recommend: true, went_well: 'Hands-on', to_improve: '', created_at: '2026-11-01T10:00:00Z' }],
  ...over,
});

beforeEach(() => { summary.mockReset(); summary.mockResolvedValue(undefined); });
afterEach(cleanup);

describe('EventFeedbackPanel', () => {
  it('shows the score, the recommend and response rates and the written answers', async () => {
    summary.mockResolvedValue(data());
    render(<EventFeedbackPanel event={{ slug: 'demo', title: 'Demo' }} onClose={() => {}} />);
    expect(await screen.findByText('4.0 / 5')).toBeTruthy();
    expect(screen.getAllByText('50%')).toHaveLength(2);
    expect(screen.getByText('2 of 4 checked in')).toBeTruthy();
    expect(screen.getByText('Asha Rao · 5/5')).toBeTruthy();
    expect(summary).toHaveBeenCalledWith('demo');
  });

  it('warns that attendees cannot answer before the event has ended', async () => {
    summary.mockResolvedValue(data({ ended: false, count: 0, average_rating: null, recommend_rate: null, response_rate: null, comments: [] }));
    render(<EventFeedbackPanel event={{ slug: 'demo', title: 'Demo' }} onClose={() => {}} />);
    expect(await screen.findByText(/has not ended yet/)).toBeTruthy();
    expect(screen.getByText('Nobody has written anything yet.')).toBeTruthy();
  });

  it('loads nothing while closed', () => {
    render(<EventFeedbackPanel event={null} onClose={() => {}} />);
    expect(summary).not.toHaveBeenCalled();
  });

  it('shows the server message when the feedback cannot be loaded', async () => {
    summary.mockImplementation(() => Promise.reject(new Error('You do not have permission.')));
    render(<EventFeedbackPanel event={{ slug: 'demo', title: 'Demo' }} onClose={() => {}} />);
    expect((await screen.findByRole('alert')).textContent).toBe('You do not have permission.');
  });
});
