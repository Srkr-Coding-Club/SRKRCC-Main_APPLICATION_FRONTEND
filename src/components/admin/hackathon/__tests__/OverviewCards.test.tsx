import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { remind: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { checkIn: { remindNoShows: (...a: unknown[]) => api.remind(...a) } },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

import { DeadlineStrip } from '../overview/DeadlineStrip';
import { EventDayCard } from '../overview/EventDayCard';
import { MoneyCard } from '../overview/MoneyCard';
import { PipelineCard } from '../overview/PipelineCard';
import { SectionNotice } from '../overview/SectionNotice';
import { StageStrip } from '../overview/StageStrip';
import { ShareSummary } from '../overview/ShareSummary';
import { TrendCard } from '../overview/TrendCard';

const NOW = new Date('2026-11-10T06:00:00Z');
const at = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000).toISOString();
beforeEach(() => api.remind.mockReset());
afterEach(cleanup);

describe('DeadlineStrip', () => {
  it('names the next date, its IST time and what follows', () => {
    render(<DeadlineStrip hackathon={{ registration_closes_at: at(5), idea_deadline: at(50), end_date: at(100) } as any} now={NOW} registrationNote="31 of 60 team places taken" />);
    const next = screen.getByRole('region', { name: 'Next date' });
    expect(next.textContent).toContain('Registration closes');
    expect(next.textContent).toContain('in 5 hours');
    expect(next.textContent).toContain('IST');
    expect(next.textContent).toContain('31 of 60 team places taken');
    expect(screen.getByRole('list', { name: 'After that' }).textContent).toContain('Ideas are due');
  });

  it('says when every date has passed, and renders nothing without dates', () => {
    const { container, rerender } = render(<DeadlineStrip hackathon={{ end_date: at(-30) } as any} now={NOW} />);
    expect(screen.getByText(/Every date has passed/)).toBeTruthy();
    rerender(<DeadlineStrip hackathon={{} as any} now={NOW} />);
    expect(container.textContent).toBe('');
  });
});

describe('TrendCard', () => {
  const analytics = (over: Record<string, unknown> = {}) => ({
    joined_per_day: [{ date: '2026-11-04', count: 5 }, { date: '2026-11-07', count: 10 }, { date: '2026-11-09', count: 8 }],
    capacity: { max_teams: null, max_participants: 100, placed_teams: 5, placed_participants: 23 }, ...over,
  }) as any;

  it('draws the running total with the limit, a sentence on where it is heading and the numbers', () => {
    render(<TrendCard analytics={analytics()} endsAt={new Date('2026-11-20T00:00:00Z')} now={NOW} />);
    expect(screen.getByRole('img', { name: /23 people in teams of a limit of 100/ })).toBeTruthy();
    expect(screen.getByText(/At this pace you reach/)).toBeTruthy();
    expect(screen.getByText('Show the numbers')).toBeTruthy();
    expect(screen.getByRole('table', { hidden: true }).textContent).toContain('23');
  });

  it('says so when nobody has joined or there is too little to project', () => {
    const { rerender } = render(<TrendCard analytics={analytics({ joined_per_day: [] })} endsAt={null} now={NOW} />);
    expect(screen.getByText('Nobody has joined a team yet.')).toBeTruthy();
    rerender(<TrendCard analytics={analytics({ joined_per_day: [{ date: '2026-11-09', count: 3 }] })} endsAt={null} now={NOW} />);
    expect(screen.getByText(/Not enough sign-ups yet/)).toBeTruthy();
  });
});

describe('MoneyCard', () => {
  const line = (count: number, amount: number) => ({ count, amount });
  it('shows verified money, the split, and what is still to settle or slow', () => {
    const onOpen = vi.fn();
    render(<MoneyCard summary={{ verified: line(3, 600), waiting: line(1, 200), rejected: line(1, 200), toSettle: line(2, 400), longWaiting: 1 }} feeAmount={200} onOpen={onOpen} />);
    expect(screen.getAllByText('₹600').length).toBeGreaterThan(0);
    expect(screen.getByText(/still to settle with 2 teams/)).toBeTruthy();
    expect(screen.getByText(/payment has waited over 24 hours/)).toBeTruthy();
    fireEvent.click(screen.getByText('Open payments'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('says nothing was paid yet', () => {
    render(<MoneyCard summary={{ verified: line(0, 0), waiting: line(0, 0), rejected: line(0, 0), toSettle: line(0, 0), longWaiting: 0 }} feeAmount={200} onOpen={() => {}} />);
    expect(screen.getByText('No payment has been submitted yet.')).toBeTruthy();
  });
});

describe('EventDayCard', () => {
  const session = (over: Record<string, unknown>) => ({ id: 1, name: 'Arrival', is_main: true, window: 'OPEN', checked_in: 6, ...over }) as any;
  const noShows = (over: Record<string, unknown> = {}) => ({ window: 'OPEN', teams: [{ team_id: 1, name: 'A', members: 3 }], absent_participants: 4, waitlisted_teams: 1, ...over }) as any;

  it('counts arrivals per session and reminds the people who have not come after a confirmation', async () => {
    api.remind.mockResolvedValue({ reminded: 4 });
    render(<EventDayCard slug="demo" sessions={[session({}), session({ id: 2, name: 'Lunch', is_main: false, window: 'CLOSED', checked_in: 0 })]} noShows={noShows()} participants={10} onOpen={() => {}} onChanged={() => {}} />);
    expect(screen.getByText('Arrival')).toBeTruthy();
    expect(screen.queryByText('Lunch')).toBeNull();
    expect(screen.getByRole('img', { name: 'Arrival: 6 of 10 people' })).toBeTruthy();
    expect(screen.getByText(/in 1 team has not arrived yet/)).toBeTruthy();
    fireEvent.click(screen.getByText('Remind them'));
    fireEvent.click(await screen.findByRole('button', { name: 'Send reminders' }));
    await waitFor(() => expect(api.remind).toHaveBeenCalledWith('demo'));
  });

  it('disables the reminder while check-in is not open, and celebrates a full house', () => {
    const { rerender } = render(<EventDayCard slug="demo" sessions={[session({})]} noShows={noShows({ window: 'CLOSED' })} participants={10} onOpen={() => {}} onChanged={() => {}} />);
    expect((screen.getByText('Remind them').closest('button') as HTMLButtonElement).disabled).toBe(true);
    rerender(<EventDayCard slug="demo" sessions={[session({})]} noShows={noShows({ absent_participants: 0, teams: [] })} participants={10} onOpen={() => {}} onChanged={() => {}} />);
    expect(screen.getByText('Everybody in a registered team has checked in.')).toBeTruthy();
  });
});

describe('SectionNotice', () => {
  it('lists the failed blocks and retries them all', () => {
    const a = vi.fn();
    const b = vi.fn();
    render(<SectionNotice failed={[{ label: 'ideas', retry: a }, { label: 'fees', retry: b }]} />);
    expect(screen.getByRole('status').textContent).toContain('ideas, fees');
    fireEvent.click(screen.getByText('Try again'));
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });
  it('renders nothing when all is well', () => {
    const { container } = render(<SectionNotice failed={[]} />);
    expect(container.textContent).toBe('');
  });
});

describe('ShareSummary', () => {
  it('shows an editable message made when it opens, and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const input = () => ({ title: 'HackOverflow', now: NOW, registeredTeams: 3, formingTeams: 1, participants: 12, maxParticipants: null, placedTeams: null, maxTeams: null, checkedIn: null, next: null, money: null, ideasToReview: null, attention: [] });
    render(<ShareSummary input={input} />);
    fireEvent.click(screen.getByText('Share status'));
    const box = (await screen.findByLabelText('Status message')) as HTMLTextAreaElement;
    expect(box.value).toContain('Teams: 3 registered, 1 still forming');
    fireEvent.change(box, { target: { value: 'edited' } });
    fireEvent.click(screen.getByText('Copy message'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('edited'));
    expect(await screen.findByText('Copied')).toBeTruthy();
  });
});

describe('PipelineCard', () => {
  it('shows each step with its share, the loss since the step above and the biggest drop', () => {
    const funnel = [{ key: 'registered', label: 'Teams registered', count: 20 }, { key: 'ideas', label: 'Teams submitted an idea', count: 10 }, { key: 'winners', label: 'Teams with an award', count: 9 }];
    render(<PipelineCard funnel={funnel} features={{ ideas: true }} participants={64} />);
    expect(screen.getByText('64 people in 20 registered teams')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Teams submitted an idea: 10, 50% of registered teams' })).toBeTruthy();
    expect(screen.getByText('−10 (50%) since the step above')).toBeTruthy();
    expect(screen.getByText(/Biggest drop:/).textContent).toContain('Teams submitted an idea');
  });
  it('renders nothing before any team registers', () => {
    const { container, rerender } = render(<PipelineCard funnel={[]} features={{}} participants={0} />);
    expect(container.textContent).toBe('');
    rerender(<PipelineCard funnel={[{ key: 'registered', label: 'Teams registered', count: 0 }, { key: 'winners', label: 'Teams with an award', count: 0 }]} features={{}} participants={0} />);
    expect(container.textContent).toBe('');
  });
});

describe('StageStrip', () => {
  it('ticks finished stages and marks the current one', () => {
    render(<StageStrip current="rounds" features={{ ideas: true }} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Registration', 'Ideas', 'Selection (now)', 'Event day', 'Results']);
    expect(items[2].getAttribute('aria-current')).toBe('step');
    expect(items[0].getAttribute('aria-current')).toBeNull();
  });
  it('leaves out ideas when that module is off', () => {
    render(<StageStrip current="registration" features={{}} />);
    expect(screen.queryByText('Ideas')).toBeNull();
  });
});

describe('TrendCard edition comparison', () => {
  const base = { joined_per_day: [{ date: '2026-11-09', count: 3 }], capacity: { max_teams: null, max_participants: null, placed_teams: 1, placed_participants: 31 } };
  it('says how far ahead or behind the earlier edition you are', () => {
    const previous = { title: 'HackOverflow 2025', slug: 'h25', point: '2026-11-10T00:00:00Z', teams_then: 9, participants_then: 28, teams_final: 30, participants_final: 110 };
    const { rerender } = render(<TrendCard analytics={{ ...base, previous_edition: previous } as any} endsAt={null} now={NOW} />);
    expect(screen.getByTestId('edition-note').textContent).toContain('HackOverflow 2025 had 28 people in 9 teams at this point, and 110 in 30 by the end. You have 31: 3 ahead');
    rerender(<TrendCard analytics={{ ...base, previous_edition: { ...previous, participants_then: 40 } } as any} endsAt={null} now={NOW} />);
    expect(screen.getByTestId('edition-note').textContent).toContain('9 behind');
    rerender(<TrendCard analytics={{ ...base, previous_edition: null } as any} endsAt={null} now={NOW} />);
    expect(screen.queryByTestId('edition-note')).toBeNull();
  });
});
