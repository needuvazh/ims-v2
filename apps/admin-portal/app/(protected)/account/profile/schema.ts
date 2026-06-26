import { z } from 'zod';

export const updateProfileFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters long.').max(200),
  phone: z.string().trim().max(50, 'Phone number is too long.').optional().nullable(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileFormSchema>;
