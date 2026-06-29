'use server';

import { revalidatePath } from 'next/cache';
import { assertPermission, getSession } from '@/lib/auth-guard';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '@/lib/observability';
import { buildIdentityActionFailure, extractFormValues } from '../../identity/form-errors';
import { createUuid, type Uuid } from '@ims/shared-kernel';

async function getActorId(): Promise<Uuid> {
  const session = await getSession();
  return createUuid(session.userId);
}
import { createPermissionCommandSchema, updatePermissionCommandSchema } from '@ims/identity-access';

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createPermissionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

    try {
      await assertPermission('iam.permission.create');
      const actorId = await getActorId();
      const { permissionService } = await import('@/lib/runtime');

      const parsed = createPermissionCommandSchema.parse({
        permissionCode: values.permissionCode,
        permissionType: values.permissionType,
        moduleCode: values.moduleCode,
        featureCode: values.featureCode,
        actionCode: values.actionCode,
        description: values.description,
        status: values.status,
      });

      await permissionService.createPermission(parsed, { actorId });
      
      logger.info('iam.permission.create.succeeded', { status: 'success', permissionId: parsed.permissionCode });
      revalidatePath('/iam/permissions');
      return { success: true };
    } catch (err) {
      logger.warn('iam.permission.create.failed', {
        status: 'failed',
        message: err instanceof Error ? err.message : 'unknown',
        error: err instanceof Error ? err : undefined,
      });

      return {
        success: false,
        ...buildIdentityActionFailure(err, 'Failed to create permission.', values),
      };
    }
  }, { action: 'iam.createPermission', route: '/iam/permissions/create' });
}

export async function updatePermissionAction(permissionId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

    try {
      await assertPermission('iam.permission.update');
      const actorId = await getActorId();
      const { permissionService } = await import('@/lib/runtime');

      const parsed = updatePermissionCommandSchema.parse({
        permissionType: values.permissionType,
        moduleCode: values.moduleCode,
        featureCode: values.featureCode,
        actionCode: values.actionCode,
        description: values.description,
        status: values.status,
      });

      await permissionService.updatePermission(permissionId as Uuid, parsed, { actorId });
      
      logger.info('iam.permission.update.succeeded', { status: 'success', entityId: permissionId });
      revalidatePath('/iam/permissions');
      revalidatePath(`/iam/permissions/${permissionId}`);
      return { success: true };
    } catch (err) {
      logger.warn('iam.permission.update.failed', {
        status: 'failed',
        message: err instanceof Error ? err.message : 'unknown',
        error: err instanceof Error ? err : undefined,
      });

      return {
        success: false,
        ...buildIdentityActionFailure(err, 'Failed to update permission.', values),
      };
    }
  }, { action: 'iam.updatePermission', route: '/iam/permissions/[id]/edit' });
}

export async function archivePermissionAction(permissionId: string): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertPermission('iam.permission.archive');
      const actorId = await getActorId();
      const { permissionService } = await import('@/lib/runtime');

      await permissionService.archivePermission(permissionId as Uuid, { actorId });
      
      logger.info('iam.permission.archive.succeeded', { status: 'success', entityId: permissionId });
      revalidatePath('/iam/permissions');
      revalidatePath(`/iam/permissions/${permissionId}`);
      return { success: true };
    } catch (err) {
      logger.error('iam.permission.archive.failed', { status: 'failed', message: 'Failed to archive permission.', error: err as Error });
      return { success: false, error: err instanceof Error ? err.message : 'Failed to archive permission.' };
    }
  }, { action: 'iam.archivePermission', route: '/iam/permissions/[id]' });
}
