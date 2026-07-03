import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

const RecordPaymentRequestSchema = z.object({
  paymentCollected: z.number().positive(),
  paymentMethod: z.string().min(1).optional(),
  remarks: z.string().nullable().optional(),
});

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_ENR_INTERNAL_ERROR';

  if (msg.includes('ERR_ENROLLMENT_NOT_FOUND')) {
    status = 404;
    code = 'ERR_ENROLLMENT_NOT_FOUND';
  } else if (msg.includes('ERR_ENR_PAYMENT_BLOCKED_WAITLIST')) {
    status = 400;
    code = 'ERR_ENR_PAYMENT_BLOCKED_WAITLIST';
  } else if (msg.includes('ERR_ENR_PAYMENT_INCOMPLETE')) {
    status = 400;
    code = 'ERR_ENR_PAYMENT_INCOMPLETE';
  } else if (msg.includes('ERR_ENR_INVALID_STATE')) {
    status = 400;
    code = 'ERR_ENR_INVALID_STATE';
  } else if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
  }

  return NextResponse.json(
    { success: false, errorCode: code, messageEnglish: msg, statusCode: status },
    { status }
  );
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'enrollment.walk-in-payment', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const body = await request.json();
      const parsed = RecordPaymentRequestSchema.parse(body);

      if (!session.activeBranchId) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      const { branchScopeResolver, enrollmentService, prisma } = await import('../../../../../../lib/runtime');

      // Verify branch permission scope
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      const enrollment = await prisma.enrollment.findUnique({
        where: { id },
        select: { branchId: true },
      });

      if (!enrollment) {
        throw new Error('ERR_ENROLLMENT_NOT_FOUND');
      }

      if (!allowedBranches.includes(enrollment.branchId as Uuid)) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      const result = await enrollmentService.recordWalkInPayment(
        id,
        parsed.paymentCollected,
        session.userId,
        parsed.remarks || undefined,
        parsed.paymentMethod || 'Cash'
      );

      const response = NextResponse.json(
        {
          success: true,
          enrollmentId: result.enrollment.id,
          enrollmentStatus: result.enrollment.enrollmentStatus,
          confirmationNumber: result.confirmation.confirmationNumber,
          documentUrl: result.confirmation.documentUrl,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/enrollments/[id]/walk-in-payment',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.enrollments.walkin.payment.failed', { status: 'failed', error: error as Error });
      return errorResponse(error as Error);
    }
  }), { route: '/api/v1/enrollments/[id]/walk-in-payment' });
}
