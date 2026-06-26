import { describe, expect, it, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import nodeCrypto from 'crypto';
import { DomainError } from '@ims/shared-kernel';
import type { Uuid } from '@ims/shared-kernel';
import { decodeSession } from '@ims/shared-auth';
import { AuthService, type AuthUserRepository, type AuthSessionRepository, type AuthResetTokenRepository } from './auth-service';
import { InMemoryAuditLogRepository } from '@ims/audit';
import type { UserWithCredentials } from '../domain/user';

describe('AuthService Security and Lockout Tests', () => {
  let authService: AuthService;
  let mockUserRepo: AuthUserRepository;
  let mockSessionRepo: AuthSessionRepository;
  let mockResetTokenRepo: AuthResetTokenRepository;
  let mockAuditRepo: InMemoryAuditLogRepository;
  let notificationCalls: Array<{ toEmail: string; resetUrl: string }>;

  const passwordHash = bcrypt.hashSync('Password@123', 12);
  const now = new Date();

  // Mock data representing standard scenarios
  let testUser: UserWithCredentials;
  let sessionsDb: Map<string, any>;
  let resetTokensDb: Map<string, any>;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test_secret_key_for_hmac_signature_checks_must_be_long_enough';
    mockAuditRepo = new InMemoryAuditLogRepository();
    sessionsDb = new Map();
    resetTokensDb = new Map();
    notificationCalls = [];

    testUser = {
      id: 'dcd16b08-8e68-45be-bbfe-81d3ee6b69fa' as Uuid,
      fullName: 'Test User',
      email: 'test@example.com',
      phone: null,
      userType: 'Admin',
      status: 'Active',
      passwordHash,
      roles: ['ADMIN'],
      permissions: ['identity.read', 'identity.write'],
      dataScopes: [],
      effectiveStartDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // yesterday
      effectiveEndDate: null,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    };

    mockUserRepo = {
      findByEmailWithCredentials: async (email) => {
        if (email === testUser.email) return { ...testUser };
        return null;
      },
      recordLastLogin: async () => {},
      incrementFailedAttempts: async (userId, lockoutMinutes = 15) => {
        if (userId === testUser.id) {
          testUser.failedLoginAttempts = (testUser.failedLoginAttempts ?? 0) + 1;
          if (testUser.failedLoginAttempts >= 5) {
            testUser.status = 'Locked';
            testUser.lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
          }
        }
      },
      resetFailedAttempts: async (userId) => {
        if (userId === testUser.id) {
          testUser.failedLoginAttempts = 0;
          testUser.lockoutUntil = null;
          testUser.status = 'Active';
        }
      },
      updatePasswordAndUnlock: async (userId, newHash) => {
        if (userId === testUser.id) {
          testUser.passwordHash = newHash;
          testUser.failedLoginAttempts = 0;
          testUser.lockoutUntil = null;
          testUser.status = 'Active';
        }
      },
    };

    mockSessionRepo = {
      createSession: async (session) => {
        sessionsDb.set(session.tokenHash, {
          userId: session.userId,
          tokenHash: session.tokenHash,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          status: 'Active',
          expiresAt: session.expiresAt,
        });
      },
      getSessionByHash: async (tokenHash) => {
        return sessionsDb.get(tokenHash) ?? null;
      },
      revokeSessionByHash: async (tokenHash) => {
        const session = sessionsDb.get(tokenHash);
        if (session) {
          session.status = 'Revoked';
        }
      },
      revokeAllSessionsForUser: async (userId) => {
        for (const [hash, session] of sessionsDb.entries()) {
          if (session.userId === userId) {
            session.status = 'Revoked';
          }
        }
      },
    };

    mockResetTokenRepo = {
      createToken: async (data) => {
        resetTokensDb.set(data.tokenHash, {
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          usedAt: null,
        });
      },
      findActiveTokenByHash: async (tokenHash) => {
        return resetTokensDb.get(tokenHash) ?? null;
      },
      markTokenAsUsed: async (tokenHash) => {
        const entry = resetTokensDb.get(tokenHash);
        if (entry) {
          entry.usedAt = new Date();
        }
      },
    };

    authService = new AuthService(
      mockUserRepo,
      mockSessionRepo,
      mockResetTokenRepo,
      mockAuditRepo,
      {
        sendPasswordResetLink: async (params) => { notificationCalls.push(params); },
      },
    );
  });

  describe('User Status Verification', () => {
    it('successfully signs in active user with correct password', async () => {
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'Password@123',
      });

      expect(result.sessionToken).toBeDefined();
      expect(result.session.userId).toBe(testUser.id);
      
      const logs = mockAuditRepo.list();
      expect(logs.some(l => l.action === 'identity.login_succeeded')).toBe(true);

      const hash = nodeCrypto.createHash('sha256').update(result.sessionToken).digest('hex');
      const persisted = sessionsDb.get(hash);
      expect(persisted).toBeDefined();
      expect(persisted.status).toBe('Active');
    });

    it('blocks deactivated user from logging in', async () => {
      testUser.status = 'Inactive';
      await expect(
        authService.signIn({ email: 'test@example.com', password: 'Password@123' })
      ).rejects.toThrowError(DomainError);
    });
  });

  describe('Brute-force Account Lockout', () => {
    it('increments failure counts on wrong password and locks user at 5 failures', async () => {
      // 4 failures
      for (let i = 0; i < 4; i++) {
        await expect(
          authService.signIn({ email: 'test@example.com', password: 'wrong' })
        ).rejects.toThrowError('Invalid email or password.');
        expect(testUser.failedLoginAttempts).toBe(i + 1);
        expect(testUser.status).toBe('Active');
      }

      // 5th failure triggers lock
      await expect(
        authService.signIn({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrowError('Invalid email or password.');

      expect(testUser.failedLoginAttempts).toBe(5);
      expect(testUser.status).toBe('Locked');
      expect(testUser.lockoutUntil!.getTime()).toBeGreaterThan(Date.now());

      // Subsequent login attempt fails immediately due to lockout status
      await expect(
        authService.signIn({ email: 'test@example.com', password: 'Password@123' })
      ).rejects.toThrowError('Your account is locked.');
    });

    it('resets failure counts to 0 on successful login', async () => {
      testUser.failedLoginAttempts = 3;
      
      await authService.signIn({ email: 'test@example.com', password: 'Password@123' });
      
      expect(testUser.failedLoginAttempts).toBe(0);
      expect(testUser.status).toBe('Active');
    });

    it('allows retry after lockout duration expires', async () => {
      testUser.status = 'Locked';
      testUser.lockoutUntil = new Date(Date.now() - 1000); // 1 second ago

      await expect(
        authService.signIn({ email: 'test@example.com', password: 'Password@123' })
      ).resolves.toBeDefined();

      expect(testUser.status).toBe('Active');
      expect(testUser.failedLoginAttempts).toBe(0);
    });
  });

  describe('Effective Dating Range Enforcements', () => {
    it('blocks login if user effective date is in the future', async () => {
      testUser.effectiveStartDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
      
      await expect(
        authService.signIn({ email: 'test@example.com', password: 'Password@123' })
      ).rejects.toThrowError('Your account is not currently within its active date range.');
    });

    it('blocks login if user effective date is expired', async () => {
      testUser.effectiveEndDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
      
      await expect(
        authService.signIn({ email: 'test@example.com', password: 'Password@123' })
      ).rejects.toThrowError('Your account is not currently within its active date range.');
    });
  });

  describe('Session Invalidation', () => {
    it('revoking session marks it Revoked in repository', async () => {
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'Password@123',
      });

      const hash = nodeCrypto.createHash('sha256').update(result.sessionToken).digest('hex');
      const activeSession = sessionsDb.get(hash);
      expect(activeSession.status).toBe('Active');

      await mockSessionRepo.revokeSessionByHash(hash);
      const revokedSession = sessionsDb.get(hash);
      expect(revokedSession.status).toBe('Revoked');
    });
  });

  describe('Password Recovery (Forgot & Reset Password)', () => {
    it('generates reset token, records audit log, and delivers notification for active user request', async () => {
      await authService.requestPasswordReset({ email: 'test@example.com' });

      expect(resetTokensDb.size).toBe(1);
      const entry = Array.from(resetTokensDb.values())[0];
      expect(entry.userId).toBe(testUser.id);
      expect(entry.usedAt).toBeNull();
      expect(entry.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Notification port must have been called with the email
      expect(notificationCalls).toHaveLength(1);
      expect(notificationCalls[0].toEmail).toBe('test@example.com');
      expect(notificationCalls[0].resetUrl).toContain('/reset-password?token=');

      const logs = mockAuditRepo.list();
      expect(logs.some(l => l.action === 'identity.password_reset_requested')).toBe(true);
    });

    it('returns without error or token creation if email does not exist', async () => {
      await authService.requestPasswordReset({ email: 'nonexistent@example.com' });
      expect(resetTokensDb.size).toBe(0);
    });

    it('returns without error or token creation if user status is inactive', async () => {
      testUser.status = 'Inactive';
      await authService.requestPasswordReset({ email: 'test@example.com' });
      expect(resetTokensDb.size).toBe(0);
    });

    it('successfully resets password, clears attempts, unlocks account, and invalidates active sessions with a valid token', async () => {
      // 1. Generate token
      await authService.requestPasswordReset({ email: 'test@example.com' });
      const rawTokenHash = Array.from(resetTokensDb.keys())[0];
      const rawTokenEntry = resetTokensDb.get(rawTokenHash);

      // Reconstruct token verification logic in test
      const rawToken = 'dummy-token';
      const tokenHash = nodeCrypto.createHash('sha256').update(rawToken).digest('hex');
      resetTokensDb.set(tokenHash, rawTokenEntry);

      mockResetTokenRepo.findActiveTokenByHash = async (hash) => {
        if (hash === tokenHash) return rawTokenEntry;
        return null;
      };

      // 2. Set user as locked to verify automatic unlock
      testUser.status = 'Locked';
      testUser.failedLoginAttempts = 4;
      testUser.lockoutUntil = new Date();

      // Create a dummy session to verify total invalidation
      await mockSessionRepo.createSession({
        userId: testUser.id,
        tokenHash: 'dummy_session_hash',
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 10000),
      });

      expect(sessionsDb.get('dummy_session_hash').status).toBe('Active');

      // 3. Reset password
      await authService.resetPassword({
        token: rawToken,
        password: 'NewStrongPassword@2026',
      });

      // 4. Verify password was updated (can hash verify with bcrypt)
      const matches = bcrypt.compareSync('NewStrongPassword@2026', testUser.passwordHash);
      expect(matches).toBe(true);
      expect(testUser.status).toBe('Active');
      expect(testUser.failedLoginAttempts).toBe(0);
      expect(testUser.lockoutUntil).toBeNull();
      expect(rawTokenEntry.usedAt).toBeDefined();
      expect(rawTokenEntry.usedAt).not.toBeNull();
      expect(sessionsDb.get('dummy_session_hash').status).toBe('Revoked');

      const logs = mockAuditRepo.list();
      expect(logs.some(l => l.action === 'identity.password_reset_completed')).toBe(true);
    });

    it('fails resetting password if token is expired', async () => {
      await authService.requestPasswordReset({ email: 'test@example.com' });
      const rawTokenHash = Array.from(resetTokensDb.keys())[0];
      const rawTokenEntry = resetTokensDb.get(rawTokenHash);
      rawTokenEntry.expiresAt = new Date(Date.now() - 1000); // expired

      mockResetTokenRepo.findActiveTokenByHash = async (hash) => {
        return rawTokenEntry;
      };

      await expect(
        authService.resetPassword({ token: 'dummy-token', password: 'NewStrongPassword@2026' })
      ).rejects.toThrowError('Invalid or expired password reset token.');
    });

    it('fails resetting password if token was already used', async () => {
      await authService.requestPasswordReset({ email: 'test@example.com' });
      const rawTokenHash = Array.from(resetTokensDb.keys())[0];
      const rawTokenEntry = resetTokensDb.get(rawTokenHash);
      rawTokenEntry.usedAt = new Date(); // already used

      mockResetTokenRepo.findActiveTokenByHash = async (hash) => {
        return rawTokenEntry;
      };

      await expect(
        authService.resetPassword({ token: 'dummy-token', password: 'NewStrongPassword@2026' })
      ).rejects.toThrowError('Invalid or expired password reset token.');
    });

    it('fails resetting password if password does not meet complexity rules', async () => {
      await authService.requestPasswordReset({ email: 'test@example.com' });
      const rawTokenHash = Array.from(resetTokensDb.keys())[0];
      const rawTokenEntry = resetTokensDb.get(rawTokenHash);

      mockResetTokenRepo.findActiveTokenByHash = async (hash) => {
        return rawTokenEntry;
      };

      await expect(
        authService.resetPassword({ token: 'dummy-token', password: 'weak' })
      ).rejects.toThrow();
    });
  });
});
