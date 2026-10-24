/**
 * Email verification, as the website sees it. The rules live on the server (apps/accounts/services/email_verification.py);
 * this file only holds the shapes the API sends, the one event the API client raises, and small helpers.
 */

/** The 403 code the API answers with when a feature needs a verified address (or the account is blocked). */
export const VERIFICATION_REQUIRED_CODE = 'EMAIL_VERIFICATION_REQUIRED';
/** Raised on `window` by the API client for such an answer, so one dialog can explain it wherever it happened. */
export const VERIFICATION_REQUIRED_EVENT = 'srkrcc:verification-required';

export type VerificationMode = 'off' | 'banner' | 'features' | 'block';

export interface EmailVerificationState {
  mode: VerificationMode;
  verified: boolean;
  verified_at: string | null;
  /** Whole days until the block (rounded up); null once verified. */
  days_left: number | null;
  deadline: string | null;
  /** The deadline has passed and the server is refusing private requests. */
  blocked: boolean;
  email_masked: string;
  pending_email_masked: string | null;
}

export interface VerificationRequiredDetail {
  detail?: string;
  code?: string;
  reason?: 'feature' | 'staff' | 'deadline';
  blocked?: boolean;
  days_left?: number | null;
}

/** Anything to show at all? Nothing when the feature is off, the person is signed out, or they are already verified. */
export function needsVerification(state: EmailVerificationState | null): state is EmailVerificationState {
  return !!state && state.mode !== 'off' && !state.verified;
}

/** Features are restricted (not just announced) for an unverified person. */
export function restrictsFeatures(state: EmailVerificationState | null): boolean {
  return needsVerification(state) && (state.mode === 'features' || state.mode === 'block');
}

export function daysLeftText(daysLeft: number | null | undefined): string {
  if (daysLeft === null || daysLeft === undefined) return '';
  if (daysLeft <= 0) return 'Your verification period has ended';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}

/** 'calm' while there is time, 'urgent' in the last two days or once blocked. */
export function urgency(state: EmailVerificationState): 'calm' | 'urgent' {
  return state.blocked || (state.days_left !== null && state.days_left <= 2) ? 'urgent' : 'calm';
}

/**
 * Screens that need a signed-in, verified person. Everything else (home, events, forms, hackathons, blogs, careers,
 * CodeQuest, login, signup, the verification pages) stays open to a blocked person, as the server also allows.
 */
const PRIVATE_PREFIXES = ['/profile', '/admin', '/attendance'];
const PRIVATE_HACKATHON_PAGE = /^\/hackathons\/[^/]+\/(dashboard|manage|check-in|finder|judging|certificate)(\/|$)/;

export function isPrivateRoute(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  return PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) || PRIVATE_HACKATHON_PAGE.test(path);
}

/** Pages where a banner would only be noise (the person is verifying, or signing in or up). */
export function hidesBanner(pathname: string): boolean {
  return pathname.startsWith('/account/verify-email') || pathname === '/login' || pathname === '/signup';
}
