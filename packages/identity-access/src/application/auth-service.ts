import bcrypt from 'bcryptjs';
import nodeCrypto from 'crypto';
import { encodeSession, type Session } from '@ims/shared-auth';
import { DomainError, type Uuid } from '@ims/shared-kernel';
import type { UserWithCredentials } from '../domain/user';
import {
  signInCommandSchema,
  requestResetCommandSchema,
  resetPasswordCommandSchema,
  type SignInCommand,
  type RequestResetCommand,
  type ResetPasswordCommand,
} from '../domain/user';
import type { AuditLogRepository } from '@ims/audit';
import type { PasswordResetNotificationPort } from '../domain/notification-port';

export interface AuthUserRepository {
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;
  recordLastLogin(userId: string): Promise<void>;
  incrementFailedAttempts(userId: string, lockoutMinutes?: number): Promise<void>;
  resetFailedAttempts(userId: string): Promise<void>;
  updatePasswordAndUnlock(userId: string, passwordHash: string): Promise<void>;
}

export interface AuthSessionRepository {
  createSession(session: {
    userId: string;
    tokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<void>;
  getSessionByHash(tokenHash: string): Promise<{ status: string; expiresAt: Date } | null>;
  revokeSessionByHash(tokenHash: string): Promise<void>;
  revokeAllSessionsForUser(userId: string): Promise<void>;
}

export interface AuthResetTokenRepository {
  createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findActiveTokenByHash(tokenHash: string): Promise<{
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null>;
  markTokenAsUsed(tokenHash: string): Promise<void>;
}

export type SignInResult = {
  sessionToken: string;
  session: Session;
};

/**
 * AuthService — handles credential verification and session issuance.
 * Business rules:
 *  - Inactive or Draft users cannot sign in.
 *  - Locked users cannot sign in (must be unlocked by admin).
 *  - Invalid credentials: always throw a generic error to prevent user enumeration.
 */
export class AuthService {
  constructor(
    private readonly userRepository: AuthUserRepository,
    private readonly sessionRepository: AuthSessionRepository,
    private readonly resetTokenRepository: AuthResetTokenRepository,
    private readonly auditRepository: AuditLogRepository,
    /** Phase 1: inject ConsolePasswordResetPort. Phase 2: inject SMTP/SaaS adapter. */
    private readonly notificationPort?: PasswordResetNotificationPort,
  ) {}

  async requestPasswordReset(command: RequestResetCommand): Promise<void> {
    const validated = requestResetCommandSchema.parse(command);
    const user = await this.userRepository.findByEmailWithCredentials(validated.email);

    // Secure design against user enumeration:
    // Return silently for missing or inactive accounts — never reveal whether an email exists.
    if (!user || user.status === 'Inactive' || user.status === 'Draft') {
      return;
    }

    const rawToken = nodeCrypto.randomBytes(32).toString('hex');
    const tokenHash = nodeCrypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.resetTokenRepository.createToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.auditRepository.append({
      id: crypto.randomUUID() as Uuid,
      actorId: user.id,
      branchId: null,
      action: 'identity.password_reset_requested',
      entityType: 'User',
      entityId: user.id,
      occurredAt: new Date(),
      details: { email: user.email },
    });

    // Deliver the reset link via the injected notification port.
    // The raw token is a secret — only the port implementation may handle it.
    // Never log rawToken here. Never hardcode a base URL here.
    const baseUrl = process.env.RESET_PASSWORD_BASE_URL ?? 'http://localhost:3000';
    await this.notificationPort?.sendPasswordResetLink({
      toEmail: user.email,
      resetUrl: `${baseUrl}/reset-password?token=${rawToken}`,
    });
  }

  async resetPassword(command: ResetPasswordCommand): Promise<void> {
    const validated = resetPasswordCommandSchema.parse(command);
    const tokenHash = nodeCrypto.createHash('sha256').update(validated.token).digest('hex');

    const tokenRecord = await this.resetTokenRepository.findActiveTokenByHash(tokenHash);

    if (!tokenRecord || tokenRecord.usedAt !== null || tokenRecord.expiresAt < new Date()) {
      throw new DomainError('invalid_reset_token', 'Invalid or expired password reset token.');
    }

    const passwordHash = await AuthService.hashPassword(validated.password);
    await this.userRepository.updatePasswordAndUnlock(tokenRecord.userId, passwordHash);
    await this.sessionRepository.revokeAllSessionsForUser(tokenRecord.userId);
    await this.resetTokenRepository.markTokenAsUsed(tokenHash);

    await this.auditRepository.append({
      id: crypto.randomUUID() as Uuid,
      actorId: tokenRecord.userId as Uuid,
      branchId: null,
      action: 'identity.password_reset_completed',
      entityType: 'User',
      entityId: tokenRecord.userId,
      occurredAt: new Date(),
      details: {},
    });
  }

  async signIn(
    command: SignInCommand,
    metadata?: { userAgent?: string | null; ipAddress?: string | null }
  ): Promise<SignInResult> {
    const validated = signInCommandSchema.parse(command);

    const user = await this.userRepository.findByEmailWithCredentials(validated.email);

    // Generic error — do not reveal whether email exists.
    const invalidError = new DomainError('unauthorized', 'Invalid email or password.');

    if (!user) {
      await this.auditRepository.append({
        id: crypto.randomUUID(),
        actorId: null,
        branchId: null,
        action: 'identity.login_failed',
        entityType: 'User',
        entityId: 'unknown',
        occurredAt: new Date(),
        details: { email: validated.email, reason: 'user_not_found' },
      });
      throw invalidError;
    }

    // 1. Check user status (Inactive/Draft)
    if (user.status === 'Inactive' || user.status === 'Draft') {
      await this.auditRepository.append({
        id: crypto.randomUUID(),
        actorId: user.id,
        branchId: null,
        action: 'identity.login_failed',
        entityType: 'User',
        entityId: user.id,
        occurredAt: new Date(),
        details: { email: user.email, reason: `status_${user.status.toLowerCase()}` },
      });
      throw new DomainError('inactive_user_cannot_login', 'Your account is not active. Contact your administrator.');
    }

    // 2. Lockout evaluation
    const now = new Date();
    if (user.status === 'Locked') {
      if (user.lockoutUntil && user.lockoutUntil > now) {
        await this.auditRepository.append({
          id: crypto.randomUUID(),
          actorId: user.id,
          branchId: null,
          action: 'identity.login_failed',
          entityType: 'User',
          entityId: user.id,
          occurredAt: new Date(),
          details: { email: user.email, reason: 'status_locked' },
        });
        throw new DomainError('locked_user_cannot_login', 'Your account is locked. Contact your administrator.');
      }
    }

    // 3. User effective dating range validation
    const userStartDate = user.effectiveStartDate;
    if ((userStartDate && userStartDate > now) || (user.effectiveEndDate && user.effectiveEndDate < now)) {
      await this.auditRepository.append({
        id: crypto.randomUUID(),
        actorId: user.id,
        branchId: null,
        action: 'identity.login_failed',
        entityType: 'User',
        entityId: user.id,
        occurredAt: new Date(),
        details: { email: user.email, reason: 'effective_dating_violation' },
      });
      throw new DomainError('unauthorized', 'Your account is not currently within its active date range.');
    }

    // 4. Password validation and Lockout updates
    const passwordMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!passwordMatch) {
      await this.userRepository.incrementFailedAttempts(user.id);
      await this.auditRepository.append({
        id: crypto.randomUUID(),
        actorId: user.id,
        branchId: null,
        action: 'identity.login_failed',
        entityType: 'User',
        entityId: user.id,
        occurredAt: new Date(),
        details: { email: user.email, reason: 'invalid_password' },
      });
      throw invalidError;
    }

    // 5a. Build the session payload and encode it (pure in-memory, no DB writes yet)
    // Default activeBranchId if user has exactly one branch scope
    let activeBranchId: string | null = null;
    const branchScopes = user.dataScopes.filter((s) => s.scopeType === 'Branch' && s.branchId);
    if (branchScopes.length === 1 && branchScopes[0].branchId) {
      activeBranchId = branchScopes[0].branchId;
    }

    const session: Session = {
      userId: user.id,
      displayName: user.fullName,
      roles: user.roles,
      permissions: user.permissions,
      dataScopes: user.dataScopes,
      activeBranchId,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    };

    const sessionToken = await encodeSession(session);

    // 5b. Persist the session in the DB — this is the point of no return.
    //     If this throws, no user state has been mutated and the caller can safely retry.
    const tokenHash = nodeCrypto.createHash('sha256').update(sessionToken).digest('hex');
    await this.sessionRepository.createSession({
      userId: user.id,
      tokenHash,
      userAgent: metadata?.userAgent ?? null,
      ipAddress: metadata?.ipAddress ?? null,
      expiresAt: new Date(session.expiresAt),
    });

    // 5c. Session committed — now update user state and write audit (best-effort after commit).
    //     Failures here are tolerable: the user has a valid session and can continue working.
    await this.userRepository.resetFailedAttempts(user.id);
    await this.userRepository.recordLastLogin(user.id);

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: user.id,
      branchId: null,
      action: 'identity.login_succeeded',
      entityType: 'User',
      entityId: user.id,
      occurredAt: new Date(),
      details: { email: user.email },
    });

    return { sessionToken, session };
  }

  static async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 12);
  }

  static async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
