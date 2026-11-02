import { describe, expect, it } from 'vitest';
import { organizeMyEvents, type RegisteredEventItem } from '@/lib/myEvents';
import type { HackathonTeam } from '@/lib/types';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const at = (offsetHours: number) => new Date(NOW + offsetHours * HOUR).toISOString();

const registration = (id: number, over: Partial<RegisteredEventItem> = {}): RegisteredEventItem => ({
  id, title: `Event ${id}`, track: 'Workshop', date: '', status: 'Seat Confirmed', badgeBg: '', event_slug: `event-${id}`, ...over,
});
const team = (id: number, over: Record<string, unknown> = {}) => ({ id, name: `Team ${id}`, hackathon_slug: `hack-${id}`, status: 'REGISTERED', ...over }) as unknown as HackathonTeam;

const ids = (entries: { key: string }[]) => entries.map((entry) => entry.key);

describe('organizeMyEvents', () => {
  it('puts events still ahead in Upcoming, soonest first, and finished ones in Past, latest first', () => {
    const result = organizeMyEvents([
      registration(1, { start_time: at(48), end_time: at(50) }),
      registration(2, { start_time: at(-30), end_time: at(-28) }),
      registration(3, { start_time: at(5), end_time: at(6) }),
      registration(4, { start_time: at(-5), end_time: at(-3) }),
    ], [], NOW);
    expect(ids(result.upcoming)).toEqual(['event-3', 'event-1']);
    expect(ids(result.past)).toEqual(['event-4', 'event-2']);
  });

  it('keeps an event that is happening right now in Upcoming', () => {
    const result = organizeMyEvents([registration(1, { start_time: at(-1), end_time: at(2) })], [], NOW);
    expect(ids(result.upcoming)).toEqual(['event-1']);
  });

  it('treats an event with only a start as lasting an hour', () => {
    const result = organizeMyEvents([registration(1, { start_time: at(-2) }), registration(2, { start_time: at(-0.5) })], [], NOW);
    expect(ids(result.past)).toEqual(['event-1']);
    expect(ids(result.upcoming)).toEqual(['event-2']);
  });

  it('lists an undated event after the dated ones in Upcoming', () => {
    const result = organizeMyEvents([registration(1), registration(2, { start_time: at(30), end_time: at(31) }), registration(3)], [], NOW);
    expect(ids(result.upcoming)).toEqual(['event-2', 'event-1', 'event-3']);
  });

  it('trusts the server when it says an event has ended', () => {
    expect(ids(organizeMyEvents([registration(1, { event_ended: true })], [], NOW).past)).toEqual(['event-1']);
  });

  it('mixes hackathon teams into the same timeline by their dates', () => {
    const result = organizeMyEvents(
      [registration(1, { start_time: at(10), end_time: at(11) })],
      [team(7, { hackathon_start: at(5), hackathon_end: at(29) }), team(8, { hackathon_start: at(-100), hackathon_end: at(-76) })],
      NOW,
    );
    expect(ids(result.upcoming)).toEqual(['team-7', 'event-1']);
    expect(ids(result.past)).toEqual(['team-8']);
  });

  it('files withdrawn and disqualified teams under Past even before the hackathon ends', () => {
    const result = organizeMyEvents([], [
      team(1, { status: 'WITHDRAWN', hackathon_start: at(10), hackathon_end: at(30) }),
      team(2, { status: 'DISQUALIFIED', hackathon_start: at(10), hackathon_end: at(30) }),
      team(3, { status: 'REGISTERED', hackathon_start: at(10), hackathon_end: at(30) }),
    ], NOW);
    expect(ids(result.past).sort()).toEqual(['team-1', 'team-2']);
    expect(ids(result.upcoming)).toEqual(['team-3']);
  });

  it('keeps plain forms out of the timeline', () => {
    const result = organizeMyEvents([registration(1, { event_slug: null }), registration(2, { event_slug: undefined })], [], NOW);
    expect(result.forms.map((form) => form.id)).toEqual([1, 2]);
    expect(result.upcoming).toEqual([]);
    expect(result.past).toEqual([]);
  });

  it('ignores a date it cannot read', () => {
    const result = organizeMyEvents([registration(1, { start_time: 'not a date' })], [], NOW);
    expect(ids(result.upcoming)).toEqual(['event-1']);
  });
});
