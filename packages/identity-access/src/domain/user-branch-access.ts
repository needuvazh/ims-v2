import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';

export const userBranchAccessStatusSchema = z.enum(['Active', 'Revoked']);
export type UserBranchAccessStatus = z.infer<typeof userBranchAccessStatusSchema>;

export interface UserBranchAccess {
  id: Uuid;
  userId: Uuid;
  branchId: Uuid;
  isDefault: boolean;
  includeChildBranches: boolean;
  consolidatedVisibility: boolean;
  status: UserBranchAccessStatus;
  revokedAt: Date | null;
  revokedBy: string | null;
  reason: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export const assignBranchCommandSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid(),
  isDefault: z.boolean().optional().default(false),
  includeChildBranches: z.boolean().optional().default(false),
  consolidatedVisibility: z.boolean().optional().default(false),
  reason: z.string().trim().nullable().optional(),
});

export type AssignBranchCommand = z.infer<typeof assignBranchCommandSchema>;
