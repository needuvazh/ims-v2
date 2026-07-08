import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { hasPermission } from '@ims/shared-auth';
import { createUuid } from '@ims/shared-kernel';

/**
 * POST /api/v1/students/[id]/id-card
 *
 * Issues or reissues an ID card for a StudentProfile. Records the event
 * in StudentIdCardHistory and updates StudentProfile.idCardIssued/idCardNumber.
 *
 * Permission: student.id_card.issue
 */
const bodySchema = z.object({
  newIdCardNumber: z.string().min(3).max(50),
  reason: z.string().min(3).max(500),
  eventType: z.enum(['Issue', 'Reissue']),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: studentProfileId } = await params;

  return withRouteObservability(
    request.headers,
    async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { session } = await withAuth(request);
        if (
          !hasPermission(session, 'student.idcard.manage') &&
          !hasPermission(session, 'student.id_card.issue')
        ) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_AUTH_PERMISSION_DENIED',
              messageEnglish: 'Missing student.idcard.manage permission.',
              statusCode: 403,
            },
            { status: 403 },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_VAL_BODY_MISSING',
              messageEnglish: 'Request body is required.',
              statusCode: 400,
            },
            { status: 400 },
          );
        }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_VAL_FAILED',
              messageEnglish:
                parsed.error.issues[0]?.message ?? 'Validation failed.',
              statusCode: 400,
            },
            { status: 400 },
          );
        }

        const { prisma } = await import('../../../../../../lib/runtime');
        const profile = await prisma.studentProfile.findUnique({
          where: { id: studentProfileId },
          select: {
            id: true,
            branchId: true,
            idCardIssued: true,
            idCardNumber: true,
            isDeleted: true,
          },
        });

        if (!profile || profile.isDeleted) {
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

        const { branchScopeResolver } =
          await import('../../../../../../lib/runtime');
        const allowedBranches =
          await branchScopeResolver.resolveAllowedBranches(
            createUuid(session.userId),
            session.activeBranchId ? createUuid(session.activeBranchId) : null,
          );

        if (
          !allowedBranches.some((branchId) => branchId === profile.branchId)
        ) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_AUTH_BRANCH_SCOPE_DENIED',
              messageEnglish:
                'Student profile is outside your allowed branch scope.',
              statusCode: 403,
            },
            { status: 403 },
          );
        }

        if (parsed.data.eventType === 'Issue' && profile.idCardIssued) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_IDCARD_ALREADY_ISSUED',
              messageEnglish: 'ID card already issued. Use Reissue instead.',
              statusCode: 409,
            },
            { status: 409 },
          );
        }

        await prisma.$transaction(async (tx) => {
          await tx.studentIdCardHistory.create({
            data: {
              studentProfileId,
              branchId: profile.branchId,
              eventType: parsed.data.eventType,
              oldIdCardNumber: profile.idCardNumber ?? null,
              newIdCardNumber: parsed.data.newIdCardNumber,
              eventDate: new Date(),
              reason: parsed.data.reason,
              performedByUserId: session.userId,
              createdBy: session.userId,
              updatedBy: session.userId,
            },
          });

          await tx.studentProfile.update({
            where: { id: studentProfileId },
            data: {
              idCardIssued: true,
              idCardNumber: parsed.data.newIdCardNumber,
              updatedAt: new Date(),
              updatedBy: session.userId,
            },
          });

          await tx.auditLog.create({
            data: {
              action: `IdCard${parsed.data.eventType}d`,
              entityType: 'StudentProfile',
              entityId: studentProfileId,
              performedBy: session.userId,
              branchId: profile.branchId,
              performedAt: new Date(),
              module: 'AdmissionsEnrollment',
              oldValue: { idCardNumber: profile.idCardNumber },
              newValue: {
                idCardNumber: parsed.data.newIdCardNumber,
                eventType: parsed.data.eventType,
                reason: parsed.data.reason,
              },
            },
          });
        });

        const response = NextResponse.json(
          {
            success: true,
            data: { idCardNumber: parsed.data.newIdCardNumber },
          },
          { status: 200 },
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/students/${studentProfileId}/id-card`,
          method: request.method,
          status: 'success',
        });

        logger.info('api.students.id-card.success', { status: 'success' });
        return response;
      } catch (error) {
        logger.error('api.students.id-card.failed', {
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
    },
    { route: `/api/v1/students/${studentProfileId}/id-card` },
  );
}
