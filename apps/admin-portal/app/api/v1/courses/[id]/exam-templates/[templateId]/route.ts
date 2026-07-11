import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
  applyObservabilityResponseHeaders,
} from '../../../../../../../lib/observability';
import { UpdateCourseExamTemplateSchema } from '@ims/course-catalog';

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

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string; templateId: string }> },
) {
  const { templateId } = await props.params;

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

  const parsed = UpdateCourseExamTemplateSchema.safeParse(payload);
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
          const { courseExamTemplateService } = await import('../../../../../../../lib/runtime');
          const template = await courseExamTemplateService.updateTemplate(
            templateId,
            parsed.data,
            session.userId,
          );

          const response = NextResponse.json(
            { success: true, data: template },
            { status: 200 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: `/api/v1/courses/[id]/exam-templates/[templateId]`,
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error: any) {
          logger.error('api.courses.exam-templates.update.failed', {
            status: 'failed',
            error: error as Error,
          });

          if (error.message && error.message.includes('ERR_CRS_ACTIVE_COURSE_LOCKED')) {
            return problemJson(409, error.message, 'ERR_CRS_ACTIVE_COURSE_LOCKED');
          }

          return problemJson(400, error.message || 'Server error', 'EXAM_TEMPLATE_UPDATE_FAILED');
        }
      }),
    { route: '/api/v1/courses/[id]/exam-templates/[templateId]' },
  );
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; templateId: string }> },
) {
  const { templateId } = await props.params;

  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'course.catalog.update', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { courseExamTemplateService } = await import('../../../../../../../lib/runtime');
          await courseExamTemplateService.deleteTemplate(templateId, session.userId);

          const response = NextResponse.json(
            { success: true },
            { status: 200 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: `/api/v1/courses/[id]/exam-templates/[templateId]`,
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error: any) {
          logger.error('api.courses.exam-templates.delete.failed', {
            status: 'failed',
            error: error as Error,
          });

          if (error.message && error.message.includes('ERR_CRS_ACTIVE_COURSE_LOCKED')) {
            return problemJson(409, error.message, 'ERR_CRS_ACTIVE_COURSE_LOCKED');
          }

          return problemJson(400, error.message || 'Server error', 'EXAM_TEMPLATE_DELETE_FAILED');
        }
      }),
    { route: '/api/v1/courses/[id]/exam-templates/[templateId]' },
  );
}
