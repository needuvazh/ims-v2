import { z } from 'zod';

export const passwordComplexitySchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const resetPasswordFormSchema = z.object({
  token: z.string().min(1, 'Token is missing.'),
  password: passwordComplexitySchema,
  confirmPassword: z.string().min(1, 'Confirm password is required.'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export type ResetPasswordFormFields = z.infer<typeof resetPasswordFormSchema>;

export type ResetFieldErrors = {
  token?: string;
  password?: string;
  confirmPassword?: string;
};

export function parseResetFieldErrors(formData: FormData, token: string): ResetFieldErrors {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  const result = resetPasswordFormSchema.safeParse({ token, password, confirmPassword });

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    return {
      token: fieldErrors.token?.[0],
      password: fieldErrors.password?.[0],
      confirmPassword: fieldErrors.confirmPassword?.[0],
    };
  }

  return {};
}
