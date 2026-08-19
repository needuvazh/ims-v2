import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  decodeSession,
  sessionCookieName,
  hasPermission,
  isAuthorizedForBranch,
} from '@ims/shared-auth';
import { JwtService, type TokenPayload } from '@ims/shared-auth/jwt';
import type { Session } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';

function getCookieValue(
  headerValue: string | null | undefined,
  name: string,
): string | null {
  if (!headerValue) return null;

  const match = headerValue
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function getPublicKey(): string {
  const publicKey = process.env.JWT_PUBLIC_KEY;
  if (publicKey) return publicKey;

  const fallbackSecret = process.env.SESSION_SECRET;
  if (!fallbackSecret) {
    throw new Error(
      'JWT_PUBLIC_KEY or SESSION_SECRET environment variable is required.',
    );
  }

  return fallbackSecret;
}

/**
 * Retrieve the current active session.
 * Throws a DomainError('unauthorized') if no session exists or is expired/invalid/revoked.
 *
 * Wrapped with React cache() — repeated calls within the same server request
 * (e.g. assertPermission + assertBranchScope) share a single DB round-trip.
 */
export const getSession: () => Promise<Session> = cache(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const accessToken =
    cookieStore.get('ims_access_token')?.value ??
    getCookieValue(headerStore.get('cookie'), 'ims_access_token') ??
    (headerStore.get('authorization')?.toLowerCase().startsWith('bearer ')
      ? headerStore.get('authorization')!.slice(7).trim()
      : null);
  const sessionToken =
    cookieStore.get(sessionCookieName)?.value ??
    getCookieValue(headerStore.get('cookie'), sessionCookieName);

  if (!accessToken && !sessionToken) {
    if (!headerStore.has('next-action')) {
      redirect('/sign-in');
    }
    throw new DomainError(
      'unauthorized',
      'Session has expired or you are not signed in. Please sign in again.',
    );
  }

  let tokenPayload: TokenPayload | null = null;
  if (accessToken) {
    try {
      tokenPayload = await JwtService.verifyAccessToken(
        accessToken,
        getPublicKey(),
      );
    } catch {
      tokenPayload = null;
    }
  }

  // Enforce database check to prevent bypass of deactivated, locked, or revoked sessions
  try {
    const { userService, sessionRepository } = await import('./runtime');

    const decodedSession = await decodeSession(sessionToken);
    if (!decodedSession && !tokenPayload) {
      if (!headerStore.has('next-action')) {
        redirect('/sign-in');
      }
      throw new DomainError(
        'unauthorized',
        'Authentication required. Please sign in.',
      );
    }

    const sessionJti =
      decodedSession?.accessTokenJti ?? tokenPayload!.jti ?? '';
    const dbSession = await sessionRepository.findByAccessTokenJti(sessionJti);

    if (
      !dbSession ||
      dbSession.status !== 'Active' ||
      new Date() > dbSession.expiresAt
    ) {
      if (!headerStore.has('next-action')) {
        redirect('/sign-in');
      }
      throw new DomainError(
        'unauthorized',
        'Your session has been revoked or has expired. Please sign in again.',
      );
    }

    // 2. Verify user status
    const user = await userService.getUser(dbSession.userId);

    if (user.status === 'Inactive') {
      if (!headerStore.has('next-action')) {
        redirect('/sign-in');
      }
      throw new DomainError(
        'inactive_user_cannot_login',
        'Your account is not active. Contact your administrator.',
      );
    }
    if (user.status === 'Locked') {
      if (!headerStore.has('next-action')) {
        redirect('/sign-in');
      }
      throw new DomainError(
        'locked_user_cannot_login',
        'Your account is locked. Contact your administrator.',
      );
    }

    // 3. Verify user effective dates
    const now = new Date();
    const userStartDate = user.effectiveStartDate;
    if (
      (userStartDate && userStartDate > now) ||
      (user.effectiveEndDate && user.effectiveEndDate < now)
    ) {
      if (!headerStore.has('next-action')) {
        redirect('/sign-in');
      }
      throw new DomainError(
        'unauthorized',
        'Your account is not currently within its active date range.',
      );
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
    if (!headerStore.has('next-action')) {
      redirect('/sign-in');
    }
    throw new DomainError(
      'unauthorized',
      'Session is invalid or user was deleted.',
    );
  }

  const session = await decodeSession(sessionToken);
  if (session) {
    // HYDRATION: Fetch permissions from cache/DB based on roles in the session
    const { effectivePermissionsService } = await import('./runtime');
    session.permissions =
      await effectivePermissionsService.getPermissionsForRoles(session.roles);
    return session;
  }

  const { sessionRepository, effectivePermissionsService } =
    await import('./runtime');
  if (!tokenPayload) {
    if (!headerStore.has('next-action')) {
      redirect('/sign-in');
    }
    throw new DomainError(
      'unauthorized',
      'Authentication required. Please sign in.',
    );
  }

  const dbSession = await sessionRepository.findByAccessTokenJti(
    tokenPayload.jti ?? '',
  );
  if (!dbSession) {
    if (!headerStore.has('next-action')) {
      redirect('/sign-in');
    }
    throw new DomainError(
      'unauthorized',
      'Authentication required. Please sign in.',
    );
  }

  return {
    userId: tokenPayload.userId as Session['userId'],
    displayName: tokenPayload.email,
    roles: tokenPayload.roles ?? [],
    permissions: await effectivePermissionsService.getPermissionsForRoles(
      tokenPayload.roles ?? [],
    ),
    dataScopes: [],
    activeBranchId: dbSession.activeBranchId,
    accessTokenJti: tokenPayload.jti ?? '',
    hashedRefreshToken: dbSession.hashedRefreshToken,
    lastActivityAt: dbSession.lastActivityAt.getTime(),
    status: dbSession.status,
    expiresAt: dbSession.expiresAt.getTime(),
  } satisfies Session;
});

/**
 * Assert that the current user has the specified permission.
 * Throws unauthorized if not logged in, and forbidden if permission check fails.
 */
export async function assertPermission(
  permissionCode: string,
): Promise<Session> {
  const session = await getSession();
  if (!hasPermission(session, permissionCode)) {
    throw new DomainError(
      'forbidden',
      `Access denied: missing permission '${permissionCode}'.`,
    );
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
    throw new DomainError(
      'forbidden',
      'Access denied: you are not authorized to access this branch.',
    );
  }

  try {
    const { organizationService } = await import('./runtime');
    const isBranchOk = await organizationService.isBranchActive(branchId);
    if (!isBranchOk) {
      throw new DomainError(
        'inactive_branch_cannot_be_used',
        'Access denied: target branch is inactive or outside its effective date range.',
      );
    }
  } catch (err) {
    if (
      err instanceof DomainError &&
      err.code === 'inactive_branch_cannot_be_used'
    ) {
      throw err;
    }
    throw new DomainError(
      'forbidden',
      'Access denied: unable to verify branch status.',
    );
  }

  return session;
}

/**
 * Assert that the current user has at least one of the specified permissions.
 * Throws unauthorized if not logged in, and forbidden if permission check fails.
 */
export async function assertAnyPermission(
  permissionCodes: string[],
): Promise<Session> {
  const session = await getSession();
  const { hasPermission } = await import('@ims/shared-auth');
  const hasAny = permissionCodes.some((code) => hasPermission(session, code));
  if (!hasAny) {
    throw new DomainError(
      'forbidden',
      `Access denied: missing one of required permissions [${permissionCodes.join(', ')}].`,
    );
  }
  return session;
}
