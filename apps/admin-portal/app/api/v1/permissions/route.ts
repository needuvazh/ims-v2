import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError, createPermissionCommandSchema } from '@ims/identity-access';
import { assertPermission } from '../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';

const querySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/permissions', title, status, detail, errorCode, invalidFields }, { status });
}

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    try {
      const session = await assertPermission('iam.permission.read');
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({ type: params.get('type') ?? undefined, status: params.get('status') ?? undefined });
      if (!parsed.success) {
        return problemJson(400, 'Invalid query parameters', 'One or more query parameters are invalid.', 'IAM-VAL-PERMISSIONS-INVALID_QUERY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'query', message: issue.message })));
      }

      const { permissionService } = await import('../../../../lib/runtime');
      const items = await permissionService.searchPermissions(parsed.data.type, parsed.data.status, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { items } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/permissions', method: request.method, status: 'success' });
      logger.info('api.permissions.list.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Permission list failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Permission list failed', error.message, error.code.toUpperCase());
      logger.error('api.permissions.list.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Permission list failed', 'Unable to load permissions at this time.', 'IAM-PERMISSIONS-LIST-FAILED');
    }
  }, { route: '/api/v1/permissions' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    let payload: unknown;
    try { payload = await request.json(); } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-PERMISSION-INVALID_JSON');
    }
    const parsed = createPermissionCommandSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Permission details are invalid.', 'IAM-VAL-PERMISSION-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.permission.create');
      const { permissionService } = await import('../../../../lib/runtime');
      const permission = await permissionService.createPermission(parsed.data, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { permission } }, { status: 201 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/permissions', method: request.method, status: 'success' });
      logger.info('api.permissions.create.succeeded', { status: 'success', permissionId: permission.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Permission create failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Permission create failed', error.message, error.code.toUpperCase());
      logger.error('api.permissions.create.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Permission create failed', 'Unable to create permission at this time.', 'IAM-PERMISSIONS-CREATE-FAILED');
    }
  }, { route: '/api/v1/permissions' });
}
