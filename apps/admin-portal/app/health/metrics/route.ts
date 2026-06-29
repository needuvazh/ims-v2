import { NextResponse } from 'next/server';
import { InMemoryMetrics } from '@ims/observability';
import { applyObservabilityResponseHeaders, withRouteObservability } from '../../lib/observability';

export async function GET(request: Request) {
  return withRouteObservability(request.headers, () => {
    const metrics = InMemoryMetrics.getInstance().snapshot();
    const response = NextResponse.json({ data: metrics });
    applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/health/metrics', method: request.method, status: 'success' });
    return response;
  });
}
