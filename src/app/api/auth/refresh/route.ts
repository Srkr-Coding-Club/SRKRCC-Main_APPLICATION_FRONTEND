import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DJANGO_API_URL = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 });
    }

    const res = await fetch(`${DJANGO_API_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Refresh token is invalid/expired - clear cookies
      const errorResponse = NextResponse.json({ error: 'Session expired' }, { status: 401 });
      errorResponse.cookies.delete('srkrcc_access_token');
      errorResponse.cookies.delete('srkrcc_refresh_token');
      errorResponse.cookies.delete('srkrcc_user_role');
      return errorResponse;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({ success: true });

    // Update HttpOnly access token
    response.cookies.set('srkrcc_access_token', data.access, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    // If rotated refresh token returned, update it
    if (data.refresh) {
      response.cookies.set('srkrcc_refresh_token', data.refresh, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Token refresh failed' }, { status: 500 });
  }
}
