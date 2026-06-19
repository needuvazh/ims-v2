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
