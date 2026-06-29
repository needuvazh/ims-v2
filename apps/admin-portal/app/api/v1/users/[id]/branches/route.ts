import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

const assignBranchSchema = z.object({
  branchId: z.string().uuid(),
  isDefault: z.boolean().optional().default(false),
  reason: z.string().trim().min(1).optional(),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-branches', title, status, detail, errorCode, invalidFields }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.user.read');
      const { branchAccessService } = await import('../../../../../../lib/runtime');
      const branches = await branchAccessService.getUserBranchAccess(params.id as import('@ims/shared-kernel').Uuid, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });
      const response = NextResponse.json({ data: { items: branches } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/branches', method: request.method, status: 'success' });
      logger.info('api.users.branches.list.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'User branches failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'User branches failed', error.message, error.code.toUpperCase());
      logger.error('api.users.branches.list.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'User branches failed', 'Unable to load branch assignments at this time.', 'IAM-USER-BRANCHES-FAILED');
    }
  }, { route: '/api/v1/users/:id/branches' });
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    let payload: unknown;
    try { payload = await request.json(); } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-USER-BRANCH-INVALID_JSON');
    }

    const parsed = assignBranchSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Branch assignment is invalid.', 'IAM-VAL-USER-BRANCH-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.user.assign-branch');
      const { branchAccessService } = await import('../../../../../../lib/runtime');
      const branch = await branchAccessService.assignBranchToUser(params.id as import('@ims/shared-kernel').Uuid, parsed.data.branchId as import('@ims/shared-kernel').Uuid, parsed.data.isDefault, parsed.data.reason ?? null, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });
      const response = NextResponse.json({ data: { branch } }, { status: 201 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/branches', method: request.method, status: 'success' });
      logger.info('api.users.branches.assign.succeeded', { status: 'success', userId: params.id, branchId: parsed.data.branchId });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Branch assignment failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Branch assignment failed', error.message, error.code.toUpperCase());
      logger.error('api.users.branches.assign.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'Branch assignment failed', 'Unable to assign branch at this time.', 'IAM-USER-BRANCH-ASSIGN-FAILED');
    }
  }, { route: '/api/v1/users/:id/branches' });
}
