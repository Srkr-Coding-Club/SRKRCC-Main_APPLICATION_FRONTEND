import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setSessionCookies } from '@/lib/server/authCookies';

const DJANGO_API_URL = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          error: 'Email and password are required.',
          fieldErrors: {
            ...(email ? {} : { email: 'Email is required.' }),
            ...(password ? {} : { password: 'Password is required.' }),
          },
        },
        { status: 400 }
      );
    }

    const res = await fetch(`${DJANGO_API_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Casing and stray whitespace are normalized server-side too, but doing it
      // here keeps the credential that reaches Django identical to the one the
      // signup flow stored.
      body: JSON.stringify({ email: String(email).trim().toLowerCase(), password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Django answers field problems as {field: [messages]}. Pass them through
      // so the sign-in form can put each message under its own input rather
      // than showing one generic "Invalid credentials".
      const fieldErrors: Record<string, string> = {};
      for (const field of ['email', 'password'] as const) {
        const value = (data as Record<string, unknown>)[field];
        if (value) fieldErrors[field] = Array.isArray(value) ? String(value[0]) : String(value);
      }

      return NextResponse.json(
        {
          error:
            data.detail ||
            data.non_field_errors?.[0] ||
            fieldErrors.email ||
            fieldErrors.password ||
            'Incorrect email or password.',
          code: data.code || null,
          ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
        },
        { status: res.status }
      );
    }

    const { access, refresh, user } = data;
    const role = user?.role || 'NON_AFFILIATE';
    const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    const isProduction = process.env.NODE_ENV === 'production';
    const secure = isProduction && isHttps;

    const response = NextResponse.json({
      success: true,
      user,
      role,
    });

    setSessionCookies(response, { access, refresh }, secure, role);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Authentication server error' }, { status: 500 });
  }
}
