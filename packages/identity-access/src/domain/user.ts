import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';

/** Mirrors the DB UserStatus enum. */
export type UserStatus = 'Draft' | 'Active' | 'Inactive' | 'Locked';

/**
 * Validated user type discriminant.
 * Values must match the DB `userType` column and seed data.
 * Extend this enum when new staff roles are introduced.
 */
export const userTypeSchema = z.enum([
  'Admin',
  'BranchManager',
  'Counselor',
  'Trainer',
  'Accountant',
  'Student',
  'AcademicCoordinator',
  'Management',
  'Owner',
]);
export type UserType = z.infer<typeof userTypeSchema>;

export type UserProfile = {
  id: Uuid;
  fullName: string;
  email: string;
  phone: string | null;
  /** Validated discriminant — use userTypeSchema for parsing untrusted input. */
  userType: UserType;
  status: UserStatus;
  effectiveStartDate?: Date;
  effectiveEndDate?: Date | null;
};

import type { UserDataScopeDto } from '@ims/shared-auth';

/** Credentials + loaded roles/permissions — NEVER leave the server. */
export type UserWithCredentials = UserProfile & {
  passwordHash: string;
  roles: string[];        // role codes
  permissions: string[];  // permission codes
  dataScopes: UserDataScopeDto[];
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
};

// Password Complexity: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const createUserCommandSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().nullable().optional(),
  userType: userTypeSchema,
  password: passwordSchema,
  roleIds: z.array(z.string().uuid()).default([]),
  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
});

export const updateUserCommandSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
  phone: z.string().trim().nullable().optional(),
  userType: userTypeSchema.optional(),
  status: z.enum(['Draft', 'Active', 'Inactive', 'Locked']).optional(),
  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
});

export const changePasswordCommandSchema = z.object({
  userId: z.string().uuid(),
  newPassword: passwordSchema,
});

export const signInCommandSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export const requestResetCommandSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const resetPasswordCommandSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export type CreateUserCommand = z.infer<typeof createUserCommandSchema>;
export type UpdateUserCommand = z.infer<typeof updateUserCommandSchema>;
export type ChangePasswordCommand = z.infer<typeof changePasswordCommandSchema>;
export type SignInCommand = z.infer<typeof signInCommandSchema>;
export type RequestResetCommand = z.infer<typeof requestResetCommandSchema>;
export type ResetPasswordCommand = z.infer<typeof resetPasswordCommandSchema>;

export type UserListFilters = {
  status?: UserStatus;
  userType?: string;
  search?: string;
};
