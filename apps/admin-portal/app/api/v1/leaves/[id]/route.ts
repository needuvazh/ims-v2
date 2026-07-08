import { NextResponse } from 'next/server';
import { withAuth, errorHandler } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
} from '../../../../lib/observability';
import { leaveManagementService, branchScopeResolver } from '../../../../lib/runtime';

function success(
  data: Record<string, unknown>,
  request: Request,
  route: string,
  status = 200,
) {
  const response = NextResponse.json({ success: true, ...data }, { status });
  applyObservabilityResponseHeaders(response.headers, request.headers, {
    route,
    method: request.method,
    status: 'success',
  });
  return response;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withRouteObservability(
    request.headers,
    async () => {
      try {
        const { session } = await withAuth(request);
        const leaveId = (await params).id;

        const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
          session.userId as any,
          session.activeBranchId as any,
        );

        const authContext = {
          actorId: session.userId,
          branchId: session.activeBranchId,
          permissions: session.permissions,
          allowedBranchIds,
        };

        await leaveManagementService.cancelLeave(leaveId, authContext);
        return success({}, request, `/api/v1/leaves/${leaveId}`);
      } catch (error) {
        return errorHandler(error, {
          title: 'Failed to cancel leave request',
          detail: 'Failed to cancel leave request due to validation, authorization or database error.',
          errorCode: 'LEAVE-CANCEL-FAILED',
        });
      }
    },
  );
}
