import { describe, expect, it } from 'vitest';
import { PasswordPolicy, DEFAULT_PASSWORD_POLICY_CONFIG } from './password-policy';
import { createIamError } from '../errors/iam-errors';
import { assertRoleArchivable } from './role';
import { assertUserStatusTransition, canTransitionUserStatus } from './user';

describe('IAM domain safeguards', () => {
  it('rejects password reuse within the configured history window', async () => {
    const policy = new PasswordPolicy(DEFAULT_PASSWORD_POLICY_CONFIG);
    const reusedHash = await policy.hash('P@ssword123456');

    await expect(policy.isReused('P@ssword123456', [reusedHash])).resolves.toBe(true);
    await expect(policy.isReused('DifferentP@ss123', [reusedHash])).resolves.toBe(false);
  });

  it('throws a structured error for system-role archive attempts', () => {
    try {
      assertRoleArchivable({ isSystemRole: true });
      throw new Error('Expected IAM-VAL-010');
    } catch (error) {
      const iamError = error as ReturnType<typeof createIamError>;
      expect(iamError.errorCode).toBe('IAM-VAL-010');
      expect(iamError.statusCode).toBe(400);
    }

    const error = createIamError('IAM-VAL-010');

    expect(error.errorCode).toBe('IAM-VAL-010');
    expect(error.statusCode).toBe(400);
    expect(error.messageEn).toBe('Cannot archive a system role');
    expect(error.messageAr).toBe('لا يمكن أرشفة دور النظام');
  });

  it('produces localized IAM errors with stable codes', () => {
    const error = createIamError('IAM-AUTH-008');

    expect(error.errorCode).toBe('IAM-AUTH-008');
    expect(error.messageEn).toBe('Maximum concurrent sessions reached.');
    expect(error.messageAr).toBe('تم الوصول إلى الحد الأقصى للجلسات المتزامنة.');
  });

  it('describes allowed user status transitions', () => {
    expect(canTransitionUserStatus('PendingActivation', 'Active')).toBe(true);
    expect(canTransitionUserStatus('Active', 'Archived')).toBe(true);
    expect(canTransitionUserStatus('Archived', 'Active')).toBe(false);
    expect(() => assertUserStatusTransition('Archived', 'Active')).toThrow('Invalid user status transition from Archived to Active.');
  });
});
