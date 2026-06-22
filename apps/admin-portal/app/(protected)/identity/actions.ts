'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { createUuid, type Uuid, DomainError } from '@ims/shared-kernel';
import type { RoleStatus, UserStatus } from '@ims/identity-access';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '../../lib/observability';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

async function getActorId(): Promise<Uuid> {
  const cookieStore = await cookies();
  const session = await decodeSession(cookieStore.get(sessionCookieName)?.value);
  return createUuid(session?.userId ?? ZERO_UUID);
}

function isUserStatus(status: string): status is UserStatus {
  return status === 'Draft' || status === 'Active' || status === 'Inactive' || status === 'Locked';
}

function isRoleStatus(status: string): status is RoleStatus {
  return status === 'Draft' || status === 'Active' || status === 'Inactive' || status === 'Archived';
}

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ── Users ──────────────────────────────────────────────────────────────────

export async function createUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const actorId = await getActorId();
      const { userService } = await import('../../lib/runtime');
      await userService.createUser({
        fullName: String(formData.get('fullName') ?? ''),
        email: String(formData.get('email') ?? ''),
        phone: formData.get('phone') as string | null,
        userType: String(formData.get('userType') ?? 'Staff'),
        password: String(formData.get('password') ?? ''),
        roleIds: [],
      }, { actorId });
      logger.info('identity.user.create.succeeded', { status: 'success' });
      revalidatePath('/identity');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('identity.user.create.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('identity.user.create.failed', { status: 'failed', message: 'Failed to create user.', error: err as Error });
      return { success: false, error: 'Failed to create user.' };
    }
  }, { action: 'identity.createUser', route: '/identity' });
}

export async function updateUserStatusAction(userId: string, status: string): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const actorId = await getActorId();
      const { userService } = await import('../../lib/runtime');
      if (!isUserStatus(status)) {
        throw new Error('Invalid user status.');
      }
      await userService.updateUser(userId, { status }, { actorId });
      logger.info('identity.user.status.updated', { status: 'success', entityId: userId });
      revalidatePath('/identity');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('identity.user.status.update.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('identity.user.status.update.failed', { status: 'failed', message: 'Failed to update user.', error: err as Error });
      return { success: false, error: 'Failed to update user.' };
    }
  }, { action: 'identity.updateUserStatus', route: '/identity' });
}

export async function assignRoleToUserAction(userId: string, roleId: string): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const actorId = await getActorId();
      const { userService } = await import('../../lib/runtime');
      await userService.assignRole(userId, roleId, { actorId });
      logger.info('identity.user.role.assigned', { status: 'success', entityId: userId, code: roleId });
      revalidatePath('/identity');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('identity.user.role.assign.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('identity.user.role.assign.failed', { status: 'failed', message: 'Failed to assign role.', error: err as Error });
      return { success: false, error: 'Failed to assign role.' };
    }
  }, { action: 'identity.assignRoleToUser', route: '/identity' });
}

export async function toggleUserRoleAction(userId: string, roleId: string, assign: boolean): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const actorId = await getActorId();
      const { userService } = await import('../../lib/runtime');
      if (assign) {
        await userService.assignRole(userId, roleId, { actorId });
      } else {
        await userService.removeRole(userId, roleId, { actorId });
      }
      logger.info('identity.user.role.toggled', { status: 'success', entityId: userId, code: roleId });
      revalidatePath('/identity');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('identity.user.role.toggle.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('identity.user.role.toggle.failed', { status: 'failed', message: 'Failed to toggle role.', error: err as Error });
      return { success: false, error: 'Failed to toggle role.' };
    }
  }, { action: 'identity.toggleUserRole', route: '/identity' });
}

export async function getUserRolesAction(userId: string): Promise<ActionResult<{ id: string; roleCode: string; roleName: string }[]>> {
  try {
    const { userService } = await import('../../lib/runtime');
    const roles = await userService.listRolesForUser(userId);
    return { success: true, data: roles };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch roles.' };
  }
}

// ── Roles ──────────────────────────────────────────────────────────────────

export async function createRoleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const actorId = await getActorId();
      const { roleService } = await import('../../lib/runtime');
      await roleService.createRole({
        roleCode: String(formData.get('roleCode') ?? ''),
        roleName: String(formData.get('roleName') ?? ''),
        description: formData.get('description') as string | null,
        permissionIds: [],
      }, { actorId });
      logger.info('identity.role.create.succeeded', { status: 'success' });
      revalidatePath('/identity');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('identity.role.create.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('identity.role.create.failed', { status: 'failed', message: 'Failed to create role.', error: err as Error });
      return { success: false, error: 'Failed to create role.' };
    }
  }, { action: 'identity.createRole', route: '/identity' });
}

export async function updateRoleStatusAction(roleId: string, status: string): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const actorId = await getActorId();
      const { roleService } = await import('../../lib/runtime');
      if (!isRoleStatus(status)) {
        throw new Error('Invalid role status.');
      }
      await roleService.updateRole(roleId, { status }, { actorId });
      logger.info('identity.role.status.updated', { status: 'success', entityId: roleId });
      revalidatePath('/identity');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('identity.role.status.update.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('identity.role.status.update.failed', { status: 'failed', message: 'Failed to update role.', error: err as Error });
      return { success: false, error: 'Failed to update role.' };
    }
  }, { action: 'identity.updateRoleStatus', route: '/identity' });
}

export async function toggleRolePermissionAction(roleId: string, permissionId: string, assign: boolean): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const actorId = await getActorId();
      const { roleService } = await import('../../lib/runtime');
      if (assign) {
        await roleService.assignPermission(roleId, permissionId, { actorId });
      } else {
        await roleService.removePermission(roleId, permissionId, { actorId });
      }
      logger.info('identity.role.permission.toggled', { status: 'success', entityId: roleId, code: permissionId });
      revalidatePath('/identity');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('identity.role.permission.toggle.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('identity.role.permission.toggle.failed', { status: 'failed', message: 'Failed to toggle permission.', error: err as Error });
      return { success: false, error: 'Failed to toggle permission.' };
    }
  }, { action: 'identity.toggleRolePermission', route: '/identity' });
}
