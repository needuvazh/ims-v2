import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address.').toLowerCase(),
});

export type ForgotPasswordFields = z.infer<typeof forgotPasswordSchema>;

export type ForgotFieldErrors = {
  email?: string;
};

export function parseForgotFieldErrors(formData: FormData): ForgotFieldErrors {
  const email = formData.get('email') as string;
  const result = forgotPasswordSchema.safeParse({ email });

  if (!result.success) {
    const errorMap = result.error.flatten().fieldErrors;
    return {
      email: errorMap.email?.[0],
    };
  }

  return {};
}
