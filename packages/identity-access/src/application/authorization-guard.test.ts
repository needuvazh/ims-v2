import crypto from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { IUserBranchAccessRepository, IRoleRepository, ISessionRepository, IUserRepository } from '../domain/repositories';
import type { User } from '../domain/user';
import type { Role } from '../domain/role';
import type { Permission } from '../domain/permission';
import type { UserBranchAccess } from '../domain/user-branch-access';
import type { UserSessionDto } from '../domain/repositories';
import { AuthorizationGuard, BranchScopeResolver, EffectivePermissionsService } from './authorization-guard';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: crypto.randomUUID(),
    personId: crypto.randomUUID(),
    username: 'user@example.com',
    email: 'user@example.com',
    userType: 'Admin',
    status: 'Active',
    defaultBranchId: null,
    preferredLanguage: 'en',
    failedLoginCount: 0,
    lockedUntil: null,
    passwordChangedAt: null,
    version: 1,
    effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
    effectiveEndDate: null,
    isDeleted: false,
    ...overrides,
  };
}

function createRole(overrides: Partial<Role> = {}): Role {
  return {
    id: crypto.randomUUID(),
    roleCode: 'ROLE_ACTIVE',
    roleName: 'Role Active',
    description: null,
    status: 'Active',
    isSystemRole: false,
    version: 1,
    effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
    effectiveEndDate: null,
    createdAt: new Date(),
    createdBy: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function createBranchAccess(userId: string, branchId: string, overrides: Partial<UserBranchAccess> = {}): UserBranchAccess {
  return {
    id: crypto.randomUUID(),
    userId: userId as never,
    branchId: branchId as never,
    isDefault: false,
    includeChildBranches: false,
    consolidatedVisibility: false,
    status: 'Active',
    revokedAt: null,
    revokedBy: null,
    reason: null,
    createdAt: new Date(),
    createdBy: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

describe('AuthorizationGuard', () => {
  const userId = crypto.randomUUID();
  const branchId = '11111111-1111-1111-1111-111111111111';
  const role = createRole();
  const permission = {
    id: crypto.randomUUID() as never,
    permissionCode: 'iam.user.read',
    permissionName: 'Read users',
    permissionType: 'Action',
    description: null,
    status: 'Active',
    createdAt: new Date(),
    createdBy: null,
    updatedAt: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
  } satisfies Permission;

  let userRepo: IUserRepository;
  let sessionRepo: ISessionRepository;
  let roleRepo: IRoleRepository;
  let branchAccessRepo: IUserBranchAccessRepository;
  let service: AuthorizationGuard;

  beforeEach(() => {
    const users = new Map<string, User>([[userId, createUser({ id: userId as never })]]);
    const sessions = new Map<string, UserSessionDto>([[
      'session-1',
      {
        id: 'session-1' as never,
        userId: userId as never,
        accessTokenJti: 'session-1',
        hashedRefreshToken: 'hash',
        previousHashedRefreshToken: null,
        activeBranchId: branchId as never,
        userAgent: null,
        ipAddress: null,
        status: 'Active',
        expiresAt: new Date(Date.now() + 60_000),
        lastActivityAt: new Date(),
        createdAt: new Date(),
      },
    ]]);
    const rolePermissions = new Map<string, Permission[]>([[role.id, [permission]]]);
    const userRoles = new Map<string, Array<{ role: Role; status: string; revokedAt: Date | null; revokedBy: string | null; reason: string | null }>>([[userId, [{ role, status: 'Active', revokedAt: null, revokedBy: null, reason: null }]]]);
    const branchAccess = new Map<string, UserBranchAccess[]>([[userId, [createBranchAccess(userId, branchId)]]]);

    userRepo = {
      findById: async (id) => users.get(String(id)) ?? null,
      findByEmail: async () => null,
      findByUsername: async () => null,
      findPersonById: async () => null,
      findPersonByMobile: async () => null,
      create: async (user) => user,
      update: async (user) => user,
      search: async () => ({ items: [], total: 0 }),
      getPasswordHash: async () => null,
      updatePassword: async () => undefined,
      createResetToken: async () => undefined,
      findResetTokenByHash: async () => null,
      markResetTokenAsUsed: async () => undefined,
    };

    sessionRepo = {
      create: async (session) => session,
      findById: async (id) => sessions.get(String(id)) ?? null,
      findByAccessTokenJti: async (jti) => Array.from(sessions.values()).find((session) => session.accessTokenJti === jti) ?? null,
      findByHashedRefreshToken: async () => null,
      update: async (session) => {
        sessions.set(String(session.id), session);
        return session;
      },
      revoke: async () => undefined,
      revokeAllForUser: async () => undefined,
      listActiveForUser: async (targetUserId) => Array.from(sessions.values()).filter((session) => session.userId === targetUserId && session.status === 'Active'),
    };

    roleRepo = {
      findById: async () => role,
      findByCode: async () => role,
      create: async (nextRole) => nextRole,
      update: async (nextRole) => nextRole,
      search: async () => ({ items: [role], total: 1 }),
      assignRoleToUser: async () => undefined,
      revokeRoleFromUser: async () => undefined,
      listRolesForUser: async () => userRoles.get(userId) ?? [],
      assignPermissionToRole: async () => undefined,
      removePermissionFromRole: async () => undefined,
      listPermissionsForRole: async () => rolePermissions.get(role.id) ?? [],
    };

    branchAccessRepo = {
      findByUser: async () => branchAccess.get(userId) ?? [],
      findById: async () => null,
      assign: async (access) => access,
      update: async (access) => access,
    };

    service = new AuthorizationGuard(userRepo, sessionRepo, new EffectivePermissionsService(userRepo, roleRepo), new BranchScopeResolver(branchAccessRepo));
  });

  it('verifies permissions for active sessions and branches', async () => {
    await expect(service.verifyPermission(userId as never, 'iam.user.read', branchId as never)).resolves.toBe(true);
  });

  it('rejects users without an active session', async () => {
    sessionRepo.listActiveForUser = async () => [];
    await expect(service.verifyPermission(userId as never, 'iam.user.read', branchId as never)).rejects.toMatchObject({ errorCode: 'IAM-AUTH-002' });
  });

  it('rejects branch access outside active assignments', async () => {
    await expect(service.verifyPermission(userId as never, 'iam.user.read', '22222222-2222-2222-2222-222222222222' as never)).rejects.toMatchObject({ errorCode: 'IAM-AUTHZ-002' });
  });
});
