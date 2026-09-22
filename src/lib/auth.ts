'use client';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: 'AFFILIATE' | 'NON_AFFILIATE' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
  club_id?: string;
  membership_status?: string;
  roll_number?: string;
  branch?: string;
  year?: number | string;
  phone_number?: string;
  phone?: string;
  registered_at?: string;
  referred_by_display?: string;
  github_profile?: string;
  linkedin_profile?: string;
}

export interface AuthTokens {
  access?: string;
  refresh?: string;
}

const USER_KEY = 'srkrcc_user';
const ROLE_COOKIE = 'srkrcc_user_role';

export function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const next = `${window.location.pathname}${window.location.search}`;
  const loginUrl = `/login?next=${encodeURIComponent(isSafeNextPath(next) ? next : '/')}`;
  clearAuthSession();
  if (window.location.pathname !== '/login') {
    window.location.replace(loginUrl);
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export const AUTH_CHANGE_EVENT = 'srkrcc_auth_change';

export function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function setStoredUser(user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (user.role) {
    document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(user.role)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  }
  notifyAuthChange();
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
  document.cookie = `${ROLE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  notifyAuthChange();
  
  // Call server BFF route to clear HttpOnly cookies
  fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!getStoredUser() || !!getCookie(ROLE_COOKIE);
}

/**
 * Guards a post-login/signup `?next=` redirect target against open-redirect
 * payloads (absolute URLs, protocol-relative `//host` paths) — only an
 * in-app relative path is ever safe to hand to `window.location.replace`.
 */
export function isSafeNextPath(next: string | null | undefined): next is string {
  return !!next && next.startsWith('/') && !next.startsWith('//');
}

export function isAdminOrLead(): boolean {
  const user = getStoredUser();
  if (user && user.role) {
    return user.role === 'ADMIN' || user.role === 'CLUB_LEAD';
  }
  const role = getCookie(ROLE_COOKIE);
  return role === 'ADMIN' || role === 'CLUB_LEAD';
}

// Shared across every subscribeToAuthResync() caller so switching back to a tab
// with several of them mounted (Navbar + HeroSection, say) triggers one
// resync, not one per component.
const AUTH_RESYNC_MIN_INTERVAL_MS = 15_000;
let lastAuthResyncAt = 0;

// Every currently-mounted subscribeToAuthResync() caller registers its
// callback here. The throttle above gates whether a resync happens at all
// on a given focus/visibility event; once it opens, EVERY callback in this
// set is invoked, not just the one belonging to whichever component's
// listener happened to fire first.
const authResyncSubscribers = new Set<() => void>();

/**
 * Re-runs `onResync` whenever this tab regains focus or visibility.
 *
 * Several components (Navbar, HeroSection, AdminGuard, …) call
 * `fetchAndSyncCurrentUser()` once on mount to show the right role-gated UI.
 * That single fetch means a role change made elsewhere — an admin promoting
 * this member to CLUB_LEAD, say — never reaches an already-open tab: it kept
 * showing the pre-promotion role/menu until a hard refresh remounted
 * everything, even though the server was correct the whole time. Refocus is
 * the moment a "go check now" actually happens, so that's what re-triggers it.
 *
 * The throttle window is shared across ALL subscribers combined (so rapid
 * focus/blur churn doesn't hammer the endpoint once per mounted component),
 * but when the window opens, every subscriber registered at that moment gets
 * its callback invoked — not just the one whose event listener fired.
 *
 * Returns an unsubscribe function for effect cleanup.
 */
export function subscribeToAuthResync(onResync: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  authResyncSubscribers.add(onResync);

  const trigger = () => {
    if (document.visibilityState === 'hidden') return;
    const now = Date.now();
    if (now - lastAuthResyncAt < AUTH_RESYNC_MIN_INTERVAL_MS) return;
    lastAuthResyncAt = now;
    authResyncSubscribers.forEach((callback) => callback());
  };

  window.addEventListener('focus', trigger);
  document.addEventListener('visibilitychange', trigger);
  return () => {
    authResyncSubscribers.delete(onResync);
    window.removeEventListener('focus', trigger);
    document.removeEventListener('visibilitychange', trigger);
  };
}

/**
 * Validates session against the server /auth/me/ endpoint and updates stored user and role cookies.
 */
export async function fetchAndSyncCurrentUser(): Promise<AuthUser | null> {
  if (typeof window === 'undefined') return null;
  if (!isAuthenticated()) return null;

  try {
    const res = await fetch('/api/proxy/auth/me/', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      // The server rejected the session outright (e.g. expired/invalidated),
      // but the localStorage user + role cookie can outlive it — clear them so
      // isAuthenticated() stops reporting a session that no longer exists.
      clearAuthSession();
      return null;
    }
    const data = await res.json();
    if (data && data.email) {
      const user: AuthUser = {
        id: data.id,
        email: data.email,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        roll_number: data.roll_number,
        branch: data.branch,
        year: data.year,
        phone_number: data.phone_number,
        github_profile: data.github_profile,
        linkedin_profile: data.linkedin_profile,
      };
      setStoredUser(user);
      return user;
    }
    return null;
  } catch {
    return null;
  }
}

/** A failed sign-in, carrying the API's per-field messages and status code. */
export interface LoginError extends Error {
  code?: string;
  fieldErrors?: { email?: string; password?: string };
  status?: number;
}

/**
 * Log in securely via Next.js BFF Route: POST /api/auth/login
 * Tokens are securely stored exclusively in HttpOnly cookies by the server.
 */
export async function loginUser(email: string, password: string): Promise<{ user: AuthUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err: LoginError = new Error(errorData.error || 'Incorrect email or password.');
    err.code = errorData.code;
    err.fieldErrors = errorData.fieldErrors || undefined;
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const user: AuthUser = data.user || {
    id: 1,
    email,
    username: email.split('@')[0],
    role: data.role || 'NON_AFFILIATE',
  };

  setStoredUser(user);
  return { user };
}

/** A failed registration, carrying the API's per-field messages. */
export interface RegistrationError extends Error {
  fieldErrors?: Record<string, unknown>;
  status?: number;
}

/**
 * Register user via BFF proxy: POST /api/proxy/auth/register/
 */
export async function registerUser(payload: Record<string, any>): Promise<any> {
  const isClient = typeof window !== 'undefined';
  const url = isClient
    ? '/api/proxy/auth/register/'
    : `${(process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '')}/auth/register/`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body.email?.[0] ||
      body.password?.[0] ||
      body.first_name?.[0] ||
      body.last_name?.[0] ||
      body.roll_number?.[0] ||
      body.branch?.[0] ||
      body.year?.[0] ||
      body.club_id?.[0] ||
      body.detail ||
      body.non_field_errors?.[0] ||
      'Registration failed. Please check your details.';
    // The raw DRF body rides along so the signup form can anchor each message
    // to the input that caused it instead of flattening everything to a toast.
    const err: RegistrationError = new Error(message);
    err.fieldErrors = body && typeof body === 'object' ? body : {};
    err.status = res.status;
    throw err;
  }

  return await res.json();
}

let activeRefreshPromise: Promise<boolean> | null = null;

/**
 * Refresh access token securely via Next.js BFF Route: POST /api/auth/refresh
 * Uses singleton promise to deduplicate concurrent refresh requests across tabs/components.
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });

      return res.ok;
    } catch {
      return false;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}
