import { NextResponse } from 'next/server';
import { z } from 'zod';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/auth-change-password',
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
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-CHANGE-INVALID_JSON');
    }

    const parsed = changePasswordSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Current password and new password are required.',
        'IAM-VAL-CHANGE-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    const cookieValue = request.headers.get('cookie')?.match(new RegExp(`${sessionCookieName}=([^;]+)`))?.[1];
    const session = await decodeSession(cookieValue);
    if (!session) {
      return problemJson(401, 'Authentication required', 'Please sign in again.', 'IAM-AUTH-CHANGE-UNAUTHORIZED');
    }

    try {
      const { authService } = await import('../../../../lib/runtime');
      const result = await authService.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      }, session);

      const response = new NextResponse(null, { status: 204 });
      response.cookies.set(sessionCookieName, result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: Math.max(0, Math.floor((result.session.expiresAt - Date.now()) / 1000)),
      });

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/auth/change-password',
        method: request.method,
        status: 'success',
      });
      logger.info('api.auth.changePassword.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'Password change failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'Password change failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.auth.changePassword.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Password change failed', 'Unable to change the password at this time.', 'IAM-AUTH-CHANGE-FAILED');
    }
  }, { route: '/api/v1/auth/change-password' });
}
