import { z } from 'zod';

export const activateAccountSchema = z.object({
  token: z.string().trim().min(1, 'Activation token is required.'),
});

export type ActivateAccountFields = z.infer<typeof activateAccountSchema>;

export type ActivateAccountFieldErrors = {
  token?: string;
};

export function parseActivateAccountFieldErrors(formData: FormData, token?: string): ActivateAccountFieldErrors {
  const result = activateAccountSchema.safeParse({ token: token ?? String(formData.get('token') ?? '') });

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    return { token: fieldErrors.token?.[0] };
  }

  return {};
}
