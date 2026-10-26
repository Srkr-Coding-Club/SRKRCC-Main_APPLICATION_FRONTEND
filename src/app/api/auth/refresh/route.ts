import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshTokens } from '@/lib/server/tokenRefresh';
import { clearSessionCookies, resolveCookieDomain, setSessionCookies } from '@/lib/server/authCookies';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;
    const existingRole = request.cookies.get('srkrcc_user_role')?.value;
    const host = request.headers.get('host');
    const domain = resolveCookieDomain(host);

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 });
    }

    const tokens = await refreshTokens(refreshToken);

    if (!tokens) {
      // Refresh token is invalid/expired - clear cookies
      const errorResponse = NextResponse.json({ error: 'Session expired' }, { status: 401 });
      clearSessionCookies(errorResponse, domain);
      return errorResponse;
    }

    const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    const secure = process.env.NODE_ENV === 'production' && isHttps;
    const response = NextResponse.json({ success: true });
    setSessionCookies(response, tokens, secure, existingRole, domain);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Token refresh failed' }, { status: 500 });
  }
}
