import { describe, expect, it } from 'vitest';
import { buildIcs, eventCalendarEvents, hackathonCalendarEvents } from '@/lib/calendar';
import { roundCountdown, timeUntil } from '@/lib/countdown';
import type { Hackathon } from '@/lib/types';

const hackathon = {
  slug: 'hack-1', title: 'Hack One', theme: 'AI', venue: 'Lab', mode: 'OFFLINE',
  start_date: '2026-12-01T04:00:00Z', end_date: '2026-12-02T04:00:00Z',
} as unknown as Hackathon;

describe('hackathonCalendarEvents rounds', () => {
  it('adds a dated round and skips an undated one', () => {
    const events = hackathonCalendarEvents(hackathon, 'https://x/h', [
      { id: 1, order: 1, name: 'Screening', starts_at: '2026-12-01T05:00:00Z', ends_at: '2026-12-01T07:00:00Z' },
      { id: 2, order: 2, name: 'Final', starts_at: null, ends_at: null },
    ]);
    const round = events.find((e) => e.uid === 'hack-1-round-1');
    expect(round?.title).toBe('Hack One: Round 1, Screening');
    expect(events.some((e) => e.uid === 'hack-1-round-2')).toBe(false);
  });

  it('gives a round with only an end time a short entry at that time', () => {
    const [, round] = hackathonCalendarEvents(hackathon, 'u', [{ id: 3, order: 1, name: 'Pitch', starts_at: null, ends_at: '2026-12-01T09:00:00Z' }]);
    expect(round.end.getTime() - round.start.getTime()).toBe(30 * 60 * 1000);
  });
});

describe('eventCalendarEvents', () => {
  const base = { id: 7, slug: 'ws', title: 'Workshop', venue: 'Hall A', category: 'Workshop' };

  it('returns nothing until the event has a date', () => {
    expect(eventCalendarEvents({ ...base, start_time: null, end_time: null }, 'u')).toEqual([]);
  });

  it('uses the end time, or one hour when it is missing or before the start', () => {
    const [timed] = eventCalendarEvents({ ...base, start_time: '2026-12-01T04:00:00Z', end_time: '2026-12-01T06:00:00Z' }, 'u');
    expect(timed.end.toISOString()).toBe('2026-12-01T06:00:00.000Z');
    const [untimed] = eventCalendarEvents({ ...base, start_time: '2026-12-01T04:00:00Z', end_time: '2026-12-01T03:00:00Z' }, 'u');
    expect(untimed.end.toISOString()).toBe('2026-12-01T05:00:00.000Z');
  });

  it('produces a valid calendar file with the venue', () => {
    const ics = buildIcs(eventCalendarEvents({ ...base, start_time: '2026-12-01T04:00:00Z', end_time: null }, 'https://x/e'));
    expect(ics).toContain('SUMMARY:Workshop');
    expect(ics).toContain('LOCATION:Hall A');
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
  });
});

describe('countdown', () => {
  const now = Date.parse('2026-12-01T00:00:00Z');
  it('formats days, hours and minutes', () => {
    expect(timeUntil('2026-12-03T03:00:00Z', now)).toBe('2 days 3 hours');
    expect(timeUntil('2026-12-01T03:05:00Z', now)).toBe('3 hours 5 min');
    expect(timeUntil('2026-12-01T00:12:00Z', now)).toBe('12 minutes');
    expect(timeUntil('2026-11-30T00:00:00Z', now)).toBeNull();
  });
  it('says when a round starts or ends, and nothing once it is done', () => {
    expect(roundCountdown({ effective_status: 'UPCOMING', starts_at: '2026-12-01T01:00:00Z', ends_at: null }, now)).toBe('Starts in 1 hour 0 min');
    expect(roundCountdown({ effective_status: 'ACTIVE', starts_at: null, ends_at: '2026-12-01T00:30:00Z' }, now)).toBe('Ends in 30 minutes');
    expect(roundCountdown({ effective_status: 'COMPLETED', starts_at: null, ends_at: null }, now)).toBeNull();
  });
});
