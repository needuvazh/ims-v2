'use server';

import { revalidatePath } from 'next/cache';
import { createUuid, type Uuid, DomainError } from '@ims/shared-kernel';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '../../lib/observability';
import { assertPermission, assertBranchScope, getSession } from '../../lib/auth-guard';

async function getActorId(): Promise<Uuid> {
  const session = await getSession();
  return createUuid(session.userId);
}

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ── Institute ──────────────────────────────────────────────────────────────

export async function createInstituteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertPermission('organization.manage');
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
      }, { actorId });
      logger.info('organization.institute.create.succeeded', { status: 'success' });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('organization.institute.create.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.institute.create.failed', { status: 'failed', message: 'Failed to create institute.', error: err as Error });
      return { success: false, error: 'Failed to create institute.' };
    }
  }, { action: 'organization.createInstitute', route: '/organization' });
}

export async function updateInstituteAction(
  instituteId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertPermission('organization.manage');
      const actorId = await getActorId();
      const { organizationService } = await import('../../lib/runtime');
      await organizationService.updateInstitute(instituteId, {
        instituteName: String(formData.get('instituteName') ?? ''),
        primaryEmail: formData.get('primaryEmail') as string | null,
        primaryPhone: formData.get('primaryPhone') as string | null,
        address: formData.get('address') as string | null,
        country: formData.get('country') as string | null,
      }, { actorId });
      logger.info('organization.institute.update.succeeded', { status: 'success', entityId: instituteId });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('organization.institute.update.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.institute.update.failed', { status: 'failed', message: 'Failed to update institute.', error: err as Error });
      return { success: false, error: 'Failed to update institute.' };
    }
  }, { action: 'organization.updateInstitute', route: '/organization' });
}

// ── Branch ─────────────────────────────────────────────────────────────────

export async function createBranchAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertPermission('organization.manage');
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
      }, { actorId });
      logger.info('organization.branch.create.succeeded', { status: 'success' });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('organization.branch.create.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.branch.create.failed', { status: 'failed', message: 'Failed to create branch.', error: err as Error });
      return { success: false, error: 'Failed to create branch.' };
    }
  }, { action: 'organization.createBranch', route: '/organization' });
}

// ── Department ─────────────────────────────────────────────────────────────

export async function createDepartmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertPermission('organization.manage');
      const branchId = String(formData.get('branchId') ?? '');
      await assertBranchScope(branchId);
      const actorId = await getActorId();
      const { organizationService } = await import('../../lib/runtime');
      await organizationService.createDepartment({
        branchId,
        departmentCode: String(formData.get('departmentCode') ?? ''),
        departmentName: String(formData.get('departmentName') ?? ''),
        description: formData.get('description') as string | null,
      }, { actorId });
      logger.info('organization.department.create.succeeded', { status: 'success' });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('organization.department.create.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.department.create.failed', { status: 'failed', message: 'Failed to create department.', error: err as Error });
      return { success: false, error: 'Failed to create department.' };
    }
  }, { action: 'organization.createDepartment', route: '/organization' });
}
