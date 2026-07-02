import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { z } from 'zod';
import { prisma } from '@ims/database';

const completionRulePostSchema = z.object({
  minimumAttendancePercent: z.number().int().min(0).max(100),
  examRequired: z.boolean().optional(),
  feeClearanceRequired: z.boolean().optional(),
  manualApprovalRequired: z.boolean().optional(),
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

function problemJson(status: number, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
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

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problemJson(400, 'Request body must be valid JSON.', 'CRS-VAL-RULES-INVALID_JSON');
  }

  const parsed = completionRulePostSchema.safeParse(payload);
  if (!parsed.success) {
    return problemJson(
      400,
      'Completion rule details are invalid.',
      'CRS-VAL-RULES-INVALID_BODY',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }))
    );
  }

  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { courseCompletionRuleService } = await import('../../../../../../lib/runtime');

      const ruleInput = {
        ...parsed.data,
        courseId: id,
      };

      const result = await courseCompletionRuleService.createCompletionRule(ruleInput, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 201 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/[id]/completion-rules',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.completion-rules.create.failed', { status: 'failed', error: error as Error });
      const msg = (error as Error).message;
      let status = 500;
      let code = 'ERR_SYSTEM';
      let messageEn = 'An unexpected error occurred.';

      if (msg.includes('ERR_CRS_COURSE_NOT_FOUND')) {
        status = 404;
        code = 'ERR_CRS_COURSE_NOT_FOUND';
        messageEn = 'Course not found.';
      } else if (msg.includes('ERR_CRS_INVALID_DATE_RANGE')) {
        status = 400;
        code = 'ERR_CRS_INVALID_DATE_RANGE';
        messageEn = 'Effective end date must be after effective start date.';
      } else if (msg.includes('ERR_CRS_INVALID_ATTENDANCE_LIMIT')) {
        status = 400;
        code = 'ERR_CRS_INVALID_ATTENDANCE_LIMIT';
        messageEn = 'Minimum attendance percent must be between 0 and 100.';
      } else if (msg.includes('ERR_CRS_MULTIPLE_ACTIVE_RULES')) {
        status = 422;
        code = 'ERR_CRS_MULTIPLE_ACTIVE_RULES';
        messageEn = 'Overlapping active completion rule already exists for this course.';
      }

      return NextResponse.json(
        {
          success: false,
          errorCode: code,
          messageEnglish: messageEn,
          statusCode: status,
        },
        { status }
      );
    }
  }), { route: '/api/v1/courses/[id]/completion-rules' });
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.view', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const status = params.get('status') || undefined;

      const records = await prisma.courseCompletionRule.findMany({
        where: {
          courseId: id,
          status: status as any || undefined,
          isDeleted: false,
        },
        orderBy: { effectiveStartDate: 'desc' },
      });

      const response = NextResponse.json(
        {
          success: true,
          data: records,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/[id]/completion-rules',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.completion-rules.list.failed', { status: 'failed', error: error as Error });
      return NextResponse.json(
        {
          success: false,
          errorCode: 'ERR_SYSTEM',
          messageEnglish: (error as Error).message,
          statusCode: 500,
        },
        { status: 500 }
      );
    }
  }), { route: '/api/v1/courses/[id]/completion-rules' });
}
