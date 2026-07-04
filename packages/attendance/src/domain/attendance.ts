import { z } from 'zod';

export const attendanceSessionStatuses = ['Draft', 'Open', 'Submitted', 'Locked', 'Reopened', 'Cancelled'] as const;
export type AttendanceSessionStatus = (typeof attendanceSessionStatuses)[number];

export const attendanceRecordStatuses = ['Present', 'Absent', 'Late', 'Excused', 'Unmarked'] as const;
export type AttendanceRecordStatus = (typeof attendanceRecordStatuses)[number];

export const attendanceCorrectionStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'] as const;
export type AttendanceCorrectionStatus = (typeof attendanceCorrectionStatuses)[number];

export const attendanceAlertStatuses = ['Active', 'Acknowledged', 'Resolved'] as const;
export type AttendanceAlertStatus = (typeof attendanceAlertStatuses)[number];

export const attendanceSessionStatusSchema = z.enum(attendanceSessionStatuses);
export const attendanceRecordStatusSchema = z.enum(attendanceRecordStatuses);
export const attendanceCorrectionStatusSchema = z.enum(attendanceCorrectionStatuses);
export const attendanceAlertStatusSchema = z.enum(attendanceAlertStatuses);

export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const uuidSchema = z.string().uuid();

export const openAttendanceSessionSchema = z.object({
  sessionId: uuidSchema,
  attendanceDate: dateOnlySchema.optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const listAttendanceSessionsSchema = z.object({
  branchId: uuidSchema.optional().nullable(),
  attendanceDateFrom: dateOnlySchema.optional().nullable(),
  attendanceDateTo: dateOnlySchema.optional().nullable(),
  status: attendanceSessionStatusSchema.optional().nullable(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const markAttendanceRecordSchema = z.object({
  attendanceRecordId: uuidSchema,
  status: attendanceRecordStatusSchema,
  remarks: z.string().trim().max(2000).optional().nullable(),
  lateMinutes: z.coerce.number().int().nonnegative().optional().nullable(),
  isManualOverride: z.boolean().default(false),
});

export const bulkMarkAttendanceSchema = z.object({
  records: z.array(markAttendanceRecordSchema).min(1),
});

export const submitAttendanceSessionSchema = z.object({
  reason: z.string().trim().max(2000).optional().nullable(),
  allowUnmarked: z.boolean().default(false),
});

export const reopenAttendanceSessionSchema = z.object({
  reason: z.string().trim().min(5).max(2000),
});

export const attendanceCorrectionRequestSchema = z.object({
  attendanceRecordId: uuidSchema,
  newStatus: attendanceRecordStatusSchema,
  reason: z.string().trim().min(5).max(2000),
});

export const attendanceCorrectionReviewSchema = z.object({
  reason: z.string().trim().min(5).max(2000).optional().nullable(),
});

export const attendanceReportFilterSchema = z.object({
  branchId: uuidSchema.optional().nullable(),
  batchId: uuidSchema.optional().nullable(),
  enrollmentId: uuidSchema.optional().nullable(),
  studentProfileId: uuidSchema.optional().nullable(),
  sessionId: uuidSchema.optional().nullable(),
  attendanceDateFrom: dateOnlySchema.optional().nullable(),
  attendanceDateTo: dateOnlySchema.optional().nullable(),
  format: z.enum(['json', 'csv', 'pdf', 'xlsx']).default('json'),
  language: z.enum(['en', 'ar']).default('en'),
});

export interface AttendanceSessionDto {
  id: string;
  sessionId: string;
  batchId: string;
  branchId: string;
  attendanceDate: Date;
  markedByTrainerId: string | null;
  status: AttendanceSessionStatus;
  openedAt: Date | null;
  submittedAt: Date | null;
  lockedAt: Date | null;
  reopenedAt: Date | null;
  markedAt: Date | null;
  notes: string | null;
  version: number;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  isDeleted: boolean;
}

export interface AttendanceRecordDto {
  id: string;
  attendanceSessionId: string;
  enrollmentId: string;
  studentProfileId: string;
  branchId: string;
  status: AttendanceRecordStatus;
  remarks: string | null;
  markedAt: Date | null;
  markedBy: string | null;
  lateMinutes: number | null;
  isManualOverride: boolean;
  correctionStatus: string;
  version: number;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  isDeleted: boolean;
}

export interface AttendanceCorrectionDto {
  id: string;
  attendanceRecordId: string;
  branchId: string;
  oldStatus: AttendanceRecordStatus;
  newStatus: AttendanceRecordStatus;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  status: AttendanceCorrectionStatus;
  version: number;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  isDeleted: boolean;
}

export interface AttendanceAlertDto {
  id: string;
  attendanceSessionId: string | null;
  attendanceRecordId: string | null;
  enrollmentId: string | null;
  branchId: string;
  alertCode: string;
  severity: string;
  thresholdPercentage: string | null;
  actualPercentage: string | null;
  message: string;
  status: AttendanceAlertStatus;
  triggeredAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  version: number;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  isDeleted: boolean;
}

export interface AttendanceSummaryDto {
  enrollmentId: string;
  studentProfileId: string;
  branchId: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  unmarkedCount: number;
  attendancePercentage: number;
}

export interface AttendanceActionContext {
  actorId: string;
  branchId: string | null;
  allowedBranchIds: string[];
  userAgent?: string | null;
  ipAddress?: string | null;
  reason?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

