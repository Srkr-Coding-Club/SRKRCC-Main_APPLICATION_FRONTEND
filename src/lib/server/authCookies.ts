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

function sessionCookieOptions(secure: boolean, maxAge: number) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function setSessionCookies(
  response: NextResponse,
  tokens: SessionTokens,
  secure: boolean,
  role?: string,
) {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.access,
    sessionCookieOptions(secure, ACCESS_TOKEN_MAX_AGE),
  );

  if (tokens.refresh) {
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      tokens.refresh,
      sessionCookieOptions(secure, REFRESH_TOKEN_MAX_AGE),
    );
  }

  if (role) {
    response.cookies.set(ROLE_COOKIE, role, {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(ROLE_COOKIE);
}
