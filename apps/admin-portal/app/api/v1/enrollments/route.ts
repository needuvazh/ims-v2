import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

const CreateEnrollmentRequestSchema = z.object({
  studentProfileId: z.string().uuid().nullable().optional(),
  admissionId: z.string().uuid().nullable().optional(),
  courseId: z.string().uuid(),
  batchId: z.string().uuid(),
  enrollmentType: z.enum(['Regular', 'Corporate', 'WalkIn', 'Online']),
  corporateParticipantId: z.string().uuid().nullable().optional(),
});

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_ENR_INTERNAL_ERROR';

  if (msg.includes('ERR_ENR_MISSING_ADMISSION')) {
    status = 400;
    code = 'ERR_ENR_MISSING_ADMISSION';
  } else if (msg.includes('ERR_CRS_COURSE_NOT_FOUND')) {
    status = 404;
    code = 'ERR_CRS_COURSE_NOT_FOUND';
  } else if (msg.includes('ERR_CRS_PRICING_NOT_FOUND')) {
    status = 404;
    code = 'ERR_CRS_PRICING_NOT_FOUND';
  } else if (msg.includes('ERR_ENR_CREDIT_EXCEEDED')) {
    status = 409;
    code = 'ERR_ENR_CREDIT_EXCEEDED';
  } else if (msg.includes('ERR_ENR_CREDIT_RULE_NOT_FOUND')) {
    status = 404;
    code = 'ERR_ENR_CREDIT_RULE_NOT_FOUND';
  }

  return NextResponse.json(
    { success: false, errorCode: code, messageEnglish: msg, statusCode: status },
    { status }
  );
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'enrollment.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const body = await request.json();
      const parsed = CreateEnrollmentRequestSchema.parse(body);

      if (parsed.enrollmentType === 'WalkIn') {
        return NextResponse.json(
          { success: false, errorCode: 'ERR_ENR_GENERIC_WALKIN_BLOCKED', messageEnglish: 'Walk-in enrollments must use the dedicated walk-in endpoint', statusCode: 400 },
          { status: 400 }
        );
      }

      const targetBranchId = session.activeBranchId;
      if (!targetBranchId) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      const { branchScopeResolver, enrollmentService } = await import('../../../../lib/runtime');

      // Verify branch permission scope
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(targetBranchId as Uuid)) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      const result = await enrollmentService.createEnrollment({
        studentProfileId: parsed.studentProfileId,
        admissionId: parsed.admissionId,
        courseId: parsed.courseId,
        batchId: parsed.batchId,
        enrollmentType: parsed.enrollmentType,
        corporateParticipantId: parsed.corporateParticipantId,
        branchId: targetBranchId,
        actorId: session.userId,
      });

      const response = NextResponse.json(
        {
          success: true,
          enrollmentId: result.id,
          enrollmentNumber: result.enrollmentNumber,
        },
        { status: 201 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/enrollments',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.enrollments.create.failed', { status: 'failed', error: error as Error });
      return errorResponse(error as Error);
    }
  }), { route: '/api/v1/enrollments' });
}
