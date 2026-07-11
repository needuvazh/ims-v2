import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
  applyObservabilityResponseHeaders,
} from '../../../../../../lib/observability';
import { z } from 'zod';
import { CreateCourseExamTemplateSchema } from '@ims/course-catalog';

function problemJson(
  status: number,
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

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'course.catalog.view', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { courseExamTemplateService } = await import('../../../../../../lib/runtime');
          const templates = await courseExamTemplateService.listTemplatesForCourse(id);

          const response = NextResponse.json(
            { success: true, data: templates },
            { status: 200 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: `/api/v1/courses/${id}/exam-templates`,
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.courses.exam-templates.list.failed', {
            status: 'failed',
            error: error as Error,
          });
          return problemJson(500, (error as Error).message || 'Server error', 'EXAM_TEMPLATE_LIST_FAILED');
        }
      }),
    { route: '/api/v1/courses/[id]/exam-templates' },
  );
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problemJson(
      400,
      'Request body must be valid JSON.',
      'EXAM_TEMPLATE_INVALID_JSON',
    );
  }

  const parsed = CreateCourseExamTemplateSchema.safeParse(payload);
  if (!parsed.success) {
    return problemJson(
      400,
      'Exam template details are invalid.',
      'EXAM_TEMPLATE_VALIDATION_FAILED',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    );
  }

  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'course.catalog.update', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { courseExamTemplateService } = await import('../../../../../../lib/runtime');
          const template = await courseExamTemplateService.createTemplate(
            {
              ...parsed.data,
              courseId: id,
            },
            session.userId,
          );

          const response = NextResponse.json(
            { success: true, data: template },
            { status: 201 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: `/api/v1/courses/${id}/exam-templates`,
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error: any) {
          logger.error('api.courses.exam-templates.create.failed', {
            status: 'failed',
            error: error as Error,
          });

          if (error.message && error.message.includes('ERR_CRS_ACTIVE_COURSE_LOCKED')) {
            return problemJson(409, error.message, 'ERR_CRS_ACTIVE_COURSE_LOCKED');
          }

          return problemJson(400, error.message || 'Server error', 'EXAM_TEMPLATE_CREATE_FAILED');
        }
      }),
    { route: '/api/v1/courses/[id]/exam-templates' },
  );
}
