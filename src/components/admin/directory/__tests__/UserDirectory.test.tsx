import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ replace: vi.fn(), path: '/admin/users', query: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }), usePathname: () => nav.path, useSearchParams: () => new URLSearchParams(nav.query),
}));
const api = vi.hoisted(() => ({
  list: vi.fn(), summary: vi.fn(), recipients: vi.fn(), markVerified: vi.fn(), extendDeadline: vi.fn(), resendVerification: vi.fn(), update: vi.fn(),
}));
vi.mock('@/lib/userDirectory', async (original) => ({ ...(await original<typeof import('@/lib/userDirectory')>()), directoryApi: api }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
const stored = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('@/lib/auth', () => ({ getStoredUser: () => ({ id: 1, role: stored.role }) }));
vi.mock('@/lib/exportApi', () => ({ downloadDatasetRows: vi.fn() }));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, { get: () => ({ initial, animate, exit, transition, ...rest }: any) => <div {...rest} /> }),
  useReducedMotion: () => false,
}));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/components/admin/EditUserModal', () => ({ EditUserModal: () => <div>edit modal</div> }));
vi.mock('@/components/admin/AssignAffiliateModal', () => ({ AssignAffiliateModal: ({ user }: any) => (user ? <div>assign modal for {user.name}</div> : null) }));

import { UserDirectory } from '../UserDirectory';

const person = (over: Record<string, unknown> = {}) => ({
  id: 1, email: 'sita@x.io', first_name: 'Sita', last_name: 'Rao', full_name: 'Sita Rao', role: 'NON_AFFILIATE', club_id: null, membership_status: 'ACTIVE',
  roll_number: 'R1', college: null, other_college_name: 'Other College', branch: 'CSE', year: 3, phone_number: '99999', github_profile: null, linkedin_profile: null,
  registered_at: null, created_from: 'SELF_REGISTRATION', created_at: '2026-10-01T04:00:00Z', last_login: null, is_active: true, password_status: 'ACTIVE',
  email_verified_at: null, email_disputed_at: null, email_state: 'UNVERIFIED', email_days_left: 4, email_deadline: '2026-11-05T04:00:00Z', referred_by_display: '', ...over,
});
const summary = (over: Record<string, unknown> = {}) => ({
  total: 60, verified: 40, unverified: 20, overdue: 3, disputed: 1, members: 12, needs_password: 0,
  by_role: { AFFILIATE: 12, NON_AFFILIATE: 48, VOLUNTEER: 0, JUDGE: 0, CLUB_LEAD: 0, ADMIN: 0 }, by_membership_status: { ACTIVE: 50, INACTIVE: 0, SUSPENDED: 0, ALUMNI: 10, PENDING: 0 }, ...over,
});
const page = (results: unknown[], count = results.length) => ({ count, next: null, previous: null, results });

const show = (scope: 'users' | 'members' = 'users') => render(<UserDirectory scope={scope} />);
const lastAddress = () => String(nav.replace.mock.calls.at(-1)?.[0] ?? '');

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  nav.replace.mockReset();
  nav.path = '/admin/users';
  nav.query = '';
  stored.role = 'ADMIN';
  api.list.mockResolvedValue(page([person(), person({ id: 2, full_name: 'Omar Z', email: 'omar@x.io', email_state: 'VERIFIED', email_verified_at: '2026-10-05T04:00:00Z', email_days_left: null, club_id: '25SCC001', role: 'AFFILIATE' })], 60));
  api.summary.mockResolvedValue(summary());
  api.update.mockResolvedValue({});
  api.markVerified.mockResolvedValue({ verified: true, changed: true });
  api.extendDeadline.mockResolvedValue({ deadline: 'x' });
  api.resendVerification.mockResolvedValue({ sent: true, email_masked: 's***@x.io' });
  api.recipients.mockResolvedValue({ recipients: [{ id: 1, email: 'sita@x.io' }], truncated: false, limit: 5000 });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('UserDirectory', () => {
  it('shows the numbers, each person with a verification badge, and where in the list we are', async () => {
    show();
    expect((await screen.findAllByText('Sita Rao')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Email unverified/ }).textContent).toContain('20');
    expect(screen.getAllByText(/Unverified · 4d left/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing/).textContent).toContain('1–25');
    expect(screen.getByText(/Showing/).textContent).toContain('60');
  });

  it('asks the server for the page the address names, with its filters', async () => {
    nav.query = 'q=sita&email=overdue&page=2';
    show();
    await screen.findAllByText('Sita Rao');
    const [filters, scope] = api.list.mock.calls[0];
    expect(scope).toBe('users');
    expect(filters).toMatchObject({ q: 'sita', email: 'overdue', page: 2 });
  });

  it('turns a summary tile into a filter in the address and goes back to the first page', async () => {
    nav.query = 'page=3';
    show();
    await screen.findAllByText('Sita Rao');
    fireEvent.click(screen.getByRole('button', { name: /Verification overdue/ }));
    expect(lastAddress()).toBe('/admin/users?email=overdue');
  });

  it('debounces typing into the address instead of asking on every key', async () => {
    show();
    await screen.findAllByText('Sita Rao');
    const box = screen.getByRole('searchbox', { name: 'Search people' });
    fireEvent.change(box, { target: { value: 's' } });
    fireEvent.change(box, { target: { value: 'sit' } });
    expect(nav.replace).not.toHaveBeenCalled();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(lastAddress()).toBe('/admin/users?q=sit');
  });

  it('pages with Previous and Next', async () => {
    nav.query = 'page=2';
    show();
    await screen.findAllByText('Sita Rao');
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(lastAddress()).toContain('page=3');
    fireEvent.click(screen.getByRole('button', { name: /Previous/ }));
    expect(lastAddress()).toBe('/admin/users');
  });

  it('says when nothing matches and offers to clear the filters', async () => {
    api.list.mockResolvedValue(page([], 0));
    nav.query = 'q=zzz';
    show();
    expect(await screen.findByText(/No people match/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(lastAddress()).toBe('/admin/users');
  });

  it('shows a retry when the list cannot load', async () => {
    api.list.mockRejectedValue(new Error('boom'));
    show();
    expect(await screen.findByText('boom')).toBeTruthy();
  });

  it('opens a person and, for an admin, offers the verification controls', async () => {
    show();
    fireEvent.click((await screen.findAllByLabelText('View Sita Rao'))[0]);
    const section = await screen.findByRole('region', { name: 'Email verification' });
    expect(within(section).getByRole('button', { name: 'Mark as verified' })).toBeTruthy();
    fireEvent.click(within(section).getByRole('button', { name: /Resend link/ }));
    await waitFor(() => expect(api.resendVerification).toHaveBeenCalledWith(1));
    // The list reloads after an action, so look the section up again instead of holding on to the old one.
    const again = () => screen.getByRole('region', { name: 'Email verification' });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    fireEvent.change(within(again()).getByLabelText('Give more time'), { target: { value: '14' } });
    fireEvent.click(within(again()).getByRole('button', { name: 'Extend' }));
    await waitFor(() => expect(api.extendDeadline).toHaveBeenCalledWith(1, 14));
  });

  it('marks verified only after a confirmation', async () => {
    show();
    fireEvent.click((await screen.findAllByLabelText('View Sita Rao'))[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as verified' }));
    expect(api.markVerified).not.toHaveBeenCalled();
    const dialogs = await screen.findAllByRole('dialog');
    fireEvent.click(within(dialogs[dialogs.length - 1]).getByRole('button', { name: 'Mark as verified' }));
    await waitFor(() => expect(api.markVerified).toHaveBeenCalledWith(1));
  });

  it('shows a club lead the state but not the controls', async () => {
    stored.role = 'CLUB_LEAD';
    show();
    fireEvent.click((await screen.findAllByLabelText('View Sita Rao'))[0]);
    expect(await screen.findByText('Only an Admin can verify, resend or extend.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mark as verified' })).toBeNull();
  });

  it('saves a role change through the server and reloads; becoming an affiliate asks for a Club ID first', async () => {
    show();
    const select = (await screen.findAllByLabelText('Role of Sita Rao'))[0];
    fireEvent.change(select, { target: { value: 'VOLUNTEER' } });
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(1, { role: 'VOLUNTEER' }));
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(1));
    fireEvent.change(select, { target: { value: 'AFFILIATE' } });
    expect(await screen.findByText('assign modal for Sita Rao')).toBeTruthy();
    expect(api.update).toHaveBeenCalledTimes(1);
  });

  it('reports a failed save and reloads the list as the server has it', async () => {
    api.update.mockRejectedValue(new Error('Not allowed'));
    show();
    fireEvent.change((await screen.findAllByLabelText('Membership status of Sita Rao'))[0], { target: { value: 'SUSPENDED' } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Not saved', 'Not allowed'));
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(1));
  });

  it('keeps the admin role out of the list for a club lead', async () => {
    stored.role = 'CLUB_LEAD';
    show();
    const select = (await screen.findAllByLabelText('Role of Sita Rao'))[0] as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).not.toContain('ADMIN');
  });

  it('uses the members tiles and scope on the members page, and offers an email to everyone matched', async () => {
    nav.path = '/admin/members';
    show('members');
    await screen.findAllByText('Sita Rao');
    expect(api.list.mock.calls[0][1]).toBe('members');
    expect(screen.getByRole('button', { name: /Alumni/ }).textContent).toContain('10');
    fireEvent.click(screen.getByRole('button', { name: /Email these members/ }));
    expect(await screen.findByText(/Goes to/)).toBeTruthy();
  });

  it('copies a Club ID', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    show();
    fireEvent.click((await screen.findAllByLabelText('Copy Club ID 25SCC001'))[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('25SCC001');
  });
});
