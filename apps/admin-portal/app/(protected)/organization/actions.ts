'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { createUuid } from '@ims/shared-kernel';
import { organizationService } from '../../lib/runtime';

const createInstituteSchema = z.object({
  instituteCode: z.string().min(2),
  instituteName: z.string().min(2),
  primaryEmail: z.string().email().optional().or(z.literal('')),
});

export async function createInstituteAction(formData: FormData) {
  const parsed = createInstituteSchema.safeParse({
    instituteCode: formData.get('instituteCode'),
    instituteName: formData.get('instituteName'),
    primaryEmail: formData.get('primaryEmail'),
  });

  if (!parsed.success) {
    throw new Error('Provide an institute code, name, and valid email address.');
  }

  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(sessionCookieName)?.value);
  if (!session) {
    throw new Error('Sign in again before creating an institute.');
  }

  await organizationService.createInstitute(
    {
      ...parsed.data,
      primaryEmail: parsed.data.primaryEmail || null,
    },
    { actorId: createUuid(session.userId) },
  );

  redirect('/dashboard?created=institute');
}
