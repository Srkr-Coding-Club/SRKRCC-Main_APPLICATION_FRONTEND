import { describe, expect, it } from 'vitest';
import { agoText, BLOCK_ORDER, countdown, currentStage, visibleStages, cumulative, isEventDay, istText, lastPassed, milestones, moneySummary, pipeline, problemBalance, projection, rupees, statusMessage, upcoming } from '../hackathonOverview';

const NOW = new Date('2026-11-10T06:00:00Z');
const at = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

describe('milestones', () => {
  it('lists the dates that exist, earliest first, and skips missing or broken ones', () => {
    const list = milestones({ registration_closes_at: at(48).toISOString(), registration_opens_at: at(-48).toISOString(), idea_deadline: 'nonsense', start_date: null as any });
    expect(list.map((item) => item.key)).toEqual(['registration_opens', 'registration_closes']);
  });

  it('splits upcoming from passed', () => {
    const list = milestones({ registration_opens_at: at(-5).toISOString(), registration_closes_at: at(5).toISOString(), end_date: at(50).toISOString() });
    expect(upcoming(list, NOW, 1).map((item) => item.key)).toEqual(['registration_closes']);
    expect(lastPassed(list, NOW)?.key).toBe('registration_opens');
    expect(lastPassed([], NOW)).toBeNull();
  });
});

describe('countdown', () => {
  it('says days, hours or minutes, and how urgent', () => {
    expect(countdown(at(72), NOW)).toMatchObject({ text: 'in 3 days', urgency: 'calm' });
    expect(countdown(at(30), NOW)).toMatchObject({ text: 'in 1 day', urgency: 'soon' });
    expect(countdown(at(5), NOW)).toMatchObject({ text: 'in 5 hours', urgency: 'urgent' });
    expect(countdown(at(0.25), NOW).text).toBe('in 15 minutes');
    expect(countdown(new Date(NOW.getTime() + 20_000), NOW).text).toBe('in less than a minute');
  });

  it('is calm once it has passed', () => {
    expect(countdown(at(-50), NOW)).toEqual({ text: '2 days ago', urgency: 'calm', past: true });
  });
});

describe('text helpers', () => {
  it('writes IST', () => {
    expect(istText(new Date('2026-11-06T08:33:00Z'))).toMatch(/6 Nov.*2:03 pm IST/i);
  });

  it('says how long ago', () => {
    expect(agoText(NOW.getTime() - 3_000, NOW.getTime())).toBe('just now');
    expect(agoText(NOW.getTime() - 40_000, NOW.getTime())).toBe('40 seconds ago');
    expect(agoText(NOW.getTime() - 60_000, NOW.getTime())).toBe('1 minute ago');
    expect(agoText(NOW.getTime() - 300_000, NOW.getTime())).toBe('5 minutes ago');
  });

  it('formats rupees the Indian way', () => {
    expect(rupees(125000)).toBe('₹1,25,000');
  });
});

describe('isEventDay', () => {
  const event = { start_date: at(2).toISOString(), end_date: at(30).toISOString() };
  it('covers half a day either side of the event', () => {
    expect(isEventDay(event, NOW)).toBe(true);
    expect(isEventDay(event, at(-11))).toBe(false);
    expect(isEventDay(event, at(-8))).toBe(true);
    expect(isEventDay(event, at(43))).toBe(false);
  });
  it('is false without dates', () => expect(isEventDay({}, NOW)).toBe(false));
});

describe('cumulative', () => {
  it('keeps a running total in date order', () => {
    expect(cumulative([{ date: '2026-11-02', count: 4 }, { date: '2026-11-01', count: 2 }])).toEqual([
      { date: '2026-11-01', count: 2, total: 2 }, { date: '2026-11-02', count: 4, total: 6 },
    ]);
  });
});

describe('projection', () => {
  const days = [{ date: day(-6), count: 7 }, { date: day(-3), count: 7 }, { date: day(-1), count: 7 }];
  it('needs three days of activity', () => {
    expect(projection({ days: [{ date: day(-1), count: 5 }], total: 5, limit: 100, endsAt: at(240), now: NOW })).toBeNull();
    expect(projection({ days: [], total: 0, limit: 100, endsAt: at(240), now: NOW })).toBeNull();
  });
  it('reports a full house', () => {
    expect(projection({ days, total: 100, limit: 100, endsAt: at(240), now: NOW })?.state).toBe('full');
  });
  it('says when the limit fills before the close', () => {
    const plan = projection({ days, total: 21, limit: 40, endsAt: at(24 * 30), now: NOW })!;
    expect(plan.state).toBe('fills');
    expect(plan.fullOn!.getTime()).toBeLessThan(at(24 * 30).getTime());
  });
  it('says how short it falls when it does not', () => {
    const plan = projection({ days, total: 21, limit: 500, endsAt: at(24 * 5), now: NOW })!;
    expect(plan.state).toBe('short');
    expect(plan.projected).toBeGreaterThan(21);
  });
  it('projects without a limit, and gives nothing once the close has passed', () => {
    expect(projection({ days, total: 21, limit: null, endsAt: at(24 * 5), now: NOW })?.state).toBe('open');
    expect(projection({ days, total: 21, limit: null, endsAt: at(-1), now: NOW })).toBeNull();
    expect(projection({ days, total: 21, limit: null, endsAt: null, now: NOW })).toBeNull();
  });
});

describe('moneySummary', () => {
  const row = (status: string, amount: number, team_status = 'REGISTERED', hoursAgo = 1) => ({ status, amount, team_status, submitted_at: at(-hoursAgo).toISOString() }) as any;
  it('splits verified, waiting and rejected, and flags the slow ones', () => {
    const sum = moneySummary([row('VERIFIED', 200), row('VERIFIED', 200), row('PENDING', 200, 'PAYMENT_PENDING', 30), row('PENDING', 200, 'PAYMENT_PENDING', 2), row('REJECTED', 200)], NOW);
    expect(sum.verified).toEqual({ count: 2, amount: 400 });
    expect(sum.waiting).toEqual({ count: 2, amount: 400 });
    expect(sum.rejected).toEqual({ count: 1, amount: 200 });
    expect(sum.longWaiting).toBe(1);
    expect(sum.toSettle).toEqual({ count: 1, amount: 200 });
  });
  it('counts money of teams that dropped out as still to settle, unless it was never paid', () => {
    const sum = moneySummary([row('VERIFIED', 200, 'WITHDRAWN'), row('PENDING', 200, 'WITHDRAWN'), row('VERIFIED', 200, 'DISQUALIFIED')], NOW);
    expect(sum.toSettle).toEqual({ count: 2, amount: 400 });
  });
  it('copes with an empty list and odd amounts', () => {
    expect(moneySummary([], NOW).verified).toEqual({ count: 0, amount: 0 });
    expect(moneySummary([row('VERIFIED', 'abc' as any)], NOW).verified.amount).toBe(0);
  });
});

describe('problemBalance', () => {
  it('groups by domain and puts the domains nobody picked first', () => {
    const groups = problemBalance([
      { id: 1, domain: 'Health', teams: 2, max_teams: 2 }, { id: 2, domain: 'Health', teams: 0, max_teams: null },
      { id: 3, domain: 'Agri', teams: 0, max_teams: null }, { id: 4, domain: 'Agri', teams: 0, max_teams: null }, { id: 5, teams: 1, max_teams: null },
    ]);
    expect(groups.map((g) => g.domain)).toEqual(['Agri', 'Health', 'No domain']);
    expect(groups[1]).toEqual({ domain: 'Health', total: 2, picked: 1, untouched: 1, full: 1, teams: 2 });
  });
});

describe('statusMessage', () => {
  const base = { title: 'HackOverflow', now: NOW, registeredTeams: 31, formingTeams: 5, participants: 128, maxParticipants: 240, placedTeams: 36, maxTeams: 60, checkedIn: null, next: null, money: null, ideasToReview: null, attention: [] as string[] };
  it('writes the facts the page shows, and skips what it does not know', () => {
    const text = statusMessage(base);
    expect(text).toContain('*HackOverflow: status on');
    expect(text).toContain('Teams: 31 registered, 5 still forming (36 of 60 team places taken)');
    expect(text).toContain('People: 128 in teams (limit 240)');
    expect(text).not.toContain('Fees');
    expect(text).not.toContain('Needs attention');
  });
  it('adds the next date, fees, ideas, check-in and attention items', () => {
    const line = (count: number, amount: number) => ({ count, amount });
    const text = statusMessage({ ...base, checkedIn: 4, ideasToReview: 2, next: { label: 'Ideas are due', at: at(48) }, attention: ['1 team asks to withdraw'], money: { verified: line(3, 600), waiting: line(1, 200), rejected: line(0, 0), toSettle: line(0, 0), longWaiting: 0 } });
    expect(text).toContain('Next: Ideas are due in 2 days');
    expect(text).toContain('Fees: ₹600 verified from 3 teams, 1 waiting for a check');
    expect(text).toContain('Ideas: 2 waiting for a review');
    expect(text).toContain('Checked in: 4 of 128');
    expect(text).toContain('- 1 team asks to withdraw');
  });
});

describe('pipeline', () => {
  const funnel = [
    { key: 'participants', label: 'People', count: 100 }, { key: 'teams', label: 'Teams', count: 30 }, { key: 'registered', label: 'Registered', count: 20 },
    { key: 'ideas', label: 'Idea', count: 15 }, { key: 'ideas_approved', label: 'Approved', count: 10 }, { key: 'submitted', label: 'Project', count: 6 },
    { key: 'scored', label: 'Scored', count: 6 }, { key: 'shortlisted', label: 'Shortlisted', count: 8 }, { key: 'winners', label: 'Winners', count: 3 },
  ];
  it('starts at registered teams and says what share is left and what was lost', () => {
    const steps = pipeline(funnel, { ideas: true, submissions: true, judging: true });
    expect(steps.map((s) => s.key)).toEqual(['registered', 'ideas', 'ideas_approved', 'submitted', 'scored', 'shortlisted', 'winners']);
    expect(steps[0]).toMatchObject({ share: 100, lost: null });
    expect(steps[1]).toMatchObject({ share: 75, lost: { count: 5, percent: 25 } });
    expect(steps[5].lost).toEqual({ count: 0, percent: 0 });
  });
  it('leaves out the steps of modules that are off, and copes with nothing registered', () => {
    expect(pipeline(funnel, {}).map((s) => s.key)).toEqual(['registered', 'shortlisted', 'winners']);
    expect(pipeline([{ key: 'participants', label: 'P', count: 1 }], {})).toEqual([]);
    const early = pipeline([{ key: 'registered', label: 'R', count: 20 }, { key: 'ideas', label: 'I', count: 10 }, { key: 'submitted', label: 'S', count: 0 }, { key: 'winners', label: 'W', count: 0 }], { ideas: true, submissions: true });
    expect(early.map((s) => s.lost?.count ?? null)).toEqual([null, 10, null, null]);
    expect(pipeline([{ key: 'registered', label: 'R', count: 0 }, { key: 'winners', label: 'W', count: 0 }], {})[1]).toMatchObject({ share: 0, lost: null });
  });
});

describe('currentStage', () => {
  const iso = (hours: number) => at(hours).toISOString();
  const dates = { registration_closes_at: iso(24 * 5), idea_deadline: iso(24 * 8), start_date: iso(24 * 12), end_date: iso(24 * 14), features: { ideas: true } };
  it('follows the dates', () => {
    expect(currentStage(dates, NOW)).toBe('registration');
    expect(currentStage(dates, at(24 * 6))).toBe('ideas');
    expect(currentStage(dates, at(24 * 9))).toBe('rounds');
    expect(currentStage(dates, at(24 * 13))).toBe('event');
    expect(currentStage(dates, at(24 * 15))).toBe('results');
  });
  it('skips the ideas stage when ideas are off, and treats a missing close as still registering', () => {
    expect(currentStage({ ...dates, features: {} }, at(24 * 6))).toBe('rounds');
    expect(currentStage({}, NOW)).toBe('registration');
    expect(visibleStages({}).map((s) => s.key)).not.toContain('ideas');
    expect(BLOCK_ORDER.event[0]).toBe('eventday');
  });
});
