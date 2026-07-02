import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

const CreateWalkInRequestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1),
  nationalId: z.string().nullable().optional(),
  courseId: z.string().uuid(),
  batchId: z.string().uuid(),
  remarks: z.string().nullable().optional(),
});

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_ENR_INTERNAL_ERROR';

  if (msg.includes('ERR_COURSE_NOT_FOUND')) {
    status = 404;
    code = 'ERR_COURSE_NOT_FOUND';
  } else if (msg.includes('ERR_COURSE_NOT_WALKIN_ENABLED')) {
    status = 400;
    code = 'ERR_COURSE_NOT_WALKIN_ENABLED';
  } else if (msg.includes('ERR_BATCH_NOT_FOUND')) {
    status = 404;
    code = 'ERR_BATCH_NOT_FOUND';
  } else if (msg.includes('ERR_ENR_BATCH_FULL')) {
    status = 400;
    code = 'ERR_ENR_BATCH_FULL';
  } else if (msg.includes('ERR_ENR_BATCH_COURSE_MISMATCH')) {
    status = 400;
    code = 'ERR_ENR_BATCH_COURSE_MISMATCH';
  } else if (msg.includes('ERR_ENR_BATCH_BRANCH_MISMATCH')) {
    status = 400;
    code = 'ERR_ENR_BATCH_BRANCH_MISMATCH';
  } else if (msg.includes('ERR_ENR_DUPLICATE_ENROLLMENT')) {
    status = 400;
    code = 'ERR_ENR_DUPLICATE_ENROLLMENT';
  } else if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
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
      const parsed = CreateWalkInRequestSchema.parse(body);

      const targetBranchId = session.activeBranchId;
      if (!targetBranchId) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      const { branchScopeResolver, enrollmentService } = await import('../../../../../lib/runtime');

      // Verify branch permission scope
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(targetBranchId as Uuid)) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      const result = await enrollmentService.createWalkInEnrollment({
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email || undefined,
        phone: parsed.phone,
        nationalId: parsed.nationalId || undefined,
        courseId: parsed.courseId,
        batchId: parsed.batchId,
        branchId: targetBranchId,
        actorId: session.userId,
        remarks: parsed.remarks || undefined,
      });

      const response = NextResponse.json(
        {
          success: true,
          enrollmentId: result.enrollment.id,
          enrollmentNumber: result.enrollment.enrollmentNumber,
          enrollmentStatus: result.enrollment.enrollmentStatus,
        },
        { status: 201 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/enrollments/walk-in',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.enrollments.walkin.create.failed', { status: 'failed', error: error as Error });
      return errorResponse(error as Error);
    }
  }), { route: '/api/v1/enrollments/walk-in' });
}
