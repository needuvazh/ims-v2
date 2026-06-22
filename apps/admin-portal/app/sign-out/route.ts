import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessionCookieName } from '@ims/shared-auth';
import { applyObservabilityResponseHeaders, withRouteObservability } from '../lib/observability';
import nodeCrypto from 'crypto';

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    if (token) {
      try {
        const { sessionRepository } = await import('../lib/runtime');
        const tokenHash = nodeCrypto.createHash('sha256').update(token).digest('hex');
        await sessionRepository.revokeSessionByHash(tokenHash);
      } catch (err) {
        console.error('Failed to revoke database session during logout:', err);
      }
    }

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
