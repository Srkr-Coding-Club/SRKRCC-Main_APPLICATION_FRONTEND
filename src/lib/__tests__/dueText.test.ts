import { describe, expect, it } from 'vitest';
import { describeDue } from '../dueText';

const NOW = Date.parse('2026-11-06T10:00:00Z');
const at = (ms: number) => new Date(NOW + ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('describeDue', () => {
  it('says nothing when there is no deadline or it is not a date', () => {
    expect(describeDue(null, NOW)).toBeNull();
    expect(describeDue(undefined, NOW)).toBeNull();
    expect(describeDue('', NOW)).toBeNull();
    expect(describeDue('not a date', NOW)).toBeNull();
  });

  it('is late once the deadline has passed, including right at the deadline', () => {
    expect(describeDue(at(-MIN), NOW)).toEqual({ text: 'The deadline has passed', tone: 'late' });
    expect(describeDue(at(0), NOW)?.tone).toBe('late');
  });

  it('counts minutes inside the last hour and never says 0 min', () => {
    expect(describeDue(at(25 * MIN), NOW)).toEqual({ text: 'Due in 25 min', tone: 'soon' });
    expect(describeDue(at(10_000), NOW)?.text).toBe('Due in 1 min');
  });

  it('counts hours and minutes inside the last day, calm only when more than six hours remain', () => {
    expect(describeDue(at(3 * HOUR + 20 * MIN), NOW)).toEqual({ text: 'Due in 3 h 20 min', tone: 'soon' });
    expect(describeDue(at(8 * HOUR), NOW)).toEqual({ text: 'Due in 8 h', tone: 'calm' });
  });

  it('counts whole days after that, with the right plural', () => {
    expect(describeDue(at(DAY + 2 * HOUR), NOW)).toEqual({ text: 'Due in 1 day', tone: 'calm' });
    expect(describeDue(at(3 * DAY), NOW)).toEqual({ text: 'Due in 3 days', tone: 'calm' });
  });
});
