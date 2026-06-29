import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/role-archive', title, status, detail, errorCode }, { status });
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.role.archive');
      const { roleService } = await import('../../../../../../lib/runtime');
      await roleService.archiveRole(params.id, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = new NextResponse(null, { status: 204 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/roles/:id/archive', method: request.method, status: 'success' });
      logger.info('api.roles.archive.succeeded', { status: 'success', roleId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Role archive failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Role archive failed', error.message, error.code.toUpperCase());
      logger.error('api.roles.archive.failed', { status: 'failed', error: error as Error, roleId: params.id });
      return problemJson(500, 'Role archive failed', 'Unable to archive role at this time.', 'IAM-ROLES-ARCHIVE-FAILED');
    }
  }, { route: '/api/v1/roles/:id/archive' });
}
