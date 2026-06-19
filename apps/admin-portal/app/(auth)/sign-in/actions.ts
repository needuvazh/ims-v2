'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createDemoSession, encodeSession, sessionCookieName } from '@ims/shared-auth';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export async function signInAction(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    throw new Error('Enter a valid email address and password.');
  }

  const session = createDemoSession('55555555-5555-5555-5555-555555555555');
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });

  redirect('/dashboard');
}
