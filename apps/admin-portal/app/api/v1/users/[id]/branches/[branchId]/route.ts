import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-branch-remove', title, status, detail, errorCode }, { status });
}

export async function DELETE(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.user.assign-branch');
      const { branchAccessService } = await import('../../../../../../../lib/runtime');
      await branchAccessService.removeBranchFromUser(params.id, params.branchId, null, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });
      const response = new NextResponse(null, { status: 204 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/branches/:branchId', method: request.method, status: 'success' });
      logger.info('api.users.branches.remove.succeeded', { status: 'success', userId: params.id, branchId: params.branchId });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Branch removal failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Branch removal failed', error.message, error.code.toUpperCase());
      logger.error('api.users.branches.remove.failed', { status: 'failed', error: error as Error, userId: params.id, branchId: params.branchId });
      return problemJson(500, 'Branch removal failed', 'Unable to remove branch at this time.', 'IAM-USER-BRANCH-REMOVE-FAILED');
    }
  }, { route: '/api/v1/users/:id/branches/:branchId' });
}
