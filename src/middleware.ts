import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ADMIN_ROLES = ['ADMIN', 'CLUB_LEAD'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept all /admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('srkrcc_access_token')?.value;
    const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;
    const role = request.cookies.get('srkrcc_user_role')?.value;

    // 1. Unauthenticated (neither access token nor refresh token exists) -> redirect to /login
    if (!token && !refreshToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Unauthorized role -> redirect to profile with error flag
    if (role && !ALLOWED_ADMIN_ROLES.includes(role)) {
      const profileUrl = new URL('/profile', request.url);
      profileUrl.searchParams.set('error', 'admin_access_required');
      return NextResponse.redirect(profileUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
