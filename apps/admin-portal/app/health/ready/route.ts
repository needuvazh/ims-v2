import { NextResponse } from 'next/server';
import { prisma } from '@ims/database';
import { applyObservabilityResponseHeaders, withRouteObservability } from '../../lib/observability';

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const response = NextResponse.json({ ok: true, status: 'ready' });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/health/ready', method: request.method, status: 'success' });
      return response;
    } catch {
      const response = NextResponse.json({ ok: false, status: 'not-ready' }, { status: 503 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/health/ready', method: request.method, status: 'error' });
      return response;
    }
  });
}
