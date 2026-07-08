import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { createUuid } from '@ims/shared-kernel';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: studentProfileId } = await params;

  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'student.restore', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { prisma, branchScopeResolver, studentStatusService } =
            await import('../../../../../../lib/runtime');
          const profile = await prisma.studentProfile.findUnique({
            where: { id: studentProfileId },
            select: {
              id: true,
              branchId: true,
              isDeleted: true,
              studentStatus: true,
            },
          });
          if (
            !profile ||
            (profile.isDeleted && profile.studentStatus !== 'Archived')
          ) {
            return NextResponse.json(
              {
                success: false,
                errorCode: 'ERR_STU_PROFILE_NOT_FOUND',
                messageEnglish: 'Student profile not found.',
                statusCode: 404,
              },
              { status: 404 },
            );
          }

          const allowedBranches =
            await branchScopeResolver.resolveAllowedBranches(
              createUuid(session.userId),
              session.activeBranchId
                ? createUuid(session.activeBranchId)
                : null,
            );
          if (
            !allowedBranches.some((branchId) => branchId === profile.branchId)
          ) {
            return NextResponse.json(
              {
                success: false,
                errorCode: 'ERR_AUTH_BRANCH_DENIED',
                messageEnglish:
                  'Student profile is outside your allowed branch scope.',
                statusCode: 403,
              },
              { status: 403 },
            );
          }

          await studentStatusService.transition({
            studentProfileId,
            newStatus: 'Active',
            changeReason: 'Restored archived profile',
            actorId: session.userId,
            branchId: profile.branchId,
          });

          const response = NextResponse.json(
            { success: true, data: { studentProfileId, status: 'Active' } },
            { status: 200 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/students/[id]/restore',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.students.restore.failed', {
            status: 'failed',
            error: error as Error,
          });
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_STUDENT_INTERNAL_ERROR',
              messageEnglish: (error as Error).message,
              statusCode: 500,
            },
            { status: 500 },
          );
        }
      }),
    { route: '/api/v1/students/[id]/restore' },
  );
}
