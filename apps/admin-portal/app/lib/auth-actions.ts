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

    // Refresh/Extend session expiration time (sliding session expiry)
    session.expiresAt = Date.now() + 8 * 60 * 60 * 1000;

    // Re-sign session cookie
    const newToken = await encodeSession(session);
    
    // Sync the new session token to the database
    if (token) {
      const nodeCrypto = await import('crypto');
      const oldTokenHash = nodeCrypto.createHash('sha256').update(token).digest('hex');
      const newTokenHash = nodeCrypto.createHash('sha256').update(newToken).digest('hex');
      const { sessionRepository } = await import('./runtime');
      
      // Revoke the old session and register the new one to prevent auth-guard rejection
      await sessionRepository.revokeSessionByHash(oldTokenHash);
      await sessionRepository.createSession({
        userId: session.userId,
        tokenHash: newTokenHash,
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(session.expiresAt),
      });
    }

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
    console.error('Error switching active branch:', err);
    return { success: false, error: 'Failed to switch active branch. Please try again.' };
  }
}
