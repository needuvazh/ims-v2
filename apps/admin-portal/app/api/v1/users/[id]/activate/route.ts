import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-activate', title, status, detail, errorCode }, { status });
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.user.activate');
      const { userService } = await import('../../../../../../lib/runtime');
      await userService.activateUser(params.id, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });

      const response = NextResponse.json({ data: { activated: true } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/activate', method: request.method, status: 'success' });
      logger.info('api.users.activate.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'User activation failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'User activation failed', error.message, error.code.toUpperCase());
      logger.error('api.users.activate.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'User activation failed', 'Unable to activate user at this time.', 'IAM-USER-ACTIVATE-FAILED');
    }
  }, { route: '/api/v1/users/:id/activate' });
}
