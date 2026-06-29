import crypto from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAuditLogRepository } from '@ims/audit';
import type { IAuditLogRepository, ISessionRepository, IUserBranchAccessRepository, IUserRepository, UserSessionDto } from '../domain/repositories';
import type { UserBranchAccess } from '../domain/user-branch-access';
import type { User } from '../domain/user';
import { BranchAccessService } from './branch-access-service';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: crypto.randomUUID(),
    personId: crypto.randomUUID(),
    username: 'user@example.com',
    email: 'user@example.com',
    userType: 'Admin',
    status: 'Active',
    defaultBranchId: '11111111-1111-1111-1111-111111111111',
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

function createSession(overrides: Partial<UserSessionDto> = {}): UserSessionDto {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    accessTokenJti: crypto.randomUUID(),
    hashedRefreshToken: 'hash',
    previousHashedRefreshToken: null,
    activeBranchId: '11111111-1111-1111-1111-111111111111',
    userAgent: null,
    ipAddress: null,
    status: 'Active',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    lastActivityAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('BranchAccessService', () => {
  let service: BranchAccessService;
  let branchRepo: IUserBranchAccessRepository;
  let userRepo: IUserRepository;
  let sessionRepo: ISessionRepository;
  let auditRepo: IAuditLogRepository;

  const users = new Map<string, User>();
  const branchAccess = new Map<string, UserBranchAccess[]>();
  const sessions = new Map<string, UserSessionDto>();
  const userId = crypto.randomUUID();
  const actorId = crypto.randomUUID();

  beforeEach(() => {
    users.clear();
    branchAccess.clear();
    sessions.clear();

    const user = createUser({ id: userId as never, personId: crypto.randomUUID(), defaultBranchId: '11111111-1111-1111-1111-111111111111' });
    users.set(user.id, user);
    branchAccess.set(user.id, [createBranchAccess(user.id, '11111111-1111-1111-1111-111111111111', { isDefault: true })]);
    sessions.set('session-1', createSession({ id: 'session-1' as never, accessTokenJti: 'session-1', userId: user.id as never }));

    branchRepo = {
      findByUser: async (id) => branchAccess.get(id) ?? [],
      findById: async () => null,
      assign: async (access) => {
        const list = branchAccess.get(access.userId) ?? [];
        list.push(access);
        branchAccess.set(access.userId, list);
        return access;
      },
      update: async (access) => {
        const list = branchAccess.get(access.userId) ?? [];
        const index = list.findIndex((entry) => entry.id === access.id);
        if (index >= 0) list[index] = access;
        return access;
      },
    };

    userRepo = {
      findById: async (id) => users.get(id) ?? null,
      findByEmail: async () => null,
      findByUsername: async () => null,
      findPersonById: async () => null,
      findPersonByMobile: async () => null,
      create: async (user, person) => {
        users.set(user.id, user);
        return user;
      },
      update: async (user) => {
        users.set(user.id, user);
        return user;
      },
      search: async () => ({ items: Array.from(users.values()), total: users.size }),
      getPasswordHash: async () => null,
      updatePassword: async () => undefined,
      createResetToken: async () => undefined,
      findResetTokenByHash: async () => null,
      markResetTokenAsUsed: async () => undefined,
    };

    sessionRepo = {
      create: async (session) => {
        sessions.set(session.accessTokenJti, session);
        return session;
      },
      findById: async (id) => sessions.get(String(id)) ?? null,
      findByAccessTokenJti: async (jti) => sessions.get(jti) ?? null,
      findByHashedRefreshToken: async () => null,
      update: async (session) => {
        sessions.set(session.accessTokenJti, session);
        return session;
      },
      revoke: async (id) => {
        const session = sessions.get(String(id));
        if (session) session.status = 'Revoked';
      },
      revokeAllForUser: async (targetUserId) => {
        for (const session of sessions.values()) {
          if (session.userId === targetUserId) session.status = 'Revoked';
        }
      },
      listActiveForUser: async (targetUserId) => Array.from(sessions.values()).filter((session) => session.userId === targetUserId && session.status === 'Active'),
    };

    auditRepo = new InMemoryAuditLogRepository();
    service = new BranchAccessService(branchRepo, userRepo, sessionRepo, auditRepo);
  });

  it('assigns a new branch and marks it default when first assignment', async () => {
    const result = await service.assignBranchToUser(userId as never, '22222222-2222-2222-2222-222222222222' as never, false, 'reason', { actorId: actorId as never, actorPermissions: ['iam.user.assign-branch'], activeBranchId: null });

    expect(result.status).toBe('Active');
    expect(result.isDefault).toBe(false);
    expect(auditRepo.list().some((entry) => entry.action === 'iam.user.branch-assigned')).toBe(true);
  });

  it('removes a branch, preserves history, and moves default branch', async () => {
    await service.assignBranchToUser(userId as never, '22222222-2222-2222-2222-222222222222' as never, false, null, { actorId: actorId as never, actorPermissions: ['iam.user.assign-branch'], activeBranchId: null });

    await service.removeBranchFromUser(userId as never, '11111111-1111-1111-1111-111111111111' as never, 'reason', { actorId: actorId as never, actorPermissions: ['iam.user.assign-branch'], activeBranchId: null });

    expect(users.get(userId)?.defaultBranchId).toBe('22222222-2222-2222-2222-222222222222');
    expect(branchAccess.get(userId)?.find((entry) => entry.branchId === '11111111-1111-1111-1111-111111111111')?.status).toBe('Revoked');
    expect(auditRepo.list().some((entry) => entry.action === 'iam.user.branch-removed')).toBe(true);
  });

  it('changes the default branch when requested', async () => {
    await service.assignBranchToUser(userId as never, '22222222-2222-2222-2222-222222222222' as never, false, null, { actorId: actorId as never, actorPermissions: ['iam.user.assign-branch'], activeBranchId: null });

    await service.setDefaultBranch(userId as never, '22222222-2222-2222-2222-222222222222' as never, { actorId: actorId as never, actorPermissions: ['iam.user.assign-branch'], activeBranchId: null });

    expect(users.get(userId)?.defaultBranchId).toBe('22222222-2222-2222-2222-222222222222');
    expect(auditRepo.list().some((entry) => entry.action === 'iam.user.default-branch-changed')).toBe(true);
  });

  it('switches active branch for the session and rejects unassigned branches', async () => {
    await service.switchActiveBranch('session-1', '11111111-1111-1111-1111-111111111111' as never, userId as never);
    expect(sessions.get('session-1')?.activeBranchId).toBe('11111111-1111-1111-1111-111111111111');
    expect(auditRepo.list().some((entry) => entry.action === 'iam.session.branch-switched')).toBe(true);

    await expect(service.switchActiveBranch('session-1', '33333333-3333-3333-3333-333333333333' as never, userId as never)).rejects.toMatchObject({ errorCode: 'IAM-AUTHZ-002' });
  });

  it('lists branch access with permission', async () => {
    const branches = await service.getUserBranchAccess(userId as never, { actorId: actorId as never, actorPermissions: ['iam.user.read'], activeBranchId: null });
    expect(branches).toHaveLength(1);
  });
});
