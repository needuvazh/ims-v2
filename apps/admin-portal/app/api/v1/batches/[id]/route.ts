import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { batchService } from '../../../../../lib/runtime';
import { batchErrorResponse } from '../route';

const updateBatchSchema = z.object({
  batchNameEnglish: z.string().trim().min(3).max(150).optional(),
  batchNameArabic: z.string().trim().min(3).max(150).optional(),
  startDate: z.string().datetime().or(z.string().date()).optional(),
  endDate: z.string().datetime().or(z.string().date()).optional(),
  capacity: z.number().int().positive().optional(),
  waitingListEnabled: z.boolean().optional(),
  allowOverbooking: z.boolean().optional(),
  isWalkIn: z.boolean().optional(),
  classroomId: z.string().uuid().nullable().optional(),
  corporateAccountId: z.string().uuid().nullable().optional(),
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
    withPermission(request, 'batch.delivery.update', async ({ session }) => {
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

      const parsed = updateBatchSchema.safeParse(payload);
      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid request body',
          'Batch update details are invalid.',
          'CRS-VAL-BATCHES-INVALID_BODY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          }))
        );
      }

      try {
        const { version, ...updateData } = parsed.data;
        const normalizedData: any = { ...updateData };
        if (updateData.startDate) normalizedData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) normalizedData.endDate = new Date(updateData.endDate);

        const result = await batchService.updateBatch(
          id,
          normalizedData,
          version,
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
          route: '/api/v1/batches/[id]',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.update.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches/[id]' });
}
