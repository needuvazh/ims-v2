export interface CourseCategory {
  id: string;
  code: string;
  nameEnglish: string;
  nameArabic: string;
  description?: string | null;
  parentCategoryId?: string | null;
  status: string;
  version: number;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}

export interface Course {
  id: string;
  courseCode: string;
  nameEnglish: string;
  nameArabic: string;
  descriptionEnglish?: string | null;
  descriptionArabic?: string | null;
  departmentId: string;
  categoryId?: string | null;
  courseClassification: string;
  durationType: string;
  durationValue: number;
  allowWalkInCompletion: boolean;
  status: string;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  version: number;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}

export interface CoursePricing {
  id: string;
  courseId: string;
  branchId?: string | null;
  batchId?: string | null;
  customerType: string;
  batchType: string;
  currency: string;
  basePrice: any; // Decimal type from Prisma
  taxPercentage: any; // Decimal type from Prisma
  isTaxExempt: boolean;
  taxExemptionReason?: string | null;
  taxExemptionCode?: string | null;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  status: string; // ConfigStatus
  version: number;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}

export interface CourseDiscount {
  id: string;
  courseId: string;
  branchId?: string | null;
  batchId?: string | null;
  discountType: string;
  discountMode: string;
  discountValue: any; // Decimal type from Prisma
  requiresApproval: boolean;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  status: string; // ConfigStatus
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}

export interface CourseCompletionRule {
  id: string;
  courseId: string;
  minimumAttendancePercent: number;
  examRequired: boolean;
  feeClearanceRequired: boolean;
  manualApprovalRequired: boolean;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  status: string; // ConfigStatus
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}
