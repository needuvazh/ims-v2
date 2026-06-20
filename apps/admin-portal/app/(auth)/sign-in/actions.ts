'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionCookieName } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import { signInSchema } from './schema';

export type SignInState = {
  error?: string;
};

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: 'Please enter a valid email and password.' };
  }

  let sessionToken: string;
  try {
    const { authService } = await import('../../lib/runtime');
    const result = await authService.signIn(parsed.data);
    sessionToken = result.sessionToken;
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: 'Something went wrong. Please try again.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  redirect('/dashboard');
}
