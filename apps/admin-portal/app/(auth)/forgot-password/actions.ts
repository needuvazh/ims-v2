'use server';

import { authService } from '../../lib/runtime';
import { forgotPasswordSchema } from './schema';
import { DomainError } from '@ims/shared-kernel';

export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
};

export async function requestPasswordResetAction(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get('email') as string;

  const result = forgotPasswordSchema.safeParse({ email });
  if (!result.success) {
    return {
      error: 'Invalid input. Please correct the fields.',
    };
  }

  try {
    await authService.requestPasswordReset({ email: result.data.email });
    return {
      success: true,
    };
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'IamError' || 'errorCode' in error)) {
      return {
        error: (error as any).messageEn || error.message,
      };
    }
    if (error instanceof DomainError) {
      return {
        error: error.message,
      };
    }
    return {
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
