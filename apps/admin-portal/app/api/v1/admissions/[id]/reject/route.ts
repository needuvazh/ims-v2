import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json(
    { success: false, errorCode, messageEnglish: detail, statusCode: status },
    { status }
  );
}

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_ADMISSION_INTERNAL_ERROR';
  
  if (msg.includes('ERR_ADMISSION_NOT_FOUND')) {
    status = 404;
    code = 'ERR_ADMISSION_NOT_FOUND';
  } else if (msg.includes('ERR_ADMISSION_INVALID_STATUS_TRANSITION')) {
    status = 422;
    code = 'ERR_ADMISSION_INVALID_STATUS_TRANSITION';
  } else if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
  } else if (msg.includes('ERR_ADMISSION_REJECTION_REMARKS_REQUIRED')) {
    status = 400;
    code = 'ERR_ADMISSION_REJECTION_REMARKS_REQUIRED';
  }

  return NextResponse.json(
    { success: false, errorCode: code, messageEnglish: msg, statusCode: status },
    { status }
  );
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id: admissionId } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'admission.approve', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: { remarks?: string } = {};
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'ERR_INVALID_JSON');
    }

    if (!payload.remarks || payload.remarks.trim() === '') {
      return problemJson(400, 'Remarks Required', 'Rejection remarks are required.', 'ERR_ADMISSION_REJECTION_REMARKS_REQUIRED');
    }

    try {
      const { prisma, branchScopeResolver, admissionService } = await import('../../../../../../lib/runtime');
      
      const admission = await prisma.admission.findUnique({
        where: { id: admissionId }
      });

      if (!admission) {
        throw new Error('ERR_ADMISSION_NOT_FOUND');
      }

      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(admission.branchId as Uuid)) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      await admissionService.rejectAdmission(admissionId, payload.remarks, session.userId);

      const response = NextResponse.json({ success: true }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/admissions/[id]/reject',
        method: request.method,
        status: 'success',
      });
      return response;
    } catch (error) {
      logger.error('api.admissions.reject.failed', { status: 'failed', error: error as Error });
      return errorResponse(error as Error);
    }
  }), { route: '/api/v1/admissions/[id]/reject' });
}
