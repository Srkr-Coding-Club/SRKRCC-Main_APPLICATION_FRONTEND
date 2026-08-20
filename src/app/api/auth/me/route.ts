import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('srkrcc_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const res = await fetch(`${DJANGO_API_URL}/auth/me/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to fetch user profile' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
