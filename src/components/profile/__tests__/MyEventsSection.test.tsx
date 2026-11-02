import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const myTeams = vi.fn();
const myInvites = vi.fn();
vi.mock('@/lib/api/hackathons', () => ({ hackathonApi: { myTeams: (...a: unknown[]) => myTeams(...a), myInvites: (...a: unknown[]) => myInvites(...a) } }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));

import { MyEventsSection } from '../MyEventsSection';
import type { RegisteredEventItem } from '@/lib/myEvents';

const HOUR = 60 * 60 * 1000;
const at = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();
const event = (id: number, title: string, over: Partial<RegisteredEventItem> = {}): RegisteredEventItem => ({
  id, title, track: 'Workshop', date: '2026-11-12', status: 'Seat Confirmed', badgeBg: '', event_slug: `e-${id}`, ...over,
});
const handlers = { cancellingId: null, onShowQr: vi.fn(), onRate: vi.fn(), onCancel: vi.fn(), emptyState: <p>Nothing registered yet</p> };

beforeEach(() => {
  myTeams.mockReset(); myInvites.mockReset();
  myTeams.mockResolvedValue([]); myInvites.mockResolvedValue([]);
  Object.values(handlers).forEach((fn) => typeof fn === 'function' && 'mockReset' in fn && (fn as any).mockReset());
});
afterEach(cleanup);

describe('MyEventsSection', () => {
  it('shows Upcoming first and moves finished events to the Past tab', async () => {
    render(<MyEventsSection {...handlers} registrations={[
      event(1, 'Next Workshop', { start_time: at(24), end_time: at(26) }),
      event(2, 'Old Talk', { start_time: at(-48), end_time: at(-46), event_ended: true }),
    ]} />);
    expect(await screen.findByText('Next Workshop')).toBeTruthy();
    expect(screen.queryByText('Old Talk')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Past/ }));
    expect(screen.getByText('Old Talk')).toBeTruthy();
    expect(screen.queryByText('Next Workshop')).toBeNull();
  });

  it('opens on Past when nothing is coming up', async () => {
    render(<MyEventsSection {...handlers} registrations={[event(2, 'Old Talk', { start_time: at(-48), end_time: at(-46), event_ended: true })]} />);
    expect(await screen.findByText('Old Talk')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Past/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('puts hackathon teams in the same list and invitations above the tabs', async () => {
    myTeams.mockResolvedValue([{ id: 7, name: 'Bytes', hackathon_slug: 'hackfest', hackathon_title: 'HackFest', status: 'REGISTERED', member_count: 3, hackathon_start: at(24), hackathon_end: at(48), problem_statement: null, open_innovation: null }]);
    myInvites.mockResolvedValue([{ id: 1, hackathon_slug: 'other', hackathon_title: 'Other Hack', team_name: 'Rockets', invited_by_name: 'Ravi' }]);
    render(<MyEventsSection {...handlers} registrations={[event(1, 'Next Workshop', { start_time: at(72), end_time: at(74) })]} />);
    expect(await screen.findByText('Bytes')).toBeTruthy();
    expect(screen.getByText('Invite to join Rockets')).toBeTruthy();
    const listed = screen.getByRole('tabpanel').textContent ?? '';
    expect(listed.indexOf('Bytes')).toBeLessThan(listed.indexOf('Next Workshop'));
  });

  it('lists plain forms in their own group, outside the tabs', async () => {
    render(<MyEventsSection {...handlers} registrations={[event(5, 'Club Survey', { event_slug: null })]} />);
    const group = await screen.findByLabelText('Form registrations');
    expect(within(group).getByText('Club Survey')).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('shows the empty state only once nothing is registered anywhere', async () => {
    render(<MyEventsSection {...handlers} registrations={[]} />);
    expect(await screen.findByText('Nothing registered yet')).toBeTruthy();
  });

  it('switches tabs with the arrow keys', async () => {
    render(<MyEventsSection {...handlers} registrations={[
      event(1, 'Next Workshop', { start_time: at(24), end_time: at(26) }),
      event(2, 'Old Talk', { start_time: at(-48), end_time: at(-46), event_ended: true }),
    ]} />);
    const upcoming = await screen.findByRole('tab', { name: /Upcoming/ });
    fireEvent.keyDown(upcoming, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('tab', { name: /Past/ }).getAttribute('aria-selected')).toBe('true'));
  });

  it('passes the right event to the rate and cancel actions', async () => {
    render(<MyEventsSection {...handlers} registrations={[event(1, 'Next Workshop', { start_time: at(24), end_time: at(26), event_started: false })]} />);
    fireEvent.click(await screen.findByRole('button', { name: /Cancel registration/ }));
    expect(handlers.onCancel).toHaveBeenCalledWith(expect.objectContaining({ id: 1, title: 'Next Workshop' }));
  });

  it('tells the member until when they can cancel when the organizers set a cutoff', async () => {
    const closesAt = new Date(Date.now() + 20 * HOUR).toISOString();
    render(<MyEventsSection {...handlers} registrations={[event(1, 'Next Workshop', { start_time: at(48), end_time: at(50), cancellation: { allowed: true, reason: null, closes_at: closesAt } })]} />);
    expect(await screen.findByRole('button', { name: /Cancel registration/ })).toBeTruthy();
    expect(screen.getByText(/You can cancel until .* IST\./)).toBeTruthy();
  });

  it('shows no closing time when there is no cutoff, and offers the button', async () => {
    render(<MyEventsSection {...handlers} registrations={[event(1, 'Next Workshop', { start_time: at(48), end_time: at(50), cancellation: { allowed: true, reason: null, closes_at: null } })]} />);
    expect(await screen.findByRole('button', { name: /Cancel registration/ })).toBeTruthy();
    expect(screen.queryByText(/You can cancel until/)).toBeNull();
  });

  it('removes the button and says why when cancelling is locked or the cutoff has passed', async () => {
    render(<MyEventsSection {...handlers} registrations={[
      event(1, 'Locked Talk', { start_time: at(48), end_time: at(50), cancellation: { allowed: false, reason: 'CANCELLATION_LOCKED', closes_at: null } }),
      event(2, 'Late Talk', { start_time: at(30), end_time: at(32), cancellation: { allowed: false, reason: 'CANCELLATION_CLOSED', closes_at: null } }),
    ]} />);
    await screen.findByText('Locked Talk');
    expect(screen.queryByRole('button', { name: /Cancel registration/ })).toBeNull();
    expect(screen.getByText(/Cancelling is closed for this event/)).toBeTruthy();
    expect(screen.getByText(/Cancelling has closed for this event/)).toBeTruthy();
  });
});

