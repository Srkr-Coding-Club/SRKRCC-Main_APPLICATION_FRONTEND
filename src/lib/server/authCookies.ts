import type { NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'srkrcc_access_token';
export const REFRESH_TOKEN_COOKIE = 'srkrcc_refresh_token';
export const ROLE_COOKIE = 'srkrcc_user_role';

const ACCESS_TOKEN_MAX_AGE = 60 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

type SessionTokens = {
  access: string;
  refresh?: string;
};

export function resolveCookieDomain(host?: string | null): string | undefined {
  if (!host) return undefined;
  const cleanHost = host.split(':')[0].toLowerCase();
  if (cleanHost === 'srkrcodingclub.in' || cleanHost.endsWith('.srkrcodingclub.in')) {
    return '.srkrcodingclub.in';
  }
  return undefined;
}

function sessionCookieOptions(secure: boolean, maxAge: number, domain?: string) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    ...(domain ? { domain } : {}),
  };
}

export function setSessionCookies(
  response: NextResponse,
  tokens: SessionTokens,
  secure: boolean,
  role?: string,
  domain?: string,
) {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.access,
    sessionCookieOptions(secure, ACCESS_TOKEN_MAX_AGE, domain),
  );

  if (tokens.refresh) {
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      tokens.refresh,
      sessionCookieOptions(secure, REFRESH_TOKEN_MAX_AGE, domain),
    );
  }

  if (role) {
    response.cookies.set(ROLE_COOKIE, role, {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      ...(domain ? { domain } : {}),
    });
  }
}

export function clearSessionCookies(response: NextResponse, domain?: string) {
  response.cookies.delete({ name: ACCESS_TOKEN_COOKIE, path: '/', ...(domain ? { domain } : {}) });
  response.cookies.delete({ name: REFRESH_TOKEN_COOKIE, path: '/', ...(domain ? { domain } : {}) });
  response.cookies.delete({ name: ROLE_COOKIE, path: '/', ...(domain ? { domain } : {}) });

  if (domain) {
    response.cookies.delete({ name: ACCESS_TOKEN_COOKIE, path: '/' });
    response.cookies.delete({ name: REFRESH_TOKEN_COOKIE, path: '/' });
    response.cookies.delete({ name: ROLE_COOKIE, path: '/' });
  }
}
