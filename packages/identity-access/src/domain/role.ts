import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';
import { createIamError } from '../errors/iam-errors';

export const roleStatusSchema = z.enum(['Active', 'Archived']);
export type RoleStatus = z.infer<typeof roleStatusSchema>;

export interface Role {
  id: Uuid;
  roleCode: string;
  roleName: string;
  description: string | null;
  status: RoleStatus;
  isSystemRole: boolean;
  version: number;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export function canArchiveRole(role: Pick<Role, 'isSystemRole'>): boolean {
  return !role.isSystemRole;
}

export function assertRoleArchivable(role: Pick<Role, 'isSystemRole'>): void {
  if (!canArchiveRole(role)) {
    throw createIamError('IAM-VAL-010');
  }
}

export const createRoleCommandSchema = z.object({
  roleCode: z.string().trim().min(2).max(100).toUpperCase(),
  roleName: z.string().trim().min(2).max(150),
  description: z.string().trim().nullable().optional(),
  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  
  // Legacy fields
  status: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const updateRoleCommandSchema = z.object({
  roleName: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().nullable().optional(),
  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),

  // Legacy fields
  status: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export type CreateRoleCommand = z.infer<typeof createRoleCommandSchema>;
export type UpdateRoleCommand = z.infer<typeof updateRoleCommandSchema>;
