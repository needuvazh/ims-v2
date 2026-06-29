import { beforeEach, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { decodeSession } from '@ims/shared-auth';
import { InMemoryAuditLogRepository } from '@ims/audit';
import { DEFAULT_SECURITY_POLICY, type SecurityPolicy } from '../domain/security-policy';
import { PasswordPolicy } from '../domain/password-policy';
import { AuthService } from './auth-service';
import type {
  IUserRepository,
  ISessionRepository,
  IPasswordHistoryRepository,
  ISecurityPolicyRepository,
  IAuditLogRepository,
  ILoginHistoryRepository,
  IUserActivationTokenRepository,
  IRoleRepository,
  IUserBranchAccessRepository,
  UserSessionDto,
  LoginHistoryDto,
  UserActivationTokenDto,
} from '../domain/repositories';
import type { User, Person } from '../domain/user';
import type { Role } from '../domain/role';
import type { Permission } from '../domain/permission';
import type { UserBranchAccess } from '../domain/user-branch-access';

const passwordPolicy = new PasswordPolicy();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: crypto.randomUUID(),
    personId: crypto.randomUUID(),
    username: 'test.user',
    email: 'test@example.com',
    userType: 'Admin',
    status: 'Active',
    defaultBranchId: '11111111-1111-1111-1111-111111111111',
    preferredLanguage: 'en',
    failedLoginCount: 0,
    lockedUntil: null,
    passwordChangedAt: new Date('2026-06-01T00:00:00.000Z'),
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
    firstName: 'Test',
    lastName: 'User',
    mobile: '+96890000000',
    nationalId: null,
    nationality: null,
    dateOfBirth: null,
    gender: null,
    ...overrides,
  };
}

function createSession(overrides: Partial<UserSessionDto> = {}): UserSessionDto {
  return {
    id: crypto.randomUUID(),
    userId: '11111111-1111-1111-1111-111111111111',
    accessTokenJti: crypto.randomUUID(),
    hashedRefreshToken: 'hash',
    previousHashedRefreshToken: null,
    activeBranchId: '11111111-1111-1111-1111-111111111111',
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    status: 'Active',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    lastActivityAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let userRepo: IUserRepository;
  let sessionRepo: ISessionRepository;
  let passwordHistoryRepo: IPasswordHistoryRepository;
  let securityPolicyRepo: ISecurityPolicyRepository;
  let auditRepo: IAuditLogRepository;
  let loginHistoryRepo: ILoginHistoryRepository;
  let activationTokenRepo: IUserActivationTokenRepository;
  let roleRepo: IRoleRepository;
  let branchRepo: IUserBranchAccessRepository;
  let outboxRepo: { publish: (event: { eventType: string }) => Promise<void> };
  let notificationPort: {
    sendActivationEmail: (recipientEmail: string, activationData: { firstName: string; activationLink: string; expiresAt: Date }) => Promise<void>;
    sendPasswordResetEmail: (recipientEmail: string, resetData: { firstName: string; expiresAt: Date }) => Promise<void>;
    sendAccountLockedNotification: (adminEmails: string[], userData: { displayName: string; failedAttempts: number; lockedUntil: Date }) => Promise<void>;
    sendRoleAssignedNotification: (recipientEmail: string, roleData: { roleName: string }) => Promise<void>;
    sendBranchAssignedNotification: (recipientEmail: string, branchData: { branchName: string }) => Promise<void>;
  };

  let currentUser: User;
  let currentPerson: Person;
  let currentPasswordHash: string;
  const sessions = new Map<string, UserSessionDto>();
  const resetTokens = new Map<string, UserActivationTokenDto & { usedAt: Date | null }>();
  const loginHistory: LoginHistoryDto[] = [];
  const branchAccessRows: UserBranchAccess[] = [];
  const outboxEvents: string[] = [];

  beforeEach(async () => {
    process.env.SESSION_SECRET = 'auth-service-test-secret-auth-service-test-secret';

    currentUser = createUser();
    currentPerson = createPerson({ id: currentUser.personId, firstName: 'Test', lastName: 'User' });
    currentPasswordHash = await passwordPolicy.hash('Password@123');

    sessions.clear();
    resetTokens.clear();
    loginHistory.length = 0;
    branchAccessRows.length = 0;
    outboxEvents.length = 0;

    branchAccessRows.push({
      id: crypto.randomUUID(),
      userId: currentUser.id,
      branchId: currentUser.defaultBranchId!,
      isDefault: true,
      includeChildBranches: false,
      consolidatedVisibility: false,
      status: 'Active',
      revokedAt: null,
      revokedBy: null,
      reason: null,
      createdAt: new Date(),
      createdBy: currentUser.id,
      updatedAt: null,
      updatedBy: null,
    });

    userRepo = {
      findById: async (id) => (id === currentUser.id ? currentUser : null),
      findByEmail: async (email) => (email === currentUser.email ? currentUser : null),
      findByUsername: async () => currentUser,
      findPersonById: async (id) => (id === currentPerson.id ? currentPerson : null),
      findPersonByMobile: async (mobile) => (mobile === currentPerson.mobile ? currentPerson : null),
      create: async (user) => {
        currentUser = clone(user);
        return currentUser;
      },
      update: async (user, person) => {
        currentUser = clone(user);
        if (person) currentPerson = clone(person);
        return currentUser;
      },
      search: async () => ({ items: [currentUser], total: 1 }),
      getPasswordHash: async () => currentPasswordHash,
      updatePassword: async (_userId, passwordHash) => {
        currentPasswordHash = passwordHash;
      },
      createResetToken: async ({ id, userId, tokenHash, expiresAt }) => {
        resetTokens.set(tokenHash, { id, userId, tokenHash, expiresAt, status: 'Pending', createdAt: new Date(), usedAt: null });
      },
      findResetTokenByHash: async (tokenHash) => {
        const token = resetTokens.get(tokenHash);
        return token ? { userId: token.userId, expiresAt: token.expiresAt, usedAt: token.usedAt } : null;
      },
      markResetTokenAsUsed: async (tokenHash) => {
        const token = resetTokens.get(tokenHash);
        if (token) token.usedAt = new Date();
      },
    };

    sessionRepo = {
      create: async (session) => {
        sessions.set(session.accessTokenJti, clone(session));
        return clone(session);
      },
      findById: async (id) => sessions.get(id) ?? null,
      findByAccessTokenJti: async (jti) => sessions.get(jti) ?? null,
      findByHashedRefreshToken: async (hash) => Array.from(sessions.values()).find((session) => session.hashedRefreshToken === hash || session.previousHashedRefreshToken === hash) ?? null,
      update: async (session) => {
        sessions.set(session.accessTokenJti, clone(session));
        return clone(session);
      },
      revoke: async (id) => {
        const session = sessions.get(id as string);
        if (session) {
          session.status = 'Revoked';
        }
      },
      revokeAllForUser: async (userId) => {
        for (const session of sessions.values()) {
          if (session.userId === userId) {
            session.status = 'Revoked';
          }
        }
      },
      listActiveForUser: async (userId) => Array.from(sessions.values()).filter((session) => session.userId === userId && session.status === 'Active'),
    };

    outboxRepo = {
      publish: async (event) => {
        outboxEvents.push(event.eventType);
      },
    };

    passwordHistoryRepo = {
      append: async () => undefined,
      findRecentN: async () => [{ id: crypto.randomUUID(), userId: currentUser.id, passwordHash: currentPasswordHash, createdAt: new Date() }],
    };

    securityPolicyRepo = {
      get: async () => ({ ...DEFAULT_SECURITY_POLICY, id: currentUser.id, maxConcurrentSessions: 3, passwordExpiryDays: 90 }),
      update: async (policy: SecurityPolicy) => policy,
    };

    auditRepo = new InMemoryAuditLogRepository();

    loginHistoryRepo = {
      append: async (record) => {
        loginHistory.push(record);
      },
      findByUser: async () => ({ items: loginHistory.filter((record) => record.userId === currentUser.id), total: loginHistory.length }),
      list: async () => ({ items: [...loginHistory], total: loginHistory.length }),
    };

    activationTokenRepo = {
      create: async (token) => {
        resetTokens.set(token.tokenHash, { ...token, usedAt: token.usedAt ?? null });
        return token;
      },
      findByHash: async (hash) => {
        const token = resetTokens.get(hash);
        return token ? { id: token.id, userId: token.userId, tokenHash: token.tokenHash, expiresAt: token.expiresAt, status: token.status, createdAt: token.createdAt, usedAt: token.usedAt } : null;
      },
      update: async (token) => {
        resetTokens.set(token.tokenHash, { ...token, usedAt: token.usedAt ?? null });
        return token;
      },
      invalidatePendingForUser: async (userId) => {
        for (const token of resetTokens.values()) {
          if (token.userId === userId && token.status === 'Pending') {
            token.status = 'Expired';
          }
        }
      },
    };

    roleRepo = {
      findById: async (id) => {
        if (id === 'role-active') return { id, roleCode: 'ROLE_ACTIVE', roleName: 'Role Active', description: null, status: 'Active', isSystemRole: false, version: 1, effectiveStartDate: new Date(), effectiveEndDate: null, createdAt: new Date(), createdBy: null, updatedAt: null, updatedBy: null };
        if (id === 'role-system') return { id, roleCode: 'ROLE_SYSTEM', roleName: 'Role System', description: null, status: 'Active', isSystemRole: true, version: 1, effectiveStartDate: new Date(), effectiveEndDate: null, createdAt: new Date(), createdBy: null, updatedAt: null, updatedBy: null };
        return null;
      },
      findByCode: async () => null,
      create: async (role) => role,
      update: async (role) => role,
      search: async () => ({ items: [], total: 0 }),
      assignRoleToUser: async () => undefined,
      revokeRoleFromUser: async () => undefined,
      listRolesForUser: async () => [{ role: { id: 'role-active', roleCode: 'ROLE_ACTIVE', roleName: 'Role Active', description: null, status: 'Active', isSystemRole: false, version: 1, effectiveStartDate: new Date(), effectiveEndDate: null, createdAt: new Date(), createdBy: null, updatedAt: null, updatedBy: null }, status: 'Active', revokedAt: null, revokedBy: null, reason: null }],
      assignPermissionToRole: async () => undefined,
      removePermissionFromRole: async () => undefined,
      listPermissionsForRole: async () => [{ id: crypto.randomUUID(), permissionCode: 'iam.user.read', permissionName: 'Read users', permissionType: 'Action', description: null, status: 'Active', createdAt: new Date(), createdBy: null, updatedAt: null, updatedBy: null, deletedAt: null, deletedBy: null, isDeleted: false }],
    };

    branchRepo = {
      findByUser: async () => branchAccessRows,
      findById: async () => branchAccessRows[0] ?? null,
      assign: async (access) => {
        branchAccessRows.push(access);
        return access;
      },
      update: async (access) => access,
    };

    notificationPort = {
      sendActivationEmail: async () => undefined,
      sendPasswordResetEmail: async () => undefined,
      sendAccountLockedNotification: async () => undefined,
      sendRoleAssignedNotification: async () => undefined,
      sendBranchAssignedNotification: async () => undefined,
    };

    authService = new AuthService(
      userRepo,
      sessionRepo,
      passwordHistoryRepo,
      securityPolicyRepo,
      auditRepo,
      loginHistoryRepo,
      notificationPort,
      roleRepo,
      branchRepo,
      outboxRepo as any,
    );
  });

  it('signs in an active user and records login history and audit', async () => {
    const result = await authService.signIn({ email: currentUser.email, password: 'Password@123' });
    const decoded = await decodeSession(result.sessionToken);

    expect(result.session.userId).toBe(currentUser.id);
    expect(result.sessionToken).toContain('.');
    expect(decoded?.roles).toContain('ROLE_ACTIVE');
    expect(loginHistory).toHaveLength(1);
    expect(loginHistory[0].status).toBe('Success');
    expect(auditRepo.list().some((entry) => entry.action === 'iam.user.login-succeeded')).toBe(true);
  });

  it('locks the account after repeated invalid passwords', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(authService.signIn({ email: currentUser.email, password: 'WrongPassword123!' })).rejects.toMatchObject({ errorCode: i < 4 ? 'IAM-AUTH-001' : 'IAM-AUTH-002' });
    }

    expect(currentUser.status).toBe('Locked');
    expect(currentUser.lockedUntil).not.toBeNull();
    expect(auditRepo.list().some((entry) => entry.action === 'iam.user.locked')).toBe(true);
  });

  it('rejects suspended users', async () => {
    currentUser.status = 'Suspended';
    await expect(authService.signIn({ email: currentUser.email, password: 'Password@123' })).rejects.toMatchObject({ errorCode: 'IAM-AUTH-003' });
  });

  it('rejects archived users and SQL injection style emails', async () => {
    currentUser.status = 'Archived';
    await expect(authService.signIn({ email: currentUser.email, password: 'Password@123' })).rejects.toMatchObject({ errorCode: 'IAM-AUTH-001' });

    await expect(authService.signIn({ email: "test@example.com' OR 1=1 --", password: 'Password@123' })).rejects.toMatchObject({ errorCode: 'IAM-AUTH-001' });
  });

  it('rejects expired passwords', async () => {
    currentUser.passwordChangedAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await expect(authService.signIn({ email: currentUser.email, password: 'Password@123' })).rejects.toMatchObject({ errorCode: 'IAM-AUTH-004' });
  });

  it('expires the oldest active session when the concurrent limit is reached', async () => {
    sessions.set('s1', createSession({ accessTokenJti: 's1', userId: currentUser.id, lastActivityAt: new Date('2026-01-01T00:00:00.000Z') }));
    sessions.set('s2', createSession({ accessTokenJti: 's2', userId: currentUser.id, lastActivityAt: new Date('2026-01-02T00:00:00.000Z') }));
    sessions.set('s3', createSession({ accessTokenJti: 's3', userId: currentUser.id, lastActivityAt: new Date('2026-01-03T00:00:00.000Z') }));

    await authService.signIn({ email: currentUser.email, password: 'Password@123' });

    expect(sessions.get('s1')?.status).toBe('Expired');
    expect(auditRepo.list().some((entry) => entry.action === 'iam.session.expired-by-policy')).toBe(true);
  });

  it('logs out by revoking the session', async () => {
    const signIn = await authService.signIn({ email: currentUser.email, password: 'Password@123' });

    await authService.logout(signIn.session.accessTokenJti);

    expect(sessions.get(signIn.session.accessTokenJti)?.status).toBe('Revoked');
    expect(auditRepo.list().some((entry) => entry.action === 'iam.user.logout')).toBe(true);
  });

  it('creates a password reset token and notification intent', async () => {
    await authService.forgotPassword(currentUser.email);

    expect(resetTokens.size).toBe(1);
    expect(outboxEvents).toContain('PasswordResetRequested');
    expect(auditRepo.list().some((entry) => entry.action === 'iam.user.password-reset-requested')).toBe(true);
  });

  it('rejects refresh token reuse after rotation', async () => {
    const login = await authService.login(currentUser.email, 'Password@123');
    const firstRefresh = login.session.hashedRefreshToken;

    const rotated = await authService.refresh(login.refreshToken);
    expect(rotated.accessToken).toBeTruthy();

    const reusedSession = sessions.get(login.session.accessTokenJti);
    expect(reusedSession?.previousHashedRefreshToken).toBe(firstRefresh);

    await expect(authService.refresh(login.refreshToken)).rejects.toMatchObject({ errorCode: 'IAM-AUTH-006' });
    expect(sessions.get(login.session.accessTokenJti)?.status).toBe('Revoked');
  });

  it('resets the password with a valid token and revokes active sessions', async () => {
    const hash = crypto.createHash('sha256').update('reset-token').digest('hex');
    resetTokens.set(hash, { id: crypto.randomUUID(), userId: currentUser.id, tokenHash: hash, expiresAt: new Date(Date.now() + 15 * 60 * 1000), status: 'Pending', createdAt: new Date(), usedAt: null });
    sessions.set('s1', createSession({ accessTokenJti: 's1', userId: currentUser.id }));

    await authService.resetPassword('reset-token', 'NewPassword@123!');

    expect(await passwordPolicy.verify(currentPasswordHash, 'NewPassword@123!')).toBe(true);
    expect(resetTokens.get(hash)?.usedAt).not.toBeNull();
    expect(Array.from(sessions.values()).every((session) => session.status === 'Revoked')).toBe(true);
    expect(auditRepo.list().some((entry) => entry.action === 'iam.user.password-reset-completed')).toBe(true);
  });

  it('rejects weak or reused reset passwords', async () => {
    const hash = crypto.createHash('sha256').update('reset-token-2').digest('hex');
    resetTokens.set(hash, { id: crypto.randomUUID(), userId: currentUser.id, tokenHash: hash, expiresAt: new Date(Date.now() + 15 * 60 * 1000), status: 'Pending', createdAt: new Date(), usedAt: null });

    await expect(authService.resetPassword('reset-token-2', 'short')).rejects.toMatchObject({ errorCode: 'IAM-VAL-005' });
    await expect(authService.resetPassword('reset-token-2', 'Password@123')).rejects.toMatchObject({ errorCode: 'IAM-VAL-009' });
  });

  it('rejects expired reset tokens and invalid refresh tokens', async () => {
    const expiredHash = crypto.createHash('sha256').update('expired-reset').digest('hex');
    resetTokens.set(expiredHash, { id: crypto.randomUUID(), userId: currentUser.id, tokenHash: expiredHash, expiresAt: new Date(Date.now() - 60_000), status: 'Pending', createdAt: new Date(), usedAt: null });

    await expect(authService.resetPassword('expired-reset', 'NewPassword@123!')).rejects.toMatchObject({ errorCode: 'IAM-AUTH-006' });
    await expect(authService.refresh('not-a-real-refresh-token')).rejects.toMatchObject({ errorCode: 'IAM-AUTH-006' });
  });

  it('changes the password for an authenticated user', async () => {
    const signIn = await authService.signIn({ email: currentUser.email, password: 'Password@123' });
    await authService.changePassword({ currentPassword: 'Password@123', newPassword: 'NewPassword@123!' }, signIn.session as any);

    expect(auditRepo.list().some((entry) => entry.action === 'iam.user.password-changed')).toBe(true);
  });

  it('rejects password change with wrong current password', async () => {
    const signIn = await authService.signIn({ email: currentUser.email, password: 'Password@123' });
    await expect(authService.changePassword({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword@123!' }, signIn.session as any)).rejects.toMatchObject({ errorCode: 'IAM-AUTH-001' });
  });
});
