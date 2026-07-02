import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_ADMISSION_INTERNAL_ERROR';

  if (msg.includes('ERR_ADMISSION_NOT_FOUND')) {
    status = 404;
    code = 'ERR_ADMISSION_NOT_FOUND';
  } else if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
  }

  return NextResponse.json(
    { success: false, errorCode: code, messageEnglish: msg, statusCode: status },
    { status }
  );
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id: admissionId } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'admission.read', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { branchScopeResolver, admissionQueryService } = await import('../../../../../lib/runtime');

      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );

      const detail = await admissionQueryService.getAdmissionDetail(
        admissionId,
        allowedBranches.map((b) => b as string)
      );

      const response = NextResponse.json(
        {
          success: true,
          data: detail,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/admissions/[id]',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.admissions.get.failed', { status: 'failed', error: error as Error });
      return errorResponse(error as Error);
    }
  }), { route: '/api/v1/admissions/[id]' });
}
