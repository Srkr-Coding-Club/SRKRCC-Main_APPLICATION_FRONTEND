import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

let search = 'token=abc123';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search), usePathname: () => '/account/verify-email', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));

let signedIn = false;
vi.mock('@/lib/auth', () => ({
  AUTH_CHANGE_EVENT: 'srkrcc_auth_change',
  getStoredUser: () => (signedIn ? { id: 7, email: 'dee@example.org' } : null),
  clearAuthSession: vi.fn(),
}));

import VerifyEmailPage from '../page';
import NotMePage from '../not-me/page';
import { EmailVerificationProvider } from '@/context/EmailVerificationContext';

const failure = (status: number, code: string, detail: string) => Object.assign(new Error(detail), { status, body: { code, detail } });
let inspect: () => Promise<unknown>;
let confirm: () => Promise<unknown>;
let dispute: () => Promise<unknown>;

beforeEach(() => {
  search = 'token=abc123';
  signedIn = false;
  window.history.pushState({}, '', '/account/verify-email?token=abc123');
  inspect = () => Promise.resolve({ valid: true, email_masked: 'd**@example.org', purpose: 'VERIFY', first_name: 'Dee' });
  confirm = () => Promise.resolve({ verified: true, already: false, email_masked: 'd**@example.org', purpose: 'VERIFY' });
  dispute = () => Promise.resolve({ done: true, already: false, removed: true });
  fetchApi.mockReset();
  fetchApi.mockImplementation((url: string, options: any = {}) => {
    if (url.startsWith('/auth/email/verification/status/')) return inspect();
    if (url === '/auth/email/verification/confirm/') return confirm();
    if (url === '/auth/email/verification/dispute/') return dispute();
    if (url === '/auth/me/') return Promise.resolve({ email_verification: { mode: 'block', verified: true, days_left: null, blocked: false, email_masked: 'd**@example.org', pending_email_masked: null } });
    return Promise.reject(new Error(`unexpected ${url} ${options.method ?? ''}`));
  });
});
afterEach(cleanup);

const confirmPage = () => render(<EmailVerificationProvider><VerifyEmailPage /></EmailVerificationProvider>);

describe('the confirmation page', () => {
  it('shows the address, uses nothing until the button is pressed, then confirms', async () => {
    confirmPage();
    expect(await screen.findByRole('heading', { name: 'Confirm your email address' })).toBeTruthy();
    expect(screen.getByText('d**@example.org')).toBeTruthy();
    expect(fetchApi.mock.calls.some(([url]) => url === '/auth/email/verification/confirm/')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm my email' }));
    expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeTruthy();
    const [, options] = fetchApi.mock.calls.find(([url]) => url === '/auth/email/verification/confirm/')!;
    expect(JSON.parse(options.body)).toEqual({ token: 'abc123' });
  });

  it('removes the one-time token from the address bar', async () => {
    confirmPage();
    await screen.findByRole('heading', { name: 'Confirm your email address' });
    expect(window.location.search).toBe('');
  });

  it('only asks the server once even if the page re-renders', async () => {
    const { rerender } = confirmPage();
    await screen.findByRole('heading', { name: 'Confirm your email address' });
    rerender(<EmailVerificationProvider><VerifyEmailPage /></EmailVerificationProvider>);
    expect(fetchApi.mock.calls.filter(([url]) => String(url).startsWith('/auth/email/verification/status/'))).toHaveLength(1);
  });

  it('words an address change differently', async () => {
    inspect = () => Promise.resolve({ valid: true, email_masked: 'n**@example.org', purpose: 'CHANGE' });
    confirmPage();
    expect(await screen.findByRole('heading', { name: 'Confirm your new email address' })).toBeTruthy();
  });

  it('says so when the link was already used (a second device, a double press)', async () => {
    inspect = () => Promise.resolve({ valid: false, code: 'ALREADY_USED', already_verified: true, email_masked: 'd**@example.org', purpose: 'VERIFY' });
    confirmPage();
    expect(await screen.findByRole('heading', { name: 'Already confirmed' })).toBeTruthy();
  });

  it('explains an expired link, and offers a new one to someone signed in', async () => {
    signedIn = true;
    inspect = () => Promise.reject(failure(400, 'LINK_EXPIRED', 'This link has expired or was replaced by a newer one.'));
    confirmPage();
    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/replaced by a newer one/);
    expect(await screen.findByRole('button', { name: 'Verify email' })).toBeTruthy();
  });

  it('sends a signed-out person with an expired link to sign in', async () => {
    inspect = () => Promise.reject(failure(400, 'LINK_EXPIRED', 'expired'));
    confirmPage();
    const link = await screen.findByRole('link', { name: 'Sign in to get a new link' });
    expect(link.getAttribute('href')).toContain('/login?next=');
  });

  it('explains an invalid link and a missing one', async () => {
    inspect = () => Promise.reject(failure(400, 'INVALID_LINK', 'This link is not valid.'));
    const first = confirmPage();
    expect(await screen.findByRole('heading', { name: 'This link is not valid' })).toBeTruthy();
    first.unmount();

    search = '';
    window.history.pushState({}, '', '/account/verify-email');
    confirmPage();
    expect(await screen.findByRole('heading', { name: 'No link found' })).toBeTruthy();
    expect(fetchApi.mock.calls.filter(([url]) => String(url).startsWith('/auth/email/verification/status/'))).toHaveLength(1); // only the first page asked
  });

  it('shows the reason when pressing the button fails (for example the address was taken meanwhile)', async () => {
    confirm = () => Promise.reject(failure(400, 'EMAIL_TAKEN', 'Someone else now uses this address, so it cannot be added to this account.'));
    confirmPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm my email' }));
    expect(await screen.findByRole('heading', { name: 'That address is already in use' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/Someone else now uses this address/);
  });

  it('cannot be pressed twice while confirming', async () => {
    let finish: (v: unknown) => void = () => {};
    confirm = () => new Promise((resolve) => { finish = resolve; });
    confirmPage();
    const button = await screen.findByRole('button', { name: 'Confirm my email' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Confirming...' }) as HTMLButtonElement).disabled).toBe(true));
    expect(fetchApi.mock.calls.filter(([url]) => url === '/auth/email/verification/confirm/')).toHaveLength(1);
    finish({ verified: true, already: false, email_masked: 'd**@example.org', purpose: 'VERIFY' });
    expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeTruthy();
  });

  it('refreshes the verification state after confirming, so the banner disappears', async () => {
    signedIn = true;
    confirmPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm my email' }));
    await screen.findByRole('heading', { name: 'Email confirmed' });
    await waitFor(() => expect(fetchApi.mock.calls.filter(([url]) => url === '/auth/me/').length).toBeGreaterThan(1));
  });
});

describe('the "This wasn\'t me" page', () => {
  const press = () => fireEvent.click(screen.getByRole('button', { name: "This wasn't me" }));

  it('explains first and acts only on the button', async () => {
    render(<NotMePage />);
    expect(await screen.findByRole('heading', { name: 'Was this not you?' })).toBeTruthy();
    expect(fetchApi).not.toHaveBeenCalled();
    press();
    expect(await screen.findByRole('heading', { name: 'Thank you, it is done' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/has been removed/);
    const [, options] = fetchApi.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ token: 'abc123' });
  });

  it('says when the account was only switched off for an admin to review', async () => {
    dispute = () => Promise.resolve({ done: true, already: false, removed: false });
    render(<NotMePage />);
    press();
    expect((await screen.findByRole('status')).textContent).toMatch(/switched off, and an admin will look at it/);
  });

  it('is harmless to press again', async () => {
    dispute = () => Promise.resolve({ done: true, already: true, removed: false });
    render(<NotMePage />);
    press();
    expect((await screen.findByRole('status')).textContent).toMatch(/already reported/);
  });

  it('shows an expired or missing link as a problem', async () => {
    dispute = () => Promise.reject(failure(400, 'LINK_EXPIRED', 'This link has expired. Contact the club if someone is using your address.'));
    const first = render(<NotMePage />);
    press();
    expect((await screen.findByRole('alert')).textContent).toMatch(/has expired/);
    first.unmount();

    search = '';
    render(<NotMePage />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Open the link from your email/);
  });
});
