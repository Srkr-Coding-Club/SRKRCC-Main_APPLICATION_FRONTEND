import { describe, expect, it } from 'vitest';
import { clampDelay, redirectProblem, safeRedirectTarget } from '../afterSubmit';

// The same cases as apps/forms/tests/test_after_submit.py: the browser and the server must agree on what is safe.
const refused = ['javascript:alert(1)', '//evil.example', 'http://plain.example', 'data:text/html,x', '/a b', 'https://user:pw@x.example', 'ftp://x.example', '/\\evil'];
const allowed = ['https://example.org/thanks?x=1', '/events/42'];

describe('redirectProblem', () => {
  it.each(refused)('refuses %s', (url) => {
    expect(redirectProblem(url)).not.toBeNull();
    expect(safeRedirectTarget(url)).toBeNull();
  });

  it.each(allowed)('accepts %s', (url) => {
    expect(redirectProblem(url)).toBeNull();
    expect(safeRedirectTarget(url)).toBe(url);
  });

  it('treats blank as "no redirect", not as a problem', () => {
    for (const blank of ['', '   ', null, undefined]) {
      expect(redirectProblem(blank)).toBeNull();
      expect(safeRedirectTarget(blank)).toBeNull();
    }
  });

  it('refuses very long addresses', () => {
    expect(redirectProblem(`https://example.org/${'a'.repeat(500)}`)).not.toBeNull();
  });

  it('trims what it returns', () => {
    expect(safeRedirectTarget('  /events  ')).toBe('/events');
  });
});

describe('clampDelay', () => {
  it('keeps the delay within 0-30 seconds and falls back to 5 for nonsense', () => {
    expect(clampDelay(3)).toBe(3);
    expect(clampDelay('7')).toBe(7);
    expect(clampDelay(-4)).toBe(0);
    expect(clampDelay(99)).toBe(30);
    expect(clampDelay(2.9)).toBe(2);
    expect(clampDelay('abc')).toBe(5);
    expect(clampDelay(undefined)).toBe(5);
  });
});
