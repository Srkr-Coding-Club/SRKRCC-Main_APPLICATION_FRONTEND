import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { stats: vi.fn(), analytics: vi.fn(), ideas: vi.fn(), payments: vi.fn(), remindForming: vi.fn(), finder: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: {
    exportFile: vi.fn(),
    admin: {
      stats: (...a: unknown[]) => api.stats(...a), analytics: (...a: unknown[]) => api.analytics(...a), ideas: (...a: unknown[]) => api.ideas(...a),
      payments: (...a: unknown[]) => api.payments(...a), finder: (...a: unknown[]) => api.finder(...a), remindForming: (...a: unknown[]) => api.remindForming(...a),
    },
  },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

import { HackathonOverviewTab } from '../HackathonOverviewTab';

const problems = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, code: `PS-${String(i + 1).padStart(3, '0')}`, title: `Problem number ${i + 1}`, teams: i === 0 ? 2 : 0, max_teams: null }));
const stats = (over: Record<string, unknown> = {}) => ({
  teams_by_status: { FORMING: 0, REGISTERED: 3, PAYMENT_PENDING: 0 }, teams_total: 3, participants: 15, pending_invites: 1, open_innovation_teams: 1,
  problem_statements: problems, rounds: [{ id: 1, order: 1, name: 'Idea review', results_published: false, total: 4, details_submitted: 0, SHORTLISTED: 2, REJECTED: 1, PENDING: 1 }],
  forming_teams: [], min_team_size: 2, registration_closes_at: null, is_registration_open: true, ...over,
});
const analytics = (over: Record<string, unknown> = {}) => ({
  funnel: [{ key: 'joined', label: 'Participants joined a team', count: 15 }], checked_in: 4, waitlisted_teams: 0,
  by_branch: [{ label: 'CSE', count: 8 }], by_year: [{ label: 'Year 1', count: 11 }], by_college: [{ label: 'SRKR', count: 15 }], joined_per_day: [],
  capacity: { max_teams: 10, max_participants: null, placed_teams: 3, placed_participants: 15 }, ...over,
});

const show = (onNavigate = vi.fn()) => ({ onNavigate, ...render(<HackathonOverviewTab slug="demo" onNavigate={onNavigate} />) });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.stats.mockResolvedValue(stats());
  api.analytics.mockResolvedValue(analytics());
  api.ideas.mockResolvedValue({ counts: { SUBMITTED: 0, APPROVED: 0, CHANGES_REQUESTED: 0, REJECTED: 0 } });
  api.payments.mockResolvedValue({ counts: { PENDING: 0, VERIFIED: 0, REJECTED: 0 }, fee_amount: 0, stage: 'NONE', payments: [] });
  api.finder.mockResolvedValue({ enabled: true, stats: { seekers_waiting: 0, teams_recruiting: 0, requests_pending: 0, requests_stuck: 0, matched: 0, median_hours_to_match: null }, seekers: [], teams: [], requests: [] });
});
afterEach(cleanup);

describe('HackathonOverviewTab', () => {
  it('says all clear when nothing waits for an organizer, and shows the headline numbers', async () => {
    show();
    expect(await screen.findByText(/All clear/)).toBeTruthy();
    expect(screen.getByText('Registered teams').parentElement!.parentElement!.textContent).toContain('3');
    expect(screen.getByText('Team places left').parentElement!.parentElement!.textContent).toContain('7');
    expect(screen.getByText('3 of 10 taken')).toBeTruthy();
    expect(screen.getByText('of 15 participants')).toBeTruthy();
  });

  it('puts everything that needs attention in one strip, each with a button to the right tab', async () => {
    api.stats.mockResolvedValue(stats({ teams_by_status: { FORMING: 1, REGISTERED: 2, PAYMENT_PENDING: 2 }, forming_teams: [{ id: 9, name: 'Tiny', leader_email: 'a@x.io', members: 1, needed: 1 }] }));
    api.ideas.mockResolvedValue({ counts: { SUBMITTED: 1, APPROVED: 0, CHANGES_REQUESTED: 0, REJECTED: 0 } });
    api.analytics.mockResolvedValue(analytics({ waitlisted_teams: 3 }));
    const { onNavigate } = show();
    const strip = await screen.findByRole('region', { name: 'Needs attention' });
    expect(within(strip).getByText('teams are waiting for their payment to be checked')).toBeTruthy();
    expect(within(strip).getByText('idea is waiting for a review')).toBeTruthy();
    expect(within(strip).getByText('team is below the minimum size of 2')).toBeTruthy();
    expect(within(strip).getByText('teams are on the waitlist')).toBeTruthy();
    fireEvent.click(within(strip).getByText('teams are waiting for their payment to be checked').closest('button')!);
    expect(onNavigate).toHaveBeenCalledWith('payments');
    fireEvent.click(within(strip).getByText('idea is waiting for a review').closest('button')!);
    expect(onNavigate).toHaveBeenCalledWith('ideas');
  });

  it('adds the finder to the strip: stuck join requests, and people waiting while teams have room', async () => {
    const listed = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    api.finder.mockResolvedValue({
      enabled: true, stats: { seekers_waiting: 2, teams_recruiting: 1, requests_pending: 2, requests_stuck: 2, matched: 0, median_hours_to_match: null },
      seekers: [{ id: 1, status: 'WAITING', listed_at: listed }, { id: 2, status: 'WAITING', listed_at: new Date().toISOString() }], teams: [], requests: [],
    });
    const { onNavigate } = show();
    const strip = await screen.findByRole('region', { name: 'Needs attention' });
    expect(within(strip).getByText('join requests have waited over 48 hours for a team leader')).toBeTruthy();
    expect(within(strip).getByText('person has been looking for a team for 3+ days while teams have room')).toBeTruthy();
    fireEvent.click(within(strip).getByText('join requests have waited over 48 hours for a team leader').closest('button')!);
    expect(onNavigate).toHaveBeenCalledWith('finder');
  });

  it('says nothing about the finder when it is off or the person may not see it', async () => {
    api.finder.mockResolvedValue({ enabled: false, stats: { requests_stuck: 5, teams_recruiting: 1 }, seekers: [], teams: [], requests: [] });
    show();
    expect(await screen.findByText(/All clear/)).toBeTruthy();
    cleanup();
    api.finder.mockRejectedValue(new Error('forbidden'));
    show();
    expect(await screen.findByText(/All clear/)).toBeTruthy();
  });

  it('shows money only when a fee is collected, and a missing optional number never breaks the page', async () => {
    api.payments.mockResolvedValue({ counts: { PENDING: 1, VERIFIED: 3, REJECTED: 0 }, fee_amount: 200, stage: 'REGISTRATION', payments: [] });
    api.ideas.mockRejectedValue(new Error('forbidden'));
    show();
    expect(await screen.findByText('₹600')).toBeTruthy();
    expect(screen.getByText('3 teams · 1 to check')).toBeTruthy();
    expect(screen.queryByText('Rounds', { selector: 'span' })).toBeNull();
  });

  it('lists the busiest problem statements first, with the rest behind a search', async () => {
    show();
    await screen.findByRole('region', { name: 'Problem statement uptake' });
    const region = screen.getByRole('region', { name: 'Problem statement uptake' });
    expect(within(region).getByText(/PS-001/)).toBeTruthy();
    expect(within(region).queryByText(/PS-012/)).toBeNull();
    expect(within(region).getByText('2 teams')).toBeTruthy();
    expect(region.textContent).toContain('11 of 12 statements not picked yet');
    fireEvent.change(within(region).getByRole('textbox'), { target: { value: 'number 12' } });
    expect(within(region).getByText(/PS-012/)).toBeTruthy();
    fireEvent.change(within(region).getByRole('textbox'), { target: { value: 'zzz' } });
    expect(within(region).getByText(/Nothing matches/)).toBeTruthy();
    fireEvent.change(within(region).getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(within(region).getByText(/Show all 12/));
    expect(within(region).getByText(/PS-012/)).toBeTruthy();
  });

  it('draws each round as a bar with a readable summary and flags unpublished results', async () => {
    show();
    const bar = await screen.findByRole('img', { name: '2 shortlisted, 1 not shortlisted, 1 pending of 4' });
    expect(bar).toBeTruthy();
    expect(screen.getByText('Unpublished')).toBeTruthy();
  });

  it('switches the participant breakdown between branch, year and college', async () => {
    show();
    await waitFor(() => expect(screen.getByText('CSE')).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: 'By year' }));
    expect(screen.getByText('Year 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'By college' }));
    expect(screen.getByText('SRKR')).toBeTruthy();
    expect(api.analytics).toHaveBeenCalledTimes(1);   // the panel reuses what the overview loaded
  });
});
