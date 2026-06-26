import { z } from 'zod';
import { passwordSchema } from '@ims/identity-access';

export const changePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm your new password.'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
