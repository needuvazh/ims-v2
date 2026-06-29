'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth-guard';

export async function terminateSessionAction(formData: FormData) {
  const sessionId = String(formData.get('sessionId') ?? '');
  if (!sessionId) return;

  const session = await getSession();
  const { sessionService } = await import('@/lib/runtime');

  await sessionService.terminateSession(sessionId as never, {
    actorId: session.userId as never,
    actorPermissions: session.permissions,
    activeBranchId: session.activeBranchId as never,
  });
  revalidatePath('/iam/sessions');
}

export async function terminateAllSessionsAction(formData: FormData) {
  const userId = String(formData.get('userId') ?? '');
  if (!userId) return;

  const session = await getSession();
  const { sessionService } = await import('@/lib/runtime');

  await sessionService.terminateAllUserSessions(userId as never, {
    actorId: session.userId as never,
    actorPermissions: session.permissions,
    activeBranchId: session.activeBranchId as never,
  });
  revalidatePath('/iam/sessions');
}
