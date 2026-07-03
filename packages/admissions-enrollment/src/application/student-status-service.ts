import { PrismaClient, StudentStatus, Prisma } from '@prisma/client';

/**
 * Valid lifecycle transitions for a StudentProfile.
 *
 * Pending  → Active     (admission approved / first enrollment confirmed)
 * Active   → Suspended  (admin action: disciplinary / payment hold)
 * Active   → Archived   (admin action: no longer active at institute)
 * Suspended → Active    (suspension lifted)
 * Suspended → Archived  (permanently closed after suspension)
 *
 * Archived can be restored by policy.
 */
const ALLOWED_TRANSITIONS: Record<string, StudentStatus[]> = {
  Pending:   ['Active'],
  Active:    ['Suspended', 'Archived'],
  Suspended: ['Active', 'Archived'],
  Inactive:  ['Active', 'Archived'],
  Archived:  ['Active', 'Suspended'],
};

export class StudentStatusService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Transition a StudentProfile to a new status, writing both:
   *  - a StudentStatusHistory row (the per-profile timeline)
   *  - an AuditLog row (the institute-wide audit trail)
   *
   * All writes happen inside a single transaction. If `tx` is provided the
   * caller's outer transaction is joined; otherwise a new one is started.
   */
  async transition(params: {
    studentProfileId: string;
    newStatus: StudentStatus;
    changeReason: string;
    actorId: string;
    branchId: string;
    effectiveDate?: Date;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const { studentProfileId, newStatus, changeReason, actorId, branchId, effectiveDate } = params;

    const run = async (client: Prisma.TransactionClient) => {
      // 1. Load the current profile
      const profile = await client.studentProfile.findUnique({
        where: { id: studentProfileId },
        select: { id: true, studentStatus: true, isDeleted: true, branchId: true }
      });

      if (!profile || profile.isDeleted) {
        throw new Error('ERR_STU_STATUS_PROFILE_NOT_FOUND');
      }

      const oldStatus = profile.studentStatus as string;

      // 2. Validate the transition
      const allowed = ALLOWED_TRANSITIONS[oldStatus] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `ERR_STU_STATUS_INVALID_TRANSITION: ${oldStatus} → ${newStatus} is not permitted`
        );
      }

      const now = new Date();
      const effectiveStart = effectiveDate ?? now;

      // 3. Close the most recent open status history row (effectiveEndDate = today)
      await client.studentStatusHistory.updateMany({
        where: {
          studentProfileId,
          effectiveEndDate: null,
          isDeleted: false,
        },
        data: {
          effectiveEndDate: effectiveStart,
          updatedAt: now,
          updatedBy: actorId,
        }
      });

      // 4. Write the new status history row
      await client.studentStatusHistory.create({
        data: {
          studentProfileId,
          branchId,
          oldStatus,
          newStatus,
          changeReason,
          effectiveStartDate: effectiveStart,
          effectiveEndDate: null,
          requestedBy: actorId,
          status: 'Active',
          createdBy: actorId,
          updatedBy: actorId,
        }
      });

      // 5. Update the StudentProfile itself
      await client.studentProfile.update({
        where: { id: studentProfileId },
        data: {
          studentStatus: newStatus,
          status: newStatus,
          updatedAt: now,
          updatedBy: actorId,
          // When archiving, set effectiveEndDate to today
          ...(newStatus === 'Archived' ? { effectiveEndDate: effectiveStart } : {}),
        }
      });

      // 6. Write an AuditLog entry
      await client.auditLog.create({
        data: {
          action: 'StudentStatusChanged',
          entityType: 'StudentProfile',
          entityId: studentProfileId,
          performedBy: actorId,
          branchId,
          performedAt: now,
          module: 'AdmissionsEnrollment',
          oldValue: { status: oldStatus },
          newValue: { status: newStatus, changeReason },
        }
      });
    };

    if (params.tx) {
      await run(params.tx);
    } else {
      await this.prisma.$transaction(run);
    }
  }

  /**
   * Convenience: activate a Pending profile (called after first admission approval).
   */
  async activatePending(params: {
    studentProfileId: string;
    actorId: string;
    branchId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    await this.transition({
      ...params,
      newStatus: 'Active',
      changeReason: 'Admission approved — profile activated',
    });
  }

  /**
   * Convenience: suspend an active profile (counsellor / branch-manager action).
   */
  async suspend(params: {
    studentProfileId: string;
    actorId: string;
    branchId: string;
    reason: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    await this.transition({
      studentProfileId: params.studentProfileId,
      actorId: params.actorId,
      branchId: params.branchId,
      newStatus: 'Suspended',
      changeReason: params.reason,
      tx: params.tx,
    });
  }

  /**
   * Convenience: lift a suspension.
   */
  async reinstate(params: {
    studentProfileId: string;
    actorId: string;
    branchId: string;
    reason: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    await this.transition({
      studentProfileId: params.studentProfileId,
      actorId: params.actorId,
      branchId: params.branchId,
      newStatus: 'Active',
      changeReason: params.reason,
      tx: params.tx,
    });
  }

  /**
   * Convenience: archive a profile (terminal state — cannot be undone).
   */
  async archive(params: {
    studentProfileId: string;
    actorId: string;
    branchId: string;
    reason: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    await this.transition({
      studentProfileId: params.studentProfileId,
      actorId: params.actorId,
      branchId: params.branchId,
      newStatus: 'Archived',
      changeReason: params.reason,
      tx: params.tx,
    });
  }
}
