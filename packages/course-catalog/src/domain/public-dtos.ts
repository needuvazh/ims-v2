import { z } from 'zod';

export const PublicCourseListItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  nameEnglish: z.string(),
  nameArabic: z.string(),
  descriptionEnglish: z.string().nullable(),
  categoryCode: z.string().nullable(),
  categoryName: z.string().nullable(),
  durationType: z.string(),
  durationValue: z.number(),
  basePrice: z.string().nullable(),
  currency: z.string().nullable(),
  nextBatchDate: z.string().nullable(),
  availableSeats: z.number().nullable(),
  imageUrl: z.string().nullable(),
  showPricingPublicly: z.boolean(),
  hasPracticalInstruction: z.boolean(),
  practicalTestingDescription: z.string().nullable(),
});

export type PublicCourseListItem = z.infer<typeof PublicCourseListItemSchema>;

export const PublicCourseDetailSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  nameEnglish: z.string(),
  nameArabic: z.string(),
  descriptionEnglish: z.string().nullable(),
  descriptionArabic: z.string().nullable(),
  courseCode: z.string(),
  categoryCode: z.string().nullable(),
  categoryName: z.string().nullable(),
  durationType: z.string(),
  durationValue: z.number(),
  basePrice: z.string().nullable(),
  taxPercentage: z.string().nullable(),
  currency: z.string().nullable(),
  imageUrl: z.string().nullable(),
  showPricingPublicly: z.boolean(),
  hasPracticalInstruction: z.boolean(),
  practicalTestingDescription: z.string().nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  metaKeywords: z.string().nullable(),
  syllabusOutline: z.string().nullable(),
  categoryHierarchy: z.array(
    z.object({
      id: z.string().uuid(),
      code: z.string(),
      nameEnglish: z.string(),
      nameArabic: z.string(),
    }),
  ),
  batches: z.array(
    z.object({
      id: z.string().uuid(),
      batchCode: z.string(),
      batchName: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      capacity: z.number(),
      currentEnrollment: z.number(),
      availableSeats: z.number(),
      status: z.string(),
      branchName: z.string().nullable(),
      trainerName: z.string().nullable(),
    }),
  ),
});

export type PublicCourseDetail = z.infer<typeof PublicCourseDetailSchema>;

export const PublicCategorySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  nameEnglish: z.string(),
  nameArabic: z.string(),
  description: z.string().nullable(),
  courseCount: z.number().optional(),
});

export type PublicCategory = z.infer<typeof PublicCategorySchema>;

export const PublicBatchSchema = z.object({
  id: z.string().uuid(),
  batchCode: z.string(),
  batchName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  capacity: z.number(),
  currentEnrollment: z.number(),
  availableSeats: z.number(),
  status: z.string(),
  branchName: z.string().nullable(),
  trainerName: z.string().nullable(),
  courseName: z.string(),
});

export type PublicBatch = z.infer<typeof PublicBatchSchema>;
