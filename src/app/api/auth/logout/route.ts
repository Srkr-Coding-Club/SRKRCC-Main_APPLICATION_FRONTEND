import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { clearSessionCookies } from '@/lib/server/authCookies';

const DJANGO_API_URL = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('srkrcc_access_token')?.value;
  const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;

  // Best-effort: revoke the refresh token server-side so it can't be replayed
  // after logout. Cookies are cleared below regardless of whether this succeeds.
  if (accessToken && refreshToken) {
    try {
      await fetch(`${DJANGO_API_URL}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch {
      // Ignore — cookies are cleared unconditionally so the client session ends either way.
    }
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  clearSessionCookies(response);

  return response;
}
