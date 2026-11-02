import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mine = vi.fn();
const save = vi.fn();
vi.mock('@/lib/api/events', () => ({ eventFeedbackApi: { mine: (...a: unknown[]) => mine(...a), save: (...a: unknown[]) => save(...a) } }));
vi.mock('@/lib/api/hackathons', () => ({ apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { EventFeedbackForm } from '../EventFeedbackForm';

const open = (over: Record<string, unknown> = {}) => ({ eligible: true, reason: null, feedback: null, ...over });
const answer = { rating: 4, would_recommend: false, went_well: 'Clear', to_improve: '' };

beforeEach(() => { mine.mockReset(); save.mockReset(); toast.success.mockReset(); });
afterEach(cleanup);

describe('EventFeedbackForm', () => {
  it('explains why feedback is closed instead of showing the form', async () => {
    mine.mockResolvedValue(open({ eligible: false, reason: 'EVENT_NOT_ENDED' }));
    render(<EventFeedbackForm slug="demo" />);
    expect(await screen.findByText('Feedback opens once the event has ended.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send feedback' })).toBeNull();
  });

  it('tells someone who was not checked in that feedback is for attendees', async () => {
    mine.mockResolvedValue(open({ eligible: false, reason: 'NOT_ATTENDED' }));
    render(<EventFeedbackForm slug="demo" />);
    expect(await screen.findByText(/checked in at the event/)).toBeTruthy();
  });

  it('asks for a rating before sending anything', async () => {
    mine.mockResolvedValue(open());
    render(<EventFeedbackForm slug="demo" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Send feedback' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Choose a rating');
    expect(save).not.toHaveBeenCalled();
  });

  it('sends the rating, the recommendation and the comments, then shows the thank-you state', async () => {
    mine.mockResolvedValue(open());
    save.mockResolvedValue({ rating: 5, would_recommend: true, went_well: 'Great talk', to_improve: '' });
    const onSaved = vi.fn();
    render(<EventFeedbackForm slug="demo" onSaved={onSaved} />);
    fireEvent.click(await screen.findByLabelText('5 out of 5, Excellent'));
    fireEvent.change(screen.getByLabelText(/What went well/), { target: { value: 'Great talk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('demo', { rating: 5, would_recommend: true, went_well: 'Great talk', to_improve: '' }));
    expect(await screen.findByText(/You rated this event 5 out of 5/)).toBeTruthy();
    expect(onSaved).toHaveBeenCalled();
  });

  it('shows an earlier answer first and lets the person change it', async () => {
    mine.mockResolvedValue(open({ feedback: answer }));
    render(<EventFeedbackForm slug="demo" />);
    expect(await screen.findByText(/You rated this event 4 out of 5/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Change my answer' }));
    expect((screen.getByLabelText(/What went well/) as HTMLTextAreaElement).value).toBe('Clear');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('keeps the form and shows the server message when saving fails', async () => {
    mine.mockResolvedValue(open());
    save.mockRejectedValue(new Error('Feedback opens once the event has ended.'));
    render(<EventFeedbackForm slug="demo" />);
    fireEvent.click(await screen.findByLabelText('3 out of 5, Good'));
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Feedback opens once the event has ended.');
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeTruthy();
  });
});
