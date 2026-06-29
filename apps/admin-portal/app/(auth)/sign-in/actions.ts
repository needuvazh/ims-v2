'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionCookieName } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '../../lib/observability';
import { signInSchema } from './schema';

export type SignInState = {
  error?: string;
};

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  const rememberMe = formData.get('rememberMe') === 'on';

  if (!parsed.success) {
    return { error: 'Please enter a valid email and password.' };
  }

  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    let accessToken: string;
    let refreshToken: string;
    let sessionToken: string;
    let sessionExpiresAt = 0;

    try {
      const { authService } = await import('../../lib/runtime');
      const result = await authService.login(parsed.data.email, parsed.data.password, rememberMe);
      accessToken = result.accessToken;
      refreshToken = result.refreshToken;
      sessionToken = await (await import('@ims/shared-auth')).encodeSession(result.session);
      sessionExpiresAt = result.session.expiresAt;
      logger.info('auth.signIn.succeeded', { status: 'success' });
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('auth.signIn.failed', { status: 'failed', message: err.message, error: err });
        return { error: err.message };
      }

      logger.error('auth.signIn.failed', { status: 'failed', message: 'Unexpected sign-in failure.', error: err as Error });
      return { error: 'Something went wrong. Please try again.' };
    }

    const cookieStore = await cookies();
    cookieStore.set('ims_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60,
    });
    cookieStore.set('ims_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 1000)),
    });
    cookieStore.set(sessionCookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 1000)),
    });

    logger.info('auth.signIn.redirect', { status: 'success', route: '/dashboard' });
    redirect('/dashboard');
  }, { action: 'auth.signIn', route: '/sign-in' });
}
