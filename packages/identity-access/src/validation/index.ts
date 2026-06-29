import { z } from 'zod';
import {
  createUserCommandSchema,
  updateUserCommandSchema,
} from '../domain/user';
import {
  createRoleCommandSchema,
  updateRoleCommandSchema,
} from '../domain/role';
import {
  createPermissionCommandSchema,
  updatePermissionCommandSchema,
  permissionTypeSchema,
} from '../domain/permission';
import { updateSecurityPolicyCommandSchema } from '../domain/security-policy';
import { PasswordPolicy, DEFAULT_PASSWORD_POLICY_CONFIG } from '../domain/password-policy';

const passwordPolicy = new PasswordPolicy(DEFAULT_PASSWORD_POLICY_CONFIG);

export const LoginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Invalid password format' }),
  rememberMe: z.boolean().optional(),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email format' }),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Reset token is required' }),
  newPassword: z.string().min(1, { message: 'Invalid password format' }).refine((value) => passwordPolicy.isCompliant(value), {
    message: 'Invalid password format',
  }),
  confirmPassword: z.string().min(1, { message: 'Passwords do not match' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: z.string().min(1, { message: 'Invalid password format' }).refine((value) => passwordPolicy.isCompliant(value), {
    message: 'Invalid password format',
  }),
  confirmPassword: z.string().min(1, { message: 'Passwords do not match' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const CreateUserSchema = createUserCommandSchema;
export const UpdateUserSchema = updateUserCommandSchema;
export const CreateRoleSchema = createRoleCommandSchema;
export const UpdateRoleSchema = updateRoleCommandSchema;
export const CreatePermissionSchema = createPermissionCommandSchema;
export const UpdatePermissionSchema = updatePermissionCommandSchema;

export const AssignBranchSchema = z.object({
  branchId: z.string().uuid({ message: 'Branch required' }),
  isDefault: z.boolean().optional(),
});

export const SwitchBranchSchema = z.object({
  branchId: z.string().uuid({ message: 'Branch required' }),
});

export const UpdateSecurityPolicySchema = updateSecurityPolicyCommandSchema;

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const AuditListFilterSchema = z.object({
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  performerId: z.string().trim().optional(),
  module: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export { permissionTypeSchema };
