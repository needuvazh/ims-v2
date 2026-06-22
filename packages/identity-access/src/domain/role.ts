import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';

export type RoleStatus = 'Draft' | 'Active' | 'Inactive' | 'Archived';

export type RoleRecord = {
  id: Uuid;
  roleCode: string;
  roleName: string;
  description: string | null;
  status: RoleStatus;
  effectiveStartDate?: Date;
  effectiveEndDate?: Date | null;
  permissions: PermissionRecord[];
};

export type PermissionRecord = {
  id: Uuid;
  moduleCode: string;
  featureCode: string;
  actionCode: string;
  permissionCode: string;
  description: string | null;
  status: string;
};

export const createRoleCommandSchema = z.object({
  roleCode: z.string().trim().min(2).max(100).toUpperCase(),
  roleName: z.string().trim().min(2).max(150),
  description: z.string().trim().nullable().optional(),
  permissionIds: z.array(z.string().uuid()).default([]),
  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
});

export const updateRoleCommandSchema = z.object({
  roleName: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().nullable().optional(),
  status: z.enum(['Draft', 'Active', 'Inactive', 'Archived']).optional(),
  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
});

export type CreateRoleCommand = z.infer<typeof createRoleCommandSchema>;
export type UpdateRoleCommand = z.infer<typeof updateRoleCommandSchema>;

/** Seed permission definitions by module. */
export const systemPermissions = [
  // Organization
  { moduleCode: 'organization', featureCode: 'institute',  actionCode: 'manage',  permissionCode: 'organization.manage',         description: 'Manage institutes and branches.' },
  { moduleCode: 'organization', featureCode: 'branch',     actionCode: 'manage',  permissionCode: 'organization.branch.manage',  description: 'Create and update branches.' },
  { moduleCode: 'organization', featureCode: 'department', actionCode: 'manage',  permissionCode: 'organization.department.manage', description: 'Manage departments.' },
  // Identity & Access
  { moduleCode: 'identity', featureCode: 'user',       actionCode: 'read',   permissionCode: 'identity.read',        description: 'View users and roles.' },
  { moduleCode: 'identity', featureCode: 'user',       actionCode: 'write',  permissionCode: 'identity.write',       description: 'Create and update users.' },
  { moduleCode: 'identity', featureCode: 'role',       actionCode: 'manage', permissionCode: 'identity.role.manage', description: 'Manage roles and permissions.' },
  // Dashboard
  { moduleCode: 'dashboard', featureCode: 'summary', actionCode: 'view', permissionCode: 'dashboard.view', description: 'View dashboard summary.' },
  // Certificates
  { moduleCode: 'certificate', featureCode: 'public', actionCode: 'verify', permissionCode: 'certificate.verify', description: 'Verify public certificates.' },
] as const;
