import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

const schema = z.object({ permissionId: z.string().uuid() });

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/role-permissions', title, status, detail, errorCode, invalidFields }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.role.read');
      const { roleService } = await import('../../../../../../lib/runtime');
      const permissions = await roleService.getRolePermissions(params.id, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { items: permissions } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/roles/:id/permissions', method: request.method, status: 'success' });
      logger.info('api.roles.permissions.list.succeeded', { status: 'success', roleId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Role permissions failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Role permissions failed', error.message, error.code.toUpperCase());
      logger.error('api.roles.permissions.list.failed', { status: 'failed', error: error as Error, roleId: params.id });
      return problemJson(500, 'Role permissions failed', 'Unable to load role permissions at this time.', 'IAM-ROLE-PERMISSIONS-FAILED');
    }
  }, { route: '/api/v1/roles/:id/permissions' });
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    let payload: unknown;
    try { payload = await request.json(); } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-ROLE-PERMISSION-INVALID_JSON');
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Permission assignment is invalid.', 'IAM-VAL-ROLE-PERMISSION-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }
    try {
      const session = await assertPermission('iam.role.permission.assign');
      const { roleService } = await import('../../../../../../lib/runtime');
      await roleService.assignPermissionToRole(params.id, parsed.data.permissionId, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { assigned: true } }, { status: 201 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/roles/:id/permissions', method: request.method, status: 'success' });
      logger.info('api.roles.permissions.assign.succeeded', { status: 'success', roleId: params.id, permissionId: parsed.data.permissionId });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Permission assignment failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Permission assignment failed', error.message, error.code.toUpperCase());
      logger.error('api.roles.permissions.assign.failed', { status: 'failed', error: error as Error, roleId: params.id });
      return problemJson(500, 'Permission assignment failed', 'Unable to assign permission at this time.', 'IAM-ROLE-PERMISSION-ASSIGN-FAILED');
    }
  }, { route: '/api/v1/roles/:id/permissions' });
}
