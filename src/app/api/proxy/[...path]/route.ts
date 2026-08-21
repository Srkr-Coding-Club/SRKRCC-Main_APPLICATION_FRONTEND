import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

async function handleProxy(request: NextRequest, params: { path: string[] }) {
  try {
    const subPath = (params.path || []).join('/');
    const normalizedPath = subPath.endsWith('/') ? subPath : `${subPath}/`;
    const search = request.nextUrl.search || '';
    const targetUrl = `${DJANGO_API_URL}/${normalizedPath}${search}`;

    // Read HttpOnly access token from request cookies
    const accessToken = request.cookies.get('srkrcc_access_token')?.value;

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

    // If 401 and refresh token cookie exists, attempt transparent refresh server-side
    let newAccessToken: string | null = null;
    let newRefreshToken: string | null = null;
    if (response.status === 401) {
      const refreshToken = request.cookies.get('srkrcc_refresh_token')?.value;
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${DJANGO_API_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            newAccessToken = refreshData.access;
            newRefreshToken = refreshData.refresh || null;
            if (newAccessToken) {
              headers['Authorization'] = `Bearer ${newAccessToken}`;
              // Retry original request with refreshed token
              response = await fetch(targetUrl, {
                ...init,
                headers,
              });
            }
          }
        } catch {
          // Fall through with original 401 response
        }
      }
    }

    const responseBody = await response.arrayBuffer();
    const responseHeaders: Record<string, string> = {};

    const respContentType = response.headers.get('content-type');
    if (respContentType) {
      responseHeaders['content-type'] = respContentType;
    }

    const nextResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

    // If a new access token was issued via transparent refresh, update the HttpOnly cookies
    if (newAccessToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      nextResponse.cookies.set('srkrcc_access_token', newAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 hour
      });

      if (newRefreshToken) {
        nextResponse.cookies.set('srkrcc_refresh_token', newRefreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }
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

export async function OPTIONS(request: NextRequest, props: Props) {
  const params = await props.params;
  return handleProxy(request, params);
}
