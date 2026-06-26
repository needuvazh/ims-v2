'use server';

import { revalidatePath } from 'next/cache';
import { createUuid, type Uuid, DomainError } from '@ims/shared-kernel';
import type { OrganizationHierarchyNode, RecordStatus } from '@ims/organization';
import { isGlobalScope, getAuthorizedBranchIds } from '@ims/shared-auth';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '../../lib/observability';
import { assertPermission, assertAnyPermission, assertBranchScope, getSession } from '../../lib/auth-guard';

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
      await assertAnyPermission(['organization.manage', 'organization.branch.manage']);
      const actorId = await getActorId();
      const { organizationService } = await import('../../lib/runtime');

      const managerId = formData.get('branchManagerId') as string | null;
      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;

      await organizationService.createBranch({
        instituteId: String(formData.get('instituteId') ?? ''),
        branchCode: String(formData.get('branchCode') ?? ''),
        branchName: String(formData.get('branchName') ?? ''),
        city: formData.get('city') as string | null,
        country: formData.get('country') as string | null,
        email: formData.get('email') as string | null,
        phone: formData.get('phone') as string | null,
        branchManagerId: managerId && managerId.trim() !== '' ? managerId : null,
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
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

export async function updateBranchAction(
  branchId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertAnyPermission(['organization.manage', 'organization.branch.manage']);
      await assertBranchScope(branchId);
      const actorId = await getActorId();
      const { organizationService } = await import('../../lib/runtime');

      const managerId = formData.get('branchManagerId') as string | null;
      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;
      const status = formData.get('status') as string | null;

      await organizationService.updateBranch(branchId, {
        branchName: String(formData.get('branchName') ?? ''),
        city: formData.get('city') as string | null,
        country: formData.get('country') as string | null,
        email: formData.get('email') as string | null,
        phone: formData.get('phone') as string | null,
        branchManagerId: managerId && managerId.trim() !== '' ? managerId : null,
        status: status ? (status as RecordStatus) : undefined,
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });
      logger.info('organization.branch.update.succeeded', { status: 'success', entityId: branchId });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('organization.branch.update.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.branch.update.failed', { status: 'failed', message: 'Failed to update branch.', error: err as Error });
      return { success: false, error: 'Failed to update branch.' };
    }
  }, { action: 'organization.updateBranch', route: '/organization' });
}

// ── Department ─────────────────────────────────────────────────────────────

export async function createDepartmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertAnyPermission(['organization.manage', 'organization.department.manage']);
      const branchId = String(formData.get('branchId') ?? '');
      await assertBranchScope(branchId);
      const actorId = await getActorId();
      const { organizationService } = await import('../../lib/runtime');

      const headId = formData.get('departmentHeadId') as string | null;
      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;

      await organizationService.createDepartment({
        branchId,
        departmentCode: String(formData.get('departmentCode') ?? ''),
        departmentName: String(formData.get('departmentName') ?? ''),
        description: formData.get('description') as string | null,
        departmentHeadId: headId && headId.trim() !== '' ? headId : null,
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
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

export async function updateDepartmentAction(
  departmentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertAnyPermission(['organization.manage', 'organization.department.manage']);
      const { organizationService } = await import('../../lib/runtime');
      const dept = await organizationService.getDepartment(departmentId);
      await assertBranchScope(dept.branchId);

      const actorId = await getActorId();
      const headId = formData.get('departmentHeadId') as string | null;
      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;
      const status = formData.get('status') as string | null;

      await organizationService.updateDepartment(departmentId, {
        departmentName: String(formData.get('departmentName') ?? ''),
        description: formData.get('description') as string | null,
        departmentHeadId: headId && headId.trim() !== '' ? headId : null,
        status: status ? (status as RecordStatus) : undefined,
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });

      logger.info('organization.department.update.succeeded', { status: 'success', entityId: departmentId });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('organization.department.update.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.department.update.failed', { status: 'failed', message: 'Failed to update department.', error: err as Error });
      return { success: false, error: 'Failed to update department.' };
    }
  }, { action: 'organization.updateDepartment', route: '/organization' });
}

// ── Classroom ──────────────────────────────────────────────────────────────

export async function createClassroomAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertAnyPermission(['organization.manage', 'organization.classroom.manage']);
      const branchId = String(formData.get('branchId') ?? '');
      await assertBranchScope(branchId);
      const actorId = await getActorId();
      const { organizationService } = await import('../../lib/runtime');

      const capacity = Number(formData.get('capacity') ?? 0);
      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;

      await organizationService.createClassroom({
        branchId,
        classroomName: String(formData.get('classroomName') ?? ''),
        capacity,
        location: formData.get('location') as string | null,
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });
      logger.info('organization.classroom.create.succeeded', { status: 'success' });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('organization.classroom.create.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.classroom.create.failed', { status: 'failed', message: 'Failed to create classroom.', error: err as Error });
      return { success: false, error: 'Failed to create classroom.' };
    }
  }, { action: 'organization.createClassroom', route: '/organization' });
}

export async function updateClassroomAction(
  classroomId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertAnyPermission(['organization.manage', 'organization.classroom.manage']);
      const { organizationService } = await import('../../lib/runtime');
      const room = await organizationService.getClassroom(classroomId);
      await assertBranchScope(room.branchId);

      const actorId = await getActorId();
      const capacity = Number(formData.get('capacity') ?? 0);
      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;
      const status = formData.get('status') as string | null;

      await organizationService.updateClassroom(classroomId, {
        classroomName: String(formData.get('classroomName') ?? ''),
        capacity,
        location: formData.get('location') as string | null,
        status: status ? (status as RecordStatus) : undefined,
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });

      logger.info('organization.classroom.update.succeeded', { status: 'success', entityId: classroomId });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('organization.classroom.update.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.classroom.update.failed', { status: 'failed', message: 'Failed to update classroom.', error: err as Error });
      return { success: false, error: 'Failed to update classroom.' };
    }
  }, { action: 'organization.updateClassroom', route: '/organization' });
}

export async function getOrganizationHierarchyAction(
  instituteId: string
): Promise<ActionResult<OrganizationHierarchyNode>> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      await assertAnyPermission([
        'organization.manage',
        'organization.branch.manage',
        'organization.department.manage',
        'organization.classroom.manage',
      ]);
      const session = await getSession();
      const { organizationService } = await import('../../lib/runtime');
      const hierarchy = await organizationService.getOrganizationHierarchy(instituteId);

      // Inject branch filtering using user active session data scopes
      const globalScope = isGlobalScope(session);
      if (!globalScope) {
        const authorizedBranchIds = getAuthorizedBranchIds(session) || [];
        if (hierarchy.children) {
          hierarchy.children = hierarchy.children.filter((branch) =>
            authorizedBranchIds.includes(branch.id)
          );
        }
      }

      logger.info('organization.hierarchy.get.succeeded', { status: 'success', entityId: instituteId, entityType: 'Institute' });
      return { success: true, data: hierarchy };
    } catch (err) {
      if (err instanceof DomainError) {
        logger.warn('organization.hierarchy.get.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.hierarchy.get.failed', { status: 'failed', message: 'Failed to get organization hierarchy.', error: err as Error });
      return { success: false, error: 'Failed to get organization hierarchy.' };
    }
  }, { action: 'organization.getHierarchy', route: '/organization' });
}
