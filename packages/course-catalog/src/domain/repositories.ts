import { Prisma } from '@prisma/client';
import {
  Course,
  CourseCategory,
  CoursePricing,
  CourseDiscount,
  CourseCompletionRule,
  CourseExamTemplate,
} from './course';

export interface ICourseRepository {
  create(
    data: Prisma.CourseUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Course>;
  update(
    id: string,
    data: Prisma.CourseUncheckedUpdateInput,
    version: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Course>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Course | null>;
  findByCode(
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Course | null>;
  findByNameInDepartment(
    nameEnglish: string,
    nameArabic: string,
    departmentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Course | null>;
  findAll(
    filters: {
      categoryId?: string;
      status?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    pagination: { page: number; limit: number },
    tx?: Prisma.TransactionClient,
  ): Promise<{ items: Course[]; total: number }>;
  delete(
    id: string,
    deletedBy: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
  hasActiveBatches(id: string, tx?: Prisma.TransactionClient): Promise<boolean>;
}

export interface ICourseCategoryRepository {
  create(
    data: Prisma.CourseCategoryUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseCategory>;
  update(
    id: string,
    data: Prisma.CourseCategoryUncheckedUpdateInput,
    version: number,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseCategory>;
  findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseCategory | null>;
  findByCode(
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseCategory | null>;
  findAll(tx?: Prisma.TransactionClient): Promise<CourseCategory[]>;
}

export interface ICoursePricingRepository {
  create(
    data: Prisma.CoursePricingUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CoursePricing>;
  update(
    id: string,
    data: Prisma.CoursePricingUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CoursePricing>;
  findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CoursePricing | null>;
  findOverlappingPricing(
    filters: {
      courseId: string;
      branchId?: string | null;
      batchId?: string | null;
      customerType: string;
      batchType: string;
      currency: string;
      startDate: Date;
      endDate?: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<CoursePricing[]>;
  findAll(
    filters: {
      courseId?: string;
      branchId?: string | null;
      batchId?: string | null;
      status?: string;
      activeAt?: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<CoursePricing[]>;
}

export interface ICourseDiscountRepository {
  create(
    data: Prisma.CourseDiscountUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseDiscount>;
  update(
    id: string,
    data: Prisma.CourseDiscountUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseDiscount>;
  findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseDiscount | null>;
  findOverlappingDiscounts(
    filters: {
      courseId: string;
      branchId?: string | null;
      batchId?: string | null;
      discountType: string;
      startDate: Date;
      endDate?: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<CourseDiscount[]>;
  findAll(
    filters: {
      courseId?: string;
      branchId?: string | null;
      batchId?: string | null;
      status?: string;
      activeAt?: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<CourseDiscount[]>;
}

export interface ICourseCompletionRuleRepository {
  create(
    data: Prisma.CourseCompletionRuleUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseCompletionRule>;
  update(
    id: string,
    data: Prisma.CourseCompletionRuleUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseCompletionRule>;
  findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseCompletionRule | null>;
  findOverlappingRules(
    filters: { courseId: string; startDate: Date; endDate?: Date | null },
    tx?: Prisma.TransactionClient,
  ): Promise<CourseCompletionRule[]>;
  findAll(
    filters: { courseId?: string; status?: string; activeAt?: Date },
    tx?: Prisma.TransactionClient,
  ): Promise<CourseCompletionRule[]>;
}

export interface ICourseExamTemplateRepository {
  create(
    data: Prisma.CourseExamTemplateUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate>;
  update(
    id: string,
    data: Prisma.CourseExamTemplateUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate>;
  findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate | null>;
  findAll(
    filters: { courseId?: string; status?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate[]>;
  delete(
    id: string,
    deletedBy: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
}
