'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission, getSession } from '../../lib/auth-guard';
import { prisma } from '@ims/database';

export async function createBatchAction(data: any) {
  try {
    await assertPermission('schedule.manage');
    const session = await getSession();

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.createBatch(data, session.userId);

    revalidatePath('/batches');
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function updateBatchAction(id: string, version: number, data: any) {
  try {
    await assertPermission('schedule.manage');
    const session = await getSession();

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.updateBatch(id, data, version, session.userId);

    revalidatePath('/batches');
    revalidatePath(`/batches/${id}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function transitionBatchStatusAction(id: string, targetStatus: string, version: number) {
  try {
    await assertPermission('schedule.manage');
    const session = await getSession();

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.transitionBatchStatus(id, targetStatus, version, session.userId);

    revalidatePath('/batches');
    revalidatePath(`/batches/${id}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function assignTrainerAction(batchId: string, data: any) {
  try {
    await assertPermission('schedule.manage');
    const session = await getSession();

    const { batchService } = await import('../../lib/runtime');
    const result = await batchService.assignTrainer(batchId, data, session.userId);

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function addToWaitlistAction(batchId: string, data: any) {
  try {
    await assertPermission('enrollment.create');
    const session = await getSession();

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');

    const active = await prisma.waitingList.findMany({
      where: { batchId, status: 'Waiting', isDeleted: false },
      orderBy: { queuePosition: 'asc' },
    });
    const alreadyQueued = active.some(w => 
      (data.studentId && w.studentId === data.studentId) || (data.leadId && w.leadId === data.leadId)
    );
    if (alreadyQueued) throw new Error('ERR_CRS_WAITLIST_DUPLICATE');

    const result = await prisma.waitingList.create({
      data: {
        id: crypto.randomUUID(),
        courseId: batch.courseId,
        batchId,
        studentId: data.studentId || null,
        leadId: data.leadId || null,
        queuePosition: active.length + 1,
        status: 'Waiting',
        createdBy: session.userId,
      }
    });

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function manualPromoteAction(batchId: string, candidateId: string) {
  try {
    await assertPermission('enrollment.create');
    const session = await getSession();

    return await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: batchId } });
      if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');

      const entry = await tx.waitingList.findUnique({ where: { id: candidateId } });
      if (!entry || entry.batchId !== batchId || entry.status !== 'Waiting') {
        throw new Error('ERR_CRS_WAITLIST_ENTRY_NOT_FOUND');
      }

      if (batch.currentEnrollmentCount >= batch.capacity && !batch.allowOverbooking) {
        throw new Error('ERR_CRS_BATCH_FULL');
      }

      const promoted = await tx.waitingList.update({
        where: { id: candidateId },
        data: { status: 'Promoted' },
      });

      const activeQueue = await tx.waitingList.findMany({
        where: { batchId, status: 'Waiting', isDeleted: false },
        orderBy: { queuePosition: 'asc' },
      });
      for (const nextEntry of activeQueue) {
        if (nextEntry.queuePosition > entry.queuePosition) {
          await tx.waitingList.update({
            where: { id: nextEntry.id },
            data: { queuePosition: nextEntry.queuePosition - 1 },
          });
        }
      }

      await tx.batch.update({
        where: { id: batchId },
        data: { currentEnrollmentCount: { increment: 1 } },
      });

      revalidatePath(`/batches/${batchId}`);
      return { success: true as const, data: promoted };
    });
  } catch (error: any) {
    return buildBatchActionFailure(error);
  }
}

export async function createSessionAction(batchId: string, data: any) {
  try {
    await assertPermission('schedule.manage');
    const session = await getSession();

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('ERR_CRS_BATCH_NOT_FOUND');

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
        createdBy: session.userId,
      }
    });

    revalidatePath(`/batches/${batchId}`);
    return { success: true as const, data: result };
  } catch (error: any) {
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
    return { success: false as const, error: 'A batch with this code already exists.' };
  }
  if (message.includes('ERR_CRS_INVALID_DATE_RANGE')) {
    return { success: false as const, error: message };
  }
  if (message.includes('ERR_CRS_BATCH_NO_TRAINER')) {
    return { success: false as const, error: 'An open batch requires at least one Primary Trainer.' };
  }
  if (message.includes('ERR_CRS_BATCH_FULL')) {
    return { success: false as const, error: 'Batch capacity limit has been reached.' };
  }
  if (message.includes('ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED')) {
    return { success: false as const, error: 'A primary trainer is already assigned for this range.' };
  }
  if (message.includes('ERR_CRS_TRAINER_SCHEDULE_CONFLICT')) {
    return { success: false as const, error: message };
  }
  if (message.includes('ERR_CRS_INVALID_STATE_TRANSITION')) {
    return { success: false as const, error: message };
  }
  if (message.includes('ERR_CRS_WALKIN_COMPLETION_NOT_ALLOWED')) {
    return { success: false as const, error: 'This course does not allow walk-in completions.' };
  }
  if (message.includes('ERR_CRS_COURSE_NOT_PUBLISHED')) {
    return { success: false as const, error: 'A batch can only be created/updated for active published courses.' };
  }

  return {
    success: false as const,
    status: 'SYSTEM_ERROR',
    error: message,
  };
}
