import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';

export interface SecurityPolicy {
  id: Uuid;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecial: boolean;
  passwordHistoryCount: number;
  passwordExpiryDays: number;
  resetTokenExpiryMinutes: number;
  accessTokenExpiryMinutes: number;
  refreshTokenExpiryDays: number;
  rememberMeRefreshTokenDays: number;
  sessionInactivityMinutes: number;
  maxConcurrentSessions: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  id: '00000000-0000-0000-0000-000000000000' as Uuid,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  passwordMinLength: 12,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecial: true,
  passwordHistoryCount: 10,
  passwordExpiryDays: 90,
  resetTokenExpiryMinutes: 15,
  accessTokenExpiryMinutes: 15,
  refreshTokenExpiryDays: 7,
  rememberMeRefreshTokenDays: 30,
  sessionInactivityMinutes: 30,
  maxConcurrentSessions: 3,
  createdAt: new Date(0),
  updatedAt: null,
};

export function createDefaultSecurityPolicy(): SecurityPolicy {
  return { ...DEFAULT_SECURITY_POLICY };
}

export const updateSecurityPolicyCommandSchema = z.object({
  maxFailedAttempts: z.number().int().positive(),
  lockoutDurationMinutes: z.number().int().positive(),
  passwordMinLength: z.number().int().positive(),
  passwordRequireUppercase: z.boolean(),
  passwordRequireLowercase: z.boolean(),
  passwordRequireNumbers: z.boolean(),
  passwordRequireSpecial: z.boolean(),
  passwordHistoryCount: z.number().int().nonnegative(),
  passwordExpiryDays: z.number().int().positive(),
  resetTokenExpiryMinutes: z.number().int().positive(),
  accessTokenExpiryMinutes: z.number().int().positive(),
  refreshTokenExpiryDays: z.number().int().positive(),
  rememberMeRefreshTokenDays: z.number().int().positive(),
  sessionInactivityMinutes: z.number().int().positive(),
  maxConcurrentSessions: z.number().int().positive(),
});

export type UpdateSecurityPolicyCommand = z.infer<typeof updateSecurityPolicyCommandSchema>;
