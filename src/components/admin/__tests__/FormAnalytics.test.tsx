import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

import { FormAnalyticsModal } from '../FormAnalyticsModal';
import { barWidth, percent, type FormAnalytics } from '@/lib/formAnalytics';

afterEach(cleanup);

describe('FormAnalyticsModal', () => {
  const analytics = (days: number): FormAnalytics => ({
    form: { id: 1, slug: 'demo', title: 'Demo' },
    total_responses: 8, responses_analysed: 8, truncated: false, first_response_at: null, last_response_at: null, days,
    timeline: Array.from({ length: days }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, count: i === 0 ? 3 : 0 })),
    unfinished: { count: 4, stopped_after: [{ field_id: 10, label: 'Name', count: 3 }, { field_id: null, label: 'Before answering anything', count: 1 }] },
    fields: [
      { field_id: 10, label: 'Track', type: 'RADIO', answered: 8, answer_rate: 1, options: [{ option: 'AI', count: 6 }, { option: 'Web', count: 2 }], other_count: 1 },
      { field_id: 11, label: 'Score', type: 'NUMBER', answered: 4, answer_rate: 0.5, numeric: { min: 1, max: 9, average: 5.5 } },
    ],
  });

  beforeEach(() => {
    fetchApi.mockReset();
    fetchApi.mockImplementation((url: string) => {
      const days = Number(new URL(`http://x${url}`).searchParams.get('days'));
      return Promise.resolve(analytics(days));
    });
  });

  it('shows totals, where people stop and each question', async () => {
    render(<FormAnalyticsModal slug="demo" isOpen onClose={() => {}} />);
    expect((await screen.findByTestId('total-responses')).textContent).toBe('8');
    expect(screen.getByText(/4 started but not finished/)).toBeTruthy();
    expect(screen.getByText('After "Name"')).toBeTruthy();
    expect(screen.getByText('Before answering anything')).toBeTruthy();
    expect(screen.getByText('8 answered (100%)')).toBeTruthy();
    expect(screen.getByText('AI')).toBeTruthy();
    expect(screen.getByText('Other / older options')).toBeTruthy();
    expect(screen.getByText(/Lowest 1 · average 5.5 · highest 9/)).toBeTruthy();
    expect(fetchApi).toHaveBeenCalledWith('/forms/demo/analytics/?days=30');
  });

  it('asks again for another period', async () => {
    render(<FormAnalyticsModal slug="demo" isOpen onClose={() => {}} />);
    await screen.findByTestId('total-responses');
    fireEvent.click(screen.getByText('7 days'));
    await waitFor(() => expect(fetchApi).toHaveBeenCalledWith('/forms/demo/analytics/?days=7'));
    expect(screen.getByLabelText('Responses per day').children).toHaveLength(7);
  });

  it('says so when it cannot load', async () => {
    fetchApi.mockImplementation(() => Promise.reject(new Error('Nope')));
    render(<FormAnalyticsModal slug="demo" isOpen onClose={() => {}} />);
    expect((await screen.findByRole('alert')).textContent).toBe('Nope');
  });

  it('draws bars within bounds', () => {
    expect(barWidth(3, 4)).toBe(75);
    expect(barWidth(5, 0)).toBe(0);
    expect(barWidth(9, 4)).toBe(100);
    expect(percent(0.5)).toBe('50%');
  });

  it('shows a message, not a crashed page, when the server answers in an unexpected shape', async () => {
    fetchApi.mockImplementation(() => Promise.resolve([]));
    render(<FormAnalyticsModal slug="demo" isOpen onClose={() => {}} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/does not understand/);
  });
});
