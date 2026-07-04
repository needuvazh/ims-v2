import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  AttendanceAlertDto,
  AttendanceCorrectionDto,
  AttendanceRecordDto,
  AttendanceSessionDto,
  AttendanceSummaryDto,
  PaginatedResult,
} from './attendance';

export type AttendanceDbClient = PrismaClient | Prisma.TransactionClient;

export interface AttendanceSessionFilters {
  branchIds: string[];
  status?: string | null;
  attendanceDateFrom?: Date | null;
  attendanceDateTo?: Date | null;
  batchId?: string | null;
  sessionId?: string | null;
}

export interface AttendanceSessionRepository {
  create(client: AttendanceDbClient, data: Prisma.AttendanceSessionUncheckedCreateInput): Promise<AttendanceSessionDto>;
  update(client: AttendanceDbClient, id: string, data: Prisma.AttendanceSessionUncheckedUpdateInput): Promise<AttendanceSessionDto>;
  findById(client: AttendanceDbClient, id: string): Promise<AttendanceSessionDto | null>;
  findBySessionId(client: AttendanceDbClient, sessionId: string): Promise<AttendanceSessionDto | null>;
  list(client: AttendanceDbClient, filters: AttendanceSessionFilters, page: number, pageSize: number): Promise<PaginatedResult<AttendanceSessionDto>>;
}

export interface AttendanceRecordRepository {
  createMany(client: AttendanceDbClient, data: Prisma.AttendanceRecordUncheckedCreateInput[]): Promise<number>;
  findById(client: AttendanceDbClient, id: string): Promise<AttendanceRecordDto | null>;
  findBySessionId(client: AttendanceDbClient, attendanceSessionId: string): Promise<AttendanceRecordDto[]>;
  findBySessionAndEnrollment(client: AttendanceDbClient, attendanceSessionId: string, enrollmentId: string): Promise<AttendanceRecordDto | null>;
  update(client: AttendanceDbClient, id: string, data: Prisma.AttendanceRecordUncheckedUpdateInput): Promise<AttendanceRecordDto>;
  listByEnrollment(client: AttendanceDbClient, enrollmentId: string): Promise<AttendanceRecordDto[]>;
}

export interface AttendanceCorrectionRepository {
  create(client: AttendanceDbClient, data: Prisma.AttendanceCorrectionUncheckedCreateInput): Promise<AttendanceCorrectionDto>;
  update(client: AttendanceDbClient, id: string, data: Prisma.AttendanceCorrectionUncheckedUpdateInput): Promise<AttendanceCorrectionDto>;
  findById(client: AttendanceDbClient, id: string): Promise<AttendanceCorrectionDto | null>;
  findPendingByRecordId(client: AttendanceDbClient, attendanceRecordId: string): Promise<AttendanceCorrectionDto | null>;
  listByBranch(client: AttendanceDbClient, branchId: string, page: number, pageSize: number): Promise<PaginatedResult<AttendanceCorrectionDto>>;
}

export interface AttendanceAlertRepository {
  create(client: AttendanceDbClient, data: Prisma.AttendanceAlertUncheckedCreateInput): Promise<AttendanceAlertDto>;
  update(client: AttendanceDbClient, id: string, data: Prisma.AttendanceAlertUncheckedUpdateInput): Promise<AttendanceAlertDto>;
  listByBranch(client: AttendanceDbClient, branchId: string, page: number, pageSize: number): Promise<PaginatedResult<AttendanceAlertDto>>;
}

export interface AttendanceQueryFilters {
  branchIds: string[];
  batchId?: string | null;
  enrollmentId?: string | null;
  studentProfileId?: string | null;
  sessionId?: string | null;
  attendanceDateFrom?: Date | null;
  attendanceDateTo?: Date | null;
}

export interface AttendanceQueryRepository {
  summaryByEnrollment(client: AttendanceDbClient, enrollmentId: string): Promise<AttendanceSummaryDto>;
  summaryByBatch(client: AttendanceDbClient, batchId: string, branchIds: string[]): Promise<AttendanceSummaryDto[]>;
  summaryByBranch(client: AttendanceDbClient, branchId: string, branchIds: string[]): Promise<AttendanceSummaryDto[]>;
  sessionRows(client: AttendanceDbClient, filters: AttendanceQueryFilters, page: number, pageSize: number): Promise<PaginatedResult<Record<string, unknown>>>;
}
