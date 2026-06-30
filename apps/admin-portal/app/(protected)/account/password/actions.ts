'use server';

import { cookies } from 'next/headers';
import { sessionCookieName } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import { authService } from '../../../lib/runtime';
import { getSession } from '../../../lib/auth-guard';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '../../../lib/observability';
import { changePasswordFormSchema } from './schema';

export type ChangePasswordState = {
  success?: boolean;
  error?: string;
};

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const session = await getSession();
      const cookieStore = await cookies();
      const token = cookieStore.get(sessionCookieName)?.value;

      const parsed = changePasswordFormSchema.safeParse({
        currentPassword: String(formData.get('currentPassword') ?? ''),
        newPassword: String(formData.get('newPassword') ?? ''),
        confirmPassword: String(formData.get('confirmPassword') ?? ''),
      });

      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        return {
          error: fieldErrors.currentPassword?.[0] ?? fieldErrors.newPassword?.[0] ?? fieldErrors.confirmPassword?.[0] ?? 'Please fix the highlighted fields.',
        };
      }

      if (!token) {
        return { error: 'Your session is missing. Please sign in again.' };
      }

      const result = await authService.changePassword(
        {
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        },
        session,
      );

      cookieStore.set(sessionCookieName, result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      logger.info('identity.password.change.succeeded', { status: 'success' });
      return { success: true };
    } catch (error) {
      if (error instanceof Error && (error.name === 'IamError' || 'errorCode' in error)) {
        const errorMsg = (error as any).messageEn || error.message;
        logger.warn('identity.password.change.failed', { status: 'failed', message: errorMsg, error });
        return { error: errorMsg };
      }

      if (error instanceof DomainError) {
        logger.warn('identity.password.change.failed', { status: 'failed', message: error.message, error });
        return { error: error.message };
      }

      logger.error('identity.password.change.failed', { status: 'failed', message: 'Failed to change password.', error: error as Error });
      return { error: 'Failed to change password.' };
    }
  }, { action: 'identity.changePassword', route: '/account/password' });
}
