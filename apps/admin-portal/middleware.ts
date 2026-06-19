import { NextRequest, NextResponse } from 'next/server';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';

const protectedRoutes = ['/dashboard', '/organization', '/identity'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = decodeSession(request.cookies.get(sessionCookieName)?.value);

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/sign-in' && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/organization/:path*', '/identity/:path*', '/sign-in'],
};
