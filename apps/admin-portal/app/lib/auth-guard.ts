import { cache } from 'react';
import { cookies } from 'next/headers';
import { decodeSession, sessionCookieName, hasPermission, isAuthorizedForBranch } from '@ims/shared-auth';
import type { Session } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import nodeCrypto from 'crypto';

/**
 * Retrieve the current active session.
 * Throws a DomainError('unauthorized') if no session exists or is expired/invalid/revoked.
 *
 * Wrapped with React cache() — repeated calls within the same server request
 * (e.g. assertPermission + assertBranchScope) share a single DB round-trip.
 */
export const getSession: () => Promise<Session> = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = await decodeSession(token);
  if (!session || !token) {
    throw new DomainError('unauthorized', 'Authentication required. Please sign in.');
  }

  // Enforce database check to prevent bypass of deactivated, locked, or revoked sessions
  try {
    const { userService, sessionRepository } = await import('./runtime');

    // 1. Verify session status in database
    const tokenHash = nodeCrypto.createHash('sha256').update(token).digest('hex');
    const dbSession = await sessionRepository.getSessionByHash(tokenHash);

    if (!dbSession || dbSession.status !== 'Active' || new Date() > dbSession.expiresAt) {
      throw new DomainError('unauthorized', 'Session has been revoked or expired.');
    }

    // 2. Verify user status
    const user = await userService.getUser(session.userId);
    
    if (user.status === 'Inactive') {
      throw new DomainError('inactive_user_cannot_login', 'Your account is not active. Contact your administrator.');
    }
    if (user.status === 'Locked') {
      throw new DomainError('locked_user_cannot_login', 'Your account is locked. Contact your administrator.');
    }

    // 3. Verify user effective dates
    const now = new Date();
    const userStartDate = user.effectiveStartDate;
    if ((userStartDate && userStartDate > now) || (user.effectiveEndDate && user.effectiveEndDate < now)) {
      throw new DomainError('unauthorized', 'Your account is not currently within its active date range.');
    }
  } catch (err) {
    if (err instanceof DomainError) {
      if (
        err.code === 'inactive_user_cannot_login' ||
        err.code === 'locked_user_cannot_login' ||
        err.code === 'unauthorized'
      ) {
        throw err;
      }
    }
    throw new DomainError('unauthorized', 'Session is invalid or user was deleted.');
  }

  return session;
});

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

  try {
    const { organizationService } = await import('./runtime');
    const isBranchOk = await organizationService.isBranchActive(branchId);
    if (!isBranchOk) {
      throw new DomainError('inactive_branch_cannot_be_used', 'Access denied: target branch is inactive or outside its effective date range.');
    }
  } catch (err) {
    if (err instanceof DomainError && err.code === 'inactive_branch_cannot_be_used') {
      throw err;
    }
    throw new DomainError('forbidden', 'Access denied: unable to verify branch status.');
  }

  return session;
}

/**
 * Assert that the current user has at least one of the specified permissions.
 * Throws unauthorized if not logged in, and forbidden if permission check fails.
 */
export async function assertAnyPermission(permissionCodes: string[]): Promise<Session> {
  const session = await getSession();
  const { hasPermission } = await import('@ims/shared-auth');
  const hasAny = permissionCodes.some((code) => hasPermission(session, code));
  if (!hasAny) {
    throw new DomainError('forbidden', `Access denied: missing one of required permissions [${permissionCodes.join(', ')}].`);
  }
  return session;
}
