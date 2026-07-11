import { z } from 'zod';

export const ARABIC_SCRIPT_REGEX = /^[\u0600-\u06FF\s0-9\-\.\,\(\)]+$/;

export const ArabicScriptSchema = z
  .string()
  .min(1, 'Arabic script is required')
  .refine((val) => ARABIC_SCRIPT_REGEX.test(val), {
    message: 'Must contain only Arabic script characters',
  });

export const CreateCategorySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, 'Invalid category code format'),
  nameEnglish: z.string().trim().min(3).max(150),
  nameArabic: ArabicScriptSchema,
  description: z.string().trim().optional().nullable(),
  parentCategoryId: z.string().uuid().nullable().optional(),
  status: z.enum(['Active', 'Inactive', 'Draft', 'Archived']).optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial().omit({
  code: true,
});

export const CreateCourseSchema = z.object({
  courseCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, 'Invalid course code format'),
  nameEnglish: z.string().trim().min(3).max(150),
  nameArabic: ArabicScriptSchema,
  descriptionEnglish: z.string().trim().optional().nullable(),
  descriptionArabic: z
    .string()
    .trim()
    .refine((val) => !val || ARABIC_SCRIPT_REGEX.test(val), {
      message: 'Must contain only Arabic script characters',
    })
    .optional()
    .nullable(),
  departmentId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  courseClassification: z.string().trim().min(2),
  durationType: z.string().trim().min(2),
  durationValue: z.number().int().positive(),
  allowWalkInCompletion: z.boolean().default(false),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.preprocess(
    (val) => (val === '' ? null : val),
    z.coerce.date().optional().nullable(),
  ),
  isPubliclyExposed: z.boolean().default(false),
  bannerImage: z.string().trim().optional().nullable(),
  metaTitle: z.string().trim().max(255).optional().nullable(),
  metaDescription: z.string().trim().optional().nullable(),
  metaKeywords: z.string().trim().optional().nullable(),
  syllabusOutline: z.string().trim().optional().nullable(),
  showPricingPublicly: z.boolean().default(true),
  hasPracticalInstruction: z.boolean().default(false),
  practicalTestingDescription: z.string().trim().optional().nullable(),
});

export const UpdateCourseSchema = CreateCourseSchema.partial().omit({
  courseCode: true,
});

export const CreateCourseExamTemplateSchema = z.object({
  examName: z
    .string()
    .trim()
    .min(3, 'Exam name must be at least 3 characters')
    .max(200, 'Exam name must be at most 200 characters'),
  maxMarks: z.coerce
    .number()
    .positive('Max marks must be greater than 0'),
  passMarks: z.coerce
    .number()
    .nonnegative('Pass marks must be >= 0'),
  status: z.enum(['Draft', 'Active', 'Inactive', 'Superseded']).optional(),
}).refine(data => data.passMarks <= data.maxMarks, {
  message: 'Passing marks cannot exceed maximum marks',
  path: ['passMarks'],
});

export const UpdateCourseExamTemplateSchema = z.object({
  examName: z
    .string()
    .trim()
    .min(3, 'Exam name must be at least 3 characters')
    .max(200, 'Exam name must be at most 200 characters')
    .optional(),
  maxMarks: z.coerce
    .number()
    .positive('Max marks must be greater than 0')
    .optional(),
  passMarks: z.coerce
    .number()
    .nonnegative('Pass marks must be >= 0')
    .optional(),
  status: z.enum(['Draft', 'Active', 'Inactive', 'Superseded']).optional(),
}).refine(data => {
  if (data.passMarks !== undefined && data.maxMarks !== undefined) {
    return data.passMarks <= data.maxMarks;
  }
  return true;
}, {
  message: 'Passing marks cannot exceed maximum marks',
  path: ['passMarks'],
});
