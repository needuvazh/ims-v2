import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError, updatePermissionCommandSchema } from '@ims/identity-access';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/permission-detail', title, status, detail, errorCode, invalidFields }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.permission.read');
      const { permissionService } = await import('../../../../../lib/runtime');
      const permission = await permissionService.getPermissionById(params.id, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { permission } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/permissions/:id', method: request.method, status: 'success' });
      logger.info('api.permissions.get.succeeded', { status: 'success', permissionId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Permission detail failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Permission detail failed', error.message, error.code.toUpperCase());
      logger.error('api.permissions.get.failed', { status: 'failed', error: error as Error, permissionId: params.id });
      return problemJson(500, 'Permission detail failed', 'Unable to load permission at this time.', 'IAM-PERMISSIONS-GET-FAILED');
    }
  }, { route: '/api/v1/permissions/:id' });
}

export async function PUT(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    let payload: unknown;
    try { payload = await request.json(); } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-PERMISSION-INVALID_JSON');
    }
    const parsed = updatePermissionCommandSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Permission update is invalid.', 'IAM-VAL-PERMISSION-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.permission.update');
      const { permissionService } = await import('../../../../../lib/runtime');
      const permission = await permissionService.updatePermission(params.id, parsed.data, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { permission } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/permissions/:id', method: request.method, status: 'success' });
      logger.info('api.permissions.update.succeeded', { status: 'success', permissionId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Permission update failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Permission update failed', error.message, error.code.toUpperCase());
      logger.error('api.permissions.update.failed', { status: 'failed', error: error as Error, permissionId: params.id });
      return problemJson(500, 'Permission update failed', 'Unable to update permission at this time.', 'IAM-PERMISSIONS-UPDATE-FAILED');
    }
  }, { route: '/api/v1/permissions/:id' });
}
