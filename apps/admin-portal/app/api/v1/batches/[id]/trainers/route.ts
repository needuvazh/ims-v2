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

const trainerAssignmentSchema = z.object({
  trainerId: z.string().uuid(),
  role: z.enum(['Primary', 'Assistant', 'Observer']),
  assignedFrom: z.string().datetime().or(z.string().date()),
  assignedTo: z.string().datetime().or(z.string().date()),
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'batch.delivery.assign', async ({ session }) => {
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

      const parsed = trainerAssignmentSchema.safeParse(payload);
      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid request body',
          'Trainer assignment details are invalid.',
          'CRS-VAL-BATCHES-INVALID_BODY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          }))
        );
      }

      try {
        const result = await batchService.assignTrainer(
          id,
          {
            ...parsed.data,
            assignedFrom: new Date(parsed.data.assignedFrom),
            assignedTo: new Date(parsed.data.assignedTo),
          },
          session.userId
        );

        const response = NextResponse.json(
          {
            success: true,
            data: result,
          },
          { status: 201 }
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/batches/[id]/trainers',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.assign-trainer.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches/[id]/trainers' });
}
