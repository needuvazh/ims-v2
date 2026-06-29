import type { Uuid } from '@ims/shared-kernel';
import type {
  IUserRepository,
  IUserBranchAccessRepository,
  IRoleRepository,
  ISessionRepository,
} from '../domain/repositories';
import { createIamError } from '../errors/iam-errors';
import type { IPermissionCachePort } from './permission-cache';
import { NoOpPermissionCache } from './permission-cache';

export class EffectivePermissionsService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly roleRepository: IRoleRepository
  ) {}

  /**
   * Resolves the aggregated permissions list for a user.
   * Phase 1: Only role-based permissions (no direct user grants or denials).
   */
  async getEffectivePermissions(userId: Uuid): Promise<string[]> {
    // 1. Get active user roles
    const userRoles = await this.roleRepository.listRolesForUser(userId);
    const activeRoles = userRoles.filter((ur) => ur.status === 'Active' && ur.role.status === 'Active');

    // 2. Fetch permissions for each active role and aggregate
    const allPermissions = new Set<string>();
    for (const ur of activeRoles) {
      const perms = await this.roleRepository.listPermissionsForRole(ur.role.id);
      for (const p of perms) {
        if (p.status === 'Active') {
          allPermissions.add(p.permissionCode);
        }
      }
    }

    return Array.from(allPermissions);
  }
}

export class BranchScopeResolver {
  constructor(private readonly userBranchAccessRepository: IUserBranchAccessRepository) {}

  /**
   * Resolves all branch IDs accessible to the user given their active branch context.
   */
  async resolveAllowedBranches(userId: Uuid, activeBranchId: Uuid | null): Promise<Uuid[]> {
    const assignments = await this.userBranchAccessRepository.findByUser(userId);
    const activeAssignments = assignments.filter((a) => a.status === 'Active');

    if (activeAssignments.length === 0) {
      return [];
    }

    // If no activeBranchId is specified, user has access to all active branch assignments
    if (!activeBranchId) {
      return activeAssignments.map((a) => a.branchId);
    }

    // Ensure the requested activeBranchId is actually in the user's active assignments
    const match = activeAssignments.find((a) => a.branchId === activeBranchId);
    if (!match) {
      return [];
    }

    const allowed = [match.branchId];

    // Phase 2 / ABAC enhancement: if includeChildBranches is true, we would recursively resolve children.
    // For Phase 1, just return the matched branchId.
    return allowed;
  }
}

export class AuthorizationGuard {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly effectivePermissionsService: EffectivePermissionsService,
    private readonly branchScopeResolver: BranchScopeResolver,
    private readonly permissionCache: IPermissionCachePort = new NoOpPermissionCache()
  ) {}

  /**
   * Verifies if a user is authenticated, active, has the required permission,
   * and is authorized for the given branch context.
   */
  async verifyPermission(
    userId: Uuid,
    permissionCode: string,
    activeBranchId: Uuid | null = null
  ): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.status !== 'Active') {
      throw createIamError('IAM-AUTH-003'); // suspended or inactive accounts fail auth
    }

    const activeSessions = await this.sessionRepository.listActiveForUser(userId);
    if (activeSessions.length === 0) {
      throw createIamError('IAM-AUTH-002');
    }

    // 1. Verify permissions
    const cachedPermissions = await this.permissionCache.getEffectivePermissions(userId);
    const permissions = cachedPermissions ?? await this.effectivePermissionsService.getEffectivePermissions(userId);
    if (!permissions.includes(permissionCode)) {
      throw createIamError('IAM-AUTHZ-001');
    }

    // 2. Verify branch scope if branch context is requested
    if (activeBranchId) {
      const allowedBranches = await this.branchScopeResolver.resolveAllowedBranches(userId, activeBranchId);
      if (!allowedBranches.includes(activeBranchId)) {
        throw createIamError('IAM-AUTHZ-002');
      }
    }

    return true;
  }
}
