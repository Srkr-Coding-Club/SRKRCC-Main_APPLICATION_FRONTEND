import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

// This proxy deliberately does NOT attempt its own token refresh (it used to,
// proactively when the access token cookie was missing and reactively on a
// 401 — see git history). That relied on an in-memory Map in
// src/lib/server/tokenRefresh.ts to dedupe concurrent refresh attempts for
// the same refresh token, on the assumption that concurrent requests share
// one Node.js process/module instance. Verified false under real concurrent
// load (multiple fetchApi calls firing on one page load): of 6 simultaneous
// requests hitting this route with a valid-but-unused refresh token, only 2
// got a successful refresh — the other 4 got 401 and the user was logged out
// even though their session was perfectly valid. Route handlers are not
// guaranteed to share process-level memory (Next.js's dev server alone can
// dispatch them across workers), so an in-memory dedup Map is not a reliable
// cross-request lock.
//
// The fix: refreshing is now the CLIENT's job alone (src/lib/auth.ts
// refreshAccessToken, called from fetchApi and fetchAndSyncCurrentUser),
// guarded by a module-level `activeRefreshPromise` singleton. That guarantee
// IS reliable, because a single browser tab's JS is genuinely single-threaded
// — there is no equivalent multi-worker ambiguity. This proxy just forwards
// whatever token exists (or none) and returns Django's response verbatim,
// including a 401; the client is responsible for refreshing and retrying.
async function handleProxy(request: NextRequest, params: { path: string[] }) {
  try {
    let subPath = (params.path || []).join('/');
    if (subPath.startsWith('api/')) {
      subPath = subPath.slice(4);
    }
    const normalizedPath = subPath.endsWith('/') ? subPath : `${subPath}/`;
    const search = request.nextUrl.search || '';
    const targetUrl = `${DJANGO_API_URL}/${normalizedPath}${search}`;

    // Read HttpOnly access token from request cookies — forwarded as-is, no
    // refresh attempted here (see module comment above).
    const accessToken = request.cookies.get('srkrcc_access_token')?.value;
    const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;

    // Short-circuit auth/me if user has neither access nor refresh token —
    // saves a pointless round-trip to Django for a request that can only 401.
    if ((subPath === 'auth/me' || subPath === 'auth/me/') && !accessToken && !refreshToken) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const headers: Record<string, string> = {};
    
    // Copy content-type if present
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['content-type'] = contentType;
    }

    // Attach Authorization header if access token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Forward custom headers like Idempotency-Key if present
    const idempotencyKey = request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key');
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const init: RequestInit = {
      method: request.method,
      headers,
      cache: 'no-store',
    };

    // Forward body for mutating methods
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
      const bodyBuffer = await request.arrayBuffer();
      if (bodyBuffer.byteLength > 0) {
        init.body = bodyBuffer;
      }
    }

    const response = await fetch(targetUrl, init);

    const responseBody = await response.arrayBuffer();
    const responseHeaders: Record<string, string> = {};

    const respContentType = response.headers.get('content-type');
    if (respContentType) {
      responseHeaders['content-type'] = respContentType;
    }
    const respContentDisposition = response.headers.get('content-disposition');
    if (respContentDisposition) {
      responseHeaders['content-disposition'] = respContentDisposition;
    }

    // No cookie writes here — this route never refreshes, so there is
    // nothing rotated to persist and nothing to clear (a genuinely dead
    // refresh token is discovered and cleared by /api/auth/refresh itself,
    // the only place that ever calls Django's token/refresh/ endpoint).
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[BFF Proxy Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'BFF Proxy Request Failed' },
      { status: 502 }
    );
  }
}

type Props = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, props: Props) {
  const params = await props.params;
  return handleProxy(request, params);
}

export async function POST(request: NextRequest, props: Props) {
  const params = await props.params;
  return handleProxy(request, params);
}

export async function PUT(request: NextRequest, props: Props) {
  const params = await props.params;
  return handleProxy(request, params);
}

export async function PATCH(request: NextRequest, props: Props) {
  const params = await props.params;
  return handleProxy(request, params);
}

export async function DELETE(request: NextRequest, props: Props) {
  const params = await props.params;
  return handleProxy(request, params);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, x-idempotency-key, X-CSRFToken, Cache-Control, Pragma',
      'Access-Control-Max-Age': '86400',
    },
  });
}

