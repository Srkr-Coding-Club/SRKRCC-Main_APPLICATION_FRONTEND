import { describe, expect, it } from 'vitest';
import {
  daysLeftText, hidesBanner, isPrivateRoute, needsVerification, restrictsFeatures, urgency,
  type EmailVerificationState,
} from '../emailVerification';

const state = (over: Partial<EmailVerificationState> = {}): EmailVerificationState => ({
  mode: 'features', verified: false, verified_at: null, days_left: 5, deadline: '2026-11-01T00:00:00Z', blocked: false,
  email_masked: 'd**@example.org', pending_email_masked: null, ...over,
});

describe('who needs to verify', () => {
  it('nobody when signed out, when the feature is off, or when already verified', () => {
    expect(needsVerification(null)).toBe(false);
    expect(needsVerification(state({ mode: 'off' }))).toBe(false);
    expect(needsVerification(state({ verified: true, days_left: null }))).toBe(false);
    expect(needsVerification(state())).toBe(true);
  });

  it('features are restricted only once the site enforces them', () => {
    expect(restrictsFeatures(state({ mode: 'banner' }))).toBe(false);
    expect(restrictsFeatures(state({ mode: 'features' }))).toBe(true);
    expect(restrictsFeatures(state({ mode: 'block' }))).toBe(true);
    expect(restrictsFeatures(state({ mode: 'block', verified: true }))).toBe(false);
    expect(restrictsFeatures(null)).toBe(false);
  });
});

describe('the countdown wording', () => {
  it('reads naturally', () => {
    expect(daysLeftText(7)).toBe('7 days left');
    expect(daysLeftText(1)).toBe('1 day left');
    expect(daysLeftText(0)).toBe('Your verification period has ended');
    expect(daysLeftText(null)).toBe('');
    expect(daysLeftText(undefined)).toBe('');
  });

  it('turns urgent in the last two days and once blocked', () => {
    expect(urgency(state({ days_left: 7 }))).toBe('calm');
    expect(urgency(state({ days_left: 3 }))).toBe('calm');
    expect(urgency(state({ days_left: 2 }))).toBe('urgent');
    expect(urgency(state({ days_left: 0 }))).toBe('urgent');
    expect(urgency(state({ days_left: 6, blocked: true }))).toBe('urgent');
  });
});

describe('which screens are private (paused for a blocked person) and which stay public', () => {
  it.each([
    '/profile', '/profile/', '/admin', '/admin/forms', '/admin/builder?slug=x', '/attendance/scan',
    '/hackathons/hack-1/dashboard', '/hackathons/hack-1/manage', '/hackathons/hack-1/check-in', '/hackathons/hack-1/finder',
    '/hackathons/hack-1/judging', '/hackathons/hack-1/certificate', '/hackathons/hack-1/dashboard/teams',
  ])('%s is private', (path) => expect(isPrivateRoute(path)).toBe(true));

  it.each([
    '/', '/about', '/events', '/events/some-event', '/forms', '/forms/some-form', '/hackathons', '/hackathons/hack-1',
    '/blogs', '/career', '/codequest', '/iconcoders', '/login', '/signup', '/403',
    '/account/verify-email', '/account/verify-email/not-me', '/account/setup-password', '/certificates/verify/ABC123',
  ])('%s is public', (path) => expect(isPrivateRoute(path)).toBe(false));

  it('does not mistake look-alike paths for private ones', () => {
    expect(isPrivateRoute('/profiles')).toBe(false);
    expect(isPrivateRoute('/administrator')).toBe(false);
    expect(isPrivateRoute('/hackathons/hack-1/dashboards-info')).toBe(false);
    expect(isPrivateRoute('/blogs/profile')).toBe(false);
  });

  it('hides the banner where it would only be noise', () => {
    expect(hidesBanner('/account/verify-email')).toBe(true);
    expect(hidesBanner('/account/verify-email/not-me')).toBe(true);
    expect(hidesBanner('/login')).toBe(true);
    expect(hidesBanner('/signup')).toBe(true);
    expect(hidesBanner('/forms')).toBe(false);
    expect(hidesBanner('/')).toBe(false);
  });
});
