import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.cookies.delete('auth-token');
  return response;
}