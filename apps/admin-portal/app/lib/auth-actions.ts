'use server';

import { cookies } from 'next/headers';
import { decodeSession, encodeSession, sessionCookieName, isAuthorizedForBranch, isGlobalScope } from '@ims/shared-auth';
import { revalidatePath } from 'next/cache';

export async function setActiveBranchAction(branchId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;
    const session = await decodeSession(token);

    if (!session) {
      return { success: false, error: 'Unauthorized: No active session.' };
    }

    // Verify user is authorized for the target branch
    if (branchId === 'All') {
      if (!isGlobalScope(session)) {
        return { success: false, error: 'Forbidden: You do not have global access.' };
      }
    } else {
      if (!isAuthorizedForBranch(session, branchId, { requireFullAccess: false })) {
        return { success: false, error: 'Forbidden: You are not authorized for this branch.' };
      }
    }


    // Update active branch in session
    session.activeBranchId = branchId === 'All' ? null : branchId;

    // Re-sign session cookie
    const newToken = await encodeSession(session);
    
    // Set cookie
    cookieStore.set(sessionCookieName, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update branch.' };
  }
}
