import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/permission-archive', title, status, detail, errorCode }, { status });
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.permission.archive');
      const { permissionService } = await import('../../../../../../lib/runtime');
      await permissionService.archivePermission(params.id, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = new NextResponse(null, { status: 204 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/permissions/:id/archive', method: request.method, status: 'success' });
      logger.info('api.permissions.archive.succeeded', { status: 'success', permissionId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Permission archive failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Permission archive failed', error.message, error.code.toUpperCase());
      logger.error('api.permissions.archive.failed', { status: 'failed', error: error as Error, permissionId: params.id });
      return problemJson(500, 'Permission archive failed', 'Unable to archive permission at this time.', 'IAM-PERMISSIONS-ARCHIVE-FAILED');
    }
  }, { route: '/api/v1/permissions/:id/archive' });
}
