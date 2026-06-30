import { z } from 'zod';

export const roleFormBaseSchema = z.object({
  roleCode: z
    .string()
    .trim()
    .min(2, 'Role Code must be at least 2 characters.')
    .max(100, 'Role Code must be at most 100 characters.')
    .regex(/^[A-Z0-9_]+$/, 'Role Code must contain only uppercase letters, numbers, and underscores.'),
  roleName: z
    .string()
    .trim()
    .min(2, 'Role Name must be at least 2 characters.')
    .max(150, 'Role Name must be at most 150 characters.'),
  description: z.string().trim().nullable().optional(),
  status: z.enum(['Active', 'Archived'], { required_error: 'Status is required.' }),
  effectiveStartDate: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.union([z.date(), z.string()]).nullable().optional().refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Invalid start date.')
  ),
  effectiveEndDate: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.union([z.date(), z.string()]).nullable().optional().refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Invalid end date.')
  ),
});

const refineDates = <T extends {
  effectiveStartDate?: any;
  effectiveEndDate?: any;
}>(schema: z.ZodType<T>) => {
  return schema
    .refine((data) => {
      if (data.effectiveStartDate && data.effectiveEndDate) {
        return new Date(data.effectiveEndDate) >= new Date(data.effectiveStartDate);
      }
      return true;
    }, {
      message: 'Effective End Date must be after or equal to Start Date.',
      path: ['effectiveEndDate'],
    });
};

export const createRoleFormSchema = refineDates(roleFormBaseSchema);

export const updateRoleFormSchema = refineDates(
  roleFormBaseSchema.omit({ roleCode: true })
);
