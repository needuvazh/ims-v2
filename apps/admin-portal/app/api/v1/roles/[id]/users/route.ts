import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/role-users', title, status, detail, errorCode }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.role.read');
      const { userService } = await import('../../../../../../lib/runtime');
      const users = await userService.searchUsers({ roleId: params.id }, 1, 1000, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });
      const response = NextResponse.json({ data: users }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/roles/:id/users', method: request.method, status: 'success' });
      logger.info('api.roles.users.list.succeeded', { status: 'success', roleId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Role users failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Role users failed', error.message, error.code.toUpperCase());
      logger.error('api.roles.users.list.failed', { status: 'failed', error: error as Error, roleId: params.id });
      return problemJson(500, 'Role users failed', 'Unable to load role users at this time.', 'IAM-ROLE-USERS-FAILED');
    }
  }, { route: '/api/v1/roles/:id/users' });
}
