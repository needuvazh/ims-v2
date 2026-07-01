import { Course, CourseCategory } from './course';

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
