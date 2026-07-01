import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { courseCatalogErrorResponse } from '../../route';
import { z } from 'zod';

const bodySchema = z.object({
  targetStatus: z.enum(['Draft', 'InReview', 'Approved', 'Published', 'Archived']),
  version: z.number().int().positive(),
});

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

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRS-VAL-COURSES-INVALID_JSON');
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return problemJson(400, 'Invalid request body', 'Invalid status transition input.', 'CRS-VAL-COURSES-INVALID_BODY');
  }

  // Permission checks vary depending on the target status
  const requiredPermission = parsed.data.targetStatus === 'Archived' ? 'course.catalog.archive' : 'course.catalog.publish';

  return withRouteObservability(request.headers, async () => withPermission(request, requiredPermission, async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { courseService } = await import('../../../../../lib/runtime');

      const result = await courseService.transitionCourseStatus(
        id,
        parsed.data.targetStatus,
        parsed.data.version,
        session.userId
      );

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/[id]/status',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.transition.failed', { status: 'failed', error: error as Error });
      return courseCatalogErrorResponse(error as Error);
    }
  }), { route: '/api/v1/courses/[id]/status' });
}
