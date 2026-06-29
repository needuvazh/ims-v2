import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';

export const permissionTypeSchema = z.enum(['Module', 'Menu', 'Action', 'Report']);
export type PermissionType = z.infer<typeof permissionTypeSchema>;

export const permissionStatusSchema = z.enum(['Active', 'Archived']);
export type PermissionStatus = z.infer<typeof permissionStatusSchema>;

export interface Permission {
  id: Uuid;
  permissionCode: string;
  permissionName: string;
  permissionType: PermissionType;
  description: string | null;
  status: PermissionStatus;
  moduleCode?: string;
  featureCode?: string;
  actionCode?: string;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  isDeleted: boolean;
}

export const createPermissionCommandSchema = z.object({
  permissionCode: z.string().trim().toLowerCase().min(3).max(200),
  permissionName: z.string().trim().min(3).max(200),
  permissionType: permissionTypeSchema,
  description: z.string().trim().nullable().optional(),
});

export const updatePermissionCommandSchema = z.object({
  permissionName: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().nullable().optional(),
});

export type CreatePermissionCommand = z.infer<typeof createPermissionCommandSchema>;
export type UpdatePermissionCommand = z.infer<typeof updatePermissionCommandSchema>;
