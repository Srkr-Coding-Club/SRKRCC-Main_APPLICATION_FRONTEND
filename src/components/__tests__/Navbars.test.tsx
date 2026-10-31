import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let pathname = '/';
const push = vi.fn();
const signOut = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: (() => { const made: Record<string, any> = {}; return new Proxy({}, { get: (_t, tag: string) => (made[tag] ??= React.forwardRef(({ initial, animate, exit, transition, whileHover, layoutId, ...rest }: any, ref: any) => <div ref={ref} {...rest} />)) }); })(),
  useReducedMotion: () => false,
}));
vi.mock('../BrainLogo', () => ({ default: () => <span>logo</span> }));
vi.mock('../PillButton', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));
vi.mock('../notifications/NotificationBell', () => ({ NotificationBell: () => <button aria-label="Notifications">bell</button> }));
vi.mock('@/lib/maintenance', () => ({ useMaintenanceAttention: () => 0 }));
const fetchApiMock = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...args: unknown[]) => fetchApiMock(...args) }));
const queueMock = vi.fn();
vi.mock('@/lib/clubMembership', () => ({ membershipApi: { queue: (...args: unknown[]) => queueMock(...args) } }));
const auth = { signedIn: true, role: 'ADMIN' };
vi.mock('@/lib/auth', () => ({
  getStoredUser: () => (auth.signedIn ? { first_name: 'Ada', last_name: 'Min', email: 'ada@srkr.ac.in', role: auth.role, club_id: '26SCC014' } : null),
  isAuthenticated: () => auth.signedIn,
  fetchAndSyncCurrentUser: () => Promise.resolve(auth.signedIn ? { first_name: 'Ada', last_name: 'Min', email: 'ada@srkr.ac.in', role: auth.role, club_id: '26SCC014' } : null),
  subscribeToAuthResync: () => () => undefined,
  clearAuthSession: () => signOut(),
  AUTH_CHANGE_EVENT: 'auth-change',
}));

import Navbar from '../Navbar';
import AdminNavbar from '../admin/AdminNavbar';
import { hackathonEntries, rankEntries } from '../admin/AdminCommandPalette';
import { pickNextUp } from '../nav/NextUpCard';

beforeEach(() => { fetchApiMock.mockReset(); fetchApiMock.mockResolvedValue([]); queueMock.mockReset(); queueMock.mockResolvedValue({ counts: { PENDING: 0 } }); push.mockReset(); signOut.mockReset(); pathname = '/'; auth.signedIn = true; auth.role = 'ADMIN'; window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as any; });
afterEach(cleanup);

const desktopNav = () => screen.getByRole('navigation', { name: 'Main' });

describe('public navbar', () => {
  it('keeps a tab current on the pages under it, and only the home tab on the home page', () => {
    pathname = '/hackathons/hackoverflow-2026';
    const { unmount } = render(<Navbar />);
    expect(within(desktopNav()).getByRole('link', { name: /Events/ }).getAttribute('aria-current')).toBe('page');
    expect(within(desktopNav()).getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
    unmount();
    pathname = '/';
    render(<Navbar />);
    expect(within(desktopNav()).getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
    expect(within(desktopNav()).getByRole('link', { name: /Events/ }).getAttribute('aria-current')).toBeNull();
  });

  it('opens the Events dropdown from the keyboard, marks the current page in it, and closes it on Escape', () => {
    pathname = '/hackathons/some-event';
    render(<Navbar />);
    const events = within(desktopNav()).getByRole('link', { name: /Events/ });
    expect(events.getAttribute('aria-expanded')).toBe('false');
    fireEvent.focus(events);
    expect(events.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Interactive hands-on sessions & masterclasses')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Hackathons/ }).getAttribute('aria-current')).toBe('page');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(events.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Interactive hands-on sessions & masterclasses')).toBeNull();
  });

  it('on a touch screen the first tap opens the dropdown instead of leaving the page, the second goes on', () => {
    window.matchMedia = ((query: string) => ({ matches: query === '(hover: none)', media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as any;
    render(<Navbar />);
    const events = within(desktopNav()).getByRole('link', { name: /Events/ });
    expect(fireEvent.click(events)).toBe(false);   // default prevented: no navigation
    expect(events.getAttribute('aria-expanded')).toBe('true');
    expect(fireEvent.click(events)).toBe(true);    // already open: the link works
  });

  it('opens the phone menu as a drawer: dialog, current page marked, who is signed in, Escape closes it', () => {
    pathname = '/forms';
    render(<Navbar />);
    const burger = screen.getByRole('button', { name: 'Toggle navigation menu' });
    expect(burger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(burger);
    const dialog = screen.getByRole('dialog', { name: 'Site menu' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(burger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(within(dialog).getByRole('link', { name: 'Forms' }).getAttribute('aria-current')).toBe('page');
    expect(within(dialog).getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
    expect(within(dialog).getByRole('link', { name: 'Admin Room' })).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: /Ada/ }).getAttribute('href')).toBe('/profile');
    expect(within(dialog).getByText('26SCC014')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(burger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the drawer from its close button and by pressing the dimmed page', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation menu' }));
    fireEvent.click(document.querySelector('[aria-hidden="true"].fixed.inset-0')!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the Events pages inside the drawer, folds them on request, and marks the page you are on', () => {
    pathname = '/hackathons/some-event';
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation menu' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /Hackathons/ }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fold Events' }));
    expect(within(dialog).queryByRole('link', { name: /Hackathons/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open Events' }));
    expect(within(dialog).getByRole('link', { name: /Workshops/ })).toBeTruthy();
  });

  it('signs out from the drawer and goes to the login page', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation menu' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/login');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('puts the avatar in the bar for a signed-in phone, and the Light/Dark switch in the drawer', () => {
    render(<Navbar />);
    expect(screen.getByRole('link', { name: 'My profile' }).getAttribute('href')).toBe('/profile');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation menu' }));
    const group = within(screen.getByRole('dialog')).getByRole('group', { name: 'Theme' });
    document.documentElement.classList.add('dark');
    fireEvent.click(within(group).getByRole('button', { name: 'Light' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(within(group).getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(group).getByRole('button', { name: 'Dark' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('has no avatar for a signed-out visitor, and offers Login and Join in the drawer footer', () => {
    auth.signedIn = false;
    render(<Navbar />);
    expect(screen.queryByRole('link', { name: 'My profile' })).toBeNull();
  });

  it('gives the drawer a solid background (a hex colour variable with an alpha silently has none)', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation menu' }));
    const classes = screen.getByRole('dialog').className;
    expect(classes).toMatch(/bg-journey-bg/);
    expect(classes).not.toMatch(/var\(--background\)/);
  });

  it('shows Login and Join when signed out, and the menu keeps both within reach', () => {
    auth.signedIn = false;
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation menu' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: 'Login' })).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: /Join the Club/ })).toBeTruthy();
  });
});

describe('admin navbar', () => {
  const adminNav = () => screen.getByRole('navigation', { name: 'Admin' });

  it('marks the current section, and the current page inside its dropdown', () => {
    pathname = '/admin/hackathons/hackoverflow-2026';
    render(<AdminNavbar />);
    const modules = within(adminNav()).getByRole('link', { name: /Modules/ });
    expect(modules.getAttribute('aria-current')).toBe('page');
    expect(within(adminNav()).getByRole('link', { name: /Dashboard/ }).getAttribute('aria-current')).toBeNull();
    fireEvent.click(modules);
    expect(modules.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('link', { name: /Hackathon Management/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /Club IDs/ }).getAttribute('aria-current')).toBeNull();
  });

  it('closes an open dropdown on Escape', () => {
    pathname = '/admin';
    render(<AdminNavbar />);
    const modules = within(adminNav()).getByRole('link', { name: /Modules/ });
    fireEvent.click(modules);
    expect(screen.getByText('Club member directory')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(modules.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Club member directory')).toBeNull();
  });

  it('opens the phone menu as a dialog with the main-site button inside, current page marked, and Escape closes it', () => {
    pathname = '/admin/club-ids';
    render(<AdminNavbar />);
    const burger = screen.getByRole('button', { name: 'Toggle navigation menu' });
    fireEvent.click(burger);
    const dialog = screen.getByRole('dialog', { name: 'Admin menu' });
    expect(burger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(within(dialog).getByRole('link', { name: /Club IDs/ }).getAttribute('aria-current')).toBe('page');
    expect(within(dialog).getByRole('link', { name: /Back to Main Site/ })).toBeTruthy();
    expect(dialog.className).toMatch(/bg-journey-bg/);
    expect(within(dialog).getByText('ADMIN')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/login');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('gives the bar and the breadcrumb strip a real tint', () => {
    pathname = '/admin/club-ids';
    const { container } = render(<AdminNavbar />);
    const html = container.innerHTML;
    expect(html).toMatch(/bg-journey-bg\//);
    expect(html).not.toMatch(/var\(--background\)\]\//);
  });

  it('uses a different icon for each of the data, forms and modules groups', () => {
    pathname = '/admin';
    render(<AdminNavbar />);
    const svgs = ['Data Center', 'Forms', 'Modules'].map((name) => within(adminNav()).getByRole('link', { name: new RegExp(name) }).querySelector('svg')!.getAttribute('class'));
    expect(new Set(svgs).size).toBe(3);
  });
});


const day = 86_400_000;
const hack = (over: Record<string, unknown>) => ({ id: 1, title: 'HackOverflow 2026', slug: 'ho26', status: 'LIVE', start_date: new Date(Date.now() + 14 * day).toISOString(), end_date: new Date(Date.now() + 15 * day).toISOString(), registration_closes_at: new Date(Date.now() + 4 * day).toISOString(), is_registration_open: true, team_count: 36, ...over }) as any;

describe('account menu (public)', () => {
  it('replaces the row of pills with one button that opens who you are, club ID, links, theme and sign out', () => {
    render(<Navbar />);
    const trigger = screen.getByRole('button', { name: 'Account menu, Ada' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('link', { name: 'Admin Room' })).toBeNull();   // not in the bar any more
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Account' });
    expect(within(menu).getByText('Ada Min')).toBeTruthy();
    expect(within(menu).getByText('ada@srkr.ac.in')).toBeTruthy();
    expect(within(menu).getByText('Admin')).toBeTruthy();
    expect(within(menu).getByRole('menuitem', { name: 'My profile' }).getAttribute('href')).toBe('/profile');
    expect(within(menu).getByRole('menuitem', { name: 'Admin Room' }).getAttribute('href')).toBe('/admin');
    expect(within(menu).getByRole('group', { name: 'Theme' })).toBeTruthy();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/login');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows no Admin Room entry to an ordinary member', () => {
    auth.role = 'AFFILIATE';
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Account menu, Ada' }));
    expect(within(screen.getByRole('menu')).queryByRole('menuitem', { name: 'Admin Room' })).toBeNull();
  });

  it('copies the club ID in one click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Account menu, Ada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy club ID 26SCC014' }));
    expect(writeText).toHaveBeenCalledWith('26SCC014');
    expect(await screen.findByRole('button', { name: 'Club ID copied' })).toBeTruthy();
  });

  it('closes on Escape and gives focus back to its button, and walks the entries with the arrow keys', () => {
    render(<Navbar />);
    const trigger = screen.getByRole('button', { name: 'Account menu, Ada' });
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu');
    const first = within(menu).getAllByRole('menuitem')[0];
    first.focus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).not.toBe(first);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('leaves a signed-out visitor with Login, Join and the round theme button, and no account button', () => {
    auth.signedIn = false;
    render(<Navbar />);
    expect(screen.queryByRole('button', { name: /Account menu/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Toggle theme' }).length).toBeGreaterThan(0);
  });
});

describe('next-up card in the Events menu', () => {
  it('picks the hackathon taking registrations, closing soonest, else the next to start', () => {
    const now = new Date();
    const open = hack({ id: 1, slug: 'a', registration_closes_at: new Date(Date.now() + 9 * day).toISOString() });
    const sooner = hack({ id: 2, slug: 'b', registration_closes_at: new Date(Date.now() + 2 * day).toISOString() });
    expect(pickNextUp([open, sooner], now)?.slug).toBe('b');
    const later = hack({ id: 3, slug: 'c', is_registration_open: false, start_date: new Date(Date.now() + 30 * day).toISOString(), end_date: new Date(Date.now() + 31 * day).toISOString() });
    const nearer = hack({ id: 4, slug: 'd', is_registration_open: false, start_date: new Date(Date.now() + 10 * day).toISOString(), end_date: new Date(Date.now() + 11 * day).toISOString() });
    expect(pickNextUp([later, nearer], now)?.slug).toBe('d');
    expect(pickNextUp([hack({ status: 'CLOSED' }), hack({ is_hidden: true }), hack({ status: 'DRAFT' }), hack({ end_date: new Date(Date.now() - day).toISOString() })], now)).toBeNull();
  });

  it('asks once, the first time the menu opens, and shows the card with a way to register', async () => {
    fetchApiMock.mockResolvedValue([hack({})]);
    render(<Navbar />);
    const events = within(desktopNav()).getByRole('link', { name: /Events/ });
    fireEvent.focus(events);
    const card = await screen.findByRole('link', { name: /HackOverflow 2026/ });
    expect(card.getAttribute('href')).toBe('/hackathons/ho26');
    expect(card.textContent).toMatch(/Register now/);
    expect(card.textContent).not.toMatch(/36|teams? so far/);   // no count of registered teams
    expect(card.textContent).toMatch(/Registration closes in \d+ days?/);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.focus(events);
    expect(fetchApiMock).toHaveBeenCalledTimes(1);
  });

  it('asks for nothing when hackathons are switched off, and copes with a failing request', async () => {
    const { unmount } = render(<Navbar moduleFlags={{ hackathons: false }} />);
    fireEvent.focus(within(desktopNav()).getByRole('link', { name: /Events/ }));
    expect(fetchApiMock).not.toHaveBeenCalled();
    unmount();
    fetchApiMock.mockRejectedValue(new Error('down'));
    render(<Navbar />);
    fireEvent.focus(within(desktopNav()).getByRole('link', { name: /Events/ }));
    await Promise.resolve();
    expect(screen.queryByText('Next up')).toBeNull();
  });
});

describe('admin jump menu', () => {
  const entries = [
    { key: 'a', label: 'Hackathon Management', href: '/admin/hackathons', section: 'Modules', desc: 'Teams, rounds', icon: () => null },
    { key: 'b', label: 'Club IDs', href: '/admin/club-ids', section: 'Modules', desc: 'Look up, reserve', icon: () => null },
    { key: 'c', label: 'Members', href: '/admin/members', section: 'Modules', icon: () => null },
    { key: 'd', label: 'Audit Logs', href: '/admin/audit-logs', section: 'Admin', icon: () => null },
  ] as any;

  it('ranks names that start with what you typed first, needs every word, and searches the section and description too', () => {
    expect(rankEntries(entries, 'club').map((e) => e.key)).toEqual(['b']);
    expect(rankEntries(entries, 'mem').map((e) => e.key)).toEqual(['c']);
    expect(rankEntries(entries, 'modules rounds').map((e) => e.key)).toEqual(['a']);
    expect(rankEntries(entries, 'ids club').map((e) => e.key)).toEqual(['b']);
    expect(rankEntries(entries, 'zzz')).toEqual([]);
    expect(rankEntries(entries, '').length).toBe(4);
    expect(rankEntries(entries, 'a', 2).length).toBe(2);
  });

  it('opens with Ctrl K, filters as you type, opens the highlighted page on Enter, and Escape closes it', () => {
    pathname = '/admin';
    render(<AdminNavbar />);
    expect(screen.queryByRole('dialog', { name: 'Jump to a page' })).toBeNull();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const dialog = screen.getByRole('dialog', { name: 'Jump to a page' });
    const input = within(dialog).getByRole('combobox', { name: 'Search admin pages' });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'club ids' } });
    expect(within(dialog).getAllByRole('option').map((o) => o.textContent)).toEqual([expect.stringContaining('Club IDs')]);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/admin/club-ids');
    expect(screen.queryByRole('dialog', { name: 'Jump to a page' })).toBeNull();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'Jump to a page' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Jump to a page' })).toBeNull();
  });

  it('moves the highlight with the arrow keys and says so when nothing matches', () => {
    pathname = '/admin';
    render(<AdminNavbar />);
    fireEvent.click(screen.getByRole('button', { name: /Jump to a page, press/ }));
    const input = screen.getByRole('combobox');
    const options = () => screen.getAllByRole('option');
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[1].id);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(options()[options().length - 1].getAttribute('aria-selected')).toBe('true');
    fireEvent.change(input, { target: { value: 'zzzz' } });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });
});

describe('admin bar on laptops and wide screens', () => {
  it('keeps the tabs from tablet width up: each has its name for screen readers and a tooltip, only the current one shows its label below xl', () => {
    pathname = '/admin/club-ids';
    render(<AdminNavbar />);
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    const modules = within(nav).getByRole('link', { name: 'Modules' });
    expect(modules.getAttribute('title')).toBe('Modules');
    expect(modules.querySelector('span.inline')).toBeTruthy();
    const users = within(nav).getByRole('link', { name: 'User Control' });
    expect(users.querySelector('span.hidden')).toBeTruthy();
    expect(nav.className).toMatch(/\blg:flex\b/);
  });

  it('puts the account in one menu: role, profile, main site, sign out', () => {
    pathname = '/admin';
    render(<AdminNavbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Account menu, Ada' }));
    const menu = screen.getByRole('menu', { name: 'Account' });
    expect(within(menu).getByText('Admin')).toBeTruthy();
    expect(within(menu).getByRole('menuitem', { name: 'Main site' }).getAttribute('href')).toBe('/');
    expect(within(menu).getByRole('menuitem', { name: 'My profile' })).toBeTruthy();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('marks Modules and the Club IDs entry when membership requests are waiting', async () => {
    pathname = '/admin';
    queueMock.mockResolvedValue({ counts: { PENDING: 3 } });
    render(<AdminNavbar />);
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    const modules = within(nav).getByRole('link', { name: 'Modules' });
    expect(await within(modules).findByRole('img', { name: /needs attention/ })).toBeTruthy();
    fireEvent.click(modules);
    expect(within(screen.getByRole('link', { name: /Club IDs/ })).getByLabelText('3 need attention')).toBeTruthy();
    expect(queueMock).toHaveBeenCalledWith({ status: 'PENDING' });
  });

  it('shows no marker when nothing is waiting, or when the person may not see the queue', async () => {
    pathname = '/admin';
    queueMock.mockRejectedValue(new Error('forbidden'));
    render(<AdminNavbar />);
    await Promise.resolve();
    expect(within(within(screen.getByRole('navigation', { name: 'Admin' })).getByRole('link', { name: 'Modules' })).queryByRole('img')).toBeNull();
  });
});


describe('next-up card for a signed-out visitor', () => {
  it('sends a signed-out visitor through the login page and back, only when registering is what the card offers', async () => {
    auth.signedIn = false;
    fetchApiMock.mockResolvedValue([hack({})]);
    render(<Navbar />);
    fireEvent.focus(within(desktopNav()).getByRole('link', { name: /Events/ }));
    const card = await screen.findByRole('link', { name: /HackOverflow 2026/ });
    expect(card.getAttribute('href')).toBe('/login?next=%2Fhackathons%2Fho26');
    expect(card.textContent).toMatch(/Sign in to register/);
  });

  it('links straight to the page when registration is not open, signed in or not', async () => {
    auth.signedIn = false;
    fetchApiMock.mockResolvedValue([hack({ is_registration_open: false })]);
    render(<Navbar />);
    fireEvent.focus(within(desktopNav()).getByRole('link', { name: /Events/ }));
    const card = await screen.findByRole('link', { name: /HackOverflow 2026/ });
    expect(card.getAttribute('href')).toBe('/hackathons/ho26');
    expect(card.textContent).toMatch(/See details/);
  });

  it('a signed-in member goes straight to the hackathon', async () => {
    fetchApiMock.mockResolvedValue([hack({})]);
    render(<Navbar />);
    fireEvent.focus(within(desktopNav()).getByRole('link', { name: /Events/ }));
    expect((await screen.findByRole('link', { name: /HackOverflow 2026/ })).getAttribute('href')).toBe('/hackathons/ho26');
  });
});

describe('hackathons in the admin jump menu', () => {
  it('lists each hackathon, with a shortcut to the tabs of the modules it uses; a closed one only gets its own entry', () => {
    const entries = hackathonEntries([
      hack({ title: 'HackOverflow 2026', slug: 'ho26', payment_stage: 'REGISTRATION', features: { ideas: true, check_in: true, team_finder: false } }),
      hack({ title: 'CodeFest 2025', slug: 'cf25', status: 'CLOSED', payment_stage: 'REGISTRATION', features: { ideas: true } }),
      hack({ title: 'Plain Jam', slug: 'jam', status: 'DRAFT', features: {} }),
    ]);
    const byKey = Object.fromEntries(entries.map((e) => [e.key, e]));
    expect(byKey['h-ho26'].href).toBe('/admin/hackathons/ho26');
    expect(byKey['h-ho26'].desc).toMatch(/^Live · /);
    expect(Object.keys(byKey).filter((k) => k.startsWith('h-ho26-')).sort()).toEqual(['h-ho26-checkin', 'h-ho26-ideas', 'h-ho26-payments', 'h-ho26-teams']);
    expect(byKey['h-ho26-payments'].href).toBe('/admin/hackathons/ho26?tab=payments');
    expect(byKey['h-ho26-payments'].label).toBe('HackOverflow 2026: Payments');
    expect(byKey['h-cf25'].desc).toMatch(/^Closed · /);
    expect(Object.keys(byKey).some((k) => k.startsWith('h-cf25-'))).toBe(false);
    expect(byKey['h-jam'].desc).toMatch(/^Draft · /);
    expect(Object.keys(byKey).filter((k) => k.startsWith('h-jam-'))).toEqual(['h-jam-teams']);
  });

  it('asks for the hackathons once, when the jump menu first opens, and typing a name and a tab finds its tab', async () => {
    pathname = '/admin';
    fetchApiMock.mockResolvedValue([hack({ title: 'HackOverflow 2026', slug: 'ho26', payment_stage: 'REGISTRATION', features: {} })]);
    render(<AdminNavbar />);
    expect(fetchApiMock).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'hackoverflow pay' } });
    const option = await screen.findByRole('option', { name: /HackOverflow 2026: Payments/ });
    expect(option).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/admin/hackathons/ho26?tab=payments');
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(fetchApiMock).toHaveBeenCalledTimes(1);
    expect(fetchApiMock).toHaveBeenCalledWith('/hackathons/');
  });

  it('still jumps to pages when the hackathons cannot be loaded', async () => {
    pathname = '/admin';
    fetchApiMock.mockRejectedValue(new Error('down'));
    render(<AdminNavbar />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'club ids' } });
    await Promise.resolve();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/admin/club-ids');
  });
});
