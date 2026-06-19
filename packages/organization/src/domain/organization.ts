import { z } from 'zod';
import type { BranchId, Uuid } from '@ims/shared-kernel';

export const instituteStatusSchema = z.enum(['Draft', 'Active', 'Inactive', 'Archived']);
export const branchStatusSchema = z.enum(['Draft', 'Active', 'Inactive', 'Archived']);

export type InstituteStatus = z.infer<typeof instituteStatusSchema>;
export type BranchStatus = z.infer<typeof branchStatusSchema>;

export type Institute = {
  id: Uuid;
  instituteCode: string;
  instituteName: string;
  primaryEmail: string | null;
  status: InstituteStatus;
};

export type Branch = {
  id: BranchId;
  instituteId: Uuid;
  branchCode: string;
  branchName: string;
  city: string | null;
  status: BranchStatus;
};

export const createInstituteCommandSchema = z.object({
  instituteCode: z.string().min(2),
  instituteName: z.string().min(2),
  primaryEmail: z.string().email().nullable().optional(),
});

export const createBranchCommandSchema = z.object({
  instituteId: z.string().uuid(),
  branchCode: z.string().min(2),
  branchName: z.string().min(2),
  city: z.string().nullable().optional(),
});

export type CreateInstituteCommand = z.infer<typeof createInstituteCommandSchema>;
export type CreateBranchCommand = z.infer<typeof createBranchCommandSchema>;
