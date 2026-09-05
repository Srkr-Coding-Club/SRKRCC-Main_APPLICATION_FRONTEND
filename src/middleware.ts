import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept /admin and /profile routes. /account is intentionally excluded:
  // its only route (/account/setup-password) is reached via an emailed one-time
  // token and must stay reachable while logged out.
  if (pathname.startsWith('/admin') || pathname.startsWith('/profile')) {
    const token = request.cookies.get('srkrcc_access_token')?.value;
    const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;

    // Unauthenticated (neither access token nor refresh token exists) -> redirect to /login
    if (!token && !refreshToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If authenticated, allow request to proceed to the page's own real-time clearance check
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*'],
};
