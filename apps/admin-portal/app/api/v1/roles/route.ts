import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError, createRoleCommandSchema } from '@ims/identity-access';
import { withPermission } from '../../../../lib/api-middleware';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/roles', title, status, detail, errorCode, invalidFields }, { status });
}

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'iam.role.read', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    try {
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({ page: params.get('page') ?? undefined, pageSize: params.get('pageSize') ?? undefined });
      if (!parsed.success) {
        return problemJson(400, 'Invalid query parameters', 'One or more query parameters are invalid.', 'IAM-VAL-ROLES-INVALID_QUERY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'query', message: issue.message })));
      }

      const { roleService } = await import('../../../../lib/runtime');
      const result = await roleService.listRoles(parsed.data.page, parsed.data.pageSize, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });

      const response = NextResponse.json({ data: result }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/roles', method: request.method, status: 'success' });
      logger.info('api.roles.list.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Role list failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Role list failed', error.message, error.code.toUpperCase());
      logger.error('api.roles.list.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Role list failed', 'Unable to load roles at this time.', 'IAM-ROLES-LIST-FAILED');
    }
  }), { route: '/api/v1/roles' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'iam.role.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    let payload: unknown;
    try { payload = await request.json(); } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-ROLE-INVALID_JSON');
    }

    const parsed = createRoleCommandSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Role details are invalid.', 'IAM-VAL-ROLE-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const { roleService } = await import('../../../../lib/runtime');
      const role = await roleService.createRole(parsed.data, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { role } }, { status: 201 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/roles', method: request.method, status: 'success' });
      logger.info('api.roles.create.succeeded', { status: 'success', roleId: role.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Role create failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Role create failed', error.message, error.code.toUpperCase());
      logger.error('api.roles.create.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Role create failed', 'Unable to create the role at this time.', 'IAM-ROLES-CREATE-FAILED');
    }
  }), { route: '/api/v1/roles' });
}
