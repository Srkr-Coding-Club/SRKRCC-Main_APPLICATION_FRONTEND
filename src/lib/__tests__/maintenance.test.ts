import { describe, expect, it } from 'vitest';
import { ago } from '../maintenance';

const now = new Date('2026-10-24T12:00:00Z').getTime();
const before = (seconds: number) => new Date(now - seconds * 1000).toISOString();

describe('ago', () => {
  it('says never when there is no date', () => {
    expect(ago(null, now)).toBe('never');
  });

  it('counts minutes, hours and days in plain words', () => {
    expect(ago(before(20), now)).toBe('just now');
    expect(ago(before(60), now)).toBe('1 minute ago');
    expect(ago(before(59 * 60), now)).toBe('59 minutes ago');
    expect(ago(before(3600), now)).toBe('1 hour ago');
    expect(ago(before(5 * 3600), now)).toBe('5 hours ago');
    expect(ago(before(24 * 3600), now)).toBe('yesterday');
    expect(ago(before(9 * 24 * 3600), now)).toBe('9 days ago');
  });

  it('never goes negative when the clocks disagree', () => {
    expect(ago(before(-500), now)).toBe('just now');
  });
});
