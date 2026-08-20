import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const res = await fetch(`${DJANGO_API_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.non_field_errors?.[0] || 'Invalid credentials' },
        { status: res.status }
      );
    }

    const { access, refresh, user } = data;
    const role = user?.role || 'MEMBER';
    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      user,
      role,
    });

    // 1. Set HttpOnly Access Token Cookie (1 hour)
    response.cookies.set('srkrcc_access_token', access, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    // 2. Set HttpOnly Refresh Token Cookie (7 days)
    if (refresh) {
      response.cookies.set('srkrcc_refresh_token', refresh, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    // 3. Set Non-HttpOnly Role & User Cookie for UI/Client reading
    response.cookies.set('srkrcc_user_role', role, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Authentication server error' }, { status: 500 });
  }
}
