import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../../lib/observability';
import { z } from 'zod';
import { parseDateOnly, getGstDateAtMidnight } from '@ims/course-catalog';

const activeQuerySchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.view', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const parsed = activeQuerySchema.safeParse({
        asOfDate: params.get('asOfDate') ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'CRS-VAL-RULES-ACTIVE-INVALID',
            messageEnglish: 'The query parameter asOfDate is invalid.',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      const evaluationDate = parsed.data.asOfDate ? parseDateOnly(parsed.data.asOfDate) : getGstDateAtMidnight();

      const { prisma } = await import('@ims/database');

      const record = await prisma.courseCompletionRule.findFirst({
        where: {
          courseId: id,
          status: 'Active',
          isDeleted: false,
          effectiveStartDate: { lte: evaluationDate },
          OR: [
            { effectiveEndDate: null },
            { effectiveEndDate: { gte: evaluationDate } }
          ]
        },
      });

      if (!record) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'ERR_CRS_COMPLETION_RULE_NOT_FOUND',
            messageEnglish: 'Active completion rule not found for the specified course and date.',
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      const response = NextResponse.json(
        {
          success: true,
          data: record,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/[id]/completion-rules/active',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.completion-rules.active.failed', { status: 'failed', error: error as Error });
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
  }), { route: '/api/v1/courses/[id]/completion-rules/active' });
}
