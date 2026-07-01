import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { UpdateCourseSchema } from '@ims/course-catalog';
import { courseCatalogErrorResponse } from '../route';
import { z } from 'zod';

const bodySchema = z.object({
  version: z.number().int().positive(),
  data: UpdateCourseSchema,
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
      invalidFields,
    },
    { status }
  );
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.update', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRS-VAL-COURSES-INVALID_JSON');
    }

    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Course update details are invalid.',
        'CRS-VAL-COURSES-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }))
      );
    }

    try {
      const { courseService } = await import('../../../../../lib/runtime');

      const result = await courseService.updateCourse(id, parsed.data.data, parsed.data.version, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/[id]',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.update.failed', { status: 'failed', error: error as Error });
      return courseCatalogErrorResponse(error as Error);
    }
  }), { route: '/api/v1/courses/[id]' });
}
