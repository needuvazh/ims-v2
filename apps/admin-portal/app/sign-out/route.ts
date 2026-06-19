import { NextResponse } from 'next/server';
import { sessionCookieName } from '@ims/shared-auth';

export async function GET() {
  const response = NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
  response.cookies.delete(sessionCookieName);
  return response;
}
