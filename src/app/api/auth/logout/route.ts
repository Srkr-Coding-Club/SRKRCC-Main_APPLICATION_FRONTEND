import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  response.cookies.delete('srkrcc_access_token');
  response.cookies.delete('srkrcc_refresh_token');
  response.cookies.delete('srkrcc_user_role');

  return response;
}
