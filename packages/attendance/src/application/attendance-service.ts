import { PrismaClient, Prisma } from '@prisma/client';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import {
  attendanceConflict,
  attendanceForbidden,
  attendanceNotFound,
  attendancePrecondition,
} from '../domain/errors';
import {
  AttendanceActionContext,
  AttendanceCorrectionDto,
  AttendanceRecordStatus,
  AttendanceSessionDto,
  AttendanceSessionStatus,
  AttendanceSummaryDto,
  openAttendanceSessionSchema,
  markAttendanceRecordSchema,
  bulkMarkAttendanceSchema,
  submitAttendanceSessionSchema,
  reopenAttendanceSessionSchema,
  attendanceCorrectionRequestSchema,
} from '../domain/attendance';
import type {
  AttendanceAlertRepository,
  AttendanceCorrectionRepository,
  AttendanceDbClient,
  AttendanceQueryRepository,
  AttendanceRecordRepository,
  AttendanceSessionRepository,
} from '../domain/repositories';
import { z } from 'zod';

const editableSessionStatuses: AttendanceSessionStatus[] = [
  'Draft',
  'Open',
  'Reopened',
];

export type OpenAttendanceSessionInput = z.infer<
  typeof openAttendanceSessionSchema
>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceRecordSchema>;
export type BulkMarkAttendanceInput = z.infer<typeof bulkMarkAttendanceSchema>;
export type SubmitAttendanceInput = z.infer<
  typeof submitAttendanceSessionSchema
>;
export type ReopenAttendanceInput = z.infer<
  typeof reopenAttendanceSessionSchema
>;
export type CorrectionRequestInput = z.infer<
  typeof attendanceCorrectionRequestSchema
>;

function muscatDateOnly(value: Date | string | null | undefined): Date {
  const source =
    value instanceof Date ? value : value ? new Date(value) : new Date();
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Muscat',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(source);
  return new Date(`${formatted}T00:00:00+04:00`);
}

function isAllowedBranch(
  context: AttendanceActionContext,
  branchId: string,
): boolean {
  return (
    context.allowedBranchIds.length === 0 ||
    context.allowedBranchIds.includes(branchId)
  );
}

function assertAllowedBranch(
  context: AttendanceActionContext,
  branchId: string,
): void {
  if (!isAllowedBranch(context, branchId)) {
    throw attendanceForbidden(
      'ERR_ATT_SESSION_BRANCH_FORBIDDEN',
      'You are not authorized to access this branch.',
    );
  }
}

function validateRecordInput(
  status: AttendanceRecordStatus,
  remarks?: string | null,
  lateMinutes?: number | null,
): void {
  if (
    status === 'Late' &&
    (!Number.isFinite(lateMinutes ?? NaN) || (lateMinutes ?? 0) <= 0)
  ) {
    throw attendancePrecondition(
      'ERR_ATT_LATE_MINUTES_REQUIRED',
      'Late attendance requires positive late minutes.',
    );
  }
  if (status === 'Excused' && !remarks?.trim()) {
    throw attendancePrecondition(
      'ERR_ATT_EXCUSED_REASON_REQUIRED',
      'Excused attendance requires a reason.',
    );
  }
}

function toJsonValue(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

async function writeAudit(
  client: AttendanceDbClient,
  payload: {
    actorId: string;
    branchId: string;
    entityType: string;
    entityId: string;
    action: string;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    reason?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  },
) {
  await client.auditLog.create({
    data: {
      id: createUuid(randomUUID()),
      module: 'Attendance',
      performedBy: payload.actorId,
      performedAt: new Date(),
      entityType: payload.entityType,
      entityId: payload.entityId,
      action: payload.action,
      oldValue: toJsonValue(payload.oldValue),
      newValue: toJsonValue(payload.newValue),
      reason: payload.reason ?? null,
      branchId: payload.branchId,
      userAgent: payload.userAgent ?? null,
      ipAddress: payload.ipAddress ?? null,
    },
  });
}

export class AttendanceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sessions: AttendanceSessionRepository,
    private readonly records: AttendanceRecordRepository,
    private readonly corrections: AttendanceCorrectionRepository,
    private readonly alerts: AttendanceAlertRepository,
    private readonly query: AttendanceQueryRepository,
  ) {}

  async openSession(
    input: OpenAttendanceSessionInput,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ): Promise<AttendanceSessionDto> {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const sourceSession = await activeClient.session.findUnique({
        where: { id: input.sessionId },
        include: { batch: true },
      });
      if (!sourceSession || sourceSession.isDeleted) {
        throw attendanceNotFound(
          'ERR_ATT_SESSION_NOT_FOUND',
          'Delivery session was not found.',
        );
      }

      assertAllowedBranch(context, sourceSession.batch.branchId);
      const attendanceDate = muscatDateOnly(
        input.attendanceDate ?? sourceSession.sessionDate,
      );
      const existing = await this.sessions.findBySessionId(
        activeClient,
        sourceSession.id,
      );
      if (existing) {
        return existing;
      }

      const created = await this.sessions.create(activeClient, {
        id: createUuid(randomUUID()),
        sessionId: sourceSession.id,
        batchId: sourceSession.batchId,
        branchId: sourceSession.batch.branchId,
        attendanceDate,
        status: 'Draft',
        notes: input.notes ?? null,
        createdBy: context.actorId,
        updatedBy: context.actorId,
        openedAt: new Date(),
        version: 1,
        isDeleted: false,
      });

      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: sourceSession.batch.branchId,
        entityType: 'AttendanceSession',
        entityId: created.id,
        action: 'AttendanceSessionOpened',
        newValue: created as unknown as Record<string, unknown>,
        reason: input.notes ?? null,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });

      return created;
    };

    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async generateRoster(
    attendanceSessionId: string,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ): Promise<{ created: number; attendanceSession: AttendanceSessionDto }> {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const attendanceSession = await this.sessions.findById(
        activeClient,
        attendanceSessionId,
      );
      if (!attendanceSession || attendanceSession.isDeleted) {
        throw attendanceNotFound(
          'ERR_ATT_SESSION_NOT_FOUND',
          'Attendance session was not found.',
        );
      }
      assertAllowedBranch(context, attendanceSession.branchId);

      const sourceSession = await activeClient.session.findUnique({
        where: { id: attendanceSession.sessionId },
        include: { batch: true },
      });
      if (!sourceSession || sourceSession.isDeleted) {
        throw attendanceNotFound(
          'ERR_ATT_SESSION_NOT_FOUND',
          'Delivery session was not found.',
        );
      }

      const enrollments = await activeClient.enrollment.findMany({
        where: {
          batchId: attendanceSession.batchId,
          branchId: attendanceSession.branchId,
          isDeleted: false,
          enrollmentStatus: { in: ['Approved', 'Confirmed', 'Active'] },
          studentProfile: { isDeleted: false, status: 'Active' },
        },
        include: { studentProfile: true },
        orderBy: { createdAt: 'asc' },
      });

      const payload = enrollments.map((enrollment) => ({
        id: createUuid(randomUUID()),
        attendanceSessionId: attendanceSession.id,
        enrollmentId: enrollment.id,
        studentProfileId: enrollment.studentProfileId,
        branchId: attendanceSession.branchId,
        status: 'Unmarked' as const,
        remarks: null,
        markedAt: null,
        markedBy: null,
        lateMinutes: null,
        isManualOverride: false,
        correctionStatus: 'None',
        createdBy: context.actorId,
        updatedBy: context.actorId,
        version: 1,
        isDeleted: false,
      }));

      const createdCount = await this.records.createMany(activeClient, payload);

      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: attendanceSession.branchId,
        entityType: 'AttendanceSession',
        entityId: attendanceSession.id,
        action: 'AttendanceRosterGenerated',
        newValue: { createdCount, attendanceSessionId: attendanceSession.id },
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });

      return { created: createdCount, attendanceSession };
    };
    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async saveDraft(
    attendanceSessionId: string,
    input: BulkMarkAttendanceInput,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ) {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const attendanceSession = await this.sessions.findById(
        activeClient,
        attendanceSessionId,
      );
      if (!attendanceSession || attendanceSession.isDeleted) {
        throw attendanceNotFound(
          'ERR_ATT_SESSION_NOT_FOUND',
          'Attendance session was not found.',
        );
      }
      assertAllowedBranch(context, attendanceSession.branchId);
      if (!editableSessionStatuses.includes(attendanceSession.status)) {
        throw attendanceConflict(
          'ERR_ATT_SESSION_LOCKED',
          'Attendance session is locked or cannot be edited.',
        );
      }

      const before = await this.records.findBySessionId(
        activeClient,
        attendanceSessionId,
      );
      for (const recordInput of input.records) {
        const existing = await this.records.findById(
          activeClient,
          recordInput.attendanceRecordId,
        );
        if (
          !existing ||
          existing.isDeleted ||
          existing.attendanceSessionId !== attendanceSessionId
        ) {
          throw attendanceNotFound(
            'ERR_ATT_RECORD_NOT_FOUND',
            'Attendance record was not found.',
          );
        }
        validateRecordInput(
          recordInput.status,
          recordInput.remarks,
          recordInput.lateMinutes,
        );
        await this.records.update(activeClient, existing.id, {
          status: recordInput.status,
          remarks: recordInput.remarks ?? null,
          lateMinutes: recordInput.lateMinutes ?? null,
          isManualOverride: recordInput.isManualOverride,
          markedAt: new Date(),
          markedBy: context.actorId,
          updatedBy: context.actorId,
          version: { increment: 1 },
        });
      }

      await this.sessions.update(activeClient, attendanceSessionId, {
        status:
          attendanceSession.status === 'Draft'
            ? 'Open'
            : attendanceSession.status,
        markedAt: new Date(),
        markedByTrainerId: context.actorId,
        updatedBy: context.actorId,
        version: { increment: 1 },
      });

      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: attendanceSession.branchId,
        entityType: 'AttendanceSession',
        entityId: attendanceSession.id,
        action: 'AttendanceMarked',
        oldValue: { recordCount: before.length },
        newValue: { recordCount: input.records.length },
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });
    };
    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async submit(
    attendanceSessionId: string,
    input: SubmitAttendanceInput,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ) {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const attendanceSession = await this.sessions.findById(
        activeClient,
        attendanceSessionId,
      );
      if (!attendanceSession || attendanceSession.isDeleted)
        throw attendanceNotFound(
          'ERR_ATT_SESSION_NOT_FOUND',
          'Attendance session was not found.',
        );
      assertAllowedBranch(context, attendanceSession.branchId);
      if (!editableSessionStatuses.includes(attendanceSession.status)) {
        throw attendanceConflict(
          'ERR_ATT_SESSION_NOT_OPEN',
          'Attendance session must be open, draft, or reopened.',
        );
      }

      const records = await this.records.findBySessionId(
        activeClient,
        attendanceSessionId,
      );
      const unmarked = records.filter((record) => record.status === 'Unmarked');
      if (unmarked.length > 0 && !input.allowUnmarked) {
        throw attendancePrecondition(
          'ERR_ATT_UNMARKED_RECORDS_EXIST',
          'Unmarked attendance records must be resolved before submission.',
        );
      }

      const updated = await this.sessions.update(
        activeClient,
        attendanceSessionId,
        {
          status: 'Submitted',
          submittedAt: new Date(),
          markedAt: new Date(),
          updatedBy: context.actorId,
          version: { increment: 1 },
        },
      );

      const uniqueEnrollments = [
        ...new Set(records.map((record) => record.enrollmentId)),
      ];
      const summaries = await Promise.all(
        uniqueEnrollments.map((enrollmentId) =>
          this.query.summaryByEnrollment(activeClient, enrollmentId),
        ),
      );
      for (const summary of summaries) {
        if (summary.attendancePercentage < 80) {
          await this.alerts.create(activeClient, {
            id: createUuid(randomUUID()),
            attendanceSessionId: attendanceSession.id,
            enrollmentId: summary.enrollmentId,
            branchId: attendanceSession.branchId,
            alertCode: 'LOW_ATTENDANCE',
            severity: 'High',
            thresholdPercentage: new Prisma.Decimal(80),
            actualPercentage: new Prisma.Decimal(summary.attendancePercentage),
            message: `Attendance percentage for enrollment ${summary.enrollmentId} fell below the threshold.`,
            status: 'Active',
            triggeredAt: new Date(),
            createdBy: context.actorId,
            updatedBy: context.actorId,
            version: 1,
            isDeleted: false,
          });
        }
      }

      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: attendanceSession.branchId,
        entityType: 'AttendanceSession',
        entityId: attendanceSession.id,
        action: 'AttendanceSubmitted',
        oldValue: { status: attendanceSession.status },
        newValue: { status: updated.status },
        reason: input.reason ?? null,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });

      return updated;
    };
    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async lock(
    attendanceSessionId: string,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ) {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const attendanceSession = await this.sessions.findById(
        activeClient,
        attendanceSessionId,
      );
      if (!attendanceSession || attendanceSession.isDeleted)
        throw attendanceNotFound(
          'ERR_ATT_SESSION_NOT_FOUND',
          'Attendance session was not found.',
        );
      assertAllowedBranch(context, attendanceSession.branchId);
      if (
        attendanceSession.status !== 'Submitted' &&
        attendanceSession.status !== 'Reopened'
      ) {
        throw attendancePrecondition(
          'ERR_ATT_SESSION_NOT_OPEN',
          'Only submitted or reopened attendance sessions can be locked.',
        );
      }
      const updated = await this.sessions.update(
        activeClient,
        attendanceSessionId,
        {
          status: 'Locked',
          lockedAt: new Date(),
          updatedBy: context.actorId,
          version: { increment: 1 },
        },
      );
      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: attendanceSession.branchId,
        entityType: 'AttendanceSession',
        entityId: attendanceSession.id,
        action: 'AttendanceSessionLocked',
        oldValue: { status: attendanceSession.status },
        newValue: { status: updated.status },
        reason: context.reason ?? null,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });
      return updated;
    };
    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async reopen(
    attendanceSessionId: string,
    input: ReopenAttendanceInput,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ) {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const attendanceSession = await this.sessions.findById(
        activeClient,
        attendanceSessionId,
      );
      if (!attendanceSession || attendanceSession.isDeleted)
        throw attendanceNotFound(
          'ERR_ATT_SESSION_NOT_FOUND',
          'Attendance session was not found.',
        );
      assertAllowedBranch(context, attendanceSession.branchId);
      if (attendanceSession.status !== 'Locked') {
        throw attendancePrecondition(
          'ERR_ATT_SESSION_NOT_OPEN',
          'Only locked attendance sessions can be reopened.',
        );
      }
      const updated = await this.sessions.update(
        activeClient,
        attendanceSessionId,
        {
          status: 'Reopened',
          reopenedAt: new Date(),
          notes: input.reason,
          updatedBy: context.actorId,
          version: { increment: 1 },
        },
      );
      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: attendanceSession.branchId,
        entityType: 'AttendanceSession',
        entityId: attendanceSession.id,
        action: 'AttendanceSessionReopened',
        oldValue: { status: attendanceSession.status },
        newValue: { status: updated.status },
        reason: input.reason,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });
      return updated;
    };
    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async requestCorrection(
    input: CorrectionRequestInput,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ): Promise<AttendanceCorrectionDto> {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const record = await this.records.findById(
        activeClient,
        input.attendanceRecordId,
      );
      if (!record || record.isDeleted)
        throw attendanceNotFound(
          'ERR_ATT_RECORD_NOT_FOUND',
          'Attendance record was not found.',
        );
      assertAllowedBranch(context, record.branchId);
      const session = await this.sessions.findById(
        activeClient,
        record.attendanceSessionId,
      );
      if (!session || session.isDeleted)
        throw attendanceNotFound(
          'ERR_ATT_SESSION_NOT_FOUND',
          'Attendance session was not found.',
        );
      if (
        await this.corrections.findPendingByRecordId(activeClient, record.id)
      ) {
        throw attendanceConflict(
          'ERR_ATT_CORRECTION_DUPLICATE_PENDING',
          'A pending correction already exists for this record.',
        );
      }
      if (record.status === input.newStatus) {
        throw attendanceConflict(
          'ERR_ATT_CORRECTION_INVALID_TRANSITION',
          'Correction status must differ from the current status.',
        );
      }

      const correction = await this.corrections.create(activeClient, {
        id: createUuid(randomUUID()),
        attendanceRecordId: record.id,
        branchId: record.branchId,
        oldStatus: record.status,
        newStatus: input.newStatus,
        reason: input.reason,
        requestedBy: context.actorId,
        requestedAt: new Date(),
        status: 'Pending',
        createdBy: context.actorId,
        updatedBy: context.actorId,
        version: 1,
        isDeleted: false,
      });

      await this.records.update(activeClient, record.id, {
        correctionStatus: 'Pending',
        updatedBy: context.actorId,
        version: { increment: 1 },
      });

      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: record.branchId,
        entityType: 'AttendanceCorrection',
        entityId: correction.id,
        action: 'AttendanceCorrectionRequested',
        oldValue: { status: record.status },
        newValue: { status: input.newStatus },
        reason: input.reason,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });

      return correction;
    };
    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async approveCorrection(
    correctionId: string,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ): Promise<AttendanceCorrectionDto> {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const correction = await this.corrections.findById(
        activeClient,
        correctionId,
      );
      if (!correction || correction.isDeleted)
        throw attendanceNotFound(
          'ERR_ATT_CORRECTION_NOT_FOUND',
          'Attendance correction was not found.',
        );
      assertAllowedBranch(context, correction.branchId);
      if (correction.status !== 'Pending') {
        throw attendancePrecondition(
          'ERR_ATT_CORRECTION_INVALID_TRANSITION',
          'Only pending corrections can be approved.',
        );
      }

      const record = await this.records.findById(
        activeClient,
        correction.attendanceRecordId,
      );
      if (!record || record.isDeleted)
        throw attendanceNotFound(
          'ERR_ATT_RECORD_NOT_FOUND',
          'Attendance record was not found.',
        );

      await this.records.update(activeClient, record.id, {
        status: correction.newStatus,
        correctionStatus: 'Approved',
        updatedBy: context.actorId,
        version: { increment: 1 },
      });

      const updated = await this.corrections.update(
        activeClient,
        correction.id,
        {
          status: 'Approved',
          approvedBy: context.actorId,
          approvedAt: new Date(),
          updatedBy: context.actorId,
          version: { increment: 1 },
        },
      );

      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: correction.branchId,
        entityType: 'AttendanceCorrection',
        entityId: correction.id,
        action: 'AttendanceCorrectionApproved',
        oldValue: { status: correction.oldStatus },
        newValue: { status: correction.newStatus },
        reason: correction.reason,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });
      return updated;
    };
    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async rejectCorrection(
    correctionId: string,
    reason: string | null,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ): Promise<AttendanceCorrectionDto> {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const correction = await this.corrections.findById(
        activeClient,
        correctionId,
      );
      if (!correction || correction.isDeleted)
        throw attendanceNotFound(
          'ERR_ATT_CORRECTION_NOT_FOUND',
          'Attendance correction was not found.',
        );
      assertAllowedBranch(context, correction.branchId);
      if (correction.status !== 'Pending') {
        throw attendancePrecondition(
          'ERR_ATT_CORRECTION_INVALID_TRANSITION',
          'Only pending corrections can be rejected.',
        );
      }

      const updated = await this.corrections.update(
        activeClient,
        correction.id,
        {
          status: 'Rejected',
          rejectedBy: context.actorId,
          rejectedAt: new Date(),
          rejectionReason: reason ?? null,
          updatedBy: context.actorId,
          version: { increment: 1 },
        },
      );

      await this.records.update(activeClient, correction.attendanceRecordId, {
        correctionStatus: 'Rejected',
        updatedBy: context.actorId,
        version: { increment: 1 },
      });

      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: correction.branchId,
        entityType: 'AttendanceCorrection',
        entityId: correction.id,
        action: 'AttendanceCorrectionRejected',
        oldValue: { status: correction.oldStatus },
        newValue: { status: correction.newStatus },
        reason: reason ?? correction.reason,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });

      return updated;
    };
    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async cancelCorrection(
    correctionId: string,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ): Promise<AttendanceCorrectionDto> {
    const client = tx ?? this.prisma;
    const run = async (activeClient: AttendanceDbClient) => {
      const correction = await this.corrections.findById(
        activeClient,
        correctionId,
      );
      if (!correction || correction.isDeleted)
        throw attendanceNotFound(
          'ERR_ATT_CORRECTION_NOT_FOUND',
          'Attendance correction was not found.',
        );
      assertAllowedBranch(context, correction.branchId);
      if (correction.status !== 'Pending') {
        throw attendancePrecondition(
          'ERR_ATT_CORRECTION_INVALID_TRANSITION',
          'Only pending corrections can be cancelled.',
        );
      }

      const updated = await this.corrections.update(
        activeClient,
        correction.id,
        {
          status: 'Cancelled',
          updatedBy: context.actorId,
          version: { increment: 1 },
        },
      );
      await this.records.update(activeClient, correction.attendanceRecordId, {
        correctionStatus: 'Cancelled',
        updatedBy: context.actorId,
        version: { increment: 1 },
      });
      await writeAudit(activeClient, {
        actorId: context.actorId,
        branchId: correction.branchId,
        entityType: 'AttendanceCorrection',
        entityId: correction.id,
        action: 'AttendanceCorrectionCancelled',
        oldValue: { status: correction.status },
        newValue: { status: 'Cancelled' },
        reason: context.reason ?? correction.reason,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      });
      return updated;
    };
    return client instanceof PrismaClient
      ? client.$transaction(run)
      : run(client);
  }

  async getEnrollmentSummary(
    enrollmentId: string,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ): Promise<AttendanceSummaryDto> {
    const client = tx ?? this.prisma;
    const summary = await this.query.summaryByEnrollment(client, enrollmentId);
    if (summary.branchId && context.allowedBranchIds.length > 0) {
      assertAllowedBranch(context, summary.branchId);
    }
    return summary;
  }

  async detectLowAttendance(
    branchId: string,
    context: AttendanceActionContext,
    tx?: AttendanceDbClient,
  ) {
    const client = tx ?? this.prisma;
    assertAllowedBranch(context, branchId);
    const summaries = await this.query.summaryByBranch(
      client,
      branchId,
      context.allowedBranchIds,
    );
    return summaries;
  }
}
