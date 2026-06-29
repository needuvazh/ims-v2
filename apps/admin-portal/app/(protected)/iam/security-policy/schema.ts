import { z } from 'zod';

export const securityPolicyFormSchema = z.object({
  maxFailedAttempts: z.coerce.number().int().positive(),
  lockoutDurationMinutes: z.coerce.number().int().positive(),
  passwordMinLength: z.coerce.number().int().positive(),
  passwordRequireUppercase: z.coerce.boolean(),
  passwordRequireLowercase: z.coerce.boolean(),
  passwordRequireNumbers: z.coerce.boolean(),
  passwordRequireSpecial: z.coerce.boolean(),
  passwordHistoryCount: z.coerce.number().int().nonnegative(),
  passwordExpiryDays: z.coerce.number().int().positive(),
  resetTokenExpiryMinutes: z.coerce.number().int().positive(),
  accessTokenExpiryMinutes: z.coerce.number().int().positive(),
  refreshTokenExpiryDays: z.coerce.number().int().positive(),
  rememberMeRefreshTokenDays: z.coerce.number().int().positive(),
  sessionInactivityMinutes: z.coerce.number().int().positive(),
  maxConcurrentSessions: z.coerce.number().int().positive(),
});

export type SecurityPolicyFormValues = z.infer<typeof securityPolicyFormSchema>;
