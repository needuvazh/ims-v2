'use server';

import { revalidatePath } from 'next/cache';
import { assertAnyPermission, getSession, assertBranchScope } from '../../lib/auth-guard';
import { prisma } from '@ims/database';
import type { CreateVenueBlockCommand } from '@ims/scheduling';

export async function createVenueBlockAction(data: CreateVenueBlockCommand) {
  try {
    await assertAnyPermission(['scheduling.venueBlock.create', 'schedule.manage']);
    await assertBranchScope(data.branchId);
    const session = await getSession();

    const { schedulingCalendarService } = await import('../../lib/runtime');
    const result = await schedulingCalendarService.createVenueBlock(data, {
      actorId: session.userId,
      branchId: data.branchId
    });

    revalidatePath('/scheduling/venues');
    return { success: true as const, data: result };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function listVenueBlocksAction(branchId: string) {
  try {
    await assertAnyPermission(['scheduling.venueBlock.read', 'schedule.manage']);
    await assertBranchScope(branchId);

    const { schedulingCalendarService } = await import('../../lib/runtime');
    const result = await schedulingCalendarService.listVenueBlocks({ branchId });

    return { success: true as const, data: result };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function getConflictDashboardAction(branchId: string) {
  try {
    await assertAnyPermission(['scheduling.conflict.read', 'schedule.manage']);
    await assertBranchScope(branchId);

    const sessions = await prisma.session.findMany({
      where: {
        batch: { branchId },
        scheduleStatus: 'Conflict',
        isDeleted: false
      },
      include: {
        batch: true
      },
      orderBy: { sessionDate: 'asc' }
    });

    return { success: true as const, data: sessions };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function resolveConflictAction(sessionId: string, action: 'RESCHEDULE' | 'CHANGE_VENUE' | 'CANCEL', payload: any) {
  try {
    await assertAnyPermission(['scheduling.session.reschedule', 'schedule.manage']);
    const sessionContext = await getSession();

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        batch: {
          select: {
            branchId: true,
          },
        },
      },
    });
    if (!session) throw new Error('ERR_SCH_SESSION_NOT_FOUND');
    await assertBranchScope(session.batch.branchId);
    const branch = await prisma.branch.findUnique({
      where: { id: session.batch.branchId },
      select: { instituteId: true },
    });
    if (!branch) throw new Error('ERR_ORG_BRANCH_NOT_FOUND');

    const { schedulingCalendarService } = await import('../../lib/runtime');
    const normalizedPayload =
      action === 'RESCHEDULE'
        ? {
            scheduledDate: payload?.scheduledDate ? new Date(payload.scheduledDate) : undefined,
            startTime: payload?.startTime,
            endTime: payload?.endTime,
          }
        : action === 'CHANGE_VENUE'
          ? {
              classroomId: payload?.classroomId,
            }
          : {};

    await schedulingCalendarService.resolveConflict(sessionId, action, normalizedPayload, {
      actorId: sessionContext.userId,
      instituteId: branch.instituteId
    });

    revalidatePath('/scheduling/conflicts');
    revalidatePath(`/batches/${session.batchId}`);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function ignoreConflictAction(sessionId: string, reason: string) {
  try {
    await assertAnyPermission(['scheduling.override.holiday', 'schedule.manage']); // Simplified check
    const sessionContext = await getSession();

    const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { batch: { select: { branchId: true } } } });
    if (!session) throw new Error('ERR_SCH_SESSION_NOT_FOUND');
    await assertBranchScope(session.batch.branchId);
    const branch = await prisma.branch.findUnique({
      where: { id: session.batch.branchId },
      select: { instituteId: true },
    });
    if (!branch) throw new Error('ERR_ORG_BRANCH_NOT_FOUND');

    const { schedulingCalendarService } = await import('../../lib/runtime');
    await schedulingCalendarService.ignoreConflict(sessionId, reason, {
      actorId: sessionContext.userId
    });

    revalidatePath('/scheduling/conflicts');
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}
