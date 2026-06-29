import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/role-permission-remove', title, status, detail, errorCode }, { status });
}

export async function DELETE(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.role.permission.assign');
      const { roleService } = await import('../../../../../../../lib/runtime');
      await roleService.removePermissionFromRole(params.id, params.permissionId, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = new NextResponse(null, { status: 204 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/roles/:id/permissions/:permissionId', method: request.method, status: 'success' });
      logger.info('api.roles.permissions.remove.succeeded', { status: 'success', roleId: params.id, permissionId: params.permissionId });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Permission removal failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Permission removal failed', error.message, error.code.toUpperCase());
      logger.error('api.roles.permissions.remove.failed', { status: 'failed', error: error as Error, roleId: params.id });
      return problemJson(500, 'Permission removal failed', 'Unable to remove permission at this time.', 'IAM-ROLE-PERMISSION-REMOVE-FAILED');
    }
  }, { route: '/api/v1/roles/:id/permissions/:permissionId' });
}
