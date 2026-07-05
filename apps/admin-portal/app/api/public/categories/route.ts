import { NextResponse } from 'next/server';
import { withRateLimit } from '../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
    },
    { status }
  );
}

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    const rateLimit = withRateLimit(request, 200, 60_000, '/api/public/categories');
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    try {
      const { publicCourseQueryService } = await import('../../../lib/runtime');

      const categories = await publicCourseQueryService.getCategories();

      const response = NextResponse.json(
        {
          success: true,
          data: { categories },
        },
        { status: 200, headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/public/categories',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.public.categories.list.failed', { status: 'failed', error: error as Error });
      return problemJson(
        500,
        'Internal server error',
        'An unexpected error occurred while fetching categories.',
        'PUB-CAT-INTERNAL_ERROR'
      );
    }
  }, { route: '/api/public/categories' });
}
