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
