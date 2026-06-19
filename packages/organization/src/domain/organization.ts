import { z } from 'zod';
import type { BranchId, Uuid } from '@ims/shared-kernel';

export const statusSchema = z.enum(['Draft', 'Active', 'Inactive', 'Archived']);
export type RecordStatus = z.infer<typeof statusSchema>;

// ─── Institute ───────────────────────────────────────────────────────────────

export type Institute = {
  id: Uuid;
  instituteCode: string;
  instituteName: string;
  registrationNumber: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  status: RecordStatus;
};

export const createInstituteCommandSchema = z.object({
  instituteCode: z.string().trim().min(2).max(50),
  instituteName: z.string().trim().min(2).max(255),
  registrationNumber: z.string().trim().nullable().optional(),
  primaryEmail: z.string().trim().email().nullable().optional(),
  primaryPhone: z.string().trim().nullable().optional(),
  website: z.string().trim().url().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
});

export const updateInstituteCommandSchema = createInstituteCommandSchema
  .omit({ instituteCode: true })
  .partial();

export type CreateInstituteCommand = z.infer<typeof createInstituteCommandSchema>;
export type UpdateInstituteCommand = z.infer<typeof updateInstituteCommandSchema>;

// ─── Branch ──────────────────────────────────────────────────────────────────

export type Branch = {
  id: BranchId;
  instituteId: Uuid;
  branchCode: string;
  branchName: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  branchManagerId: string | null;
  status: RecordStatus;
};

export const createBranchCommandSchema = z.object({
  instituteId: z.string().uuid(),
  branchCode: z.string().trim().min(2).max(50),
  branchName: z.string().trim().min(2).max(200),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
});

export const updateBranchCommandSchema = createBranchCommandSchema
  .omit({ instituteId: true, branchCode: true })
  .partial();

export type CreateBranchCommand = z.infer<typeof createBranchCommandSchema>;
export type UpdateBranchCommand = z.infer<typeof updateBranchCommandSchema>;

// ─── Department ──────────────────────────────────────────────────────────────

export type Department = {
  id: Uuid;
  branchId: BranchId;
  departmentCode: string;
  departmentName: string;
  description: string | null;
  status: RecordStatus;
};

export const createDepartmentCommandSchema = z.object({
  branchId: z.string().uuid(),
  departmentCode: z.string().trim().min(2).max(50),
  departmentName: z.string().trim().min(2).max(200),
  description: z.string().trim().nullable().optional(),
});

export type CreateDepartmentCommand = z.infer<typeof createDepartmentCommandSchema>;

// ─── Pagination ──────────────────────────────────────────────────────────────

export type ListFilters = {
  status?: RecordStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
