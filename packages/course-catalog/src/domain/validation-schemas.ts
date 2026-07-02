import { z } from 'zod';

export const ARABIC_SCRIPT_REGEX = /^[\u0600-\u06FF\s0-9\-\.\,\(\)]+$/;

export const ArabicScriptSchema = z.string()
  .min(1, 'Arabic script is required')
  .refine(
    (val) => ARABIC_SCRIPT_REGEX.test(val),
    {
      message: 'Must contain only Arabic script characters',
    }
  );

export const CreateCategorySchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/, 'Invalid category code format'),
  nameEnglish: z.string().trim().min(3).max(150),
  nameArabic: ArabicScriptSchema,
  description: z.string().trim().optional().nullable(),
  parentCategoryId: z.string().uuid().nullable().optional(),
  status: z.enum(['Active', 'Inactive', 'Draft', 'Archived']).optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial().omit({ code: true });

export const CreateCourseSchema = z.object({
  courseCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/, 'Invalid course code format'),
  nameEnglish: z.string().trim().min(3).max(150),
  nameArabic: ArabicScriptSchema,
  descriptionEnglish: z.string().trim().optional().nullable(),
  descriptionArabic: z.string().trim().refine((val) => !val || ARABIC_SCRIPT_REGEX.test(val), {
    message: 'Must contain only Arabic script characters',
  }).optional().nullable(),
  departmentId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  courseClassification: z.string().trim().min(2),
  durationType: z.string().trim().min(2),
  durationValue: z.number().int().positive(),
  allowWalkInCompletion: z.boolean().default(false),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.preprocess((val) => (val === '' ? null : val), z.coerce.date().optional().nullable()),
});

export const UpdateCourseSchema = CreateCourseSchema.partial().omit({ courseCode: true });
