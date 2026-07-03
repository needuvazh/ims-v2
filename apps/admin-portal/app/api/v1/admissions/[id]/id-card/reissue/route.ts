import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_REISSUE_INTERNAL_ERROR';

  if (msg.includes('ERR_ADMISSION_NOT_FOUND')) {
    status = 404;
    code = 'ERR_ADMISSION_NOT_FOUND';
  } else if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
  } else if (msg.includes('ERR_ADMISSION_NOT_APPROVED')) {
    status = 422;
    code = 'ERR_ADMISSION_NOT_APPROVED';
  }

  return NextResponse.json(
    { success: false, errorCode: code, messageEnglish: msg, statusCode: status },
    { status }
  );
}

function getNextCardNumber(studentNumber: string, currentCardNumber: string | null): string {
  if (!currentCardNumber || currentCardNumber === studentNumber) {
    return `${studentNumber}-R1`;
  }
  const match = currentCardNumber.match(/-R(\d+)$/);
  if (match) {
    const nextRev = parseInt(match[1], 10) + 1;
    return currentCardNumber.replace(/-R\d+$/, `-R${nextRev}`);
  }
  return `${currentCardNumber}-R1`;
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id: admissionId } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'idcard.reissue', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { prisma, branchScopeResolver } = await import('../../../../../../../lib/runtime');

      // 1. Fetch admission with student profile
      const admission = await prisma.admission.findUnique({
        where: { id: admissionId },
        include: {
          studentProfile: true,
        },
      });

      if (!admission || admission.isDeleted) {
        throw new Error('ERR_ADMISSION_NOT_FOUND');
      }

      // 2. Verify branch permission scope
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(admission.branchId as Uuid)) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      if (admission.admissionStatus !== 'Approved') {
        throw new Error('ERR_ADMISSION_NOT_APPROVED');
      }

      const profile = admission.studentProfile;
      const currentCardNumber = profile.idCardNumber;
      const nextCardNumber = getNextCardNumber(profile.studentNumber, currentCardNumber);

      // 3. Update profile and write audit log in transaction
      await prisma.$transaction(async (tx) => {
        await tx.studentProfile.update({
          where: { id: profile.id },
          data: {
            idCardIssued: true,
            idCardNumber: nextCardNumber,
            updatedBy: session.userId,
            updatedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            module: 'AdmissionsEnrollment',
            action: 'IDCardReissued',
            performedBy: session.userId,
            performedAt: new Date(),
            entityType: 'StudentProfile',
            entityId: profile.id,
            branchId: admission.branchId,
            oldValue: { idCardNumber: currentCardNumber || profile.studentNumber, idCardIssued: profile.idCardIssued },
            newValue: { idCardNumber: nextCardNumber, idCardIssued: true },
          },
        });
      });

      logger.info('api.admissions.idcard.reissue.succeeded', {
        status: 'success',
        entityId: profile.id,
        entityType: 'StudentProfile',
        action: 'IDCardReissued',
      });

      const response = NextResponse.json({
        success: true,
        idCardNumber: nextCardNumber,
      }, { status: 200 });

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/admissions/[id]/id-card/reissue',
        method: request.method,
        status: 'success',
      });
      return response;
    } catch (error) {
      logger.error('api.admissions.idcard.reissue.failed', { status: 'failed', error: error as Error });
      return errorResponse(error as Error);
    }
  }), { route: '/api/v1/admissions/[id]/id-card/reissue' });
}
