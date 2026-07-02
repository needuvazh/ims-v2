import { Course, CourseCategory, CoursePricing, CourseDiscount, CourseCompletionRule } from './course';

export interface ICourseRepository {
  create(data: any, tx?: any): Promise<Course>;
  update(id: string, data: any, version: number, tx?: any): Promise<Course>;
  findById(id: string, tx?: any): Promise<Course | null>;
  findByCode(code: string, tx?: any): Promise<Course | null>;
  findByNameInDepartment(nameEnglish: string, nameArabic: string, departmentId: string, tx?: any): Promise<Course | null>;
  findAll(filters: any, pagination: any, tx?: any): Promise<{ items: Course[]; total: number }>;
  delete(id: string, deletedBy: string, tx?: any): Promise<void>;
  hasActiveBatches(id: string, tx?: any): Promise<boolean>;
}

export interface ICourseCategoryRepository {
  create(data: any, tx?: any): Promise<CourseCategory>;
  update(id: string, data: any, version: number, tx?: any): Promise<CourseCategory>;
  findById(id: string, tx?: any): Promise<CourseCategory | null>;
  findByCode(code: string, tx?: any): Promise<CourseCategory | null>;
  findAll(tx?: any): Promise<CourseCategory[]>;
}

export interface ICoursePricingRepository {
  create(data: any, tx?: any): Promise<CoursePricing>;
  update(id: string, data: any, tx?: any): Promise<CoursePricing>;
  findById(id: string, tx?: any): Promise<CoursePricing | null>;
  findOverlappingPricing(filters: { courseId: string; branchId?: string | null; batchId?: string | null; customerType: string; batchType: string; currency: string; startDate: Date; endDate?: Date | null }, tx?: any): Promise<CoursePricing[]>;
  findAll(filters: { courseId?: string; branchId?: string | null; batchId?: string | null; status?: string; activeAt?: Date }, tx?: any): Promise<CoursePricing[]>;
}

export interface ICourseDiscountRepository {
  create(data: any, tx?: any): Promise<CourseDiscount>;
  update(id: string, data: any, tx?: any): Promise<CourseDiscount>;
  findById(id: string, tx?: any): Promise<CourseDiscount | null>;
  findOverlappingDiscounts(filters: { courseId: string; branchId?: string | null; batchId?: string | null; discountType: string; startDate: Date; endDate?: Date | null }, tx?: any): Promise<CourseDiscount[]>;
  findAll(filters: { courseId?: string; branchId?: string | null; batchId?: string | null; status?: string; activeAt?: Date }, tx?: any): Promise<CourseDiscount[]>;
}

export interface ICourseCompletionRuleRepository {
  create(data: any, tx?: any): Promise<CourseCompletionRule>;
  update(id: string, data: any, tx?: any): Promise<CourseCompletionRule>;
  findById(id: string, tx?: any): Promise<CourseCompletionRule | null>;
  findOverlappingRules(filters: { courseId: string; startDate: Date; endDate?: Date | null }, tx?: any): Promise<CourseCompletionRule[]>;
  findAll(filters: { courseId?: string; status?: string; activeAt?: Date }, tx?: any): Promise<CourseCompletionRule[]>;
}
