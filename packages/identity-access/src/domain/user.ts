import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';

export const userStatusSchema = z.enum([
  'PendingActivation',
  'Active',
  'Locked',
  'Suspended',
  'Archived',
]);
export type UserStatus = z.infer<typeof userStatusSchema>;

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

export interface Person {
  id: Uuid;
  firstName: string;
  lastName: string;
  mobile: string;
  nationalId?: string | null;
  nationality?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
}

export interface User {
  id: Uuid;
  personId: Uuid;
  username: string;
  email: string;
  userType: UserType;
  status: UserStatus;
  defaultBranchId: Uuid | null;
  preferredLanguage: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
  passwordChangedAt: Date | null;
  version: number;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  isDeleted: boolean;
  updatedAt?: Date | null;
  updatedBy?: Uuid | null;
}

// Password Complexity is governed by PasswordPolicy, but we can have a basic Zod schema as validation guard.
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters long');

export const createUserCommandSchema = z.object({
  firstName: z.string().trim().min(2).max(100).optional(),
  lastName: z.string().trim().min(2).max(100).optional(),
  mobile: z.string().trim().regex(/^\+?[0-9\-\s]{8,20}$/, 'Invalid mobile phone format').optional(),
  nationalId: z.string().trim().nullable().optional(),
  nationality: z.string().trim().nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  gender: z.string().trim().nullable().optional(),
  
  // Legacy fields
  fullName: z.string().trim().optional(),
  phone: z.string().trim().nullable().optional(),

  email: z.string().trim().email().toLowerCase(),
  userType: userTypeSchema,
  password: passwordSchema.optional(), // If not provided, a random temporary password can be generated
  roleIds: z.array(z.string().uuid()).min(1, 'At least one role is required'),
  branchIds: z.array(z.string().uuid()).min(1, 'At least one branch access is required'),
  defaultBranchId: z.string().uuid().nullable().optional(),
  preferredLanguage: z.string().default('en').optional(),
  
  // Extra legacy fields
  status: z.string().optional(),
  assignedOnly: z.boolean().optional(),
  effectiveStartDate: z.coerce.date().nullable().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
});

export const updateUserCommandSchema = z.object({
  firstName: z.string().trim().min(2).max(100).optional(),
  lastName: z.string().trim().min(2).max(100).optional(),
  mobile: z.string().trim().regex(/^\+?[0-9\-\s]{8,20}$/).optional(),
  nationalId: z.string().trim().nullable().optional(),
  nationality: z.string().trim().nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  gender: z.string().trim().nullable().optional(),
  
  // Legacy fields
  fullName: z.string().trim().optional(),
  phone: z.string().trim().nullable().optional(),

  userType: userTypeSchema.optional(),
  defaultBranchId: z.string().uuid().nullable().optional(),
  preferredLanguage: z.string().optional(),

  // Legacy fields
  effectiveStartDate: z.coerce.date().nullable().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  status: z.string().optional(),
  branchIds: z.array(z.string().uuid()).optional(),
  assignedOnly: z.boolean().optional(),
});

export type CreateUserCommand = z.infer<typeof createUserCommandSchema>;
export type UpdateUserCommand = z.infer<typeof updateUserCommandSchema>;

export type UserListFilters = {
  status?: UserStatus;
  userType?: string;
  branchId?: string;
  roleId?: string;
  search?: string;
};
