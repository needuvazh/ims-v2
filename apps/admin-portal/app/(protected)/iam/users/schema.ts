import { z } from 'zod';

export const userFormBaseSchema = z.object({
  firstName: z.string().trim().min(2, 'First Name must be at least 2 characters.'),
  lastName: z.string().trim().min(2, 'Last Name must be at least 2 characters.'),
  email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
  mobile: z.string().trim().min(1, 'Mobile number is required.').regex(/^\+?[0-9\-\s]{8,20}$/, 'Invalid mobile phone format.'),
  nationalId: z.string().trim().nullable().optional(),
  nationality: z.string().trim().nullable().optional(),
  dateOfBirth: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.union([z.date(), z.string()]).nullable().optional().refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Invalid date of birth.')
  ),
  gender: z.string().trim().nullable().optional(),
  status: z.string().min(1, 'Status is required.'),
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
  roleIds: z.array(z.string().uuid('Invalid role ID.')).min(1, 'At least one role must be selected.'),
  branchIds: z.array(z.string().uuid('Invalid branch ID.')).min(1, 'At least one branch must be selected.'),
  defaultBranchId: z.string().uuid('Invalid default branch ID').nullable().optional(),
});

const refineBranchAndDates = <T extends {
  branchIds: string[];
  defaultBranchId?: string | null;
  effectiveStartDate?: any;
  effectiveEndDate?: any;
}>(schema: z.ZodType<T>) => {
  return schema
    .refine((data) => {
      if (data.branchIds.length > 0 && !data.defaultBranchId) {
        return false;
      }
      if (data.defaultBranchId && !data.branchIds.includes(data.defaultBranchId)) {
        return false;
      }
      return true;
    }, {
      message: 'Default branch must be one of the selected branches.',
      path: ['defaultBranchId'],
    })
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

export const createUserFormSchema = refineBranchAndDates(userFormBaseSchema);

export const updateUserFormSchema = refineBranchAndDates(
  userFormBaseSchema.omit({ email: true }).extend({
    email: z.string().trim().email('Please enter a valid email address.').toLowerCase().optional(),
  })
);
