import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError, updateRoleCommandSchema } from '@ims/identity-access';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/role-detail', title, status, detail, errorCode, invalidFields }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.role.read');
      const { roleService } = await import('../../../../../lib/runtime');
      const result = await roleService.listRoles(1, 1000, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const role = result.items.find((item: { id: string }) => item.id === params.id);
      if (!role) {
        return problemJson(404, 'Role not found', 'Role does not exist.', 'IAM-SYS-001');
      }

      const response = NextResponse.json({ data: { role } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/roles/:id', method: request.method, status: 'success' });
      logger.info('api.roles.get.succeeded', { status: 'success', roleId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Role detail failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Role detail failed', error.message, error.code.toUpperCase());
      logger.error('api.roles.get.failed', { status: 'failed', error: error as Error, roleId: params.id });
      return problemJson(500, 'Role detail failed', 'Unable to load role at this time.', 'IAM-ROLES-GET-FAILED');
    }
  }, { route: '/api/v1/roles/:id' });
}

export async function PUT(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    let payload: unknown;
    try { payload = await request.json(); } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-ROLE-INVALID_JSON');
    }

    const parsed = updateRoleCommandSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Role update is invalid.', 'IAM-VAL-ROLE-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.role.update');
      const { roleService } = await import('../../../../../lib/runtime');
      const role = await roleService.updateRole(params.id, parsed.data, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { role } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/roles/:id', method: request.method, status: 'success' });
      logger.info('api.roles.update.succeeded', { status: 'success', roleId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Role update failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Role update failed', error.message, error.code.toUpperCase());
      logger.error('api.roles.update.failed', { status: 'failed', error: error as Error, roleId: params.id });
      return problemJson(500, 'Role update failed', 'Unable to update role at this time.', 'IAM-ROLES-UPDATE-FAILED');
    }
  }, { route: '/api/v1/roles/:id' });
}
