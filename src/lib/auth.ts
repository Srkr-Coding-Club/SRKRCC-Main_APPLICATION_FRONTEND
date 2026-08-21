'use client';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: 'MEMBER' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
  roll_number?: string;
  branch?: string;
  year?: number | string;
  phone_number?: string;
  phone?: string;
  github_profile?: string;
  linkedin_profile?: string;
}

export interface AuthTokens {
  access?: string;
  refresh?: string;
}

const USER_KEY = 'srkrcc_user';
const ROLE_COOKIE = 'srkrcc_user_role';

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

export function setStoredUser(user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
  
  // Call server BFF route to clear HttpOnly cookies
  fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!getStoredUser() || !!getCookie(ROLE_COOKIE);
}

export function isAdminOrLead(): boolean {
  const user = getStoredUser();
  if (user) {
    return user.role === 'ADMIN' || user.role === 'CLUB_LEAD';
  }
  const role = getCookie(ROLE_COOKIE);
  return role === 'ADMIN' || role === 'CLUB_LEAD';
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
    throw new Error(errorData.error || 'Invalid email or password.');
  }

  const data = await res.json();
  const user: AuthUser = data.user || {
    id: 1,
    email,
    username: email.split('@')[0],
    role: data.role || 'MEMBER',
  };

  setStoredUser(user);
  return { user };
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
    const err = await res.json().catch(() => ({}));
    const message =
      err.email?.[0] ||
      err.username?.[0] ||
      err.password?.[0] ||
      err.detail ||
      'Registration failed. Please check your details.';
    throw new Error(message);
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
