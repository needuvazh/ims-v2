import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';

const activateAccountSchema = z.object({
  token: z.string().min(1),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/auth-activate-account',
      title,
      status,
      detail,
      errorCode,
      invalidFields,
    },
    { status },
  );
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-ACTIVATE-INVALID_JSON');
    }

    const parsed = activateAccountSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Activation token is required.',
        'IAM-VAL-ACTIVATE-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    try {
      const { userService } = await import('../../../../lib/runtime');
      await userService.activateAccountViaToken(parsed.data.token);

      const response = NextResponse.json({ data: { activated: true } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/auth/activate-account',
        method: request.method,
        status: 'success',
      });
      logger.info('api.auth.activateAccount.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'Activation failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'Activation failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.auth.activateAccount.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Activation failed', 'Unable to activate the account at this time.', 'IAM-AUTH-ACTIVATE-FAILED');
    }
  }, { route: '/api/v1/auth/activate-account' });
}
