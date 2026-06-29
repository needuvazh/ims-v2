import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

const createUserRoleSchema = z.object({
  roleId: z.string().uuid(),
  reason: z.string().trim().min(1).optional(),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-roles', title, status, detail, errorCode, invalidFields }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      await assertPermission('iam.user.read');
      const { userService } = await import('../../../../../../lib/runtime');
      const roles = await userService.listRolesForUser(params.id);
      const response = NextResponse.json({ data: { items: roles } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/roles', method: request.method, status: 'success' });
      logger.info('api.users.roles.list.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'User roles failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'User roles failed', error.message, error.code.toUpperCase());
      logger.error('api.users.roles.list.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'User roles failed', 'Unable to load user roles at this time.', 'IAM-USER-ROLES-FAILED');
    }
  }, { route: '/api/v1/users/:id/roles' });
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    let payload: unknown;
    try { payload = await request.json(); } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-USER-ROLE-INVALID_JSON');
    }

    const parsed = createUserRoleSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Role assignment is invalid.', 'IAM-VAL-USER-ROLE-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.user.assign-role');
      const { roleService } = await import('../../../../../../lib/runtime');
      await roleService.assignRoleToUser(params.id, parsed.data.roleId, parsed.data.reason ?? null, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });

      const response = NextResponse.json({ data: { assigned: true } }, { status: 201 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/roles', method: request.method, status: 'success' });
      logger.info('api.users.roles.assign.succeeded', { status: 'success', userId: params.id, roleId: parsed.data.roleId });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Role assignment failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Role assignment failed', error.message, error.code.toUpperCase());
      logger.error('api.users.roles.assign.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'Role assignment failed', 'Unable to assign role at this time.', 'IAM-USER-ROLE-ASSIGN-FAILED');
    }
  }, { route: '/api/v1/users/:id/roles' });
}
