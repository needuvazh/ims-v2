import { NextResponse } from 'next/server';
import { withRateLimit } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';

function problemJson(
  status: number,
  title: string,
  detail: string,
  errorCode: string,
) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
    },
    { status },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  return withRouteObservability(
    request.headers,
    async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      const rateLimit = withRateLimit(
        request,
        200,
        60_000,
        `/api/public/courses/${slug}`,
      );
      if (!rateLimit.allowed && rateLimit.response) {
        return rateLimit.response;
      }

      try {
        const { publicCourseQueryService } =
          await import('../../../../lib/runtime');

        const course = await publicCourseQueryService.getCourseBySlug(slug);

        if (!course) {
          return problemJson(
            404,
            'Course not found',
            'The requested course does not exist or is not published.',
            'PUB-CRS-NOT_FOUND',
          );
        }

        const response = NextResponse.json(
          {
            success: true,
            data: { course },
          },
          {
            status: 200,
            headers: {
              'Cache-Control':
                'public, s-maxage=300, stale-while-revalidate=600',
            },
          },
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/public/courses/[slug]',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.public.courses.detail.failed', {
          status: 'failed',
          error: error as Error,
        });
        return problemJson(
          500,
          'Internal server error',
          'An unexpected error occurred while fetching the course.',
          'PUB-CRS-INTERNAL_ERROR',
        );
      }
    },
    { route: '/api/public/courses/[slug]' },
  );
}
