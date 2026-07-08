import type { Prisma, PrismaClient } from '@prisma/client';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import type {
  AttendanceAlertDto,
  AttendanceCorrectionDto,
  AttendanceRecordDto,
  AttendanceSessionDto,
  AttendanceSessionStatus,
  AttendanceRecordStatus,
  AttendanceCorrectionStatus,
  AttendanceAlertStatus,
  PaginatedResult,
} from '../domain/attendance';
import type {
  AttendanceAlertRepository,
  AttendanceCorrectionRepository,
  AttendanceDbClient,
  AttendanceQueryFilters,
  AttendanceQueryRepository,
  AttendanceRecordRepository,
  AttendanceSessionFilters,
  AttendanceSessionRepository,
} from '../domain/repositories';

function mapSession(row: any): AttendanceSessionDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    batchId: row.batchId,
    branchId: row.branchId,
    attendanceDate: row.attendanceDate,
    markedByTrainerId: row.markedByTrainerId ?? null,
    status: row.status as AttendanceSessionStatus,
    openedAt: row.openedAt ?? null,
    submittedAt: row.submittedAt ?? null,
    lockedAt: row.lockedAt ?? null,
    reopenedAt: row.reopenedAt ?? null,
    markedAt: row.markedAt ?? null,
    notes: row.notes ?? null,
    version: row.version,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? null,
    updatedAt: row.updatedAt ?? null,
    updatedBy: row.updatedBy ?? null,
    deletedAt: row.deletedAt ?? null,
    deletedBy: row.deletedBy ?? null,
    isDeleted: row.isDeleted,
  };
}

function mapRecord(row: any): AttendanceRecordDto {
  return {
    id: row.id,
    attendanceSessionId: row.attendanceSessionId,
    enrollmentId: row.enrollmentId,
    studentProfileId: row.studentProfileId,
    branchId: row.branchId,
    status: row.status as AttendanceRecordStatus,
    remarks: row.remarks ?? null,
    markedAt: row.markedAt ?? null,
    markedBy: row.markedBy ?? null,
    lateMinutes: row.lateMinutes ?? null,
    isManualOverride: row.isManualOverride,
    correctionStatus: row.correctionStatus,
    version: row.version,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? null,
    updatedAt: row.updatedAt ?? null,
    updatedBy: row.updatedBy ?? null,
    deletedAt: row.deletedAt ?? null,
    deletedBy: row.deletedBy ?? null,
    isDeleted: row.isDeleted,
  };
}

function mapCorrection(row: any): AttendanceCorrectionDto {
  return {
    id: row.id,
    attendanceRecordId: row.attendanceRecordId,
    branchId: row.branchId,
    oldStatus: row.oldStatus as AttendanceRecordStatus,
    newStatus: row.newStatus as AttendanceRecordStatus,
    reason: row.reason,
    requestedBy: row.requestedBy,
    requestedAt: row.requestedAt,
    approvedBy: row.approvedBy ?? null,
    approvedAt: row.approvedAt ?? null,
    rejectedBy: row.rejectedBy ?? null,
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    status: row.status as AttendanceCorrectionStatus,
    version: row.version,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? null,
    updatedAt: row.updatedAt ?? null,
    updatedBy: row.updatedBy ?? null,
    deletedAt: row.deletedAt ?? null,
    deletedBy: row.deletedBy ?? null,
    isDeleted: row.isDeleted,
  };
}

function mapAlert(row: any): AttendanceAlertDto {
  return {
    id: row.id,
    attendanceSessionId: row.attendanceSessionId ?? null,
    attendanceRecordId: row.attendanceRecordId ?? null,
    enrollmentId: row.enrollmentId ?? null,
    branchId: row.branchId,
    alertCode: row.alertCode,
    severity: row.severity,
    thresholdPercentage: row.thresholdPercentage?.toString?.() ?? null,
    actualPercentage: row.actualPercentage?.toString?.() ?? null,
    message: row.message,
    status: row.status as AttendanceAlertStatus,
    triggeredAt: row.triggeredAt,
    acknowledgedAt: row.acknowledgedAt ?? null,
    acknowledgedBy: row.acknowledgedBy ?? null,
    resolvedAt: row.resolvedAt ?? null,
    resolvedBy: row.resolvedBy ?? null,
    version: row.version,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? null,
    updatedAt: row.updatedAt ?? null,
    updatedBy: row.updatedBy ?? null,
    deletedAt: row.deletedAt ?? null,
    deletedBy: row.deletedBy ?? null,
    isDeleted: row.isDeleted,
  };
}

function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return { items, total, page, pageSize };
}

export class PrismaAttendanceSessionRepository implements AttendanceSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    client: AttendanceDbClient,
    data: Prisma.AttendanceSessionUncheckedCreateInput,
  ): Promise<AttendanceSessionDto> {
    const row = await client.attendanceSession.create({ data });
    return mapSession(row);
  }

  async update(
    client: AttendanceDbClient,
    id: string,
    data: Prisma.AttendanceSessionUncheckedUpdateInput,
  ): Promise<AttendanceSessionDto> {
    const row = await client.attendanceSession.update({ where: { id }, data });
    return mapSession(row);
  }

  async findById(
    client: AttendanceDbClient,
    id: string,
  ): Promise<AttendanceSessionDto | null> {
    const row = await client.attendanceSession.findUnique({ where: { id } });
    return row ? mapSession(row) : null;
  }

  async findBySessionId(
    client: AttendanceDbClient,
    sessionId: string,
  ): Promise<AttendanceSessionDto | null> {
    const row = await client.attendanceSession.findFirst({
      where: { sessionId, isDeleted: false },
    });
    return row ? mapSession(row) : null;
  }

  async list(
    client: AttendanceDbClient,
    filters: AttendanceSessionFilters,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<AttendanceSessionDto>> {
    const where: Prisma.AttendanceSessionWhereInput = {
      isDeleted: false,
      branchId: { in: filters.branchIds },
      ...(filters.status
        ? { status: filters.status as AttendanceSessionStatus }
        : {}),
      ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
      ...(filters.batchId ? { batchId: filters.batchId } : {}),
      ...(filters.attendanceDateFrom || filters.attendanceDateTo
        ? {
            attendanceDate: {
              ...(filters.attendanceDateFrom
                ? { gte: filters.attendanceDateFrom }
                : {}),
              ...(filters.attendanceDateTo
                ? { lte: filters.attendanceDateTo }
                : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      client.attendanceSession.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
      }),
      client.attendanceSession.count({ where }),
    ]);
    return paginate(rows.map(mapSession), total, page, pageSize);
  }
}

export class PrismaAttendanceRecordRepository implements AttendanceRecordRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(
    client: AttendanceDbClient,
    data: Prisma.AttendanceRecordUncheckedCreateInput[],
  ): Promise<number> {
    if (data.length === 0) return 0;
    const result = await client.attendanceRecord.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  async findById(
    client: AttendanceDbClient,
    id: string,
  ): Promise<AttendanceRecordDto | null> {
    const row = await client.attendanceRecord.findUnique({ where: { id } });
    return row ? mapRecord(row) : null;
  }

  async findBySessionId(
    client: AttendanceDbClient,
    attendanceSessionId: string,
  ): Promise<AttendanceRecordDto[]> {
    const rows = await client.attendanceRecord.findMany({
      where: { attendanceSessionId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapRecord);
  }

  async findBySessionAndEnrollment(
    client: AttendanceDbClient,
    attendanceSessionId: string,
    enrollmentId: string,
  ): Promise<AttendanceRecordDto | null> {
    const row = await client.attendanceRecord.findFirst({
      where: { attendanceSessionId, enrollmentId, isDeleted: false },
    });
    return row ? mapRecord(row) : null;
  }

  async update(
    client: AttendanceDbClient,
    id: string,
    data: Prisma.AttendanceRecordUncheckedUpdateInput,
  ): Promise<AttendanceRecordDto> {
    const row = await client.attendanceRecord.update({ where: { id }, data });
    return mapRecord(row);
  }

  async listByEnrollment(
    client: AttendanceDbClient,
    enrollmentId: string,
  ): Promise<AttendanceRecordDto[]> {
    const rows = await client.attendanceRecord.findMany({
      where: { enrollmentId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapRecord);
  }
}

export class PrismaAttendanceCorrectionRepository implements AttendanceCorrectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    client: AttendanceDbClient,
    data: Prisma.AttendanceCorrectionUncheckedCreateInput,
  ): Promise<AttendanceCorrectionDto> {
    const row = await client.attendanceCorrection.create({ data });
    return mapCorrection(row);
  }

  async update(
    client: AttendanceDbClient,
    id: string,
    data: Prisma.AttendanceCorrectionUncheckedUpdateInput,
  ): Promise<AttendanceCorrectionDto> {
    const row = await client.attendanceCorrection.update({
      where: { id },
      data,
    });
    return mapCorrection(row);
  }

  async findById(
    client: AttendanceDbClient,
    id: string,
  ): Promise<AttendanceCorrectionDto | null> {
    const row = await client.attendanceCorrection.findUnique({ where: { id } });
    return row ? mapCorrection(row) : null;
  }

  async findPendingByRecordId(
    client: AttendanceDbClient,
    attendanceRecordId: string,
  ): Promise<AttendanceCorrectionDto | null> {
    const row = await client.attendanceCorrection.findFirst({
      where: { attendanceRecordId, status: 'Pending', isDeleted: false },
    });
    return row ? mapCorrection(row) : null;
  }

  async listByBranch(
    client: AttendanceDbClient,
    branchId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<AttendanceCorrectionDto>> {
    const where = { branchId, isDeleted: false };
    const [rows, total] = await Promise.all([
      client.attendanceCorrection.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ requestedAt: 'desc' }],
      }),
      client.attendanceCorrection.count({ where }),
    ]);
    return paginate(rows.map(mapCorrection), total, page, pageSize);
  }
}

export class PrismaAttendanceAlertRepository implements AttendanceAlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    client: AttendanceDbClient,
    data: Prisma.AttendanceAlertUncheckedCreateInput,
  ): Promise<AttendanceAlertDto> {
    const row = await client.attendanceAlert.create({ data });
    return mapAlert(row);
  }

  async update(
    client: AttendanceDbClient,
    id: string,
    data: Prisma.AttendanceAlertUncheckedUpdateInput,
  ): Promise<AttendanceAlertDto> {
    const row = await client.attendanceAlert.update({ where: { id }, data });
    return mapAlert(row);
  }

  async listByBranch(
    client: AttendanceDbClient,
    branchId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<AttendanceAlertDto>> {
    const where = { branchId, isDeleted: false };
    const [rows, total] = await Promise.all([
      client.attendanceAlert.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ triggeredAt: 'desc' }],
      }),
      client.attendanceAlert.count({ where }),
    ]);
    return paginate(rows.map(mapAlert), total, page, pageSize);
  }
}

export class PrismaAttendanceQueryRepository implements AttendanceQueryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async summaryByEnrollment(client: AttendanceDbClient, enrollmentId: string) {
    const records = await client.attendanceRecord.findMany({
      where: {
        enrollmentId,
        isDeleted: false,
        attendanceSession: {
          isDeleted: false,
          status: { in: ['Submitted', 'Locked', 'Reopened'] },
        },
      },
      include: { attendanceSession: true },
    });

    const totalSessions = records.length;
    const presentCount = records.filter(
      (record) => record.status === 'Present',
    ).length;
    const lateCount = records.filter(
      (record) => record.status === 'Late',
    ).length;
    const excusedCount = records.filter(
      (record) => record.status === 'Excused',
    ).length;
    const absentCount = records.filter(
      (record) => record.status === 'Absent',
    ).length;
    const unmarkedCount = records.filter(
      (record) => record.status === 'Unmarked',
    ).length;
    const attended = presentCount + lateCount + excusedCount;
    return {
      enrollmentId,
      studentProfileId: records[0]?.studentProfileId ?? '',
      branchId: records[0]?.branchId ?? '',
      totalSessions,
      presentCount,
      lateCount,
      excusedCount,
      absentCount,
      unmarkedCount,
      attendancePercentage:
        totalSessions === 0
          ? 0
          : Number(((attended / totalSessions) * 100).toFixed(2)),
    };
  }

  async summaryByBatch(
    client: AttendanceDbClient,
    batchId: string,
    branchIds: string[],
  ) {
    const records = await client.attendanceRecord.findMany({
      where: {
        isDeleted: false,
        attendanceSession: {
          isDeleted: false,
          batchId,
          branchId: { in: branchIds },
          status: { in: ['Submitted', 'Locked', 'Reopened'] },
        },
      },
      include: { attendanceSession: true },
      orderBy: [{ enrollmentId: 'asc' }, { createdAt: 'asc' }],
    });
    const grouped = new Map<string, typeof records>();
    for (const record of records) {
      const bucket = grouped.get(record.enrollmentId) ?? [];
      bucket.push(record);
      grouped.set(record.enrollmentId, bucket);
    }
    return [...grouped.entries()].map(([enrollmentId, enrollmentRecords]) => {
      const presentCount = enrollmentRecords.filter(
        (record) => record.status === 'Present',
      ).length;
      const lateCount = enrollmentRecords.filter(
        (record) => record.status === 'Late',
      ).length;
      const excusedCount = enrollmentRecords.filter(
        (record) => record.status === 'Excused',
      ).length;
      const absentCount = enrollmentRecords.filter(
        (record) => record.status === 'Absent',
      ).length;
      const unmarkedCount = enrollmentRecords.filter(
        (record) => record.status === 'Unmarked',
      ).length;
      const attended = presentCount + lateCount + excusedCount;
      return {
        enrollmentId,
        studentProfileId: enrollmentRecords[0]?.studentProfileId ?? '',
        branchId: enrollmentRecords[0]?.branchId ?? '',
        totalSessions: enrollmentRecords.length,
        presentCount,
        lateCount,
        excusedCount,
        absentCount,
        unmarkedCount,
        attendancePercentage:
          enrollmentRecords.length === 0
            ? 0
            : Number(((attended / enrollmentRecords.length) * 100).toFixed(2)),
      };
    });
  }

  async summaryByBranch(
    client: AttendanceDbClient,
    branchId: string,
    branchIds: string[],
  ) {
    const records = await client.attendanceRecord.findMany({
      where: {
        isDeleted: false,
        branchId,
        attendanceSession: {
          isDeleted: false,
          branchId: { in: branchIds },
          status: { in: ['Submitted', 'Locked', 'Reopened'] },
        },
      },
      include: { attendanceSession: true },
      orderBy: [{ enrollmentId: 'asc' }, { createdAt: 'asc' }],
    });
    const grouped = new Map<string, typeof records>();
    for (const record of records) {
      const bucket = grouped.get(record.enrollmentId) ?? [];
      bucket.push(record);
      grouped.set(record.enrollmentId, bucket);
    }
    return [...grouped.entries()].map(([enrollmentId, enrollmentRecords]) => {
      const presentCount = enrollmentRecords.filter(
        (record) => record.status === 'Present',
      ).length;
      const lateCount = enrollmentRecords.filter(
        (record) => record.status === 'Late',
      ).length;
      const excusedCount = enrollmentRecords.filter(
        (record) => record.status === 'Excused',
      ).length;
      const absentCount = enrollmentRecords.filter(
        (record) => record.status === 'Absent',
      ).length;
      const unmarkedCount = enrollmentRecords.filter(
        (record) => record.status === 'Unmarked',
      ).length;
      const attended = presentCount + lateCount + excusedCount;
      return {
        enrollmentId,
        studentProfileId: enrollmentRecords[0]?.studentProfileId ?? '',
        branchId: branchId,
        totalSessions: enrollmentRecords.length,
        presentCount,
        lateCount,
        excusedCount,
        absentCount,
        unmarkedCount,
        attendancePercentage:
          enrollmentRecords.length === 0
            ? 0
            : Number(((attended / enrollmentRecords.length) * 100).toFixed(2)),
      };
    });
  }

  async sessionRows(
    client: AttendanceDbClient,
    filters: AttendanceQueryFilters,
    page: number,
    pageSize: number,
  ) {
    const where: Prisma.AttendanceSessionWhereInput = {
      isDeleted: false,
      branchId: { in: filters.branchIds },
      ...(filters.batchId ? { batchId: filters.batchId } : {}),
      ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
      ...(filters.attendanceDateFrom || filters.attendanceDateTo
        ? {
            attendanceDate: {
              ...(filters.attendanceDateFrom
                ? { gte: filters.attendanceDateFrom }
                : {}),
              ...(filters.attendanceDateTo
                ? { lte: filters.attendanceDateTo }
                : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      client.attendanceSession.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
        include: { records: true },
      }),
      client.attendanceSession.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        ...mapSession(row),
        recordCount: row.records.filter((record) => !record.isDeleted).length,
      })),
      total,
      page,
      pageSize,
    };
  }
}
