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
import { batchErrorResponse } from '../../../route';

const conflictQuerySchema = z.object({
  trainerId: z.string().uuid(),
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'batch.delivery.assign', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      const { searchParams } = new URL(request.url);
      const query = {
        trainerId: searchParams.get('trainerId'),
        assignedFrom: searchParams.get('assignedFrom'),
        assignedTo: searchParams.get('assignedTo'),
      };

      const parsed = conflictQuerySchema.safeParse(query);
      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid request query',
          'Trainer conflict check parameters are invalid.',
          'CRS-VAL-BATCHES-INVALID_QUERY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'query',
            message: issue.message,
          }))
        );
      }

      try {
        const result = await batchService.checkTrainerConflicts(
          id,
          parsed.data.trainerId,
          new Date(parsed.data.assignedFrom),
          new Date(parsed.data.assignedTo),
          session.userId
        );

        const response = NextResponse.json(
          {
            success: true,
            conflicts: result,
          },
          { status: 200 }
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/batches/[id]/trainers/conflicts',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.trainer-conflicts.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches/[id]/trainers/conflicts' });
}
