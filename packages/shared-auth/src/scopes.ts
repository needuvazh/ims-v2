import type { Session } from './session';

export type ScopingOptions = {
  /**
   * If true, requires branch-wide management access (ignores assignedOnly scopes).
   * Default: true (for write operations and management pages).
   */
  requireFullAccess?: boolean;
};

/**
 * Check if the user is authorized for a specific branch ID.
 * Authorized if:
 * 1. User has global 'All' scopeType.
 * 2. User has a 'Branch' scope matching target branchId (and satisfies requireFullAccess).
 * 3. User has a 'Department' scope matching target branchId (and satisfies requireFullAccess).
 */
export function isAuthorizedForBranch(
  session: Session | null,
  branchId: string,
  options: ScopingOptions = { requireFullAccess: true }
): boolean {
  if (!session) return false;
  
  return session.dataScopes.some(scope => {
    if (scope.scopeType === 'All') return true;
    
    if (scope.scopeType === 'Branch' && scope.branchId === branchId) {
      if (options.requireFullAccess && scope.assignedOnly) {
        return false;
      }
      return true;
    }

    if (scope.scopeType === 'Department' && scope.branchId === branchId) {
      if (options.requireFullAccess) {
        return false;
      }
      return true;
    }
    
    return false;
  });
}


/**
 * Returns a list of branch IDs the user has explicit scopes for.
 * If user has 'All' scope, returns null (meaning all branches are authorized).
 */
export function getAuthorizedBranchIds(session: Session | null): string[] | null {
  if (!session) return [];

  const isGlobal = isGlobalScope(session);
  if (isGlobal) return null;

  const branchIds = session.dataScopes
    .filter(scope => scope.scopeType === 'Branch' && scope.branchId)
    .map(scope => scope.branchId as string);

  return [...new Set(branchIds)];
}

/**
 * Returns true if the user has dynamic global access ('All' data scope).
 */
export function isGlobalScope(session: Session | null): boolean {
  if (!session) return false;
  return session.dataScopes.some(scope => scope.scopeType === 'All');
}
