import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

const suspendSchema = z.object({ reason: z.string().trim().min(1).optional() });

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-suspend', title, status, detail, errorCode, invalidFields }, { status });
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    let payload: unknown = {};
    try { payload = await request.json(); } catch {}
    const parsed = suspendSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Suspend reason is invalid.', 'IAM-VAL-USER-SUSPEND-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.user.suspend');
      const { userService } = await import('../../../../../../lib/runtime');
      await userService.suspendUser(params.id, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { suspended: true } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/suspend', method: request.method, status: 'success' });
      logger.info('api.users.suspend.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'User suspension failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'User suspension failed', error.message, error.code.toUpperCase());
      logger.error('api.users.suspend.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'User suspension failed', 'Unable to suspend user at this time.', 'IAM-USER-SUSPEND-FAILED');
    }
  }, { route: '/api/v1/users/:id/suspend' });
}
