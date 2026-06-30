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
  legalNameEnglish: string | null;
  legalNameArabic: string | null;
  tradeName: string | null;
  shortName: string | null;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
  currency: string | null;
  timezone: string | null;
  language: string | null;
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
  legalNameEnglish: z.string().trim().max(255).nullable().optional(),
  legalNameArabic: z.string().trim().max(255).nullable().optional(),
  tradeName: z.string().trim().max(255).nullable().optional(),
  shortName: z.string().trim().max(100).nullable().optional(),
  effectiveStartDate: z.coerce.date().nullable().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  currency: z.string().trim().max(10).nullable().optional(),
  timezone: z.string().trim().max(50).nullable().optional(),
  language: z.string().trim().max(10).nullable().optional(),
}).refine(
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

export const updateInstituteCommandSchema = z.object({
  instituteName: z.string().trim().min(2).max(255).optional(),
  registrationNumber: z.string().trim().nullable().optional(),
  taxNumber: z.string().trim().nullable().optional(),
  primaryEmail: z.string().trim().email().nullable().optional(),
  primaryPhone: z.string().trim().nullable().optional(),
  website: z.string().trim().url().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
  legalNameEnglish: z.string().trim().max(255).nullable().optional(),
  legalNameArabic: z.string().trim().max(255).nullable().optional(),
  tradeName: z.string().trim().max(255).nullable().optional(),
  shortName: z.string().trim().max(100).nullable().optional(),
  effectiveStartDate: z.coerce.date().nullable().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  currency: z.string().trim().max(10).nullable().optional(),
  timezone: z.string().trim().max(50).nullable().optional(),
  language: z.string().trim().max(10).nullable().optional(),
  status: statusSchema.optional(),
}).refine(
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

export type CreateInstituteCommand = z.infer<typeof createInstituteCommandSchema>;
export type UpdateInstituteCommand = z.infer<typeof updateInstituteCommandSchema>;

// ─── Branch ──────────────────────────────────────────────────────────────────

export const branchStatusSchema = z.enum([
  'Draft',
  'Configured',
  'Active',
  'UnderMaintenance',
  'Suspended',
  'Closed',
  'Archived',
]);
export type BranchStatus = z.infer<typeof branchStatusSchema>;

export type Branch = {
  id: BranchId;
  instituteId: Uuid;
  parentBranchId: string | null;
  branchCode: string;
  branchName: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  branchManagerId: string | null;
  status: BranchStatus;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
  contacts?: BranchContact[];
  addresses?: BranchAddress[];
  settings?: BranchSettings;
  policies?: BranchPolicy[];
};

export type BranchContact = {
  id: Uuid;
  branchId: BranchId;
  contactType: string;
  contactValue: string;
  isPrimary: boolean;
};

export type BranchAddress = {
  id: Uuid;
  branchId: BranchId;
  building: string | null;
  street: string | null;
  city: string | null;
  governorate: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
};

export type BranchSettings = {
  id: Uuid;
  branchId: BranchId;
  currency: string | null;
  timezone: string | null;
  weekStartDay: string | null;
  workingCalendar: string | null;
};

export type BranchPolicy = {
  id: Uuid;
  branchId: BranchId;
  policyType: string;
  policyContent: string | null;
};

export const branchContactSchema = z.object({
  id: z.string().uuid().optional(),
  contactType: z.string().trim().min(1).max(50),
  contactValue: z.string().trim().min(1).max(255),
  isPrimary: z.boolean().default(false),
});

export const branchAddressSchema = z.object({
  id: z.string().uuid().optional(),
  building: z.string().trim().max(100).nullable().optional(),
  street: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  governorate: z.string().trim().max(100).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().max(30).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  mapUrl: z.string().trim().url().max(1000).nullable().optional(),
});

export const branchSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  currency: z.string().trim().max(10).nullable().optional(),
  timezone: z.string().trim().max(50).nullable().optional(),
  weekStartDay: z.string().trim().max(20).nullable().optional(),
  workingCalendar: z.string().trim().max(100).nullable().optional(),
});

export const branchPolicySchema = z.object({
  id: z.string().uuid().optional(),
  policyType: z.string().trim().min(1).max(50),
  policyContent: z.string().trim().nullable().optional(),
});

const branchBaseSchema = z.object({
  instituteId: z.string().uuid(),
  parentBranchId: z.string().uuid().nullable().optional(),
  branchCode: z.string().trim().min(2).max(50),
  branchName: z.string().trim().min(2).max(200),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  branchManagerId: z.string().uuid().nullable().optional(),
  status: branchStatusSchema.optional(),
  effectiveStartDate: z.coerce.date().nullable().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  contacts: z.array(branchContactSchema).optional(),
  addresses: z.array(branchAddressSchema).optional(),
  settings: branchSettingsSchema.optional(),
  policies: z.array(branchPolicySchema).optional(),
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
  status: RecordStatus | BranchStatus;
  children?: OrganizationHierarchyNode[];
};

export interface UserPresenceVerifier {
  isActiveUser(userId: string): Promise<boolean>;
  hasBranchAccess(userId: string, branchId: string): Promise<boolean>;
}

export interface ClassroomUsageVerifier {
  getActiveEnrollmentSize(classroomId: string): Promise<number>;
}

export interface BranchDependencyChecker {
  hasActiveDependencies(branchId: string): Promise<boolean>;
}


