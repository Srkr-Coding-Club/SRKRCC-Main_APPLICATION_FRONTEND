/**
 * Where a respondent may be sent after submitting. Mirrors the server's `clean_redirect_url`
 * (apps/forms/serializers.py): an https:// address or a path on this site - nothing else - and the public form checks
 * it again before navigating, so a bad value that somehow got stored still cannot send anyone anywhere unsafe.
 */

export const DEFAULT_THANK_YOU = 'Thank you for submitting your response.';
export const MAX_REDIRECT_DELAY = 30;

export function redirectProblem(url: string | undefined | null): string | null {
  const value = (url ?? '').trim();
  if (!value) return null;
  if (value.length > 500 || /[\s\\]/.test(value)) return 'Use a single address of at most 500 characters, with no spaces.';
  if (value.startsWith('/') && !value.startsWith('//')) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' && parsed.hostname && !parsed.username && !parsed.password) return null;
  } catch {
    /* falls through */
  }
  return 'Use an https:// address, or a path on this site such as /events.';
}

/** The address to navigate to, or null when there is none / it is not safe. */
export function safeRedirectTarget(url: string | undefined | null): string | null {
  return redirectProblem(url) === null && (url ?? '').trim() ? (url as string).trim() : null;
}

export function clampDelay(seconds: unknown): number {
  const n = Math.floor(Number(seconds));
  return Number.isFinite(n) ? Math.min(MAX_REDIRECT_DELAY, Math.max(0, n)) : 5;
}
