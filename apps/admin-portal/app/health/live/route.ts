import { NextResponse } from 'next/server';
import { applyObservabilityResponseHeaders, withRouteObservability } from '../../lib/observability';

export async function GET(request: Request) {
  return withRouteObservability(request.headers, () => {
    const response = NextResponse.json({ ok: true, status: 'live' });
    applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/health/live', method: request.method, status: 'success' });
    return response;
  });
}
