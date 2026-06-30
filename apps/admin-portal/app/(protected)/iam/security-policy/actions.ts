'use server';

import { revalidatePath } from 'next/cache';
import { DomainError } from '@ims/shared-kernel';
import { getSession } from '../../../lib/auth-guard';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '../../../lib/observability';
import { securityPolicyFormSchema } from './schema';

export type SecurityPolicyState = {
  success?: boolean;
  error?: string;
  values?: Record<string, any>;
};

export async function updateSecurityPolicyAction(_prev: SecurityPolicyState, formData: FormData): Promise<SecurityPolicyState> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = Object.fromEntries(formData.entries());

    try {
      const session = await getSession();
      const parsed = securityPolicyFormSchema.safeParse(values);

      if (!parsed.success) {
        return { error: 'Please fix the highlighted fields.', values };
      }

      const { securityPolicyService } = await import('../../../lib/runtime');
      await securityPolicyService.updateSecurityPolicy(parsed.data, {
        actorId: session.userId as never,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId as never,
      });

      logger.info('iam.securityPolicy.updated', { status: 'success', entityId: session.userId });
      revalidatePath('/iam/security-policy');
      return { success: true };
    } catch (error) {
      if (error instanceof DomainError) {
        logger.warn('iam.securityPolicy.update.failed', { status: 'failed', message: error.message, error });
        return { error: error.message, values };
      }

      logger.error('iam.securityPolicy.update.failed', { status: 'failed', message: 'Failed to update security policy.', error: error as Error });
      return { error: 'Failed to update security policy.', values };
    }
  }, { action: 'iam.updateSecurityPolicy', route: '/iam/security-policy/edit' });
}
