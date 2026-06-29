import crypto from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAuditLogRepository } from '@ims/audit';
import { createDefaultSecurityPolicy } from '../domain/security-policy';
import type {
  IAuditLogRepository,
  INotificationRepository,
  IOutboxEventRepository,
  IRoleRepository,
  ISecurityPolicyRepository,
  ISessionRepository,
  IUserActivationTokenRepository,
  IUserBranchAccessRepository,
  IUserRepository,
  UserSessionDto,
} from '../domain/repositories';
import type { Person, User } from '../domain/user';
import type { Role } from '../domain/role';
import type { Permission } from '../domain/permission';
import type { UserBranchAccess } from '../domain/user-branch-access';
import { UserService } from './user-service';

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

function createPerson(overrides: Partial<Person> = {}): Person {
  return {
    id: crypto.randomUUID(),
    firstName: 'Current',
    lastName: 'User',
    mobile: '+96890000000',
    nationalId: null,
    nationality: null,
    dateOfBirth: null,
    gender: null,
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

describe('UserService', () => {
  let userService: UserService;
  let userRepo: IUserRepository;
  let roleRepo: IRoleRepository;
  let branchAccessRepo: IUserBranchAccessRepository;
  let activationTokenRepo: IUserActivationTokenRepository;
  let securityPolicyRepo: ISecurityPolicyRepository;
  let auditRepo: IAuditLogRepository;
  let notificationRepo: INotificationRepository;
  let outboxRepo: IOutboxEventRepository;
  let sessionRepo: ISessionRepository;

  const users = new Map<string, User>();
  const people = new Map<string, Person>();
  const roles = new Map<string, Role>();
  const branchAccess = new Map<string, UserBranchAccess[]>();
  const activationTokens = new Map<string, { userId: string; tokenHash: string; expiresAt: Date; status: 'Pending' | 'Used' | 'Expired'; createdAt: Date; usedAt: Date | null }>();
  const passwordResetTokens = new Map<string, { id: string; userId: string; tokenHash: string; expiresAt: Date }>();
  const notifications: Array<{ subject: string; body: string; metadata: unknown }> = [];
  const outbox: Array<{ eventType: string }> = [];
  const sessions = new Map<string, UserSessionDto>();

  beforeEach(() => {
    users.clear();
    people.clear();
    roles.clear();
    branchAccess.clear();
    activationTokens.clear();
    passwordResetTokens.clear();
    notifications.length = 0;
    outbox.length = 0;
    sessions.clear();

    const person = createPerson();
    const user = createUser({ personId: person.id, email: person.mobile ? 'current@example.com' : 'current@example.com' });
    const branchId = '11111111-1111-1111-1111-111111111111';
    const role = createRole();

    people.set(person.id, person);
    users.set(user.id, user);
    roles.set(role.id, role);
    branchAccess.set(user.id, [createBranchAccess(user.id, branchId, { isDefault: true })]);

    userRepo = {
      findById: async (id) => users.get(id) ?? null,
      findByEmail: async (email) => Array.from(users.values()).find((candidate) => candidate.email === email) ?? null,
      findByUsername: async (username) => Array.from(users.values()).find((candidate) => candidate.username === username) ?? null,
      findPersonById: async (id) => people.get(id) ?? null,
      findPersonByMobile: async (mobile) => Array.from(people.values()).find((candidate) => candidate.mobile === mobile) ?? null,
      create: async (nextUser, personRecord) => {
        users.set(nextUser.id, nextUser);
        people.set(personRecord.id, personRecord);
        return nextUser;
      },
      update: async (nextUser, personRecord) => {
        users.set(nextUser.id, nextUser);
        if (personRecord) people.set(personRecord.id, personRecord);
        return nextUser;
      },
      search: async (filters) => {
        const items = Array.from(users.values()).filter((candidate) => !filters.branchId || branchAccess.get(candidate.id)?.some((access) => access.branchId === filters.branchId));
        return { items, total: items.length };
      },
      getPasswordHash: async () => null,
      updatePassword: async () => undefined,
      createResetToken: async ({ id, userId, tokenHash, expiresAt }) => {
        passwordResetTokens.set(tokenHash, { id: String(id), userId: String(userId), tokenHash, expiresAt });
      },
      findResetTokenByHash: async () => null,
      markResetTokenAsUsed: async () => undefined,
    };

    roleRepo = {
      findById: async (id) => roles.get(id) ?? null,
      findByCode: async (code) => Array.from(roles.values()).find((candidate) => candidate.roleCode === code) ?? null,
      create: async (roleRecord) => {
        roles.set(roleRecord.id, roleRecord);
        return roleRecord;
      },
      update: async (roleRecord) => {
        roles.set(roleRecord.id, roleRecord);
        return roleRecord;
      },
      search: async () => ({ items: Array.from(roles.values()), total: roles.size }),
      assignRoleToUser: async () => undefined,
      revokeRoleFromUser: async () => undefined,
      listRolesForUser: async (userId) => (branchAccess.get(userId) ? [{ role: role, status: 'Active', revokedAt: null, revokedBy: null, reason: null }] : []),
      assignPermissionToRole: async () => undefined,
      removePermissionFromRole: async () => undefined,
      listPermissionsForRole: async () => [{ id: crypto.randomUUID() as never, permissionCode: 'iam.user.read', permissionName: 'Read users', permissionType: 'Action', description: null, status: 'Active', createdAt: new Date(), createdBy: null, updatedAt: null, updatedBy: null, deletedAt: null, deletedBy: null, isDeleted: false }],
    };

    branchAccessRepo = {
      findByUser: async (userId) => branchAccess.get(userId) ?? [],
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

    activationTokenRepo = {
      create: async (token) => {
        activationTokens.set(token.tokenHash, token);
        return token;
      },
      findByHash: async (hash) => activationTokens.get(hash) ?? null,
      update: async (token) => {
        activationTokens.set(token.tokenHash, token);
        return token;
      },
      invalidatePendingForUser: async () => undefined,
    };

    securityPolicyRepo = {
      get: async () => createDefaultSecurityPolicy(),
      update: async (policy) => policy,
    };

    auditRepo = new InMemoryAuditLogRepository();

    notificationRepo = {
      create: async (notification) => {
        notifications.push({ subject: notification.subject, body: notification.body, metadata: notification.metadata });
        return notification;
      },
      update: async (notification) => notification,
      findById: async () => null,
      listPending: async () => [],
    };

    outboxRepo = {
      publish: async (event) => {
        outbox.push({ eventType: event.eventType });
        return event;
      },
      claimPending: async () => [],
      update: async (event) => event,
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
      revokeAllForUser: async (userId) => {
        for (const session of sessions.values()) {
          if (session.userId === userId) session.status = 'Revoked';
        }
      },
      listActiveForUser: async () => Array.from(sessions.values()).filter((session) => session.status === 'Active'),
    };

    userService = new UserService(userRepo, roleRepo, branchAccessRepo, activationTokenRepo, securityPolicyRepo, auditRepo, notificationRepo, outboxRepo, sessionRepo);
  });

  it('creates a user with role, branch access, notification, outbox, and audit records', async () => {
    const roleId = Array.from(roles.keys())[0];
    const user = await userService.createUser({
      email: 'new.user@example.com',
      userType: 'Admin',
      roleIds: [roleId],
      branchIds: ['11111111-1111-1111-1111-111111111111'],
      defaultBranchId: '11111111-1111-1111-1111-111111111111',
      firstName: 'New',
      lastName: 'User',
      mobile: '+96891111111',
    }, { actorId: 'actor-1', actorPermissions: ['iam.user.create'], activeBranchId: '11111111-1111-1111-1111-111111111111' });

    expect(user.email).toBe('new.user@example.com');
    expect(branchAccess.get(user.id)?.length).toBe(1);
    expect(notifications).toHaveLength(1);
    expect(outbox).toEqual([{ eventType: 'UserCreated' }]);
    expect((await auditRepo.list()).some((entry) => entry.action === 'iam.user.created')).toBe(true);
  });

  it('records audit entries with the required metadata fields', async () => {
    const roleId = Array.from(roles.keys())[0];

    await userService.createUser({
      email: 'audit.fields@example.com',
      userType: 'Admin',
      roleIds: [roleId],
      branchIds: ['11111111-1111-1111-1111-111111111111'],
      defaultBranchId: '11111111-1111-1111-1111-111111111111',
      firstName: 'Audit',
      lastName: 'Fields',
      mobile: '+96895555555',
    }, { actorId: 'actor-1', actorPermissions: ['iam.user.create'], activeBranchId: '11111111-1111-1111-1111-111111111111' });

    const auditEntry = (await auditRepo.list()).find((entry) => entry.action === 'iam.user.created');
    expect(auditEntry).toMatchObject({
      performedBy: 'actor-1',
      entityType: 'User',
      action: 'iam.user.created',
      branchId: '11111111-1111-1111-1111-111111111111',
      reason: null,
      correlationId: null,
    });
    expect(auditEntry?.performedAt).toBeInstanceOf(Date);
  });

  it('rejects user creation without role or branch assignments', async () => {
    await expect(userService.createUser({
      email: 'no-role@example.com',
      userType: 'Admin',
      roleIds: [],
      branchIds: ['11111111-1111-1111-1111-111111111111'],
      firstName: 'No',
      lastName: 'Role',
      mobile: '+96892222222',
    }, { actorId: 'actor-1', actorPermissions: ['iam.user.create'], activeBranchId: '11111111-1111-1111-1111-111111111111' })).rejects.toMatchObject({ errorCode: 'IAM-VAL-008' });

    await expect(userService.createUser({
      email: 'no-branch@example.com',
      userType: 'Admin',
      roleIds: [Array.from(roles.keys())[0]],
      branchIds: [],
      firstName: 'No',
      lastName: 'Branch',
      mobile: '+96893333333',
    }, { actorId: 'actor-1', actorPermissions: ['iam.user.create'], activeBranchId: '11111111-1111-1111-1111-111111111111' })).rejects.toMatchObject({ errorCode: 'IAM-VAL-007' });
  });

  it('rejects duplicate user email', async () => {
    await expect(userService.createUser({
      email: 'current@example.com',
      userType: 'Admin',
      roleIds: [Array.from(roles.keys())[0]],
      branchIds: ['11111111-1111-1111-1111-111111111111'],
      firstName: 'Dup',
      lastName: 'Email',
      mobile: '+96894444444',
    }, { actorId: 'actor-1', actorPermissions: ['iam.user.create'], activeBranchId: '11111111-1111-1111-1111-111111111111' })).rejects.toMatchObject({ errorCode: 'IAM-VAL-001' });
  });

  it('escapes user name fields before storing them', async () => {
    const roleId = Array.from(roles.keys())[0];

    const created = await userService.createUser({
      email: 'xss@example.com',
      userType: 'Admin',
      roleIds: [roleId],
      branchIds: ['11111111-1111-1111-1111-111111111111'],
      firstName: '<script>alert(1)</script>',
      lastName: 'User',
      mobile: '+96896666666',
    }, { actorId: 'actor-1', actorPermissions: ['iam.user.create'], activeBranchId: '11111111-1111-1111-1111-111111111111' });

    expect(people.get(created.personId)?.firstName).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('exposes an append-only audit repository surface', () => {
    expect('update' in auditRepo).toBe(false);
    expect('delete' in auditRepo).toBe(false);
  });

  it('updates user profile and branch assignments', async () => {
    const userId = Array.from(users.keys())[0];
    await userService.updateUser(userId, { fullName: 'Updated User', branchIds: ['22222222-2222-2222-2222-222222222222'] }, { actorId: 'actor-1', actorPermissions: ['iam.user.update'], activeBranchId: '11111111-1111-1111-1111-111111111111' });

    expect(people.get(users.get(userId)!.personId)?.firstName).toBe('Updated');
    expect(branchAccess.get(userId)?.some((access) => access.branchId === '22222222-2222-2222-2222-222222222222' && access.status === 'Active')).toBe(true);
    expect(branchAccess.get(userId)?.some((access) => access.branchId === '11111111-1111-1111-1111-111111111111' && access.status === 'Revoked')).toBe(true);
  });

  it('enforces branch scope when reading a user', async () => {
    const userId = Array.from(users.keys())[0];
    await expect(userService.getUserById(userId, { actorId: 'actor-1', actorPermissions: ['iam.user.read'], activeBranchId: '22222222-2222-2222-2222-222222222222' })).rejects.toMatchObject({ errorCode: 'IAM-AUTHZ-002' });
  });

  it('suspends, archives, and unlocks with session revocation', async () => {
    const userId = Array.from(users.keys())[0];
    sessions.set('session-1', {
      id: 'session-1' as never,
      userId: userId as never,
      accessTokenJti: 'session-1',
      hashedRefreshToken: 'hash',
      previousHashedRefreshToken: null,
      activeBranchId: null,
      userAgent: null,
      ipAddress: null,
      status: 'Active',
      expiresAt: new Date(Date.now() + 60_000),
      lastActivityAt: new Date(),
      createdAt: new Date(),
    });

    await userService.suspendUser(userId, { actorId: 'actor-1', actorPermissions: ['iam.user.suspend'], activeBranchId: null });
    expect(users.get(userId)?.status).toBe('Suspended');

    users.get(userId)!.status = 'Locked';
    users.get(userId)!.failedLoginCount = 4;
    users.get(userId)!.lockedUntil = new Date();
    await userService.unlockUser(userId, { actorId: 'actor-1', actorPermissions: ['iam.user.unlock'], activeBranchId: null });
    expect(users.get(userId)?.status).toBe('Active');
    expect(users.get(userId)?.failedLoginCount).toBe(0);

    await userService.archiveUser(userId, { actorId: 'actor-1', actorPermissions: ['iam.user.archive'], activeBranchId: null });
    expect(users.get(userId)?.status).toBe('Archived');
    expect(users.get(userId)?.isDeleted).toBe(true);
    expect(Array.from(sessions.values()).every((session) => session.status === 'Revoked')).toBe(true);
  });

  it('creates an admin reset password request', async () => {
    const userId = Array.from(users.keys())[0];

    await userService.adminResetPassword(userId, { actorId: 'actor-1', actorPermissions: ['iam.user.reset-password'], activeBranchId: null });

    expect(passwordResetTokens.size).toBe(1);
    expect(notifications[0]?.subject).toContain('Password Reset Request');
    expect((await auditRepo.list()).some((entry) => entry.action === 'iam.user.admin-reset-password-requested')).toBe(true);
  });

  it('activates an account via token and rejects expired activation tokens', async () => {
    const userId = Array.from(users.keys())[0];
    const tokenHash = crypto.createHash('sha256').update('activation-token').digest('hex');
    const expiredHash = crypto.createHash('sha256').update('expired-activation').digest('hex');

    users.get(userId)!.status = 'PendingActivation';
    activationTokens.set(tokenHash, {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      status: 'Pending',
      createdAt: new Date(),
      usedAt: null,
    });
    activationTokens.set(expiredHash, {
      id: crypto.randomUUID(),
      userId,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 15 * 60 * 1000),
      status: 'Pending',
      createdAt: new Date(),
      usedAt: null,
    });

    await userService.activateAccountViaToken('activation-token');
    expect(users.get(userId)?.status).toBe('Active');
    expect(activationTokens.get(tokenHash)?.status).toBe('Used');

    await expect(userService.activateAccountViaToken('expired-activation')).rejects.toMatchObject({ errorCode: 'IAM-AUTH-006' });
  });
});
