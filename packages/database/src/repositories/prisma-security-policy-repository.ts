import type { PrismaClient } from '@prisma/client';
import type { ISecurityPolicyRepository, SecurityPolicy } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaSecurityPolicyRepository implements ISecurityPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapPolicy(row: any): SecurityPolicy {
    return {
      id: row.id as Uuid,
      maxFailedAttempts: row.maxFailedAttempts,
      lockoutDurationMinutes: row.lockoutDurationMinutes,
      passwordMinLength: row.passwordMinLength,
      passwordRequireUppercase: row.passwordRequireUppercase,
      passwordRequireLowercase: row.passwordRequireLowercase,
      passwordRequireNumbers: row.passwordRequireNumbers,
      passwordRequireSpecial: row.passwordRequireSpecial,
      passwordHistoryCount: row.passwordHistoryCount,
      passwordExpiryDays: row.passwordExpiryDays,
      resetTokenExpiryMinutes: row.resetTokenExpiryMinutes,
      accessTokenExpiryMinutes: row.accessTokenExpiryMinutes,
      refreshTokenExpiryDays: row.refreshTokenExpiryDays,
      rememberMeRefreshTokenDays: row.rememberMeRefreshTokenDays,
      sessionInactivityMinutes: row.sessionInactivityMinutes,
      maxConcurrentSessions: row.maxConcurrentSessions,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async get(): Promise<SecurityPolicy> {
    const row = await this.prisma.securityPolicy.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!row) {
      throw new Error('Default security policy not found. Please seed the database.');
    }
    return this.mapPolicy(row);
  }

  async update(policy: SecurityPolicy): Promise<SecurityPolicy> {
    const row = await this.prisma.securityPolicy.update({
      where: { id: policy.id },
      data: {
        maxFailedAttempts: policy.maxFailedAttempts,
        lockoutDurationMinutes: policy.lockoutDurationMinutes,
        passwordMinLength: policy.passwordMinLength,
        passwordRequireUppercase: policy.passwordRequireUppercase,
        passwordRequireLowercase: policy.passwordRequireLowercase,
        passwordRequireNumbers: policy.passwordRequireNumbers,
        passwordRequireSpecial: policy.passwordRequireSpecial,
        passwordHistoryCount: policy.passwordHistoryCount,
        passwordExpiryDays: policy.passwordExpiryDays,
        resetTokenExpiryMinutes: policy.resetTokenExpiryMinutes,
        accessTokenExpiryMinutes: policy.accessTokenExpiryMinutes,
        refreshTokenExpiryDays: policy.refreshTokenExpiryDays,
        rememberMeRefreshTokenDays: policy.rememberMeRefreshTokenDays,
        sessionInactivityMinutes: policy.sessionInactivityMinutes,
        maxConcurrentSessions: policy.maxConcurrentSessions,
      },
    });
    return this.mapPolicy(row);
  }
}
