import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';
import { withRateLimit } from '../../../../lib/api-middleware';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/auth-forgot-password',
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
    const rateLimit = withRateLimit(request, 10, 60_000, '/api/v1/auth/forgot-password');
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-FORGOT-INVALID_JSON');
    }

    const parsed = forgotPasswordSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Email is required.',
        'IAM-VAL-FORGOT-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    try {
      const { authService } = await import('../../../../lib/runtime');
      await authService.forgotPassword(parsed.data.email);

      const response = NextResponse.json({ data: { requested: true } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/auth/forgot-password',
        method: request.method,
        status: 'success',
      });
      logger.info('api.auth.forgotPassword.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'Password reset request failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'Password reset request failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.auth.forgotPassword.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Password reset request failed', 'Unable to request a password reset at this time.', 'IAM-AUTH-FORGOT-FAILED');
    }
  }, { route: '/api/v1/auth/forgot-password' });
}
