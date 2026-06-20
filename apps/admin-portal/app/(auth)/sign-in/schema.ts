import { z } from 'zod';

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email Address is required.')
    .email('Please enter a valid email address.')
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required.'),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export type SignInFieldErrors = Partial<Record<keyof SignInFormValues, string>>;

export function parseSignInFieldErrors(input: FormData | Record<string, FormDataEntryValue | null>) {
  const result = signInSchema.safeParse(Object.fromEntries(
    input instanceof FormData ? input.entries() : Object.entries(input),
  ));

  if (result.success) {
    return {};
  }

  const flattened = result.error.flatten().fieldErrors;

  return {
    email: flattened.email?.[0],
    password: flattened.password?.[0],
  } satisfies SignInFieldErrors;
}
