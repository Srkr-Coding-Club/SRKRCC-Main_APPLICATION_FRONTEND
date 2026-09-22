import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshTokens } from '@/lib/server/tokenRefresh';
import { clearSessionCookies, setSessionCookies } from '@/lib/server/authCookies';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 });
    }

    const tokens = await refreshTokens(refreshToken);

    if (!tokens) {
      // Refresh token is invalid/expired - clear cookies
      const errorResponse = NextResponse.json({ error: 'Session expired' }, { status: 401 });
      clearSessionCookies(errorResponse);
      return errorResponse;
    }

    const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    const secure = process.env.NODE_ENV === 'production' && isHttps;
    const response = NextResponse.json({ success: true });
    setSessionCookies(response, tokens, secure);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Token refresh failed' }, { status: 500 });
  }
}
