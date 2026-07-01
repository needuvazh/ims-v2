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
import { batchErrorResponse } from '../../route';

const statusSchema = z.object({
  status: z.string().trim().min(1),
  version: z.number().int().nonnegative(),
});

function problemJson(
  status: number,
  title: string,
  detail: string,
  errorCode: string,
  invalidFields?: Array<{ field: string; message: string }>
) {
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'schedule.manage', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return problemJson(
          400,
          'Invalid request body',
          'Request body must be valid JSON.',
          'CRS-VAL-BATCHES-INVALID_JSON'
        );
      }

      const parsed = statusSchema.safeParse(payload);
      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid request body',
          'Status details are invalid.',
          'CRS-VAL-BATCHES-INVALID_BODY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          }))
        );
      }

      try {
        const result = await batchService.transitionBatchStatus(
          id,
          parsed.data.status,
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
          route: '/api/v1/batches/[id]/status',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.transition.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches/[id]/status' });
}
