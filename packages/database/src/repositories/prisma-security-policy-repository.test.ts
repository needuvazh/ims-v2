import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createDefaultSecurityPolicy } from '@ims/identity-access';
import { PrismaSecurityPolicyRepository } from './prisma-security-policy-repository';

describe('PrismaSecurityPolicyRepository', () => {
  it('returns the latest policy when one exists', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'policy-1',
      maxFailedAttempts: 7,
      lockoutDurationMinutes: 45,
      passwordMinLength: 14,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: true,
      passwordHistoryCount: 12,
      passwordExpiryDays: 60,
      resetTokenExpiryMinutes: 20,
      accessTokenExpiryMinutes: 10,
      refreshTokenExpiryDays: 14,
      rememberMeRefreshTokenDays: 45,
      sessionInactivityMinutes: 15,
      maxConcurrentSessions: 5,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
    });

    const prisma = {
      securityPolicy: {
        findFirst,
        create: vi.fn(),
      },
    } as unknown as PrismaClient;

    const repository = new PrismaSecurityPolicyRepository(prisma);
    const policy = await repository.get();

    expect(findFirst).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    expect(policy.id).toBe('policy-1');
    expect(policy.passwordMinLength).toBe(14);
  });

  it('creates the default policy when none exists', async () => {
    const create = vi.fn().mockImplementation(async ({ data }: { data: ReturnType<typeof createDefaultSecurityPolicy> }) => data);
    const prisma = {
      securityPolicy: {
        findFirst: vi.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaClient;

    const repository = new PrismaSecurityPolicyRepository(prisma);
    const policy = await repository.get();

    expect(create).toHaveBeenCalledWith({ data: createDefaultSecurityPolicy() });
    expect(policy).toEqual(createDefaultSecurityPolicy());
  });
});
