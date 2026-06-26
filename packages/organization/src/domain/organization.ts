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
  taxNumber: string | null;
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
  taxNumber: z.string().trim().nullable().optional(),
  primaryEmail: z.string().trim().email().nullable().optional(),
  primaryPhone: z.string().trim().nullable().optional(),
  website: z.string().trim().url().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
});

export const updateInstituteCommandSchema = createInstituteCommandSchema
  .omit({ instituteCode: true })
  .extend({ status: statusSchema.optional() })
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
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
};

const branchBaseSchema = z.object({
  instituteId: z.string().uuid(),
  branchCode: z.string().trim().min(2).max(50),
  branchName: z.string().trim().min(2).max(200),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  branchManagerId: z.string().uuid().nullable().optional(),
  status: statusSchema.optional(),
  effectiveStartDate: z.coerce.date().nullable().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
});

export const createBranchCommandSchema = branchBaseSchema.refine(
  (data) => {
    if (data.effectiveStartDate && data.effectiveEndDate) {
      return new Date(data.effectiveEndDate) >= new Date(data.effectiveStartDate);
    }
    return true;
  },
  {
    message: 'Effective end date must be after or equal to effective start date',
    path: ['effectiveEndDate'],
  }
);

export const updateBranchCommandSchema = branchBaseSchema
  .omit({ instituteId: true, branchCode: true })
  .partial()
  .refine(
    (data) => {
      if (data.effectiveStartDate && data.effectiveEndDate) {
        return new Date(data.effectiveEndDate) >= new Date(data.effectiveStartDate);
      }
      return true;
    },
    {
      message: 'Effective end date must be after or equal to effective start date',
      path: ['effectiveEndDate'],
    }
  );

export type CreateBranchCommand = z.infer<typeof createBranchCommandSchema>;
export type UpdateBranchCommand = z.infer<typeof updateBranchCommandSchema>;

// ─── Department ──────────────────────────────────────────────────────────────

export type Department = {
  id: Uuid;
  branchId: BranchId;
  departmentCode: string;
  departmentName: string;
  departmentHeadId: string | null;
  description: string | null;
  status: RecordStatus;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
};

const departmentBaseSchema = z.object({
  branchId: z.string().uuid(),
  departmentCode: z.string().trim().min(2).max(50),
  departmentName: z.string().trim().min(2).max(200),
  departmentHeadId: z.string().uuid().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  status: statusSchema.optional(),
  effectiveStartDate: z.coerce.date().nullable().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
});

export const createDepartmentCommandSchema = departmentBaseSchema.refine(
  (data) => {
    if (data.effectiveStartDate && data.effectiveEndDate) {
      return new Date(data.effectiveEndDate) >= new Date(data.effectiveStartDate);
    }
    return true;
  },
  {
    message: 'Effective end date must be after or equal to effective start date',
    path: ['effectiveEndDate'],
  }
);

export const updateDepartmentCommandSchema = departmentBaseSchema
  .omit({ branchId: true, departmentCode: true })
  .partial()
  .refine(
    (data) => {
      if (data.effectiveStartDate && data.effectiveEndDate) {
        return new Date(data.effectiveEndDate) >= new Date(data.effectiveStartDate);
      }
      return true;
    },
    {
      message: 'Effective end date must be after or equal to effective start date',
      path: ['effectiveEndDate'],
    }
  );

export type CreateDepartmentCommand = z.infer<typeof createDepartmentCommandSchema>;
export type UpdateDepartmentCommand = z.infer<typeof updateDepartmentCommandSchema>;

// ─── Classroom ───────────────────────────────────────────────────────────────

export type Classroom = {
  id: Uuid;
  branchId: BranchId;
  classroomName: string;
  capacity: number;
  location: string | null;
  status: RecordStatus;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
};

const classroomBaseSchema = z.object({
  branchId: z.string().uuid(),
  classroomName: z.string().trim().min(2).max(150),
  capacity: z.number().int().positive(),
  location: z.string().trim().nullable().optional(),
  status: statusSchema.optional(),
  effectiveStartDate: z.coerce.date().nullable().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
});

export const createClassroomCommandSchema = classroomBaseSchema.refine(
  (data) => {
    if (data.effectiveStartDate && data.effectiveEndDate) {
      return new Date(data.effectiveEndDate) >= new Date(data.effectiveStartDate);
    }
    return true;
  },
  {
    message: 'Effective end date must be after or equal to effective start date',
    path: ['effectiveEndDate'],
  }
);

export const updateClassroomCommandSchema = classroomBaseSchema
  .omit({ branchId: true })
  .partial()
  .refine(
    (data) => {
      if (data.effectiveStartDate && data.effectiveEndDate) {
        return new Date(data.effectiveEndDate) >= new Date(data.effectiveStartDate);
      }
      return true;
    },
    {
      message: 'Effective end date must be after or equal to effective start date',
      path: ['effectiveEndDate'],
    }
  );

export type CreateClassroomCommand = z.infer<typeof createClassroomCommandSchema>;
export type UpdateClassroomCommand = z.infer<typeof updateClassroomCommandSchema>;

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

// ─── Hierarchy ───────────────────────────────────────────────────────────────

export type OrganizationHierarchyNode = {
  id: string;
  name: string;
  type: 'Institute' | 'Branch' | 'Department' | 'Classroom';
  code?: string;
  status: RecordStatus;
  children?: OrganizationHierarchyNode[];
};

export interface UserPresenceVerifier {
  isActiveUser(userId: string): Promise<boolean>;
}


