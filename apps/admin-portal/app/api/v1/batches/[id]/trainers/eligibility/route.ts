import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { batchService } from '../../../../../../lib/runtime';

const eligibilityQuerySchema = z.object({
  courseId: z.string().uuid().optional().nullable(),
  targetDate: z.string().datetime().or(z.string().date()).optional().nullable(),
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'batch.delivery.assign', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        const { searchParams } = new URL(request.url);
        const query = {
          courseId: searchParams.get('courseId') || undefined,
          targetDate: searchParams.get('targetDate') || undefined,
        };

        const parsed = eligibilityQuerySchema.safeParse(query);
        if (!parsed.success) {
          return problemJson(
            400,
            'Invalid request query',
            'Trainer eligibility check parameters are invalid.',
            'CRS-VAL-BATCHES-INVALID_QUERY',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'query',
              message: issue.message,
            })),
          );
        }

        try {
          const result = await batchService.getFacultyEligibilityForBatch(
            id,
            {
              courseId: parsed.data.courseId || undefined,
              targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : undefined,
            },
            session.userId,
          );

          const response = NextResponse.json(
            {
              success: true,
              eligibleTrainers: result,
            },
            { status: 200 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/batches/[id]/trainers/eligibility',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error: any) {
          logger.error('api.batches.trainer-eligibility.failed', {
            status: 'failed',
            error: error as Error,
          });
          
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_BATCH_ELIGIBILITY_FAILED',
              messageEnglish: error.message || 'Failed to check trainer eligibility.',
              statusCode: 500,
            },
            { status: 500 },
          );
        }
      }),
    { route: '/api/v1/batches/[id]/trainers/eligibility' },
  );
}
