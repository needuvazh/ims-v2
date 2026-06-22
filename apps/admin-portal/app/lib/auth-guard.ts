import { cookies } from 'next/headers';
import { decodeSession, sessionCookieName, hasPermission, isAuthorizedForBranch } from '@ims/shared-auth';
import type { Session } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';

/**
 * Retrieve the current active session.
 * Throws a DomainError('unauthorized') if no session exists or is expired/invalid.
 */
export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = await decodeSession(token);
  if (!session) {
    throw new DomainError('unauthorized', 'Authentication required. Please sign in.');
  }

  // Enforce database check to prevent bypass of deactivated or locked users
  try {
    const { userService } = await import('./runtime');
    const user = await userService.getUser(session.userId);
    
    if (user.status === 'Inactive') {
      throw new DomainError('inactive_user_cannot_login', 'Your account is not active. Contact your administrator.');
    }
    if (user.status === 'Locked') {
      throw new DomainError('locked_user_cannot_login', 'Your account is locked. Contact your administrator.');
    }
  } catch (err) {
    if (err instanceof DomainError) {
      if (err.code === 'inactive_user_cannot_login' || err.code === 'locked_user_cannot_login') {
        throw err;
      }
    }
    throw new DomainError('unauthorized', 'Session is invalid or user was deleted.');
  }

  return session;
}

/**
 * Assert that the current user has the specified permission.
 * Throws unauthorized if not logged in, and forbidden if permission check fails.
 */
export async function assertPermission(permissionCode: string): Promise<Session> {
  const session = await getSession();
  if (!hasPermission(session, permissionCode)) {
    throw new DomainError('forbidden', `Access denied: missing permission '${permissionCode}'.`);
  }
  return session;
}

/**
 * Assert that the current user is authorized to perform mutations/queries on a target branch.
 * Throws unauthorized if not logged in, and forbidden if branch scope check fails.
 */
export async function assertBranchScope(branchId: string): Promise<Session> {
  const session = await getSession();
  if (!isAuthorizedForBranch(session, branchId)) {
    throw new DomainError('forbidden', 'Access denied: you are not authorized to access this branch.');
  }
  return session;
}
