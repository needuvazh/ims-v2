'use server';

import { revalidatePath } from 'next/cache';
import { createUuid, type Uuid, DomainError } from '@ims/shared-kernel';
import type { OrganizationHierarchyNode, RecordStatus, BranchStatus } from '@ims/organization';
import { isGlobalScope, getAuthorizedBranchIds } from '@ims/shared-auth';
import { createStructuredLogger, getCurrentRequestContext, withServerActionObservability } from '../../lib/observability';
import { assertPermission, assertAnyPermission, assertBranchScope, getSession } from '../../lib/auth-guard';
import { buildOrganizationActionFailure, extractFormValues } from './organization-form-errors';

async function getActorId(): Promise<Uuid> {
  const session = await getSession();
  return createUuid(session.userId);
}

function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError || (err instanceof Error && err.name === 'DomainError');
}

function emptyToNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

// ── Institute ──────────────────────────────────────────────────────────────

export async function createInstituteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

    try {
      await assertPermission('organization.manage');
      const actorId = await getActorId();
      const { organizationService } = await import('../../lib/runtime');
      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;

      await organizationService.createInstitute({
        instituteCode: String(formData.get('instituteCode') ?? ''),
        instituteName: String(formData.get('instituteName') ?? ''),
        registrationNumber: emptyToNull(formData.get('registrationNumber')),
        taxNumber: emptyToNull(formData.get('taxNumber')),
        primaryEmail: emptyToNull(formData.get('primaryEmail')),
        primaryPhone: emptyToNull(formData.get('primaryPhone')),
        website: emptyToNull(formData.get('website')),
        address: emptyToNull(formData.get('address')),
        country: emptyToNull(formData.get('country')),
        legalNameEnglish: emptyToNull(formData.get('legalNameEnglish')),
        legalNameArabic: emptyToNull(formData.get('legalNameArabic')),
        tradeName: emptyToNull(formData.get('tradeName')),
        shortName: emptyToNull(formData.get('shortName')),
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
        currency: emptyToNull(formData.get('currency')),
        timezone: emptyToNull(formData.get('timezone')),
        language: emptyToNull(formData.get('language')),
      }, { actorId });
      logger.info('organization.institute.create.succeeded', { status: 'success' });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      logger.warn('organization.institute.create.failed', { status: 'failed', message: err instanceof Error ? err.message : 'unknown', error: err instanceof Error ? err : undefined });
      const failure = buildOrganizationActionFailure(err, 'Failed to create institute.', values, {
        domain: {
          institute_code_already_exists: 'instituteCode',
        },
        prisma: {
          instituteCode: 'instituteCode',
        },
        prismaMessages: {
          instituteCode: 'Institute Code already exists. Please use a different Institute Code.',
        },
      });
      return { success: false, ...failure };
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
    const values = extractFormValues(formData);

    try {
      await assertPermission('organization.manage');
      const actorId = await getActorId();
      const { organizationService } = await import('../../lib/runtime');
      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;

      await organizationService.updateInstitute(instituteId, {
        instituteName: String(formData.get('instituteName') ?? ''),
        registrationNumber: emptyToNull(formData.get('registrationNumber')),
        taxNumber: emptyToNull(formData.get('taxNumber')),
        primaryEmail: emptyToNull(formData.get('primaryEmail')),
        primaryPhone: emptyToNull(formData.get('primaryPhone')),
        website: emptyToNull(formData.get('website')),
        address: emptyToNull(formData.get('address')),
        country: emptyToNull(formData.get('country')),
        status: (formData.get('status') as RecordStatus) || undefined,
        legalNameEnglish: emptyToNull(formData.get('legalNameEnglish')),
        legalNameArabic: emptyToNull(formData.get('legalNameArabic')),
        tradeName: emptyToNull(formData.get('tradeName')),
        shortName: emptyToNull(formData.get('shortName')),
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
        currency: emptyToNull(formData.get('currency')),
        timezone: emptyToNull(formData.get('timezone')),
        language: emptyToNull(formData.get('language')),
      }, { actorId });
      logger.info('organization.institute.update.succeeded', { status: 'success', entityId: instituteId });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      logger.warn('organization.institute.update.failed', { status: 'failed', message: err instanceof Error ? err.message : 'unknown', error: err instanceof Error ? err : undefined });
      const failure = buildOrganizationActionFailure(err, 'Failed to update institute.', values, {
        domain: {
          institute_code_already_exists: 'instituteCode',
        },
        prisma: {
          instituteCode: 'instituteCode',
        },
        prismaMessages: {
          instituteCode: 'Institute Code already exists. Please use a different Institute Code.',
        },
      });
      return { success: false, ...failure };
    }
  }, { action: 'organization.updateInstitute', route: '/organization' });
}

// ── Branch ─────────────────────────────────────────────────────────────────

export async function createBranchAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

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
        city: emptyToNull(formData.get('city')),
        country: emptyToNull(formData.get('country')),
        email: emptyToNull(formData.get('email')),
        phone: emptyToNull(formData.get('phone')),
        branchManagerId: emptyToNull(formData.get('branchManagerId')),
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });
      logger.info('organization.branch.create.succeeded', { status: 'success' });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      logger.warn('organization.branch.create.failed', { status: 'failed', message: err instanceof Error ? err.message : 'unknown', error: err instanceof Error ? err : undefined });
      const failure = buildOrganizationActionFailure(err, 'Failed to create branch.', values, {
        domain: {
          branch_code_already_exists: 'branchCode',
          inactive_branch_cannot_be_used: 'instituteId',
          precondition_failed: 'branchManagerId',
        },
        prisma: {
          branchCode: 'branchCode',
        },
        prismaMessages: {
          branchCode: 'Branch Code already exists. Please use a different Branch Code.',
        },
      });
      return { success: false, ...failure };
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
    const values = extractFormValues(formData);

    try {
      await assertAnyPermission(['organization.manage', 'organization.branch.manage']);
      await assertBranchScope(branchId);
      const actorId = await getActorId();
      const { organizationService } = await import('../../lib/runtime');

      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;
      const status = formData.get('status') as string | null;

      await organizationService.updateBranch(branchId, {
        branchName: String(formData.get('branchName') ?? ''),
        city: emptyToNull(formData.get('city')),
        country: emptyToNull(formData.get('country')),
        email: emptyToNull(formData.get('email')),
        phone: emptyToNull(formData.get('phone')),
        branchManagerId: emptyToNull(formData.get('branchManagerId')),
        status: status ? (status as BranchStatus) : undefined,
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });
      logger.info('organization.branch.update.succeeded', { status: 'success', entityId: branchId });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      logger.warn('organization.branch.update.failed', { status: 'failed', message: err instanceof Error ? err.message : 'unknown', error: err instanceof Error ? err : undefined });
      const failure = buildOrganizationActionFailure(err, 'Failed to update branch.', values, {
        domain: {
          precondition_failed: 'branchManagerId',
          inactive_branch_cannot_be_used: 'status',
        },
      });
      return { success: false, ...failure };
    }
  }, { action: 'organization.updateBranch', route: '/organization' });
}

// ── Department ─────────────────────────────────────────────────────────────

export async function createDepartmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

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
        description: emptyToNull(formData.get('description')),
        departmentHeadId: emptyToNull(formData.get('departmentHeadId')),
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });
      logger.info('organization.department.create.succeeded', { status: 'success' });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      logger.warn('organization.department.create.failed', { status: 'failed', message: err instanceof Error ? err.message : 'unknown', error: err instanceof Error ? err : undefined });
      const failure = buildOrganizationActionFailure(err, 'Failed to create department.', values, {
        domain: {
          department_code_already_exists: 'departmentCode',
          inactive_branch_cannot_be_used: 'branchId',
          precondition_failed: 'departmentHeadId',
        },
        prisma: {
          departmentCode: 'departmentCode',
        },
        prismaMessages: {
          departmentCode: 'Department Code already exists in this branch. Please use a different Department Code.',
        },
      });
      return { success: false, ...failure };
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
    const values = extractFormValues(formData);

    try {
      await assertAnyPermission(['organization.manage', 'organization.department.manage']);
      const { organizationService } = await import('../../lib/runtime');
      const dept = await organizationService.getDepartment(departmentId);
      await assertBranchScope(dept.branchId);

      const actorId = await getActorId();
      const startStr = formData.get('effectiveStartDate') as string | null;
      const endStr = formData.get('effectiveEndDate') as string | null;
      const status = formData.get('status') as string | null;

      await organizationService.updateDepartment(departmentId, {
        departmentName: String(formData.get('departmentName') ?? ''),
        description: emptyToNull(formData.get('description')),
        departmentHeadId: emptyToNull(formData.get('departmentHeadId')),
        status: status ? (status as RecordStatus) : undefined,
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });

      logger.info('organization.department.update.succeeded', { status: 'success', entityId: departmentId });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      logger.warn('organization.department.update.failed', { status: 'failed', message: err instanceof Error ? err.message : 'unknown', error: err instanceof Error ? err : undefined });
      const failure = buildOrganizationActionFailure(err, 'Failed to update department.', values, {
        domain: {
          inactive_branch_cannot_be_used: 'status',
          precondition_failed: 'departmentHeadId',
        },
      });
      return { success: false, ...failure };
    }
  }, { action: 'organization.updateDepartment', route: '/organization' });
}

// ── Classroom ──────────────────────────────────────────────────────────────

export async function createClassroomAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return withServerActionObservability(async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const values = extractFormValues(formData);

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
        location: emptyToNull(formData.get('location')),
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });
      logger.info('organization.classroom.create.succeeded', { status: 'success' });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      logger.warn('organization.classroom.create.failed', { status: 'failed', message: err instanceof Error ? err.message : 'unknown', error: err instanceof Error ? err : undefined });
      const failure = buildOrganizationActionFailure(err, 'Failed to create classroom.', values, {
        domain: {
          classroom_name_already_exists: 'classroomName',
          inactive_branch_cannot_be_used: 'branchId',
        },
        prisma: {
          classroomName: 'classroomName',
        },
        prismaMessages: {
          classroomName: 'Classroom Name already exists in this branch. Please use a different Classroom Name.',
        },
      });
      return { success: false, ...failure };
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
    const values = extractFormValues(formData);

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
        location: emptyToNull(formData.get('location')),
        status: status ? (status as RecordStatus) : undefined,
        effectiveStartDate: startStr && startStr.trim() !== '' ? new Date(startStr) : null,
        effectiveEndDate: endStr && endStr.trim() !== '' ? new Date(endStr) : null,
      }, { actorId });

      logger.info('organization.classroom.update.succeeded', { status: 'success', entityId: classroomId });
      revalidatePath('/organization');
      return { success: true };
    } catch (err) {
      logger.warn('organization.classroom.update.failed', { status: 'failed', message: err instanceof Error ? err.message : 'unknown', error: err instanceof Error ? err : undefined });
      const failure = buildOrganizationActionFailure(err, 'Failed to update classroom.', values, {
        domain: {
          inactive_branch_cannot_be_used: 'status',
        },
      });
      return { success: false, ...failure };
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
      if (isDomainError(err)) {
        logger.warn('organization.hierarchy.get.failed', { status: 'failed', message: err.message, error: err });
        return { success: false, error: err.message };
      }
      logger.error('organization.hierarchy.get.failed', { status: 'failed', message: 'Failed to get organization hierarchy.', error: err as Error });
      return { success: false, error: 'Failed to get organization hierarchy.' };
    }
  }, { action: 'organization.getHierarchy', route: '/organization' });
}
