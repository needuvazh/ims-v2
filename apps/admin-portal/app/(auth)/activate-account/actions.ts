'use server';

import { DomainError } from '@ims/shared-kernel';
import { activateAccountSchema } from './schema';

export type ActivateAccountState = {
  error?: string;
  success?: boolean;
};

export async function activateAccountAction(
  prevState: ActivateAccountState,
  formData: FormData,
): Promise<ActivateAccountState> {
  const token = String(formData.get('token') ?? '');
  const result = activateAccountSchema.safeParse({ token });

  if (!result.success) {
    return { error: 'Activation token is required.' };
  }

  try {
    const { userService } = await import('../../lib/runtime');
    await userService.activateAccountViaToken(result.data.token);
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'IamError' || 'errorCode' in error)) {
      return { error: (error as any).messageEn || error.message };
    }
    if (error instanceof DomainError) {
      return { error: error.message };
    }

    return { error: 'Unable to activate the account right now.' };
  }
}
