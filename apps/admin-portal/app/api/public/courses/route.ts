import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRateLimit } from '../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../lib/observability';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(25),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
});

function problemJson(
  status: number,
  title: string,
  detail: string,
  errorCode: string,
  invalidFields?: Array<{ field: string; message: string }>,
) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
      invalidFields,
    },
    { status },
  );
}

export async function GET(request: Request) {
  return withRouteObservability(
    request.headers,
    async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      const rateLimit = withRateLimit(
        request,
        200,
        60_000,
        '/api/public/courses',
      );
      if (!rateLimit.allowed && rateLimit.response) {
        return rateLimit.response;
      }

      try {
        const params = new URL(request.url).searchParams;
        const parsed = querySchema.safeParse({
          page: params.get('page') ?? undefined,
          limit: params.get('limit') ?? undefined,
          categoryId: params.get('categoryId') ?? undefined,
          search: params.get('search') ?? undefined,
        });

        if (!parsed.success) {
          return problemJson(
            400,
            'Invalid query parameters',
            'One or more query parameters are invalid.',
            'PUB-CRS-INVALID_QUERY',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'query',
              message: issue.message,
            })),
          );
        }

        const { publicCourseQueryService } =
          await import('../../../lib/runtime');

        const result = await publicCourseQueryService.getPublishedCourses({
          categoryId: parsed.data.categoryId,
          search: parsed.data.search,
          page: parsed.data.page,
          limit: parsed.data.limit,
        });

        const response = NextResponse.json(
          {
            success: true,
            data: {
              courses: result.items,
              pagination: {
                total: result.total,
                page: parsed.data.page,
                limit: parsed.data.limit,
                pages: result.pages,
              },
            },
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
          route: '/api/public/courses',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.public.courses.list.failed', {
          status: 'failed',
          error: error as Error,
        });
        return problemJson(
          500,
          'Internal server error',
          'An unexpected error occurred while fetching courses.',
          'PUB-CRS-INTERNAL_ERROR',
        );
      }
    },
    { route: '/api/public/courses' },
  );
}
