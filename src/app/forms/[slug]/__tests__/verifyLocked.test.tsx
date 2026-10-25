import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'demo' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/forms/demo',
}));

const user = { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', role: 'NON_AFFILIATE' };
vi.mock('@/lib/auth', () => ({
  AUTH_CHANGE_EVENT: 'srkrcc_auth_change',
  getStoredUser: () => user,
  fetchAndSyncCurrentUser: () => Promise.resolve(user),
  clearAuthSession: vi.fn(),
}));

import FormDetailSubmissionPage from '../page';
import { EmailVerificationProvider } from '@/context/EmailVerificationContext';
import { VerifyDialog } from '@/components/verification/VerifyDialog';

const state = (over: Record<string, unknown> = {}) => ({
  mode: 'features', verified: false, verified_at: null, days_left: 5, deadline: null, blocked: false, email_masked: 'd**@example.org', pending_email_masked: null, ...over,
});
let verification: ReturnType<typeof state>;

const form = {
  id: 55, title: 'Locked', slug: 'demo', description: 'x', status: 'PUBLISHED', version: 1,
  allow_multiple_responses: false, allow_response_editing: true, enable_prefill: false,
  fields: [{ id: 1, label: 'Name', type: 'TEXT', is_required: true, order: 1 }, { id: 2, label: 'Track', type: 'RADIO', order: 2, options: ['AI', 'Web'] }],
};

beforeEach(() => {
  verification = state();
  fetchApi.mockReset();
  fetchApi.mockImplementation((url: string, options: any = {}) => {
    if (url === '/auth/me/') return Promise.resolve({ ...user, email_verification: verification });
    if (url === '/forms/demo/') return Promise.resolve(form);
    if (url.startsWith('/forms/demo/my-response/')) return Promise.resolve({ has_submitted: false, can_edit: true, response: null });
    if (url === '/forms/demo/draft/') return Promise.resolve(options.method === 'PUT' ? { saved_at: 'now', dropped: [] } : { draft: null });
    if (url === '/forms/demo/availability/') return Promise.resolve({});
    if (url === '/forms/submissions/') return Promise.resolve({ id: 1, answers: [] });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
  Element.prototype.scrollIntoView = vi.fn();
  window.history.pushState({}, '', '/forms/demo');
  sessionStorage.clear();
});
afterEach(cleanup);

const open = async () => {
  render(<EmailVerificationProvider><FormDetailSubmissionPage /><VerifyDialog /></EmailVerificationProvider>);
  await screen.findByText('Locked');
};
const input = () => document.getElementById('field-1') as HTMLInputElement;
const submissions = () => fetchApi.mock.calls.filter(([url]) => url === '/forms/submissions/');
const drafts = () => fetchApi.mock.calls.filter(([url, o]) => url === '/forms/demo/draft/' && o?.method === 'PUT');

describe('a form for someone whose email is not verified yet', () => {
  it('can be read, but its fields and Submit are disabled and say why', async () => {
    await open();
    expect(await screen.findByText('Verify your email address to fill in this form.')).toBeTruthy();
    expect(input().matches(':disabled')).toBe(true); // disabled by the fieldset around the questions
    expect((screen.getByText('Submit Form').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('fieldset')?.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Name')).toBeTruthy(); // the questions are still readable
  });

  it('never autosaves or sends anything, and keeps no backup copy', async () => {
    await open();
    await screen.findByText('Verify your email address to fill in this form.');
    await new Promise((resolve) => setTimeout(resolve, 1800));
    expect(drafts()).toHaveLength(0);
    expect(submissions()).toHaveLength(0);
    expect(Object.keys(sessionStorage).filter((k) => k.startsWith('srkrcc_form_backup'))).toEqual([]);
  });

  it('the "Verify email" button opens the dialog', async () => {
    await open();
    fireEvent.click(await screen.findByRole('button', { name: 'Verify email' }));
    expect(await screen.findByRole('dialog', { name: 'Verify your email' })).toBeTruthy();
  });

  it('is not locked in banner mode (nothing is restricted yet)', async () => {
    verification = state({ mode: 'banner' });
    await open();
    await waitFor(() => expect(fetchApi).toHaveBeenCalledWith('/auth/me/', expect.anything()));
    expect(input().matches(':disabled')).toBe(false);
    expect(screen.queryByText('Verify your email address to fill in this form.')).toBeNull();
  });

  it('is open to a verified person, who can fill it in and submit', async () => {
    verification = state({ verified: true, days_left: null });
    await open();
    await waitFor(() => expect(input().matches(':disabled')).toBe(false));
    fireEvent.change(input(), { target: { value: 'Dee' } });
    fireEvent.click(screen.getByText('Submit Form'));
    await waitFor(() => expect(submissions()).toHaveLength(1));
  });

  it('is open when verification is off on the server', async () => {
    verification = state({ mode: 'off' });
    await open();
    await waitFor(() => expect(fetchApi).toHaveBeenCalledWith('/auth/me/', expect.anything()));
    expect(input().matches(':disabled')).toBe(false);
  });

  it('unlocks as soon as the person verifies (no reload needed)', async () => {
    await open();
    await screen.findByText('Verify your email address to fill in this form.');
    verification = state({ verified: true, days_left: null });
    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(input().matches(':disabled')).toBe(false));
    expect(screen.queryByText('Verify your email address to fill in this form.')).toBeNull();
  });
});
