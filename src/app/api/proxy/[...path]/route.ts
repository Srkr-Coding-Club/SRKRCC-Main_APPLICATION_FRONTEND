import { NextRequest, NextResponse } from 'next/server';
import { refreshTokens } from '@/lib/server/tokenRefresh';
import { clearSessionCookies, setSessionCookies } from '@/lib/server/authCookies';

const DJANGO_API_URL = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

async function handleProxy(request: NextRequest, params: { path: string[] }) {
  try {
    let subPath = (params.path || []).join('/');
    if (subPath.startsWith('api/')) {
      subPath = subPath.slice(4);
    }
    const normalizedPath = subPath.endsWith('/') ? subPath : `${subPath}/`;
    const search = request.nextUrl.search || '';
    const targetUrl = `${DJANGO_API_URL}/${normalizedPath}${search}`;

    // Read HttpOnly access token and refresh token from request cookies
    let accessToken = request.cookies.get('srkrcc_access_token')?.value;
    const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;

    let newAccessToken: string | null = null;
    let newRefreshToken: string | null = null;
    let refreshAttempted = false;

    // If access token is missing but refresh token exists, proactively refresh before contacting Django
    if (!accessToken && refreshToken) {
      refreshAttempted = true;
      const tokens = await refreshTokens(refreshToken);
      if (tokens) {
        newAccessToken = tokens.access;
        accessToken = newAccessToken || undefined;
        newRefreshToken = tokens.refresh || null;
      }
    }

    // Short-circuit auth/me if user has neither access nor refresh token
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

    let response = await fetch(targetUrl, init);

    // If 401 and refresh token cookie exists and we haven't already refreshed, attempt transparent refresh server-side
    if (response.status === 401 && !refreshAttempted && refreshToken) {
      refreshAttempted = true;
      const tokens = await refreshTokens(refreshToken);
      if (tokens) {
        newAccessToken = tokens.access;
        newRefreshToken = tokens.refresh || null;
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        // Retry original request with refreshed token
        response = await fetch(targetUrl, {
          ...init,
          headers,
        });
      }
    }

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

    const nextResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

    // Persist rotated tokens or remove an invalid session after the one allowed refresh attempt.
    if (newAccessToken) {
      const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
      const isProduction = process.env.NODE_ENV === 'production';
      const secure = isProduction && isHttps;
      setSessionCookies(nextResponse, { access: newAccessToken, refresh: newRefreshToken || undefined }, secure);
    } else if (refreshAttempted && response.status === 401) {
      clearSessionCookies(nextResponse);
    }

    return nextResponse;
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

