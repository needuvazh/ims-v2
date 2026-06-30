'use server';

import { createUuid, DomainError } from '@ims/shared-kernel';
import { getSession } from '../../../lib/auth-guard';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '../../../lib/observability';
import { userService } from '../../../lib/runtime';
import { updateProfileFormSchema } from './schema';

export type UpdateProfileState = {
  success?: boolean;
  error?: string;
  values?: {
    fullName?: string;
    phone?: string | null;
  };
};

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = {
      fullName: String(formData.get('fullName') ?? ''),
      phone: formData.get('phone') ? String(formData.get('phone')) : null,
    };

    try {
      const session = await getSession();
      const parsed = updateProfileFormSchema.safeParse({
        fullName: values.fullName,
        phone: values.phone,
      });

      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        return {
          error: fieldErrors.fullName?.[0] ?? fieldErrors.phone?.[0] ?? 'Please fix the highlighted fields.',
          values,
        };
      }

      const phone = parsed.data.phone?.trim() ? parsed.data.phone.trim() : null;

      await userService.updateUser(
        session.userId,
        {
          fullName: parsed.data.fullName,
          phone,
        },
        { actorId: createUuid(session.userId) },
      );

      logger.info('identity.profile.updated', { status: 'success', entityId: session.userId });
      return { success: true };
    } catch (error) {
      if (error instanceof DomainError) {
        logger.warn('identity.profile.update.failed', { status: 'failed', message: error.message, error });
        return { error: error.message, values };
      }

      logger.error('identity.profile.update.failed', { status: 'failed', message: 'Failed to update profile.', error: error as Error });
      return { error: 'Failed to update profile.', values };
    }
  }, { action: 'identity.updateProfile', route: '/account/profile' });
}
