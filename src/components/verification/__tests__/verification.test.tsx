import React from 'react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

let pathname = '/forms';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));

let signedIn = true;
let storedRole = 'NON_AFFILIATE';
const clearAuthSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  AUTH_CHANGE_EVENT: 'srkrcc_auth_change',
  getStoredUser: () => (signedIn ? { id: 7, email: 'dee@example.org', role: storedRole } : null),
  clearAuthSession: () => clearAuthSession(),
}));

import { EmailVerificationProvider } from '@/context/EmailVerificationContext';
import { VerificationBanner } from '../VerificationBanner';
import { VerificationGate } from '../VerificationGate';
import { EmailVerificationCard } from '../EmailVerificationCard';
import { VERIFICATION_REQUIRED_EVENT, type EmailVerificationState } from '@/lib/emailVerification';

const base = (over: Partial<EmailVerificationState> = {}): EmailVerificationState => ({
  mode: 'block', verified: false, verified_at: null, days_left: 5, deadline: '2026-11-01T00:00:00Z', blocked: false,
  email_masked: 'd**@example.org', pending_email_masked: null, ...over,
});

let current: EmailVerificationState;
let sendReply: () => Promise<unknown>;
let changeReply: () => Promise<unknown>;

beforeEach(() => {
  signedIn = true;
  storedRole = 'NON_AFFILIATE';
  pathname = '/forms';
  current = base();
  sendReply = () => Promise.resolve({ detail: 'ok', sent: true, email_masked: 'd**@example.org' });
  changeReply = () => Promise.resolve({ detail: 'We sent a link to n**@example.org. Your address changes once you confirm it.', sent: true });
  fetchApi.mockReset();
  fetchApi.mockImplementation((url: string) => {
    if (url === '/auth/me/') return Promise.resolve({ email_verification: current });
    if (url === '/auth/email/verification/request/') return sendReply();
    if (url === '/auth/email/change/') return changeReply();
    return Promise.reject(new Error(`unexpected ${url}`));
  });
});
afterEach(cleanup);

const mount = (ui: React.ReactNode) => render(<EmailVerificationProvider>{ui}</EmailVerificationProvider>);
const posts = (path: string) => fetchApi.mock.calls.filter(([url, o]) => url === path && o?.method === 'POST');

describe('the banner', () => {
  it('shows the days left and sends the link when the button is pressed', async () => {
    mount(<VerificationBanner />);
    expect(await screen.findByText(/5 days left/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Email verification' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(await screen.findByText(/Link sent to d\*\*@example.org/)).toBeTruthy();
    expect(posts('/auth/email/verification/request/')).toHaveLength(1);
    expect((screen.getByRole('button', { name: /Send again in \d+s/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says nothing is restricted yet in banner mode, and does not mention days', async () => {
    current = base({ mode: 'banner' });
    mount(<VerificationBanner />);
    expect(await screen.findByText(/It will soon be needed/)).toBeTruthy();
    expect(screen.queryByText(/days left/)).toBeNull();
  });

  it('is not there when the feature is off, when signed out, when verified, or while blocked (the blocked screen takes over)', async () => {
    for (const next of [base({ mode: 'off' }), base({ verified: true, days_left: null }), base({ blocked: true, days_left: 0 })]) {
      current = next;
      const { container, unmount } = mount(<VerificationBanner />);
      await waitFor(() => expect(fetchApi).toHaveBeenCalled());
      await act(async () => { await Promise.resolve(); });
      expect(container.innerHTML).toBe('');
      unmount();
      fetchApi.mockClear();
    }
    signedIn = false;
    const { container } = mount(<VerificationBanner />);
    await act(async () => { await Promise.resolve(); });
    expect(container.innerHTML).toBe('');
    expect(fetchApi).not.toHaveBeenCalledWith('/auth/me/', expect.anything());
  });

  it('stays out of the way on the pages used to verify, sign in and sign up', async () => {
    for (const path of ['/account/verify-email', '/account/verify-email/not-me', '/login', '/signup']) {
      pathname = path;
      const { container, unmount } = mount(<VerificationBanner />);
      await act(async () => { await Promise.resolve(); });
      expect(container.querySelector('[aria-label="Email verification"]')).toBeNull();
      unmount();
    }
  });

  it('turns urgent in the last two days', async () => {
    current = base({ days_left: 2 });
    mount(<VerificationBanner />);
    const region = await screen.findByRole('region', { name: 'Email verification' });
    expect(region.className).toMatch(/rose/);
  });

  it('explains a send that was refused, and waits as long as it is told', async () => {
    sendReply = () => Promise.reject(Object.assign(new Error('A link was just sent.'), { status: 429, body: { detail: 'A link was just sent. You can ask for another in about 60 seconds.', code: 'COOLDOWN', retry_after: 42 } }));
    mount(<VerificationBanner />);
    fireEvent.click(await screen.findByRole('button', { name: 'Verify email' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Send again in 42s|Verify email/ })).toBeTruthy());
    await waitFor(() => expect((screen.getByRole('button', { name: /in 42s/ }) as HTMLButtonElement).disabled).toBe(true));
  });

  it('copes with the email service being down', async () => {
    sendReply = () => Promise.reject(Object.assign(new Error('x'), { status: 503, body: { detail: 'We could not send the email just now. Please try again in a moment.', code: 'SEND_FAILED' } }));
    mount(<VerificationBanner />);
    fireEvent.click(await screen.findByRole('button', { name: 'Verify email' }));
    fireEvent.click(await screen.findByRole('button', { name: 'More' }));
    expect((await screen.findAllByText(/could not send the email just now/)).length).toBeGreaterThan(0);
  });
});

describe('the gate and the blocked screen', () => {
  const page = <VerificationGate><p>Private page content</p></VerificationGate>;

  it('replaces a private page for a blocked person, keeps the way out, and releases them once verified', async () => {
    current = base({ blocked: true, days_left: 0 });
    pathname = '/profile';
    mount(page);
    expect(await screen.findByRole('heading', { name: 'Verify your email to continue' })).toBeTruthy();
    expect(screen.queryByText('Private page content')).toBeNull();
    expect(screen.getByRole('link', { name: 'Browse public pages' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(await screen.findByText(/We sent a link to d\*\*@example.org/)).toBeTruthy();

    current = base({ verified: true, days_left: null });
    fireEvent.click(screen.getByRole('button', { name: /I have verified/ }));
    expect(await screen.findByText('Private page content')).toBeTruthy();
  });

  it('never covers a public page, even for a blocked person', async () => {
    current = base({ blocked: true, days_left: 0 });
    for (const path of ['/', '/events', '/forms', '/forms/some-form', '/hackathons/x', '/login']) {
      pathname = path;
      const { unmount } = mount(page);
      expect(await screen.findByText('Private page content')).toBeTruthy();
      unmount();
    }
  });

  it('covers every private area for a blocked person', async () => {
    current = base({ blocked: true, days_left: 0 });
    for (const path of ['/profile', '/admin', '/admin/forms', '/attendance/scan', '/hackathons/x/dashboard']) {
      pathname = path;
      const { unmount } = mount(page);
      expect(await screen.findByRole('heading', { name: 'Verify your email to continue' })).toBeTruthy();
      unmount();
    }
  });

  it('does not cover private pages for someone who is merely unverified (before the deadline)', async () => {
    pathname = '/profile';
    mount(page);
    expect(await screen.findByText('Private page content')).toBeTruthy();
  });

  it('signs out from the blocked screen', async () => {
    current = base({ blocked: true, days_left: 0 });
    pathname = '/profile';
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true });
    mount(page);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(clearAuthSession).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('/');
  });

  it('has no accessibility violations', async () => {
    current = base({ blocked: true, days_left: 0 });
    pathname = '/profile';
    mount(page);
    await screen.findByRole('heading', { name: 'Verify your email to continue' });
    const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});

describe('the dialog that explains a refused feature', () => {
  const raise = (detail: object) => act(async () => { window.dispatchEvent(new CustomEvent(VERIFICATION_REQUIRED_EVENT, { detail })); });

  it('opens when the API refuses something, says why, and can send the link', async () => {
    mount(<VerificationGate><p>page</p></VerificationGate>);
    await screen.findByText('page');
    await raise({ code: 'EMAIL_VERIFICATION_REQUIRED', reason: 'feature', blocked: false });
    const dialog = await screen.findByRole('dialog', { name: 'Verify your email' });
    expect(dialog.textContent).toMatch(/This feature needs a verified email address/);
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(await screen.findByText(/We sent a link to d\*\*@example.org/)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('uses the admin wording for admin tools', async () => {
    mount(<VerificationGate><p>page</p></VerificationGate>);
    await screen.findByText('page');
    await raise({ reason: 'staff' });
    expect((await screen.findByRole('dialog')).textContent).toMatch(/Admin tools need a verified email/);
  });

  it('does not pop up over the blocked screen (it is already the whole page)', async () => {
    current = base({ blocked: true, days_left: 0 });
    pathname = '/profile';
    mount(<VerificationGate><p>page</p></VerificationGate>);
    await screen.findByRole('heading', { name: 'Verify your email to continue' });
    await raise({ reason: 'deadline', blocked: true });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not open for a verified person', async () => {
    current = base({ verified: true, days_left: null });
    mount(<VerificationGate><p>page</p></VerificationGate>);
    await screen.findByText('page');
    await raise({ reason: 'feature' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('changing a wrong address', () => {
  it('asks for the new address and the password, and reports what happens', async () => {
    mount(<EmailVerificationCard />);
    fireEvent.click(await screen.findByRole('button', { name: /Wrong address/ }));
    fireEvent.change(screen.getByLabelText('New email address'), { target: { value: 'new@example.org' } });
    fireEvent.change(screen.getByLabelText('Your password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send a link to the new address' }));
    expect(await screen.findByText(/Your address changes once you confirm it/)).toBeTruthy();
    const [, options] = posts('/auth/email/change/')[0];
    expect(JSON.parse(options.body)).toEqual({ new_email: 'new@example.org', password: 'secret123' });
    expect(screen.queryByLabelText('Your password')).toBeNull();
  });

  it('keeps the form open and shows the reason when the server refuses', async () => {
    changeReply = () => Promise.reject(Object.assign(new Error('x'), { status: 400, body: { detail: 'That password is not correct.', code: 'WRONG_PASSWORD' } }));
    mount(<EmailVerificationCard />);
    fireEvent.click(await screen.findByRole('button', { name: /Wrong address/ }));
    fireEvent.change(screen.getByLabelText('New email address'), { target: { value: 'new@example.org' } });
    fireEvent.change(screen.getByLabelText('Your password'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send a link to the new address' }));
    expect((await screen.findByRole('alert')).textContent).toBe('That password is not correct.');
    expect(screen.getByLabelText('Your password')).toBeTruthy();
  });

  it('shows a change that is waiting to be confirmed', async () => {
    current = base({ pending_email_masked: 'n**@example.org' });
    mount(<EmailVerificationCard />);
    expect(await screen.findByText(/Waiting for you to confirm/)).toBeTruthy();
    expect(screen.getByText('n**@example.org')).toBeTruthy();
  });
});

describe('the profile card', () => {
  it('shows verified, or what to do; and nothing when the feature is off', async () => {
    current = base({ verified: true, days_left: null });
    const first = mount(<EmailVerificationCard />);
    expect(await screen.findByText('Email verified')).toBeTruthy();
    first.unmount();

    current = base();
    const second = mount(<EmailVerificationCard />);
    expect(await screen.findByText(/Email not verified/)).toBeTruthy();
    expect(screen.getByText(/5 days left/)).toBeTruthy();
    second.unmount();

    current = base({ mode: 'off' });
    const third = mount(<EmailVerificationCard />);
    await act(async () => { await Promise.resolve(); });
    expect(third.container.innerHTML).toBe('');
  });
});

describe('keeping up with the truth', () => {
  it('re-checks when the person comes back to the tab, so verifying on a phone is noticed', async () => {
    current = base({ blocked: true, days_left: 0 });
    pathname = '/profile';
    mount(<VerificationGate><p>Private page content</p></VerificationGate>);
    await screen.findByRole('heading', { name: 'Verify your email to continue' });
    current = base({ verified: true, days_left: null });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(await screen.findByText('Private page content')).toBeTruthy();
  });

  it('forgets everything when the person signs out', async () => {
    mount(<VerificationBanner />);
    await screen.findByText(/5 days left/);
    signedIn = false;
    await act(async () => { window.dispatchEvent(new Event('srkrcc_auth_change')); });
    await waitFor(() => expect(screen.queryByText(/days left/)).toBeNull());
  });

  it('a failed look-up (offline, server error) does not blank the page or the banner', async () => {
    mount(<VerificationBanner />);
    await screen.findByText(/5 days left/);
    fetchApi.mockImplementation(() => Promise.reject(new Error('offline')));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(screen.getByText(/5 days left/)).toBeTruthy();
  });
});

describe('admin tools for someone who has not verified', () => {
  const page = <VerificationGate><p>Admin page content</p></VerificationGate>;

  it.each(['ADMIN', 'CLUB_LEAD'])('a %s who is not verified sees one clear screen, not a page full of failing panels', async (role) => {
    storedRole = role;
    current = base({ mode: 'features' });
    pathname = '/admin/forms';
    mount(page);
    expect(await screen.findByRole('heading', { name: 'Verify your email to use the admin tools' })).toBeTruthy();
    expect(screen.queryByText('Admin page content')).toBeNull();
    expect(screen.getByRole('button', { name: 'Verify email' })).toBeTruthy();
  });

  it('a verified admin, and an admin before the feature is enforced, see the page', async () => {
    storedRole = 'ADMIN';
    pathname = '/admin';
    current = base({ verified: true, days_left: null, mode: 'features' });
    const first = mount(page);
    expect(await screen.findByText('Admin page content')).toBeTruthy();
    first.unmount();
    current = base({ mode: 'banner' });
    mount(page);
    expect(await screen.findByText('Admin page content')).toBeTruthy();
  });

  it('does not cover public pages or pages outside /admin for an unverified admin', async () => {
    storedRole = 'ADMIN';
    current = base({ mode: 'features' });
    for (const path of ['/', '/forms', '/administrator', '/profile']) {
      pathname = path;
      const { unmount } = mount(page);
      expect(await screen.findByText('Admin page content')).toBeTruthy();
      unmount();
    }
  });

  it('a member (not staff) is not shown the admin screen', async () => {
    storedRole = 'NON_AFFILIATE';
    current = base({ mode: 'features' });
    pathname = '/admin/forms';
    mount(page);
    expect(await screen.findByText('Admin page content')).toBeTruthy();
  });
});

describe('a burst of refusals', () => {
  it('re-checks the state once, not once per refusal', async () => {
    mount(<VerificationGate><p>page</p></VerificationGate>);
    await screen.findByText('page');
    const before = fetchApi.mock.calls.filter(([url]) => url === '/auth/me/').length;
    await act(async () => {
      for (let i = 0; i < 6; i++) window.dispatchEvent(new CustomEvent(VERIFICATION_REQUIRED_EVENT, { detail: { reason: 'feature', blocked: false } }));
    });
    await waitFor(() => expect(fetchApi.mock.calls.filter(([url]) => url === '/auth/me/').length).toBe(before + 1));
  });
});

describe('the provider keeps its look-ups under control', () => {
  const meCalls = () => fetchApi.mock.calls.filter(([url]) => url === '/auth/me/').length;

  it('ignores storage changes that are not the sign-in record (another tab saving a draft)', async () => {
    mount(<VerificationBanner />);
    await screen.findByText(/5 days left/);
    const before = meCalls();
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'srkrcc_form_backup:demo:7' })); });
    expect(meCalls()).toBe(before);
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'srkrcc_user' })); });
    expect(meCalls()).toBeGreaterThanOrEqual(before); // allowed to look again, never required to
  });

  it('asks the server quietly, so a refusal of that very call cannot raise the dialog again and loop', async () => {
    mount(<VerificationBanner />);
    await screen.findByText(/5 days left/);
    const [, options] = fetchApi.mock.calls.find(([url]) => url === '/auth/me/')!;
    expect(options).toMatchObject({ silentVerification: true, silentAuth: true });
  });

  it('throws away a late answer for someone who has since signed out', async () => {
    let release: (value: unknown) => void = () => {};
    fetchApi.mockImplementation((url: string) => (url === '/auth/me/' ? new Promise((resolve) => { release = resolve; }) : Promise.reject(new Error(url))));
    mount(<VerificationBanner />);
    await waitFor(() => expect(meCalls()).toBe(1));
    signedIn = false;
    await act(async () => { window.dispatchEvent(new Event('srkrcc_auth_change')); });
    await act(async () => { release({ email_verification: base() }); });
    expect(screen.queryByText(/days left/)).toBeNull();
  });

  it('does not pop the dialog open again straight after the person closed it', async () => {
    mount(<VerificationGate><p>page</p></VerificationGate>);
    await screen.findByText('page');
    const raise = () => act(async () => { window.dispatchEvent(new CustomEvent(VERIFICATION_REQUIRED_EVENT, { detail: { reason: 'feature' } })); });
    await raise();
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await raise();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('explains a block on a public page too (there the full-page screen does not apply)', async () => {
    current = base({ blocked: true, days_left: 0 });
    pathname = '/events';
    mount(<VerificationGate><p>public page</p></VerificationGate>);
    await screen.findByText('public page');
    await act(async () => { window.dispatchEvent(new CustomEvent(VERIFICATION_REQUIRED_EVENT, { detail: { reason: 'deadline', blocked: true } })); });
    const dialog = await screen.findByRole('dialog', { name: 'Verify your email' });
    expect(dialog.textContent).toMatch(/verification period has ended/);
  });

  it('shows a wait as a wait even when no "sent" message came with it (after changing the address)', async () => {
    mount(<EmailVerificationCard />);
    fireEvent.click(await screen.findByRole('button', { name: /Wrong address/ }));
    fireEvent.change(screen.getByLabelText('New email address'), { target: { value: 'new@example.org' } });
    fireEvent.change(screen.getByLabelText('Your password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send a link to the new address' }));
    const button = await screen.findByRole('button', { name: /Send again in \d+s/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/We sent a link to d\*\*@example.org/)).toBeNull();
  });
});
