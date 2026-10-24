import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'demo' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/forms/demo',
}));

const user = { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', role: 'NON_AFFILIATE' };
vi.mock('@/lib/auth', () => ({
  getStoredUser: () => user,
  fetchAndSyncCurrentUser: () => Promise.resolve(user),
}));

// The real widget loads Cloudflare's script; here a button stands in for "the visitor passed the check".
let tokenSink: ((t: string | null) => void) | null = null;
let resetSeen = 0;
vi.mock('@/components/forms/TurnstileWidget', () => ({
  TurnstileWidget: ({ onToken, resetSignal }: { onToken: (t: string | null) => void; resetSignal?: number }) => {
    tokenSink = onToken;
    resetSeen = resetSignal ?? 0;
    return <button type="button" onClick={() => onToken('tok-123')}>Pass the check</button>;
  },
  turnstileSiteKey: () => 'site-key',
}));

import FormDetailSubmissionPage from '../page';

let form: any;
const fields = [{ id: 1, label: 'Name', type: 'TEXT', is_required: true, order: 1 }];
const baseForm = (extra: Record<string, unknown> = {}) => ({
  id: 55, title: 'After', slug: 'demo', description: 'x', status: 'PUBLISHED', version: 1,
  allow_multiple_responses: false, allow_response_editing: true, enable_prefill: false, fields, ...extra,
});

let submitResult: () => Promise<unknown>;
const respond = (url: string, options: any = {}) => {
  if (url === '/forms/demo/') return Promise.resolve(form);
  if (url.startsWith('/forms/demo/my-response/')) return Promise.resolve({ has_submitted: false, can_edit: true, response: null });
  if (url === '/forms/demo/draft/') return Promise.resolve(options.method === 'PUT' ? { saved_at: 'now', dropped: [] } : { draft: null });
  if (url === '/forms/demo/availability/') return Promise.resolve({});
  if (url === '/forms/submissions/') return submitResult();
  return Promise.reject(new Error(`unexpected request ${url}`));
};

const submissions = () => fetchApi.mock.calls.filter(([url]) => url === '/forms/submissions/');
const sent = () => JSON.parse(submissions()[0][1].body);

beforeEach(() => {
  fetchApi.mockReset();
  fetchApi.mockImplementation(respond);
  submitResult = () => Promise.resolve({ id: 1, answers: [] });
  tokenSink = null;
  resetSeen = 0;
  Element.prototype.scrollIntoView = vi.fn();
  window.history.pushState({}, '', '/forms/demo');
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const open = async (extra: Record<string, unknown> = {}) => {
  form = baseForm(extra);
  render(<FormDetailSubmissionPage />);
  await screen.findByText('After');
  await waitFor(() => expect(fetchApi).toHaveBeenCalledWith('/forms/demo/draft/', expect.anything()));
};
const fill = () => fireEvent.change(document.getElementById('field-1')!, { target: { value: 'Dee' } });

describe('thank-you page', () => {
  it('shows the form’s message with answers piped in', async () => {
    await open({ confirmation_message: 'See you there, {{1}}!' });
    fill();
    fireEvent.click(screen.getByText('Submit Form'));
    expect((await screen.findByTestId('thank-you-message')).textContent).toBe('See you there, Dee!');
  });

  it('falls back to the default when no message is set', async () => {
    await open();
    fill();
    fireEvent.click(screen.getByText('Submit Form'));
    expect(await screen.findByText('Submission Received!')).toBeTruthy();
    expect(screen.queryByTestId('thank-you-message')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('offers the redirect countdown when the form sets one', async () => {
    await open({ redirect_url: '/events', redirect_delay_seconds: 9 });
    fill();
    fireEvent.click(screen.getByText('Submit Form'));
    expect((await screen.findByRole('status')).textContent).toMatch(/in 9 seconds/);
  });
});

describe('bot protection', () => {
  it('always sends an empty honeypot, which people cannot see or reach', async () => {
    await open();
    const trap = document.querySelector('input[name="hp_q7z4"]') as HTMLInputElement;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    fill();
    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(submissions()).toHaveLength(1));
    expect(sent().hp_q7z4).toBe('');
    expect(sent()).not.toHaveProperty('captcha_token');
  });

  it('does not show a check on a form that has not asked for one', async () => {
    await open();
    expect(screen.queryByText('Pass the check')).toBeNull();
  });

  it('needs the check passed before the form can be submitted, then sends its token', async () => {
    await open({ captcha_enabled: true });
    fill();
    const submit = screen.getByText('Submit Form').closest('button')!;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByText('Pass the check'));
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(submissions()).toHaveLength(1));
    expect(sent().captcha_token).toBe('tok-123');
  });

  it('asks for a fresh check after every attempt, since a token works once', async () => {
    submitResult = () => Promise.reject(Object.assign(new Error('The bot check did not pass. Please try again.'), { body: { error: 'x', code: 'CAPTCHA_FAILED' } }));
    await open({ captcha_enabled: true });
    fill();
    fireEvent.click(screen.getByText('Pass the check'));
    const before = resetSeen;
    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(resetSeen).toBe(before + 1));
    expect(await screen.findByText(/did not pass/)).toBeTruthy();
    act(() => tokenSink!(null));
    expect((screen.getByText('Submit Form').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('the form in another language', () => {
  it('speaks Telugu on its buttons and marks the page as Telugu', async () => {
    await open({ language: 'te' });
    expect(screen.getByText('ఫారమ్ సమర్పించండి')).toBeTruthy();
    expect(screen.queryByText('Submit Form')).toBeNull();
    expect(document.querySelector('[lang="te"]')).not.toBeNull();
  });

  it('thanks in Hindi after submitting, with the form’s own words untouched', async () => {
    await open({ language: 'hi', confirmation_message: '' });
    fill();
    fireEvent.click(screen.getByText('फ़ॉर्म जमा करें'));
    expect(await screen.findByText('जमा प्राप्त हुआ!')).toBeTruthy();
    expect(screen.getByText('फ़ॉर्म केंद्र पर लौटें')).toBeTruthy();
  });

  it('stays English when the form does not say', async () => {
    await open();
    expect(screen.getByText('Submit Form')).toBeTruthy();
    expect(document.querySelector('[lang="en"]')).not.toBeNull();
  });

  it('shows the multi-page progress in the form’s language', async () => {
    await open({
      language: 'hi',
      fields: [
        { id: 1, label: 'Name', type: 'TEXT', order: 1 },
        { id: 2, label: 'Break', type: 'PAGE_BREAK', order: 2 },
        { id: 3, label: 'Other', type: 'TEXT', order: 3 },
      ],
    });
    expect(screen.getByText('पृष्ठ 1 / 2')).toBeTruthy();
    expect(screen.getByText('आगे')).toBeTruthy();
  });
});

describe('when the server asks the visitor to slow down', () => {
  it('keeps the answers, explains, and brings Submit back after the wait', async () => {
    let attempts = 0;
    submitResult = () => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(Object.assign(new Error('You are going a little too fast.'), { status: 429, retryAfter: 2, body: { code: 'THROTTLED', retry_after: 2 } }))
        : Promise.resolve({ id: 1, answers: [] });
    };
    await open();
    fill();
    fireEvent.click(screen.getByText('Submit Form'));
    expect(await screen.findByText(/going a little too fast/i)).toBeTruthy();
    const waiting = await screen.findByText(/Try again in \d+s/);
    expect((waiting.closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('field-1') as HTMLInputElement).value).toBe('Dee');
    // after the wait the button is back and works
    await waitFor(() => expect(screen.getByText('Submit Form')).toBeTruthy(), { timeout: 4000 });
    fireEvent.click(screen.getByText('Submit Form'));
    expect(await screen.findByText('Submission Received!')).toBeTruthy();
    expect(attempts).toBe(2);
  });
});
