import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';
import { z } from 'zod';

const ChangeBatchRequestSchema = z.object({
  batchId: z.string().uuid(),
});

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_ENR_INTERNAL_ERROR';

  if (msg.includes('ERR_ENROLLMENT_NOT_FOUND')) {
    status = 404;
    code = 'ERR_ENROLLMENT_NOT_FOUND';
  } else if (msg.includes('ERR_BATCH_NOT_FOUND')) {
    status = 404;
    code = 'ERR_BATCH_NOT_FOUND';
  } else if (msg.includes('ERR_ENR_BATCH_COURSE_MISMATCH')) {
    status = 400;
    code = 'ERR_ENR_BATCH_COURSE_MISMATCH';
  } else if (msg.includes('ERR_ENR_BATCH_CHANGE_BLOCKED_PAID')) {
    status = 422;
    code = 'ERR_ENR_BATCH_CHANGE_BLOCKED_PAID';
  } else if (msg.includes('ERR_ENR_BATCH_FULL')) {
    status = 422;
    code = 'ERR_ENR_BATCH_FULL';
  } else if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
  }

  return NextResponse.json(
    {
      success: false,
      errorCode: code,
      messageEnglish: msg,
      statusCode: status,
    },
    { status },
  );
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id: enrollmentId } = await props.params;
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'enrollment.submit', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const body = await request.json();
          const parsed = ChangeBatchRequestSchema.parse(body);

          const { enrollmentService, branchScopeResolver } =
            await import('../../../../../../lib/runtime');

          const allowedBranches =
            await branchScopeResolver.resolveAllowedBranches(
              session.userId,
              session.activeBranchId ?? null,
            );

          // Fetch enrollment to verify branch scope before modifying
          const prisma = (await import('../../../../../../lib/runtime')).prisma;
          const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
          });

          if (!enrollment) {
            throw new Error('ERR_ENROLLMENT_NOT_FOUND');
          }

          if (!allowedBranches.includes(enrollment.branchId as Uuid)) {
            throw new Error('ERR_AUTH_BRANCH_DENIED');
          }

          await enrollmentService.changeEnrollmentBatch(
            enrollmentId,
            parsed.batchId,
            session.userId,
          );

          const response = NextResponse.json(
            {
              success: true,
              message: 'Enrollment batch changed successfully.',
            },
            { status: 200 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/enrollments/[id]/change-batch',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error) {
          logger.error('api.enrollments.change-batch.failed', {
            status: 'failed',
            error: error as Error,
          });
          return errorResponse(error as Error);
        }
      }),
    { route: '/api/v1/enrollments/[id]/change-batch' },
  );
}
