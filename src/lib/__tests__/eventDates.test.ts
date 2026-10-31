import { describe, expect, it } from 'vitest';
import { formatEventDates, formatShortDate, registrationLine } from '../eventDates';

describe('formatEventDates', () => {
  it('writes a one-day event once, and a range as compactly as the dates allow', () => {
    expect(formatEventDates('2026-12-18T04:30:00Z', '2026-12-18T12:30:00Z')).toBe('18 Dec 2026');
    expect(formatEventDates('2026-12-18T04:30:00Z', '2026-12-19T12:30:00Z')).toBe('18-19 Dec 2026');
    expect(formatEventDates('2026-11-30T04:30:00Z', '2026-12-02T12:30:00Z')).toBe('30 Nov - 2 Dec 2026');
    expect(formatEventDates('2026-12-30T04:30:00Z', '2027-01-02T12:30:00Z')).toBe('30 Dec 2026 - 2 Jan 2027');
  });

  it('counts days in Indian time, not UTC: an event from 11 pm to 6 am IST spans two days', () => {
    // 17:30 UTC on the 18th is 11 pm IST on the 18th; 00:30 UTC on the 19th is 6 am IST on the 19th.
    expect(formatEventDates('2026-12-18T17:30:00Z', '2026-12-19T00:30:00Z')).toBe('18-19 Dec 2026');
    // 19:00 UTC on the 18th is 12:30 am IST on the 19th: the same IST day as 6 am on the 19th.
    expect(formatEventDates('2026-12-18T19:00:00Z', '2026-12-19T00:30:00Z')).toBe('19 Dec 2026');
  });

  it('leaves the line out for missing or broken dates, and shows one date when the end is missing', () => {
    expect(formatEventDates(null, null)).toBe('');
    expect(formatEventDates('nonsense', '2026-12-19T00:00:00Z')).toBe('');
    expect(formatEventDates('2026-12-18T04:30:00Z', null)).toBe('18 Dec 2026');
    expect(formatEventDates('2026-12-18T04:30:00Z', 'nonsense')).toBe('18 Dec 2026');
  });
});

describe('registrationLine', () => {
  const now = new Date('2026-11-10T06:00:00Z');
  it('says when it closes while open, with or without a closing date', () => {
    expect(registrationLine({ closed: false, open: true, closesAt: '2026-11-30T18:29:00Z', now })).toBe('Registration closes 30 Nov 2026');
    expect(registrationLine({ closed: false, open: true, now })).toBe('Registration is open');
  });
  it('says when it opens if it has not yet, and that it is closed otherwise', () => {
    expect(registrationLine({ closed: false, open: false, opensAt: '2026-11-20T00:00:00Z', now })).toBe('Registration opens 20 Nov 2026');
    expect(registrationLine({ closed: false, open: false, opensAt: '2026-11-01T00:00:00Z', now })).toBe('Registration closed');
    expect(registrationLine({ closed: true, open: false, closesAt: '2026-11-30T00:00:00Z', now })).toBe('Registration closed');
  });
  it('never mentions a number of teams', () => {
    for (const line of [registrationLine({ closed: false, open: true, closesAt: '2026-11-30T00:00:00Z', now }), registrationLine({ closed: true, open: false, now })]) expect(line).not.toMatch(/team/i);
  });
});

describe('formatShortDate', () => {
  it('uses Indian time', () => {
    expect(formatShortDate('2026-11-30T20:00:00Z')).toBe('1 Dec 2026');
  });
});
