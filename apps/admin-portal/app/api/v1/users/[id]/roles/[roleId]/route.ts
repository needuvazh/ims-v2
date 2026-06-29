import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../../lib/observability';

const removeRoleSchema = z.object({ reason: z.string().trim().min(1).optional() });

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-role-remove', title, status, detail, errorCode, invalidFields }, { status });
}

export async function DELETE(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    let payload: unknown = {};
    try { payload = await request.json(); } catch {}
    const parsed = removeRoleSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Role revocation reason is invalid.', 'IAM-VAL-USER-ROLE-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.user.assign-role');
      const { roleService } = await import('../../../../../../../lib/runtime');
      await roleService.removeRoleFromUser(params.id, params.roleId, parsed.data.reason ?? null, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });

      const response = NextResponse.json({ data: { revoked: true } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/roles/:roleId', method: request.method, status: 'success' });
      logger.info('api.users.roles.remove.succeeded', { status: 'success', userId: params.id, roleId: params.roleId });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Role revocation failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Role revocation failed', error.message, error.code.toUpperCase());
      logger.error('api.users.roles.remove.failed', { status: 'failed', error: error as Error, userId: params.id, roleId: params.roleId });
      return problemJson(500, 'Role revocation failed', 'Unable to revoke role at this time.', 'IAM-USER-ROLE-REMOVE-FAILED');
    }
  }, { route: '/api/v1/users/:id/roles/:roleId' });
}
