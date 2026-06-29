import crypto from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAuditLogRepository } from '@ims/audit';
import { createDefaultSecurityPolicy } from '../domain/security-policy';
import type { IAuditLogRepository, ISecurityPolicyRepository, SecurityPolicy } from '../domain/repositories';
import { SecurityPolicyService } from './security-policy-service';

describe('SecurityPolicyService', () => {
  let service: SecurityPolicyService;
  let repo: ISecurityPolicyRepository;
  let auditRepo: IAuditLogRepository;

  let policy: SecurityPolicy;

  beforeEach(() => {
    policy = {
      ...createDefaultSecurityPolicy(),
      id: crypto.randomUUID() as never,
    };

    repo = {
      get: async () => policy,
      update: async (nextPolicy) => {
        policy = nextPolicy;
        return nextPolicy;
      },
    };

    auditRepo = new InMemoryAuditLogRepository();
    service = new SecurityPolicyService(repo, auditRepo);
  });

  it('returns the current policy with read permission', async () => {
    const result = await service.getSecurityPolicy({ actorId: crypto.randomUUID() as never, actorPermissions: ['iam.security-policy.read'], activeBranchId: null });
    expect(result.id).toBe(policy.id);
    expect(result.maxConcurrentSessions).toBe(3);
  });

  it('updates the policy and records audit', async () => {
    const result = await service.updateSecurityPolicy({ maxFailedAttempts: 7, lockoutDurationMinutes: 45, passwordMinLength: 14, passwordRequireUppercase: true, passwordRequireLowercase: true, passwordRequireNumbers: true, passwordRequireSpecial: true, passwordHistoryCount: 12, passwordExpiryDays: 60, resetTokenExpiryMinutes: 20, accessTokenExpiryMinutes: 10, refreshTokenExpiryDays: 14, rememberMeRefreshTokenDays: 45, sessionInactivityMinutes: 15, maxConcurrentSessions: 5 }, { actorId: crypto.randomUUID() as never, actorPermissions: ['iam.security-policy.update'], activeBranchId: null });

    expect(result.maxFailedAttempts).toBe(7);
    expect(result.maxConcurrentSessions).toBe(5);
    expect(auditRepo.list().some((entry) => entry.action === 'iam.security-policy.updated')).toBe(true);
  });

  it('rejects missing permission', async () => {
    await expect(service.getSecurityPolicy({ actorId: crypto.randomUUID() as never, actorPermissions: [], activeBranchId: null })).rejects.toMatchObject({ errorCode: 'IAM-AUTHZ-001' });
  });
});
