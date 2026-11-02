import { describe, expect, it } from 'vitest';
import {
  eventAvailability, eventPoster, formatEventDay, formatEventDayWithYear, formatEventTimeRange, listingPhase, registrationWindowLine, seatsLabel, seatsLeft, splitByPhase,
} from '@/lib/eventListing';

const NOW = new Date('2026-11-10T06:00:00Z');
const at = (hours: number) => new Date(NOW.getTime() + hours * 3600_000).toISOString();
const event = (over: Record<string, unknown> = {}) => ({ status: 'LIVE', capacity: 100, registration_count: 10, registration_opens_at: null, registration_closes_at: null, ...over }) as any;

describe('formatting in IST', () => {
  it('prints the day and the times in Indian time whatever the machine zone is', () => {
    expect(formatEventDay('2026-11-10T20:00:00Z')).toBe('Wed, Nov 11');          // 1:30 AM next day in IST
    expect(formatEventDayWithYear('2026-11-10T06:00:00Z')).toBe('Nov 10, 2026');
    expect(formatEventTimeRange('2026-11-10T06:00:00Z', '2026-11-10T08:30:00Z')).toBe('11:30 AM - 2:00 PM');
  });

  it('says "To be announced" when there is no date, and shows only the start when there is no end', () => {
    expect(formatEventDay(null)).toBe('To be announced');
    expect(formatEventTimeRange(null, null)).toBe('To be announced');
    expect(formatEventTimeRange('2026-11-10T06:00:00Z', null)).toBe('11:30 AM');
    expect(formatEventDay('nonsense')).toBe('To be announced');
  });
});

describe('eventAvailability', () => {
  it('is open with seats, dates unset', () => {
    expect(eventAvailability(event(), NOW)).toMatchObject({ kind: 'OPEN', label: 'Registration open', canRegister: true, fillingFast: false });
  });

  it('is closed when the organizers closed it, even with seats left', () => {
    expect(eventAvailability(event({ status: 'CLOSED' }), NOW)).toMatchObject({ kind: 'CLOSED', canRegister: false });
  });

  it('is full when no seats are left, and filling fast at 15% or less', () => {
    expect(eventAvailability(event({ registration_count: 100 }), NOW)).toMatchObject({ kind: 'FULL', label: 'Event full', canRegister: false });
    expect(eventAvailability(event({ registration_count: 85 }), NOW)).toMatchObject({ kind: 'OPEN', fillingFast: true });
    expect(eventAvailability(event({ registration_count: 84 }), NOW)).toMatchObject({ fillingFast: false });
  });

  it('is not open yet before the registration opens, and over after it closes', () => {
    expect(eventAvailability(event({ registration_opens_at: at(5) }), NOW)).toMatchObject({ kind: 'NOT_YET_OPEN', label: 'Opens soon', canRegister: false });
    expect(eventAvailability(event({ registration_closes_at: at(-1) }), NOW)).toMatchObject({ kind: 'ENDED', label: 'Registration closed', canRegister: false });
    expect(eventAvailability(event({ registration_opens_at: at(-5), registration_closes_at: at(5) }), NOW).canRegister).toBe(true);
  });

  it('treats an event with no capacity set as never full', () => {
    expect(eventAvailability(event({ capacity: 0 }), NOW).kind).toBe('OPEN');
  });
});

describe('seats, the window line and the poster', () => {
  it('counts seats left and never goes below zero', () => {
    expect(seatsLeft(event())).toBe(90);
    expect(seatsLeft(event({ registration_count: 150 }))).toBe(0);
    expect(seatsLeft({ capacity: 5 } as any)).toBe(5);
  });

  it('names the next thing about registration, or nothing', () => {
    expect(registrationWindowLine(event({ registration_opens_at: at(5) }), NOW)).toMatch(/^Registration opens Nov 10, 2026, /);
    expect(registrationWindowLine(event({ registration_closes_at: at(30) }), NOW)).toMatch(/^Registration closes Nov 11, 2026, /);
    expect(registrationWindowLine(event({ registration_closes_at: at(-3) }), NOW)).toBeNull();
    expect(registrationWindowLine(event(), NOW)).toBeNull();
  });

  it('only uses a poster whose address is safe', () => {
    expect(eventPoster({ poster_image: 'https://cdn.example.org/p.png' })).toBe('https://cdn.example.org/p.png');
    expect(eventPoster({ poster_image: 'javascript:alert(1)' })).toBeNull();
    expect(eventPoster({ poster_image: null })).toBeNull();
  });
});


describe('listingPhase and splitByPhase', () => {
  it('tells what is over, what is on and what is ahead', () => {
    expect(listingPhase(at(-30), at(-27), NOW)).toBe('PAST');
    expect(listingPhase(at(-1), at(2), NOW)).toBe('LIVE');
    expect(listingPhase(at(48), at(50), NOW)).toBe('UPCOMING');
  });

  it('treats an undated item as ahead, and an item with only a start as an hour long', () => {
    expect(listingPhase(null, null, NOW)).toBe('UPCOMING');
    expect(listingPhase(at(-2), null, NOW)).toBe('PAST');
    expect(listingPhase(at(-0.5), null, NOW)).toBe('LIVE');
  });

  it('puts an item ending this very moment in the past', () => {
    expect(listingPhase(at(-3), NOW.toISOString(), NOW)).toBe('PAST');
  });

  it('splits a list: soonest upcoming first, undated last, latest past first', () => {
    const rows = [
      { id: 'later', start: at(72), end: at(74) },
      { id: 'undated', start: null, end: null },
      { id: 'soon', start: at(5), end: at(6) },
      { id: 'old', start: at(-100), end: at(-98) },
      { id: 'recent', start: at(-30), end: at(-28) },
      { id: 'now', start: at(-1), end: at(1) },
    ];
    const result = splitByPhase(rows, (row) => row, NOW);
    expect(result.live.map((r) => r.id)).toEqual(['now']);
    expect(result.upcoming.map((r) => r.id)).toEqual(['soon', 'later', 'undated']);
    expect(result.past.map((r) => r.id)).toEqual(['recent', 'old']);
  });

  it('keeps every item exactly once', () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ id: i, start: at(i * 20 - 60), end: at(i * 20 - 58) }));
    const { live, upcoming, past } = splitByPhase(rows, (row) => row, NOW);
    expect(live.length + upcoming.length + past.length).toBe(7);
  });
});

describe('ended events and seat wording', () => {
  it('marks an event that is over as ended, ahead of every other state', () => {
    expect(eventAvailability(event({ start_time: at(-30), end_time: at(-27) }), NOW)).toMatchObject({ kind: 'PAST', label: 'Event ended', canRegister: false });
    expect(eventAvailability(event({ start_time: at(-30), end_time: at(-27), status: 'CLOSED', registration_count: 100 }), NOW).kind).toBe('PAST');
  });

  it('keeps an event that is on now or ahead open for registration', () => {
    expect(eventAvailability(event({ start_time: at(-1), end_time: at(2) }), NOW).kind).toBe('OPEN');
    expect(eventAvailability(event({ start_time: at(40), end_time: at(42) }), NOW).kind).toBe('OPEN');
  });

  it('says "1 seat" and "100 seats"', () => {
    expect(seatsLabel(1)).toBe('1 seat');
    expect(seatsLabel(0)).toBe('0 seats');
    expect(seatsLabel(100)).toBe('100 seats');
  });
});
