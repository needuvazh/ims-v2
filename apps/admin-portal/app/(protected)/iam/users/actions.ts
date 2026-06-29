'use server';

import { revalidatePath } from 'next/cache';
import { createUuid, type Uuid } from '@ims/shared-kernel';
import type { UserStatus, UserType } from '@ims/identity-access';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '@/lib/observability';
import { assertPermission, getSession } from '@/lib/auth-guard';
import { buildIdentityActionFailure, extractFormValues } from '../../identity/form-errors';

async function getActorId(): Promise<Uuid> {
  const session = await getSession();
  return createUuid(session.userId);
}

function isUserStatus(status: string): status is UserStatus {
  return ['PendingActivation', 'Active', 'Locked', 'Suspended', 'Archived'].includes(status);
}

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function createUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

    try {
      await assertPermission('iam.user.create');
      const actorId = await getActorId();
      const { userService } = await import('@/lib/runtime');
      
      const roleIds = formData.getAll('roleIds').map((value) => String(value)).filter((value) => value.trim() !== '');
      const branchIds = formData.getAll('branchIds').map((value) => String(value)).filter((value) => value.trim() !== '');
      const userStatusRaw = String(formData.get('status') ?? 'PendingActivation');
      
      const effectiveStartDateStr = formData.get('effectiveStartDate') ? String(formData.get('effectiveStartDate')) : undefined;
      const effectiveEndDateStr = formData.get('effectiveEndDate') ? String(formData.get('effectiveEndDate')) : null;

      await userService.createUser({
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
        email: String(formData.get('email') ?? ''),
        mobile: formData.get('mobile') as string | undefined,
        nationalId: formData.get('nationalId') as string | null,
        nationality: formData.get('nationality') as string | null,
        dateOfBirth: formData.get('dateOfBirth') ? new Date(String(formData.get('dateOfBirth'))) : null,
        gender: formData.get('gender') as string | null,
        
        userType: String(formData.get('userType') ?? 'Student') as UserType, // Legacy fallback
        status: isUserStatus(userStatusRaw) ? userStatusRaw : 'PendingActivation',
        roleIds,
        branchIds,
        defaultBranchId: formData.get('defaultBranchId') ? String(formData.get('defaultBranchId')) : null,
        
        effectiveStartDate: effectiveStartDateStr ? new Date(effectiveStartDateStr) : undefined,
        effectiveEndDate: effectiveEndDateStr ? new Date(effectiveEndDateStr) : null,
      }, { actorId });
      
      logger.info('iam.user.create.succeeded', { status: 'success' });
      revalidatePath('/iam');
      revalidatePath('/iam/users');
      return { success: true };
    } catch (err) {
      logger.warn('iam.user.create.failed', {
        status: 'failed',
        message: err instanceof Error ? err.message : 'unknown',
        error: err instanceof Error ? err : undefined,
      });

      return {
        success: false,
        ...buildIdentityActionFailure(err, 'Failed to create user.', values, {
          domain: { conflict: 'email' },
          prisma: { email: 'email' },
          prismaMessages: { email: 'Email already exists. Please use a different email address.' },
        }),
      };
    }
  }, { action: 'iam.createUser', route: '/iam/users/create' });
}

export async function updateUserAction(userId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

    try {
      await assertPermission('iam.user.update');
      const actorId = await getActorId();
      const { userService } = await import('@/lib/runtime');
      
      const roleIds = formData.getAll('roleIds').map((value) => String(value)).filter((value) => value.trim() !== '');
      const branchIds = formData.getAll('branchIds').map((value) => String(value)).filter((value) => value.trim() !== '');
      const userStatusRaw = formData.get('status') ? String(formData.get('status')) : undefined;
      
      const effectiveStartDateStr = formData.get('effectiveStartDate') ? String(formData.get('effectiveStartDate')) : undefined;
      const effectiveEndDateStr = formData.get('effectiveEndDate') ? String(formData.get('effectiveEndDate')) : null;

      await userService.updateUser(userId, {
        firstName: formData.get('firstName') ? String(formData.get('firstName')) : undefined,
        lastName: formData.get('lastName') ? String(formData.get('lastName')) : undefined,
        mobile: formData.get('mobile') ? String(formData.get('mobile')) : undefined,
        nationalId: formData.get('nationalId') as string | null,
        nationality: formData.get('nationality') as string | null,
        dateOfBirth: formData.get('dateOfBirth') ? new Date(String(formData.get('dateOfBirth'))) : null,
        gender: formData.get('gender') as string | null,
        
        userType: formData.get('userType') ? String(formData.get('userType')) as UserType : undefined,
        status: isUserStatus(userStatusRaw ?? '') ? userStatusRaw : undefined,
        branchIds: branchIds.length > 0 ? branchIds : undefined,
        defaultBranchId: formData.get('defaultBranchId') ? String(formData.get('defaultBranchId')) : undefined,
        
        effectiveStartDate: effectiveStartDateStr ? new Date(effectiveStartDateStr) : undefined,
        effectiveEndDate: effectiveEndDateStr ? new Date(effectiveEndDateStr) : null,
      }, { actorId });
      
      // Update roles separately if provided
      if (roleIds.length > 0) {
         // This is a naive implementation: in a real scenario we'd diff and add/remove.
         // But the UserService doesn't have a bulk `updateRoles`, so we manually sync them.
         const currentRoles = await userService.listRolesForUser(userId);
         const currentRoleIds = currentRoles.map(r => r.id);
         
         const toAdd = roleIds.filter(id => !currentRoleIds.includes(id));
         const toRemove = currentRoleIds.filter(id => !roleIds.includes(id));
         
         for (const id of toAdd) {
            await userService.assignRole(userId, id, { actorId });
         }
         for (const id of toRemove) {
            await userService.removeRole(userId, id, { actorId });
         }
      }

      logger.info('iam.user.update.succeeded', { status: 'success', entityId: userId });
      revalidatePath('/iam');
      revalidatePath('/iam/users');
      revalidatePath(`/iam/users/${userId}`);
      return { success: true };
    } catch (err) {
      logger.warn('iam.user.update.failed', {
        status: 'failed',
        message: err instanceof Error ? err.message : 'unknown',
        error: err instanceof Error ? err : undefined,
      });

      return {
        success: false,
        ...buildIdentityActionFailure(err, 'Failed to update user.', values),
      };
    }
  }, { action: 'iam.updateUser', route: '/iam/users/[id]/edit' });
}

export async function userLifecycleAction(userId: string, action: 'activate' | 'suspend' | 'archive' | 'unlock' | 'adminResetPassword' | 'resendActivationEmail'): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const actorId = await getActorId();
      const { userService } = await import('@/lib/runtime');
      
      switch (action) {
        case 'activate':
          await userService.activateUser(userId, { actorId });
          break;
        case 'suspend':
          await userService.suspendUser(userId, { actorId });
          break;
        case 'archive':
          await userService.archiveUser(userId, { actorId });
          break;
        case 'unlock':
          await userService.unlockUser(userId, { actorId });
          break;
        case 'adminResetPassword':
          await userService.adminResetPassword(userId, { actorId });
          break;
        case 'resendActivationEmail':
          await userService.resendActivationEmail(userId, { actorId });
          break;
      }
      
      logger.info(`iam.user.lifecycle.${action}.succeeded`, { status: 'success', entityId: userId });
      revalidatePath('/iam');
      revalidatePath(`/iam/users/${userId}`);
      return { success: true };
    } catch (err) {
      logger.error(`iam.user.lifecycle.${action}.failed`, { status: 'failed', message: `Failed to ${action} user.`, error: err as Error });
      return { success: false, error: err instanceof Error ? err.message : `Failed to ${action} user.` };
    }
  }, { action: 'iam.userLifecycleAction', route: '/iam/users/[id]' });
}
