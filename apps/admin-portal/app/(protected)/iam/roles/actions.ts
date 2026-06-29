'use server';

import { revalidatePath } from 'next/cache';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '@/lib/observability';
import { buildIdentityActionFailure, extractFormValues } from '../../identity/form-errors';
import { getSession, assertPermission } from '@/lib/auth-guard';
import { createUuid, type Uuid } from '@ims/shared-kernel';

async function getActorId(): Promise<Uuid> {
  const session = await getSession();
  return createUuid(session.userId);
}
import { createRoleCommandSchema, updateRoleCommandSchema } from '@ims/identity-access';

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createRoleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

    try {
      await assertPermission('iam.role.create');
      const actorId = await getActorId();
      const { roleService } = await import('@/lib/runtime');

      const parsed = createRoleCommandSchema.parse({
        roleCode: values.roleCode,
        roleName: values.roleName,
        description: values.description,
        status: values.status,
        effectiveStartDate: values.effectiveStartDate ? new Date(values.effectiveStartDate as string) : new Date(),
        effectiveEndDate: values.effectiveEndDate ? new Date(values.effectiveEndDate as string) : null,
      });

      await roleService.createRole(parsed, { actorId });
      
      logger.info('iam.role.create.succeeded', { status: 'success', roleId: parsed.roleCode });
      revalidatePath('/iam');
      revalidatePath('/iam/roles');
      return { success: true };
    } catch (err) {
      logger.warn('iam.role.create.failed', {
        status: 'failed',
        message: err instanceof Error ? err.message : 'unknown',
        error: err instanceof Error ? err : undefined,
      });

      return {
        success: false,
        ...buildIdentityActionFailure(err, 'Failed to create role.', values),
      };
    }
  }, { action: 'iam.createRole', route: '/iam/roles/create' });
}

export async function updateRoleAction(roleId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

    try {
      await assertPermission('iam.role.update');
      const actorId = await getActorId();
      const { roleService } = await import('@/lib/runtime');

      const parsed = updateRoleCommandSchema.parse({
        roleName: values.roleName,
        description: values.description,
        status: values.status,
        effectiveStartDate: values.effectiveStartDate ? new Date(values.effectiveStartDate as string) : undefined,
        effectiveEndDate: values.effectiveEndDate ? new Date(values.effectiveEndDate as string) : null,
      });

      await roleService.updateRole(roleId, parsed, { actorId });
      
      logger.info('iam.role.update.succeeded', { status: 'success', entityId: roleId });
      revalidatePath('/iam');
      revalidatePath('/iam/roles');
      revalidatePath(`/iam/roles/${roleId}`);
      return { success: true };
    } catch (err) {
      logger.warn('iam.role.update.failed', {
        status: 'failed',
        message: err instanceof Error ? err.message : 'unknown',
        error: err instanceof Error ? err : undefined,
      });

      return {
        success: false,
        ...buildIdentityActionFailure(err, 'Failed to update role.', values),
      };
    }
  }, { action: 'iam.updateRole', route: '/iam/roles/[id]/edit' });
}

export async function archiveRoleAction(roleId: string): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertPermission('iam.role.archive');
      const actorId = await getActorId();
      const { roleService } = await import('@/lib/runtime');

      await roleService.archiveRole(roleId, { actorId });
      
      logger.info('iam.role.archive.succeeded', { status: 'success', entityId: roleId });
      revalidatePath('/iam');
      revalidatePath('/iam/roles');
      revalidatePath(`/iam/roles/${roleId}`);
      return { success: true };
    } catch (err) {
      logger.error('iam.role.archive.failed', { status: 'failed', message: 'Failed to archive role.', error: err as Error });
      return { success: false, error: err instanceof Error ? err.message : 'Failed to archive role.' };
    }
  }, { action: 'iam.archiveRole', route: '/iam/roles/[id]' });
}

export async function toggleRolePermissionAction(roleId: string, permissionId: string, assign: boolean): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertPermission('iam.role.permission.assign');
      const actorId = await getActorId();
      const { roleService } = await import('@/lib/runtime');

      if (assign) {
        await roleService.assignPermission(roleId, permissionId, { actorId });
      } else {
        await roleService.removePermission(roleId, permissionId, { actorId });
      }
      
      logger.info('iam.role.permission.toggled', { status: 'success', roleId, permissionId });
      revalidatePath('/iam/roles');
      revalidatePath(`/iam/roles/${roleId}`);
      revalidatePath(`/iam/roles/${roleId}/permissions`);
      return { success: true };
    } catch (err) {
      logger.error('iam.role.permission.toggled.failed', { status: 'failed', message: 'Failed to update role permission.', error: err as Error });
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update role permission.' };
    }
  }, { action: 'iam.toggleRolePermission', route: '/iam/roles/[id]/permissions' });
}
