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

// ── Institute ──────────────────────────────────────────────────────────────

export async function createInstituteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actorId = await getActorId();
    const { organizationService } = await import('../../lib/runtime');
    await organizationService.createInstitute({
      instituteCode: String(formData.get('instituteCode') ?? ''),
      instituteName: String(formData.get('instituteName') ?? ''),
      registrationNumber: formData.get('registrationNumber') as string | null,
      primaryEmail: formData.get('primaryEmail') as string | null,
      primaryPhone: formData.get('primaryPhone') as string | null,
      website: formData.get('website') as string | null,
      address: formData.get('address') as string | null,
      country: formData.get('country') as string | null,
    }, { actorId: actorId as any });
    revalidatePath('/organization');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to create institute.' };
  }
}

export async function updateInstituteAction(
  instituteId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actorId = await getActorId();
    const { organizationService } = await import('../../lib/runtime');
    await organizationService.updateInstitute(instituteId, {
      instituteName: String(formData.get('instituteName') ?? ''),
      primaryEmail: formData.get('primaryEmail') as string | null,
      primaryPhone: formData.get('primaryPhone') as string | null,
      address: formData.get('address') as string | null,
      country: formData.get('country') as string | null,
    }, { actorId: actorId as any });
    revalidatePath('/organization');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to update institute.' };
  }
}

// ── Branch ─────────────────────────────────────────────────────────────────

export async function createBranchAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actorId = await getActorId();
    const { organizationService } = await import('../../lib/runtime');
    await organizationService.createBranch({
      instituteId: String(formData.get('instituteId') ?? ''),
      branchCode: String(formData.get('branchCode') ?? ''),
      branchName: String(formData.get('branchName') ?? ''),
      city: formData.get('city') as string | null,
      country: formData.get('country') as string | null,
      email: formData.get('email') as string | null,
      phone: formData.get('phone') as string | null,
    }, { actorId: actorId as any });
    revalidatePath('/organization');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to create branch.' };
  }
}

// ── Department ─────────────────────────────────────────────────────────────

export async function createDepartmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actorId = await getActorId();
    const { organizationService } = await import('../../lib/runtime');
    await organizationService.createDepartment({
      branchId: String(formData.get('branchId') ?? ''),
      departmentCode: String(formData.get('departmentCode') ?? ''),
      departmentName: String(formData.get('departmentName') ?? ''),
      description: formData.get('description') as string | null,
    }, { actorId: actorId as any });
    revalidatePath('/organization');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof DomainError ? err.message : 'Failed to create department.' };
  }
}
