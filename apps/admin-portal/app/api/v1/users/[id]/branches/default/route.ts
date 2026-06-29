import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../../lib/observability';

const defaultBranchSchema = z.object({ branchId: z.string().uuid() });

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-default-branch', title, status, detail, errorCode, invalidFields }, { status });
}

export async function PUT(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    let payload: unknown;
    try { payload = await request.json(); } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-USER-DEFAULT-BRANCH-INVALID_JSON');
    }
    const parsed = defaultBranchSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Default branch is invalid.', 'IAM-VAL-USER-DEFAULT-BRANCH-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.user.assign-branch');
      const { branchAccessService } = await import('../../../../../../../lib/runtime');
      await branchAccessService.setDefaultBranch(params.id as import('@ims/shared-kernel').Uuid, parsed.data.branchId as import('@ims/shared-kernel').Uuid, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { defaultBranchId: parsed.data.branchId } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/branches/default', method: request.method, status: 'success' });
      logger.info('api.users.branches.default.succeeded', { status: 'success', userId: params.id, branchId: parsed.data.branchId });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Default branch update failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Default branch update failed', error.message, error.code.toUpperCase());
      logger.error('api.users.branches.default.failed', { status: 'failed', error: error as Error, userId: params.id, branchId: parsed.data.branchId });
      return problemJson(500, 'Default branch update failed', 'Unable to update default branch at this time.', 'IAM-USER-DEFAULT-BRANCH-FAILED');
    }
  }, { route: '/api/v1/users/:id/branches/default' });
}
