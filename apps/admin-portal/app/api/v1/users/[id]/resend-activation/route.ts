import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/user-resend-activation',
      title,
      status,
      detail,
      errorCode,
    },
    { status },
  );
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;

    try {
      const session = await assertPermission('iam.user.activate');
      const { userService } = await import('../../../../../lib/runtime');

      await userService.resendActivationEmail(params.id, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });

      const response = NextResponse.json({ data: { resent: true } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/users/:id/resend-activation',
        method: request.method,
        status: 'success',
      });
      logger.info('api.users.resendActivation.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'Activation resend failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'Activation resend failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.users.resendActivation.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'Activation resend failed', 'Unable to resend activation email at this time.', 'IAM-USER-RESEND-ACTIVATION-FAILED');
    }
  }, { route: '/api/v1/users/:id/resend-activation' });
}
