'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@ims/database';
import { createUuid } from '@ims/shared-kernel';
import { assertPermission, getSession } from '../../lib/auth-guard';

function buildAttendanceActionFailure(error: any) {
  const message = error?.message || 'An unexpected attendance error occurred.';

  if (message.includes('ERR_ATT_SESSION_NOT_FOUND')) {
    return {
      success: false as const,
      error: 'Attendance session or source delivery session was not found.',
    };
  }
  if (message.includes('ERR_ATT_SESSION_BRANCH_FORBIDDEN')) {
    return {
      success: false as const,
      error: 'You are not authorized to open attendance for this branch.',
    };
  }
  if (message.includes('ERR_ATT_SESSION_LOCKED')) {
    return {
      success: false as const,
      error: 'This attendance session cannot be edited in its current state.',
    };
  }

  return { success: false as const, error: message };
}

export async function openAttendanceSessionAction(sessionId: string) {
  try {
    await assertPermission('attendance.session.open');
    const session = await getSession();
    const { attendanceService, branchScopeResolver } =
      await import('../../lib/runtime');

    const allowedBranchIds = (
      await branchScopeResolver.resolveAllowedBranches(
        createUuid(session.userId),
        session.activeBranchId ? createUuid(session.activeBranchId) : null,
      )
    ).map((value) => String(value));

    const sourceSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { batch: true },
    });

    if (
      !sourceSession ||
      sourceSession.isDeleted ||
      sourceSession.batch.isDeleted
    ) {
      throw new Error('ERR_ATT_SESSION_NOT_FOUND');
    }

    if (
      allowedBranchIds.length > 0 &&
      !allowedBranchIds.includes(sourceSession.batch.branchId)
    ) {
      throw new Error('ERR_ATT_SESSION_BRANCH_FORBIDDEN');
    }

    const attendanceContext = {
      actorId: session.userId,
      branchId: sourceSession.batch.branchId,
      allowedBranchIds,
      userAgent: null,
      ipAddress: null,
    };

    const attendanceSession = await prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceSession.findUnique({
        where: { sessionId },
        include: {
          records: {
            where: { isDeleted: false },
            select: { id: true },
          },
        },
      });

      if (existing) {
        if (existing.records.length === 0) {
          await attendanceService.generateRoster(
            existing.id,
            attendanceContext,
            tx,
          );
        }
        return existing;
      }

      const opened = await attendanceService.openSession(
        { sessionId, notes: null },
        attendanceContext,
        tx,
      );
      await attendanceService.generateRoster(opened.id, attendanceContext, tx);
      return opened;
    });

    revalidatePath(`/batches/${sourceSession.batchId}`);
    revalidatePath('/attendance/dashboard');
    revalidatePath('/attendance/sessions');
    revalidatePath('/attendance/records');
    revalidatePath('/attendance/corrections');
    revalidatePath('/attendance/reports');

    return { success: true as const, data: attendanceSession };
  } catch (error: any) {
    return buildAttendanceActionFailure(error);
  }
}
