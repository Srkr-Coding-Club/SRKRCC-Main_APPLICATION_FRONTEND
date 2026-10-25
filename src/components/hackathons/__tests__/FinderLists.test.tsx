import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const finder = { requestToJoin: vi.fn(), answerRequest: vi.fn(), invite: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { finder: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (finder as any)[name](...args) }) },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));

import { FinderLists, JoinRequestsToAnswer } from '../FinderLists';
import { JoinRequestActions } from '@/components/notifications/NotificationBell';

const hackathon = { rules: '', require_rules_acceptance: false, registration_questions: [] } as any;
const team = (id: number, over: Record<string, unknown> = {}) => ({ id, name: `Team ${id}`, looking_for: 'a designer', members: 1, max_members: 3, problem: null, leader: `Leader ${id}`, ...over });
const person = (id: number, over: Record<string, unknown> = {}) => ({ id, name: `Person ${id}`, skills: 'React', note: 'builder', profile: 'CSE · Year 2', is_me: false, ...over });
const listing = (over: Record<string, unknown> = {}) => ({ teams: [team(1), team(2)], seekers: [person(1), person(2)], my_profile: null, my_requests: [], ...over }) as any;
const renderLists = (props: Record<string, unknown> = {}) => {
  const onChanged = vi.fn();
  render(<FinderLists slug="demo" hackathon={hackathon} listing={listing()} hasTeam={false} iAmLeader={false} onChanged={onChanged} {...props} />);
  return onChanged;
};

beforeEach(() => { Object.values(finder).forEach((fn) => fn.mockReset().mockResolvedValue({})); });
afterEach(() => cleanup());

describe('FinderLists', () => {
  it('lists the teams that need people and the people who are available', () => {
    renderLists();
    expect(screen.getByRole('region', { name: 'Teams that need people' }).textContent).toContain('Looking for: a designer');
    expect(screen.getByRole('region', { name: 'People who are available' }).textContent).toContain('Skills: React');
    expect(screen.getByText('Teams that need people (2)')).toBeTruthy();
    expect(screen.getByText('People looking for a team (2)')).toBeTruthy();
  });

  it('shows empty messages', () => {
    renderLists({ listing: listing({ teams: [], seekers: [] }) });
    expect(screen.getByText('No team is recruiting right now.')).toBeTruthy();
    expect(screen.getByText('Nobody is listed yet.')).toBeTruthy();
  });

  it('on the dashboard card only the first few show, with a link to see them all', () => {
    renderLists({ listing: listing({ teams: [1, 2, 3, 4, 5, 6].map((n) => team(n)) }), limit: 4 });
    expect(screen.getAllByText(/^Team \d$/, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Team 5/)).toBeNull();
    const all = screen.getByRole('link', { name: 'See all 6' });
    expect(all.getAttribute('href')).toBe('/hackathons/demo/finder');
  });

  it('narrows both lists by the search text', () => {
    renderLists({ search: 'team 2' });
    expect(screen.getByText('Teams that need people (1)')).toBeTruthy();
    expect(screen.getByText('People looking for a team (0)')).toBeTruthy();
  });

  it('asks the leader with a message and tells the person they will be told', async () => {
    const onChanged = renderLists();
    fireEvent.click(screen.getAllByRole('button', { name: /Ask to join/ })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/short message/i), { target: { value: 'I love UI' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(finder.requestToJoin).toHaveBeenCalledWith('demo', 1, 'I love UI', undefined));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(dialog).toBeTruthy();
  });

  it('asks for the rules and the questions first when the organizers set them, and sends them', async () => {
    const config = { rules: 'Be kind.', require_rules_acceptance: true, registration_questions: [{ key: 'size', label: 'T-shirt size', type: 'text', required: true }] } as any;
    renderLists({ hackathon: config });
    fireEvent.click(screen.getAllByRole('button', { name: /Ask to join/ })[0]);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('Please accept the rules to continue.')).toBeTruthy();
    expect(finder.requestToJoin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(/I have read and accept the rules/));
    fireEvent.change(screen.getByLabelText(/T-shirt size/), { target: { value: 'M' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(finder.requestToJoin).toHaveBeenCalledWith('demo', 1, '', { accept_rules: true, answers: { size: 'M' } }));
  });

  it('shows the server\'s reason in the dialog when the request is refused, and keeps it open', async () => {
    finder.requestToJoin.mockRejectedValue(Object.assign(new Error('That team is already full.'), { body: { code: 'TEAM_FULL' } }));
    renderLists();
    fireEvent.click(screen.getAllByRole('button', { name: /Ask to join/ })[0]);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect((await screen.findByText('That team is already full.')).getAttribute('role')).toBe('alert');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('a team already asked shows that, offers Cancel, and cannot be asked twice', async () => {
    const onChanged = renderLists({ listing: listing({ my_requests: [{ id: 9, team_id: 1, team_name: 'Team 1', status: 'PENDING', message: '', created_at: '', decided_at: null }] }) });
    expect(screen.getByText(/Request sent: waiting for the leader/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Ask to join/ })).toHaveLength(1);   // only the other team
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    await waitFor(() => expect(finder.answerRequest).toHaveBeenCalledWith('demo', 9, 'cancel'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('a declined or cancelled earlier request does not hide the Ask button', () => {
    renderLists({ listing: listing({ my_requests: [{ id: 9, team_id: 1, team_name: 'Team 1', status: 'DECLINED', message: '', created_at: '', decided_at: null }] }) });
    expect(screen.getAllByRole('button', { name: /Ask to join/ })).toHaveLength(2);
  });

  it('someone already on a team cannot ask, and only a leader can invite', () => {
    renderLists({ hasTeam: true });
    expect(screen.queryByRole('button', { name: /Ask to join/ })).toBeNull();
    expect(screen.getByText('Only your team leader can send invites.')).toBeTruthy();
    cleanup();
    renderLists({ hasTeam: true, iAmLeader: true, listing: listing({ seekers: [person(1), person(2, { is_me: true })] }) });
    expect(screen.getAllByRole('button', { name: 'Invite to my team' })).toHaveLength(1);   // not for yourself
  });

  it('sends an invite', async () => {
    renderLists({ hasTeam: true, iAmLeader: true });
    fireEvent.click(screen.getAllByRole('button', { name: 'Invite to my team' })[0]);
    await waitFor(() => expect(finder.invite).toHaveBeenCalledWith('demo', 1));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<FinderLists slug="demo" hackathon={hackathon} listing={listing()} hasTeam={false} iAmLeader={false} onChanged={vi.fn()} />);
    expect((await axe.run(container, { rules: { region: { enabled: false } } })).violations.map((v) => v.id)).toEqual([]);
  });
});

describe('JoinRequestsToAnswer', () => {
  const request = (over: Record<string, unknown> = {}) => ({ id: 5, team_id: 1, team_name: 'Open Door', status: 'PENDING', message: 'hi', created_at: '', decided_at: null, name: 'Sita', profile: 'CSE', skills: 'React', blocked_reason: '', ...over }) as any;

  it('shows nothing when there is nothing to answer', () => {
    const { container } = render(<JoinRequestsToAnswer slug="demo" requests={[]} onChanged={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('accepts and declines, and reloads afterwards', async () => {
    const onChanged = vi.fn();
    render(<JoinRequestsToAnswer slug="demo" requests={[request()]} onChanged={onChanged} />);
    expect(screen.getByText(/"hi"|“hi”|hi/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Accept Sita' }));
    await waitFor(() => expect(finder.answerRequest).toHaveBeenCalledWith('demo', 5, 'accept'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Decline Sita' }));
    await waitFor(() => expect(finder.answerRequest).toHaveBeenCalledWith('demo', 5, 'decline'));
  });

  it('cannot accept when the team is full, but can still decline, and says why', () => {
    render(<JoinRequestsToAnswer slug="demo" requests={[request({ blocked_reason: 'Your team is already full.' })]} onChanged={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Accept Sita' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Decline Sita' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText('Your team is already full.')).toBeTruthy();
  });
});

describe('JoinRequestActions in a notification', () => {
  const note = (over: Record<string, unknown> = {}) => ({ id: 3, title: 'Sita wants to join Open Door', message: 'm', type: 'INFO', category: 'HACKATHON', action_kind: 'JOIN_REQUEST', action_ref: 'my-hack:5', action_outcome: '', is_read: false, read_at: null, created_at: '', created_by_name: 'x', ...over }) as any;

  it('accepts from the notification and reports the outcome', async () => {
    const onOutcome = vi.fn();
    render(<JoinRequestActions notif={note()} onOutcome={onOutcome} />);
    fireEvent.click(screen.getByRole('button', { name: /Accept:/ }));
    await waitFor(() => expect(finder.answerRequest).toHaveBeenCalledWith('my-hack', 5, 'accept'));
    await waitFor(() => expect(onOutcome).toHaveBeenCalledWith(3, 'ACCEPTED'));
  });

  it('a slug with colons-free parts is read right and decline works', async () => {
    const onOutcome = vi.fn();
    render(<JoinRequestActions notif={note({ action_ref: 'a-b-2026:12' })} onOutcome={onOutcome} />);
    fireEvent.click(screen.getByRole('button', { name: /Decline:/ }));
    await waitFor(() => expect(finder.answerRequest).toHaveBeenCalledWith('a-b-2026', 12, 'decline'));
    await waitFor(() => expect(onOutcome).toHaveBeenCalledWith(3, 'DECLINED'));
  });

  it('shows the result instead of buttons once it was answered anywhere', () => {
    render(<JoinRequestActions notif={note({ action_outcome: 'ACCEPTED' })} onOutcome={vi.fn()} />);
    expect(screen.getByText('Accepted')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    render(<JoinRequestActions notif={note({ action_outcome: 'CANCELLED' })} onOutcome={vi.fn()} />);
    expect(screen.getByText('Cancelled by the sender')).toBeTruthy();
  });

  it('when someone else already answered it, the buttons turn into that answer', async () => {
    finder.answerRequest.mockRejectedValue(Object.assign(new Error('This request was already declined.'), { body: { code: 'REQUEST_NOT_PENDING', outcome: 'DECLINED' } }));
    const onOutcome = vi.fn();
    render(<JoinRequestActions notif={note()} onOutcome={onOutcome} />);
    fireEvent.click(screen.getByRole('button', { name: /Accept:/ }));
    await waitFor(() => expect(onOutcome).toHaveBeenCalledWith(3, 'DECLINED'));
  });

  it('any other failure (a full team, for one) is shown and the buttons stay', async () => {
    finder.answerRequest.mockRejectedValue(Object.assign(new Error('This team is already full.'), { body: { code: 'TEAM_FULL' } }));
    const onOutcome = vi.fn();
    render(<JoinRequestActions notif={note()} onOutcome={onOutcome} />);
    fireEvent.click(screen.getByRole('button', { name: /Accept:/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('This team is already full.');
    expect(onOutcome).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: /Accept:/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('a notification with a broken reference offers nothing', () => {
    const { container } = render(<JoinRequestActions notif={note({ action_ref: 'garbage' })} onOutcome={vi.fn()} />);
    expect(container.textContent).toBe('');
  });
});
