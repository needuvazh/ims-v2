import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';

/** Mirrors the DB UserStatus enum. */
export type UserStatus = 'Draft' | 'Active' | 'Inactive' | 'Locked';

export type UserProfile = {
  id: Uuid;
  fullName: string;
  email: string;
  phone: string | null;
  userType: string;
  status: UserStatus;
};

/** Credentials + loaded roles/permissions — NEVER leave the server. */
export type UserWithCredentials = UserProfile & {
  passwordHash: string;
  roles: string[];        // role codes
  permissions: string[];  // permission codes
};

export const createUserCommandSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().nullable().optional(),
  userType: z.string().min(1).max(50),
  password: z.string().min(8),
  roleIds: z.array(z.string().uuid()).default([]),
});

export const updateUserCommandSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
  phone: z.string().trim().nullable().optional(),
  userType: z.string().min(1).max(50).optional(),
  status: z.enum(['Draft', 'Active', 'Inactive', 'Locked']).optional(),
});

export const changePasswordCommandSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8),
});

export const signInCommandSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export type CreateUserCommand = z.infer<typeof createUserCommandSchema>;
export type UpdateUserCommand = z.infer<typeof updateUserCommandSchema>;
export type ChangePasswordCommand = z.infer<typeof changePasswordCommandSchema>;
export type SignInCommand = z.infer<typeof signInCommandSchema>;

export type UserListFilters = {
  status?: UserStatus;
  userType?: string;
  search?: string;
};
