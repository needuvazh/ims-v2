import { NextRequest, NextResponse } from 'next/server';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { applyRequestContextHeaders, createRequestContext } from '@ims/observability';

const protectedRoutes = ['/dashboard', '/organization', '/iam', '/ui-preview'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decodeSession(request.cookies.get(sessionCookieName)?.value);
  const requestContext = createRequestContext(request.headers, { route: pathname, method: request.method });
  const forwardedHeaders = new Headers(request.headers);
  applyRequestContextHeaders(forwardedHeaders, requestContext);

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('from', pathname);
    const response = NextResponse.redirect(url);
    applyRequestContextHeaders(response.headers, requestContext);
    return response;
  }

  if (pathname === '/sign-in' && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    const response = NextResponse.redirect(url);
    applyRequestContextHeaders(response.headers, requestContext);
    return response;
  }

  const response = NextResponse.next({
    request: {
      headers: forwardedHeaders,
    },
  });
  applyRequestContextHeaders(response.headers, requestContext);
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/organization/:path*',
    '/iam/:path*',
    '/ui-preview/:path*',
    '/sign-in',
  ],
};
