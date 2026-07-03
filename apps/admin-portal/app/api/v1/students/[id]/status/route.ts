import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../../lib/api-middleware';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';
import { createUuid } from '@ims/shared-kernel';

const bodySchema = z.object({
  newStatus: z.enum(['Pending', 'Active', 'Suspended', 'Archived']),
  reason: z.string().trim().min(10).max(500),
  effectiveDate: z.string().datetime().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: studentProfileId } = await params;

  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'student.status.change', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ success: false, errorCode: 'ERR_VAL_BODY_MISSING', messageEnglish: 'Request body is required.', statusCode: 400 }, { status: 400 });
      }

      const parsed = bodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, errorCode: 'ERR_VAL_FAILED', messageEnglish: parsed.error.issues[0]?.message ?? 'Validation failed.', statusCode: 400 }, { status: 400 });
      }

      try {
        const { prisma, branchScopeResolver, studentStatusService } = await import('../../../../../../lib/runtime');

        const profile = await prisma.studentProfile.findUnique({
          where: { id: studentProfileId },
          select: { id: true, branchId: true, isDeleted: true },
        });

        if (!profile || profile.isDeleted) {
          return NextResponse.json({ success: false, errorCode: 'ERR_STU_PROFILE_NOT_FOUND', messageEnglish: 'Student profile not found.', statusCode: 404 }, { status: 404 });
        }

        const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
          createUuid(session.userId),
          session.activeBranchId ? createUuid(session.activeBranchId) : null
        );
        if (!allowedBranches.some((branchId) => branchId === profile.branchId)) {
          return NextResponse.json({ success: false, errorCode: 'ERR_AUTH_BRANCH_DENIED', messageEnglish: 'Student profile is outside your allowed branch scope.', statusCode: 403 }, { status: 403 });
        }

        await studentStatusService.transition({
          studentProfileId,
          newStatus: parsed.data.newStatus,
          changeReason: parsed.data.reason,
          actorId: session.userId,
          branchId: profile.branchId,
          effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : undefined,
        });

        const response = NextResponse.json({ success: true, data: { studentProfileId, newStatus: parsed.data.newStatus } }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/students/[id]/status', method: request.method, status: 'success' });
        return response;
      } catch (error) {
        logger.error('api.students.status.failed', { status: 'failed', error: error as Error });
        return NextResponse.json({ success: false, errorCode: 'ERR_STUDENT_INTERNAL_ERROR', messageEnglish: (error as Error).message, statusCode: 500 }, { status: 500 });
      }
    }),
    { route: '/api/v1/students/[id]/status' }
  );
}
