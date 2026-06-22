'use server';

import { authService } from '../../lib/runtime';
import { resetPasswordFormSchema } from './schema';
import { DomainError } from '@ims/shared-kernel';

export type ResetPasswordState = {
  error?: string;
  success?: boolean;
};

export async function resetPasswordAction(
  token: string,
  prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  const result = resetPasswordFormSchema.safeParse({ token, password, confirmPassword });
  if (!result.success) {
    const errorMap = result.error.flatten().fieldErrors;
    const errorMsg = errorMap.token?.[0] || errorMap.password?.[0] || errorMap.confirmPassword?.[0] || 'Invalid inputs.';
    return {
      error: errorMsg,
    };
  }

  try {
    await authService.resetPassword({
      token: result.data.token,
      password: result.data.password,
    });
    return {
      success: true,
    };
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return {
        error: error.message,
      };
    }
    return {
      error: 'An unexpected error occurred or the recovery link is invalid/expired.',
    };
  }
}
