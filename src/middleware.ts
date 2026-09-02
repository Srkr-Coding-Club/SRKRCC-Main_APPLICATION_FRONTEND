import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept all /admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('srkrcc_access_token')?.value;
    const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;

    // Unauthenticated (neither access token nor refresh token exists) -> redirect to /login
    if (!token && !refreshToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If authenticated, allow request to proceed to AdminGuard for real-time clearance check
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
