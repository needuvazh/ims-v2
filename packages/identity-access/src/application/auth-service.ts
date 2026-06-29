import { UAParser } from 'ua-parser-js';
import crypto from 'crypto';
import { InMemoryMetrics } from '@ims/observability';
import { JwtService, RefreshTokenService, encodeSession, getDevelopmentKeyPair, type Session, type TokenPayload } from '@ims/shared-auth';
import type { Uuid } from '@ims/shared-kernel';
import { createIamError, IamError } from '../errors/iam-errors';
import { PasswordPolicy } from '../domain/password-policy';
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
  IOutboxEventRepository,
  UserSessionDto,
  LoginHistoryDto,
} from '../domain/repositories';
import type { INotificationPort } from '../domain/notification-port';

function getKeys(): { publicKey: string; privateKey: string } {
  const privateKey = process.env.JWT_PRIVATE_KEY;
  const publicKey = process.env.JWT_PUBLIC_KEY;
  if (privateKey && publicKey) {
    return { privateKey, publicKey };
  }
  return getDevelopmentKeyPair();
}

export type SignInResult = {
  accessToken: string;
  refreshToken: string;
  user: any;
  session: any;
};

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly passwordHistoryRepository: IPasswordHistoryRepository,
    private readonly securityPolicyRepository: ISecurityPolicyRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly loginHistoryRepository: ILoginHistoryRepository,
    private readonly notificationPort: INotificationPort,
    private readonly roleRepository?: IRoleRepository,
    private readonly userBranchAccessRepository?: IUserBranchAccessRepository,
    private readonly outboxEventRepository?: IOutboxEventRepository
  ) {}

  async signIn(
    command: { email: string; password: string },
    metadata?: { userAgent?: string | null; ipAddress?: string | null }
  ): Promise<{ sessionToken: string; session: Session }> {
    const res = await this.login(command.email, command.password, false, metadata?.ipAddress || null, metadata?.userAgent || null);

    let roles: string[] = [];
    let permissions: string[] = [];
    if (this.roleRepository) {
      const userRoles = await this.roleRepository.listRolesForUser(res.user.id);
      const activeRoles = userRoles.filter((ur: any) => ur.status === 'Active' && ur.role.status === 'Active');
      roles = activeRoles.map((ur: any) => ur.role.roleCode);

      const allPermissions = new Set<string>();
      for (const ur of activeRoles) {
        const perms = await this.roleRepository.listPermissionsForRole(ur.role.id);
        for (const p of perms) {
          if (p.status === 'Active') {
            allPermissions.add(p.permissionCode);
          }
        }
      }
      permissions = Array.from(allPermissions);
    }

    let dataScopes: any[] = [];
    if (this.userBranchAccessRepository) {
      const branches = await this.userBranchAccessRepository.findByUser(res.user.id);
      dataScopes = branches
        .filter((b: any) => b.status === 'Active')
        .map((b: any) => ({
          scopeType: 'Branch',
          branchId: b.branchId,
          departmentId: null,
          assignedOnly: b.consolidatedVisibility || false,
        }));
    }

    if (dataScopes.length === 0) {
      dataScopes = [{ scopeType: 'All', branchId: null, departmentId: null, assignedOnly: false }];
    }

    const legacySession: Session = {
      userId: res.user.id,
      displayName: res.user.username,
      roles,
      permissions,
      dataScopes,
      activeBranchId: res.user.defaultBranchId,
      accessTokenJti: res.session.accessTokenJti,
      hashedRefreshToken: res.session.hashedRefreshToken,
      lastActivityAt: res.session.lastActivityAt.getTime(),
      status: 'Active',
      expiresAt: res.session.expiresAt.getTime(),
    };

    const sessionToken = await encodeSession(legacySession);
    return { sessionToken, session: legacySession };
  }

  async requestPasswordReset(command: { email: string }): Promise<void> {
    return this.forgotPassword(command.email);
  }

  async login(
    email: string,
    password: string,
    rememberMe: boolean = false,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<SignInResult> {
    const attemptedEmail = email.trim().toLowerCase();
    const now = new Date();

    // Setup UA Parser
    const parser = new UAParser(userAgent || undefined);
    const browser = parser.getBrowser().name || null;
    const os = parser.getOS().name || null;
    const device = parser.getDevice().type || 'Desktop';

    const policy = await this.securityPolicyRepository.get();
    const user = await this.userRepository.findByEmail(attemptedEmail);

    const logHistoryAndThrow = async (
      reason: string,
      errorCode: any,
      userId: string | null = null,
      branchId: string | null = null
    ) => {
      // Persist LoginHistory record
      await this.loginHistoryRepository.append({
        id: crypto.randomUUID() as Uuid,
        userId: userId as Uuid | null,
        attemptedEmail,
        ipAddress,
        userAgent,
        browser,
        os,
        device,
        status: 'Failure',
        failureReason: reason,
        branchId: branchId as Uuid | null,
        createdAt: now,
      });

      // Append Audit Log
      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: userId as Uuid | null,
        performedAt: now,
        entityType: 'User',
        entityId: userId || 'unknown',
        action: 'iam.user.login-failed',
        oldValue: null,
        newValue: null,
        ipAddress,
        userAgent,
        branchId: branchId as Uuid | null,
        correlationId: null,
        reason,
      });

      InMemoryMetrics.getInstance().increment('iam.login.failure', 1, { reason, attemptedEmail });

      throw createIamError(errorCode);
    };

    if (!user) {
      await logHistoryAndThrow('user_not_found', 'IAM-AUTH-001');
      throw createIamError('IAM-AUTH-001'); // satisfy TS
    }

    // Check status
    if (user.status === 'Archived') {
      await logHistoryAndThrow('user_archived', 'IAM-AUTH-001', user.id);
    }
    if (user.status === 'Suspended') {
      await logHistoryAndThrow('user_suspended', 'IAM-AUTH-003', user.id);
    }
    if (user.status === 'PendingActivation') {
      await logHistoryAndThrow('user_pending_activation', 'IAM-AUTH-001', user.id);
    }

    // Locked check
    if (user.status === 'Locked') {
      if (user.lockedUntil && user.lockedUntil > now) {
        await logHistoryAndThrow('account_locked', 'IAM-AUTH-002', user.id);
      } else {
        // Lockout expired, unlock automatically
        user.status = 'Active';
        user.failedLoginCount = 0;
        user.lockedUntil = null;
        await this.userRepository.update(user);
      }
    }

    // Effective dating check
    if (
      user.effectiveStartDate > now ||
      (user.effectiveEndDate && user.effectiveEndDate < now)
    ) {
      await logHistoryAndThrow('effective_date_expired', 'IAM-AUTH-001', user.id);
    }

    // Password credentials validation
    // Need to fetch user credentials (PrismaUserRepository returns user with passwordHash from DB)
    // We didn't expose passwordHash directly in User entity to avoid leaking it,
    // so we can fetch the user directly via prisma inside user repository, or use a method that returns passwordHash.
    // In our PrismaUserRepository, user does not contain passwordHash. Let's make sure we have a passwordHash fetch method or get it.
    // Wait, in PrismaUserRepository:
    // row = await tx.user.create/update/findUnique...
    // Since we need passwordHash for auth, we must add a helper to `IUserRepository` or prisma client.
    // Let's check how the old `PrismaUserRepository` did it:
    // `findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>`
    // Wait! In `prisma-user-repository.ts` we refactored, did we include `findByEmailWithCredentials`?
    // Let's look at `prisma-user-repository.ts` we wrote:
    // We only put `findByEmail(email)` and `findById(id)`.
    // Let's modify `IUserRepository` and `PrismaUserRepository` to allow getting user credentials.
    // Wait, in `IUserRepository` we can add `findCredentialsByUserId(userId: Uuid): Promise<string | null>`.
    // Or we can just get the user model directly. Let's add `getPasswordHash(userId: Uuid): Promise<string | null>` to `IUserRepository`.
    // Let's check `packages/database/src/repositories/prisma-user-repository.ts`.
    // We can add it there easily!
    // But first, let's finish the logic here.
    // Let's fetch credentials hash:
    const passwordHash = await (this.userRepository as any).getPasswordHash(user.id);
    if (!passwordHash) {
      await logHistoryAndThrow('no_credentials', 'IAM-AUTH-001', user.id);
      throw createIamError('IAM-AUTH-001'); // satisfy TS
    }

    const passwordPolicy = new PasswordPolicy({
      minLength: policy.passwordMinLength,
      requireUppercase: policy.passwordRequireUppercase,
      requireLowercase: policy.passwordRequireLowercase,
      requireNumbers: policy.passwordRequireNumbers,
      requireSpecial: policy.passwordRequireSpecial,
      historyCount: policy.passwordHistoryCount,
    });

    const isMatch = await passwordPolicy.verify(passwordHash, password);
    if (!isMatch) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= policy.maxFailedAttempts) {
        user.status = 'Locked';
        user.lockedUntil = new Date(now.getTime() + policy.lockoutDurationMinutes * 60 * 1000);
        await this.userRepository.update(user);

        // Account Locked Notification & Audit
        await this.auditLogRepository.append({
          id: crypto.randomUUID() as Uuid,
          module: 'iam',
          performedBy: user.id,
          performedAt: now,
          entityType: 'User',
          entityId: user.id,
          action: 'iam.user.locked',
          oldValue: { status: 'Active' },
          newValue: { status: 'Locked', lockedUntil: user.lockedUntil },
          ipAddress,
          userAgent,
          branchId: user.defaultBranchId,
          correlationId: null,
          reason: 'too_many_failed_attempts',
        });

        // Send lock notification
        await this.notificationPort.sendAccountLockedNotification(
          ['admin@ims.com'], // In practice this would be loaded admins
          { displayName: user.username, failedAttempts: user.failedLoginCount, lockedUntil: user.lockedUntil }
        );

        InMemoryMetrics.getInstance().increment('iam.login.lockout', 1, { userId: user.id });

        await logHistoryAndThrow('account_locked', 'IAM-AUTH-002', user.id, user.defaultBranchId);
      } else {
        await this.userRepository.update(user);
        await logHistoryAndThrow('invalid_password', 'IAM-AUTH-001', user.id, user.defaultBranchId);
      }
    }

    // 90-day password expiry check
    if (user.passwordChangedAt) {
      const diffTime = Math.abs(now.getTime() - user.passwordChangedAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > policy.passwordExpiryDays) {
        await logHistoryAndThrow('password_expired', 'IAM-AUTH-004', user.id, user.defaultBranchId);
      }
    }

    // Enforce concurrent session limit
    const activeSessions = await this.sessionRepository.listActiveForUser(user.id);
    if (activeSessions.length >= policy.maxConcurrentSessions) {
      // Policy: Terminate oldest session
      const sorted = [...activeSessions].sort(
        (a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime()
      );
      const oldest = sorted[0];
      if (oldest) {
        oldest.status = 'Expired';
        await this.sessionRepository.update(oldest);

        await this.auditLogRepository.append({
          id: crypto.randomUUID() as Uuid,
          module: 'iam',
          performedBy: user.id,
          performedAt: now,
          entityType: 'UserSession',
          entityId: oldest.id,
          action: 'iam.session.expired-by-policy',
          oldValue: { status: 'Active' },
          newValue: { status: 'Expired' },
          ipAddress,
          userAgent,
          branchId: user.defaultBranchId,
          correlationId: null,
          reason: 'concurrent_session_limit_exceeded',
        });
      }
    }

    // Issue tokens
    const { raw: refreshToken, hash: hashedRefreshToken } = RefreshTokenService.generate();
    const accessTokenJti = crypto.randomUUID();

    const keys = getKeys();
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roles: [], // Will populate in application service or guard
      permissions: [], // Will populate in application service or guard
      activeBranchId: user.defaultBranchId,
      jti: accessTokenJti,
    };

    const accessToken = await JwtService.signAccessToken(payload, keys.privateKey);

    // Create session
    const refreshExpiryDays = rememberMe
      ? policy.rememberMeRefreshTokenDays
      : policy.refreshTokenExpiryDays;
    const sessionExpiresAt = new Date(now.getTime() + refreshExpiryDays * 24 * 60 * 60 * 1000);

    const session: UserSessionDto = {
      id: accessTokenJti as Uuid,
      userId: user.id,
      accessTokenJti,
      hashedRefreshToken,
      previousHashedRefreshToken: null,
      activeBranchId: user.defaultBranchId,
      userAgent,
      ipAddress,
      status: 'Active',
      expiresAt: sessionExpiresAt,
      lastActivityAt: now,
      createdAt: now,
    };

    await this.sessionRepository.create(session);

    // Reset failed login attempts on successful login
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await this.userRepository.update(user);

    // Append LoginHistory record
    await this.loginHistoryRepository.append({
      id: crypto.randomUUID() as Uuid,
      userId: user.id,
      attemptedEmail,
      ipAddress,
      userAgent,
      browser,
      os,
      device,
      status: 'Success',
      failureReason: null,
      branchId: user.defaultBranchId,
      createdAt: now,
    });

    // Audit Success Log
    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: user.id,
      performedAt: now,
      entityType: 'User',
      entityId: user.id,
      action: 'iam.user.login-succeeded',
      oldValue: null,
      newValue: null,
      ipAddress,
      userAgent,
      branchId: user.defaultBranchId,
      correlationId: null,
      reason: null,
    });

    InMemoryMetrics.getInstance().increment('iam.login.success', 1, { branchId: user.defaultBranchId || 'none' });

    return {
      accessToken,
      refreshToken,
      user,
      session,
    };
  }

  async refresh(
    refreshTokenRaw: string,
    userAgent: string | null = null,
    ipAddress: string | null = null
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hashedToken = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    const session = await this.sessionRepository.findByHashedRefreshToken(hashedToken);
    const now = new Date();

    if (!session || session.status !== 'Active' || session.expiresAt < now) {
      // Invalidate if expired or revoked
      throw createIamError('IAM-AUTH-006');
    }

    if (session.previousHashedRefreshToken === hashedToken) {
      session.status = 'Revoked';
      await this.sessionRepository.update(session);
      await this.sessionRepository.revokeAllForUser(session.userId);

      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: session.userId,
        performedAt: now,
        entityType: 'UserSession',
        entityId: session.id,
        action: 'iam.session.refresh-token-reused',
        oldValue: { status: 'Active' },
        newValue: { status: 'Revoked' },
        ipAddress,
        userAgent,
        branchId: session.activeBranchId,
        correlationId: null,
        reason: 'refresh_token_reuse_detected',
      });

      throw createIamError('IAM-AUTH-006');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user || user.status !== 'Active') {
      throw createIamError('IAM-AUTH-001');
    }

    // Refresh token rotation (issue new refresh token, invalidate old one)
    const { raw: newRefreshToken, hash: hashedNewRefreshToken } = RefreshTokenService.generate();
    session.previousHashedRefreshToken = session.hashedRefreshToken;
    session.hashedRefreshToken = hashedNewRefreshToken;
    session.lastActivityAt = now;
    await this.sessionRepository.update(session);

    const keys = getKeys();
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roles: [],
      permissions: [],
      activeBranchId: session.activeBranchId,
      jti: session.id,
    };

    const newAccessToken = await JwtService.signAccessToken(payload, keys.privateKey);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(accessTokenJti: string): Promise<void> {
    const session = await this.sessionRepository.findById(accessTokenJti as Uuid);
    if (session) {
      session.status = 'Revoked';
      await this.sessionRepository.update(session);

      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: session.userId,
        performedAt: new Date(),
        entityType: 'UserSession',
        entityId: session.id,
        action: 'iam.user.logout',
        oldValue: { status: 'Active' },
        newValue: { status: 'Revoked' },
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        branchId: session.activeBranchId,
        correlationId: null,
        reason: null,
      });

      InMemoryMetrics.getInstance().increment('iam.logout', 1, { userId: session.userId });
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const attemptedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(attemptedEmail);

    // Prevent user enumeration: always return successfully
    if (!user || user.status === 'Archived' || user.status === 'Suspended') {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const policy = await this.securityPolicyRepository.get();
    const expiresAt = new Date(Date.now() + policy.resetTokenExpiryMinutes * 60 * 1000);

    // Re-use PasswordResetToken model in DB if present or activation token repository structure
    // Since we are using Prisma, let's create a reset token.
    // Wait, in schema.prisma, do we have PasswordResetToken? Yes! Let's check schema.prisma
    // model PasswordResetToken {
    //   id        String   @id @default(uuid()) @db.Uuid
    //   userId    String   @db.Uuid
    //   tokenHash String   @unique @db.Text
    //   expiresAt DateTime @db.Timestamptz(6)
    //   usedAt    DateTime? @db.Timestamptz(6)
    //   createdAt DateTime @default(now()) @db.Timestamptz(6)
    //   user      User     @relation(fields: [userId], references: [id])
    // }
    // We don't have a direct repository interface in `repositories.ts` for PasswordResetToken,
    // but wait! We can add a helper or implement it in `IUserRepository` / PrismaUserRepository
    // Or we can just use the PrismaUserRepository or create a simple method inside IUserRepository.
    // Let's add reset token support directly to `IUserRepository` / `PrismaUserRepository` or create `IResetTokenRepository`.
    // Wait, let's check `IUserRepository` we defined. No reset token methods.
    // Let's add `createResetToken`, `findResetTokenByHash`, `markResetTokenAsUsed` to `IUserRepository`.
    // Yes! That keeps the interface neat without spawning too many separate repository classes.

    await (this.userRepository as any).createResetToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    if (this.outboxEventRepository) {
      await this.outboxEventRepository.publish({
        id: crypto.randomUUID() as Uuid,
        eventType: 'PasswordResetRequested',
        payload: { userId: user.id, email: user.email },
        status: 'Pending',
        createdAt: new Date(),
        processedAt: null,
        retryCount: 0,
      });
    }

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: user.id,
      performedAt: new Date(),
      entityType: 'User',
      entityId: user.id,
      action: 'iam.user.password-reset-requested',
      oldValue: null,
      newValue: null,
      ipAddress: null,
      userAgent: null,
      branchId: user.defaultBranchId,
      correlationId: null,
      reason: null,
    });

    // Send reset email without exposing the reset link to the adapter boundary.
    await this.notificationPort.sendPasswordResetEmail(user.email, {
      firstName: user.username, // Using username as name placeholder
      expiresAt,
    });
  }

  async resetPassword(
    tokenOrCommand: string | { token: string; password: string },
    newPassword?: string
  ): Promise<void> {
    if (typeof tokenOrCommand === 'object') {
      const command = tokenOrCommand;
      return this.resetPasswordInternal(command.token, command.password);
    } else {
      const token = tokenOrCommand as string;
      return this.resetPasswordInternal(token, newPassword!);
    }
  }

  private async resetPasswordInternal(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRecord = await (this.userRepository as any).findResetTokenByHash(tokenHash);

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw createIamError('IAM-AUTH-006'); // token invalid/expired
    }

    const user = await this.userRepository.findById(tokenRecord.userId);
    if (!user) {
      throw createIamError('IAM-AUTH-001');
    }

    const policy = await this.securityPolicyRepository.get();
    const passwordHistory = await this.passwordHistoryRepository.findRecentN(
      user.id,
      policy.passwordHistoryCount
    );

    const passwordPolicy = new PasswordPolicy({
      minLength: policy.passwordMinLength,
      requireUppercase: policy.passwordRequireUppercase,
      requireLowercase: policy.passwordRequireLowercase,
      requireNumbers: policy.passwordRequireNumbers,
      requireSpecial: policy.passwordRequireSpecial,
      historyCount: policy.passwordHistoryCount,
    });

    if (!passwordPolicy.isCompliant(newPassword)) {
      throw createIamError('IAM-VAL-005');
    }

    const isReused = await passwordPolicy.isReused(
      newPassword,
      passwordHistory.map((h) => h.passwordHash)
    );
    if (isReused) {
      throw createIamError('IAM-VAL-009');
    }

    const newHash = await passwordPolicy.hash(newPassword);

    // Save updated password
    await (this.userRepository as any).updatePassword(user.id, newHash);
    await this.passwordHistoryRepository.append({
      id: crypto.randomUUID() as Uuid,
      userId: user.id,
      passwordHash: newHash,
      createdAt: new Date(),
    });

    // Mark token used
    await (this.userRepository as any).markResetTokenAsUsed(tokenHash);

    // Revoke all sessions
    await this.sessionRepository.revokeAllForUser(user.id);

    // If locked, activate/unlock
    if (user.status === 'Locked') {
      user.status = 'Active';
      user.failedLoginCount = 0;
      user.lockedUntil = null;
      await this.userRepository.update(user);
    }

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: user.id,
      performedAt: new Date(),
      entityType: 'User',
      entityId: user.id,
      action: 'iam.user.password-reset-completed',
      oldValue: null,
      newValue: null,
      ipAddress: null,
      userAgent: null,
      branchId: user.defaultBranchId,
      correlationId: null,
      reason: null,
    });
  }

  async changePassword(
    userIdOrCommand: Uuid | { currentPassword: string; newPassword: string },
    currentPasswordOrSession: string | Session,
    newPassword?: string
  ): Promise<any> {
    if (typeof userIdOrCommand === 'object') {
      const command = userIdOrCommand;
      const session = currentPasswordOrSession as Session;
      
      await this.changePasswordInternal(session.userId as Uuid, command.currentPassword, command.newPassword);
      
      const nextSession: Session = {
        ...session,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };
      const sessionToken = await encodeSession(nextSession);
      return { sessionToken, session: nextSession };
    } else {
      const userId = userIdOrCommand as Uuid;
      const currentPassword = currentPasswordOrSession as string;
      return this.changePasswordInternal(userId, currentPassword, newPassword!);
    }
  }

  private async changePasswordInternal(
    userId: Uuid,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw createIamError('IAM-AUTH-001');
    }

    const passwordHash = await (this.userRepository as any).getPasswordHash(user.id);
    if (!passwordHash) {
      throw createIamError('IAM-AUTH-001');
    }

    const policy = await this.securityPolicyRepository.get();
    const passwordPolicy = new PasswordPolicy({
      minLength: policy.passwordMinLength,
      requireUppercase: policy.passwordRequireUppercase,
      requireLowercase: policy.passwordRequireLowercase,
      requireNumbers: policy.passwordRequireNumbers,
      requireSpecial: policy.passwordRequireSpecial,
      historyCount: policy.passwordHistoryCount,
    });

    const isMatch = await passwordPolicy.verify(passwordHash, currentPassword);
    if (!isMatch) {
      throw createIamError('IAM-AUTH-001');
    }

    if (!passwordPolicy.isCompliant(newPassword)) {
      throw createIamError('IAM-VAL-005');
    }

    const passwordHistory = await this.passwordHistoryRepository.findRecentN(
      user.id,
      policy.passwordHistoryCount
    );
    const isReused = await passwordPolicy.isReused(
      newPassword,
      passwordHistory.map((h) => h.passwordHash)
    );
    if (isReused) {
      throw createIamError('IAM-VAL-009');
    }

    const newHash = await passwordPolicy.hash(newPassword);

    await (this.userRepository as any).updatePassword(user.id, newHash);
    await this.passwordHistoryRepository.append({
      id: crypto.randomUUID() as Uuid,
      userId: user.id,
      passwordHash: newHash,
      createdAt: new Date(),
    });

    // Revoke other sessions
    await this.sessionRepository.revokeAllForUser(user.id);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: user.id,
      performedAt: new Date(),
      entityType: 'User',
      entityId: user.id,
      action: 'iam.user.password-changed',
      oldValue: null,
      newValue: null,
      ipAddress: null,
      userAgent: null,
      branchId: user.defaultBranchId,
      correlationId: null,
      reason: null,
    });
  }
}
