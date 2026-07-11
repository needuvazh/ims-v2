'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  assertPermission,
  getSession,
  assertBranchScope,
} from '../../lib/auth-guard';
import { prisma } from '@ims/database';

export async function createBatchAction(data: any) {
  try {
    await assertPermission('batch.delivery.create');
    const session = await getSession();

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.createBatch(data, session.userId);

    revalidatePath('/batches');
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function updateBatchAction(
  id: string,
  version: number,
  data: any,
) {
  try {
    await assertPermission('batch.delivery.update');
    const session = await getSession();

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.updateBatch(
      id,
      data,
      version,
      session.userId,
    );

    revalidatePath('/batches');
    revalidatePath(`/batches/${id}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function transitionBatchStatusAction(
  id: string,
  targetStatus: string,
  version: number,
) {
  try {
    await assertPermission('batch.delivery.transition');
    const session = await getSession();

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.transitionBatchStatus(
      id,
      targetStatus,
      version,
      session.userId,
    );

    revalidatePath('/batches');
    revalidatePath(`/batches/${id}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function assignTrainerAction(batchId: string, data: any) {
  try {
    await assertPermission('batch.delivery.assign');
    const session = await getSession();

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.assignTrainer(
      batchId,
      data,
      session.userId,
    );

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function unassignTrainerAction(batchId: string, assignmentId: string) {
  try {
    await assertPermission('batch.delivery.assign');
    const session = await getSession();

    const { batchService } = await import('../../lib/runtime');
    await batchService.removeTrainer(
      batchId,
      assignmentId,
      session.userId,
    );

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}


export async function addToWaitlistAction(batchId: string, data: any) {
  try {
    await assertPermission('waitinglist.manage');
    const session = await getSession();

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    await assertBranchScope(batch.branchId);

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.enqueueWaitlist({
      batchId,
      studentProfileId: data.studentProfileId || data.studentId || null,
      leadId: data.leadId || null,
      actorId: session.userId,
    });

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    console.error('SERVER ACTION ERROR (addToWaitlistAction):', error);
    return buildBatchActionFailure(error);
  }
}

export async function manualPromoteAction(batchId: string, waitlistId: string) {
  try {
    await assertPermission('waitinglist.manage');
    const session = await getSession();

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    await assertBranchScope(batch.branchId);

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.manualPromoteWaitlist(
      batchId,
      waitlistId,
      session.userId,
    );

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function skipWaitlistAction(
  batchId: string,
  waitlistId: string,
  reason: string,
) {
  try {
    await assertPermission('waitinglist.manage');
    const session = await getSession();

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    await assertBranchScope(batch.branchId);

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.skipWaitlistEntry(
      batchId,
      waitlistId,
      reason,
      session.userId,
    );

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function reactivateWaitlistAction(
  batchId: string,
  waitlistId: string,
) {
  try {
    await assertPermission('waitinglist.manage');
    const session = await getSession();

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    await assertBranchScope(batch.branchId);

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.reactivateWaitlistEntry(
      batchId,
      waitlistId,
      session.userId,
    );

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function removeWaitlistAction(
  batchId: string,
  waitlistId: string,
) {
  try {
    await assertPermission('waitinglist.manage');
    const session = await getSession();

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    await assertBranchScope(batch.branchId);

    const { batchService } = await import('../../lib/runtime');
    await batchService.removeWaitlistEntry(batchId, waitlistId, session.userId);

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function reorderWaitlistAction(
  batchId: string,
  waitlistIds: string[],
) {
  try {
    await assertPermission('waitinglist.manage');
    const session = await getSession();

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    await assertBranchScope(batch.branchId);

    const { batchService } = await import('../../lib/runtime');
    await batchService.reorderWaitlist(batchId, waitlistIds, session.userId);

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function createSessionAction(batchId: string, data: any) {
  try {
    await assertPermission('schedule.manage');
    const sessionContext = await getSession();

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { course: true },
    });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    const branch = await prisma.branch.findUnique({
      where: { id: batch.branchId },
      select: { instituteId: true },
    });
    if (!branch) throw new Error('ERR_ORG_BRANCH_NOT_FOUND');

    const { schedulingCalendarService } = await import('../../lib/runtime');
    const validation = await schedulingCalendarService.validateSession({
      branchId: batch.branchId,
      instituteId: branch.instituteId,
      scheduledDate: new Date(data.sessionDate),
      startTime: data.startTime,
      endTime: data.endTime,
      trainerId: data.trainerId || null,
      classroomId: data.classroomId || null,
      batchId: batch.id,
    });

    if (!validation.isValid) {
      throw new Error(
        `Scheduling conflict: ${validation.conflicts[0].message}`,
      );
    }

    const result = await prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        batchId,
        sessionNumber: parseInt(data.sessionNumber, 10),
        titleEnglish: data.titleEnglish,
        titleArabic: data.titleArabic,
        sessionDate: new Date(data.sessionDate),
        startTime: data.startTime,
        endTime: data.endTime,
        classroomId: data.classroomId || null,
        trainerId: data.trainerId || null,
        status: 'Scheduled',
        scheduleStatus: 'Published',
        createdBy: sessionContext.userId,
      },
    });

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function updateSessionAction(
  batchId: string,
  sessionId: string,
  data: any,
) {
  try {
    await assertPermission('schedule.manage');
    const sessionContext = await getSession();

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { course: true },
    });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    const branch = await prisma.branch.findUnique({
      where: { id: batch.branchId },
      select: { instituteId: true },
    });
    if (!branch) throw new Error('ERR_ORG_BRANCH_NOT_FOUND');

    const { schedulingCalendarService } = await import('../../lib/runtime');
    const validation = await schedulingCalendarService.validateSession({
      branchId: batch.branchId,
      instituteId: branch.instituteId,
      scheduledDate: new Date(data.sessionDate),
      startTime: data.startTime,
      endTime: data.endTime,
      trainerId: data.trainerId || null,
      classroomId: data.classroomId || null,
      batchId: batch.id,
      sessionId: sessionId,
    });

    if (!validation.isValid) {
      throw new Error(
        `Scheduling conflict: ${validation.conflicts[0].message}`,
      );
    }

    const result = await prisma.session.update({
      where: { id: sessionId },
      data: {
        sessionNumber: parseInt(data.sessionNumber, 10),
        titleEnglish: data.titleEnglish,
        titleArabic: data.titleArabic,
        sessionDate: new Date(data.sessionDate),
        startTime: data.startTime,
        endTime: data.endTime,
        classroomId: data.classroomId || null,
        trainerId: data.trainerId || null,
        scheduleStatus: 'Published',
        conflictType: null,
        isConflictIgnored: false,
        overrideReason: null,
      },
    });

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function cloneBatchAction(data: any) {
  try {
    await assertPermission('batch.delivery.create');
    await assertPermission('schedule.manage');
    const sessionContext = await getSession();

    await assertBranchScope(data.branchId);

    const result = await prisma.$transaction(async (tx) => {
      // Check Course exists and is Published first
      const course = await tx.course.findUnique({
        where: { id: data.courseId, isDeleted: false },
      });
      if (!course) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }
      if (course.status !== 'Published') {
        throw new Error('ERR_CRS_COURSE_NOT_PUBLISHED');
      }

      // Generate new batch code
      const courseCode = course.courseCode.toUpperCase();
      const count = await tx.batch.count({
        where: { courseId: data.courseId },
      });
      const serial = (count + 1).toString().padStart(3, '0');
      const finalBatchCode = `${courseCode}-${serial}`;

      // Date validations
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      if (endDate < startDate) {
        throw new Error('ERR_CRS_INVALID_DATE_RANGE');
      }
      const courseStart = new Date(course.effectiveStartDate);
      if (startDate < courseStart) {
        throw new Error('ERR_CRS_INVALID_DATE_RANGE');
      }
      if (course.effectiveEndDate) {
        const courseEnd = new Date(course.effectiveEndDate);
        if (endDate > courseEnd) {
          throw new Error('ERR_CRS_INVALID_DATE_RANGE');
        }
      }

      // Verify corporate account if provided
      if (data.corporateAccountId) {
        const corp = await tx.corporateAccount.findUnique({
          where: { id: data.corporateAccountId },
        });
        if (!corp) {
          throw new Error('ERR_CRS_INVALID_CORPORATE_ACCOUNT');
        }
      }

      // Create batch
      const newBatchId = crypto.randomUUID();
      const batch = await tx.batch.create({
        data: {
          id: newBatchId,
          courseId: data.courseId,
          branchId: data.branchId,
          classroomId: null,
          batchCode: finalBatchCode,
          batchNameEnglish: data.batchNameEnglish,
          batchNameArabic: data.batchNameArabic,
          startDate,
          endDate,
          capacity: data.capacity,
          currentEnrollmentCount: 0,
          waitingListEnabled: data.waitingListEnabled,
          allowOverbooking: data.allowOverbooking,
          isWalkIn: data.isWalkIn,
          corporateAccountId: data.corporateAccountId || null,
          status: 'Draft',
          version: 1,
          createdBy: sessionContext.userId,
        },
      });

      // Assign Primary Trainer if provided
      if (data.primaryTrainerId) {
        await tx.batchTrainer.create({
          data: {
            id: crypto.randomUUID(),
            batchId: newBatchId,
            trainerId: data.primaryTrainerId,
            role: 'Primary',
            assignedFrom: startDate,
            assignedTo: endDate,
            status: 'Active',
            createdBy: sessionContext.userId,
          },
        });
      }

      // Create duplicate sessions
      const branchObj = await tx.branch.findUnique({
        where: { id: data.branchId },
        select: { instituteId: true },
      });
      if (!branchObj) throw new Error('ERR_ORG_BRANCH_NOT_FOUND');

      const { schedulingCalendarService } = await import('../../lib/runtime');

      const createdSessions = [];
      if (data.sessions && Array.isArray(data.sessions)) {
        for (const s of data.sessions) {
          const validation = await schedulingCalendarService.validateSession(
            {
              branchId: data.branchId,
              instituteId: branchObj.instituteId,
              scheduledDate: new Date(s.sessionDate),
              startTime: s.startTime,
              endTime: s.endTime,
              trainerId: s.trainerId || null,
              classroomId: s.classroomId || null,
              batchId: newBatchId,
            },
            tx,
          );

          const validConflictTypes = [
            'HOLIDAY',
            'VENUE',
            'TRAINER_OVERLAP',
            'CLASSROOM_OVERLAP',
            'OPERATING_HOURS',
          ];
          let sessionConflictType: any = null;
          let scheduleStatus: any = 'Published';

          if (!validation.isValid && validation.conflicts.length > 0) {
            scheduleStatus = 'Conflict';
            const mainConflict = validation.conflicts[0].type;
            if (validConflictTypes.includes(mainConflict)) {
              sessionConflictType = mainConflict;
            }
          }

          const sessionRecord = await tx.session.create({
            data: {
              id: crypto.randomUUID(),
              batchId: newBatchId,
              sessionNumber: parseInt(s.sessionNumber, 10),
              titleEnglish: s.titleEnglish,
              titleArabic: s.titleArabic,
              sessionDate: new Date(s.sessionDate),
              startTime: s.startTime,
              endTime: s.endTime,
              classroomId: s.classroomId || null,
              trainerId: s.trainerId || null,
              status: 'Scheduled',
              scheduleStatus,
              conflictType: sessionConflictType,
              createdBy: sessionContext.userId,
            },
          });
          createdSessions.push(sessionRecord);
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          module: 'TrainingDelivery',
          performedBy: sessionContext.userId,
          performedAt: new Date(),
          entityType: 'Batch',
          entityId: newBatchId,
          action: 'BATCH_CLONED',
          newValue: JSON.parse(JSON.stringify(batch)),
        },
      });

      return { batch, sessions: createdSessions };
    });

    revalidatePath('/batches');
    return { success: true as const, data: result };
  } catch (error: any) {
    console.error('cloneBatchAction error:', error);
    return buildBatchActionFailure(error);
  }
}


function buildBatchActionFailure(error: any) {
  if (error instanceof z.ZodError) {
    return {
      success: false as const,
      status: 'VALIDATION_ERROR',
      fieldErrors: error.flatten().fieldErrors,
      error: 'Please fix the errors in the form.',
    };
  }

  const message = error?.message || 'An unknown error occurred';

  if (message.includes('ERR_CRS_DUPLICATE_BATCH_CODE')) {
    return {
      success: false as const,
      error: 'A batch with this code already exists.',
    };
  }
  if (message.includes('ERR_CRS_INVALID_DATE_RANGE')) {
    return { success: false as const, error: message };
  }
  if (message.includes('ERR_CRS_BATCH_NO_TRAINER')) {
    return {
      success: false as const,
      error: 'An open batch requires at least one Primary Trainer.',
    };
  }
  if (message.includes('ERR_CRS_BATCH_FULL')) {
    return {
      success: false as const,
      error: 'Batch capacity limit has been reached.',
    };
  }
  if (message.includes('ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED')) {
    return {
      success: false as const,
      error: 'A primary trainer is already assigned for this range.',
    };
  }
  if (message.includes('ERR_CRS_TRAINER_SCHEDULE_CONFLICT')) {
    return { success: false as const, error: message };
  }
  if (message.includes('ERR_CRS_INVALID_STATE_TRANSITION')) {
    return { success: false as const, error: message };
  }
  if (message.includes('ERR_CRS_WALKIN_COMPLETION_NOT_ALLOWED')) {
    return {
      success: false as const,
      error: 'This course does not allow walk-in completions.',
    };
  }
  if (message.includes('ERR_CRS_COURSE_NOT_PUBLISHED')) {
    return {
      success: false as const,
      error:
        'A batch can only be created/updated for active published courses.',
    };
  }
  if (
    message.includes('ERR_CRS_TRAINER_BRANCH_MISMATCH') ||
    error?.code === 'ERR_CRS_TRAINER_BRANCH_MISMATCH' ||
    message.includes('Trainer registered branch does not match batch branch.')
  ) {
    return {
      success: false as const,
      error: 'Trainer registered branch does not match batch branch.',
    };
  }

  return {
    success: false as const,
    status: 'SYSTEM_ERROR',
    error: message,
  };
}
