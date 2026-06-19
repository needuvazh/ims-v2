'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';

async function getActorId(): Promise<string> {
  const cookieStore = await cookies();
  const session = await decodeSession(cookieStore.get(sessionCookieName)?.value);
  return session?.userId ?? 'system';
}

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ── Users ──────────────────────────────────────────────────────────────────

export async function createUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
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
    }, { actorId: actorId as any });
    revalidatePath('/identity');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to create user.' };
  }
}

export async function updateUserStatusAction(userId: string, status: string): Promise<ActionResult> {
  try {
    const actorId = await getActorId();
    const { userService } = await import('../../lib/runtime');
    await userService.updateUser(userId, { status: status as any }, { actorId: actorId as any });
    revalidatePath('/identity');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to update user.' };
  }
}

export async function assignRoleToUserAction(userId: string, roleId: string): Promise<ActionResult> {
  try {
    const actorId = await getActorId();
    const { userService } = await import('../../lib/runtime');
    await userService.assignRole(userId, roleId, { actorId: actorId as any });
    revalidatePath('/identity');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to assign role.' };
  }
}

export async function toggleUserRoleAction(userId: string, roleId: string, assign: boolean): Promise<ActionResult> {
  try {
    const actorId = await getActorId();
    const { userService } = await import('../../lib/runtime');
    if (assign) {
      await userService.assignRole(userId, roleId, { actorId: actorId as any });
    } else {
      await userService.removeRole(userId, roleId, { actorId: actorId as any });
    }
    revalidatePath('/identity');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to toggle role.' };
  }
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
  try {
    const actorId = await getActorId();
    const { roleService } = await import('../../lib/runtime');
    await roleService.createRole({
      roleCode: String(formData.get('roleCode') ?? ''),
      roleName: String(formData.get('roleName') ?? ''),
      description: formData.get('description') as string | null,
      permissionIds: [],
    }, { actorId: actorId as any });
    revalidatePath('/identity');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to create role.' };
  }
}

export async function updateRoleStatusAction(roleId: string, status: string): Promise<ActionResult> {
  try {
    const actorId = await getActorId();
    const { roleService } = await import('../../lib/runtime');
    await roleService.updateRole(roleId, { status: status as any }, { actorId: actorId as any });
    revalidatePath('/identity');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to update role.' };
  }
}

export async function toggleRolePermissionAction(roleId: string, permissionId: string, assign: boolean): Promise<ActionResult> {
  try {
    const actorId = await getActorId();
    const { roleService } = await import('../../lib/runtime');
    if (assign) {
      await roleService.assignPermission(roleId, permissionId, { actorId: actorId as any });
    } else {
      await roleService.removePermission(roleId, permissionId, { actorId: actorId as any });
    }
    revalidatePath('/identity');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to toggle permission.' };
  }
}
