import { NextResponse } from 'next/server';
import { sessionCookieName } from '@ims/shared-auth';
import { applyObservabilityResponseHeaders, withRouteObservability } from '../lib/observability';

export async function GET(request: Request) {
  return withRouteObservability(request.headers, () => {
    const response = NextResponse.redirect(
      new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
    );
    response.cookies.delete(sessionCookieName);
    applyObservabilityResponseHeaders(response.headers, request.headers, {
      route: '/sign-out',
      method: request.method,
      status: 'success',
    });
    return response;
  });
}
