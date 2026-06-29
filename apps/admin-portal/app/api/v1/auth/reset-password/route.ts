import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/auth-reset-password',
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
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-RESET-INVALID_JSON');
    }

    const parsed = resetPasswordSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Reset token and new password are required.',
        'IAM-VAL-RESET-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    try {
      const { authService } = await import('../../../../lib/runtime');
      await authService.resetPassword(parsed.data.token, parsed.data.newPassword);

      const response = new NextResponse(null, { status: 204 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/auth/reset-password',
        method: request.method,
        status: 'success',
      });
      logger.info('api.auth.resetPassword.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'Password reset failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'Password reset failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.auth.resetPassword.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Password reset failed', 'Unable to reset the password at this time.', 'IAM-AUTH-RESET-FAILED');
    }
  }, { route: '/api/v1/auth/reset-password' });
}
