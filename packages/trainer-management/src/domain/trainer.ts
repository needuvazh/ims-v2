import { z } from 'zod';
import { DomainError, Money } from '@ims/shared-kernel';

export const TrainerTypeSchema = z.enum(['FullTime', 'PartTime', 'Freelance']);
export const TrainerStatusSchema = z.enum(['Active', 'Inactive', 'Suspended']);
export const AvailabilityDaySchema = z.enum([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);
export const CompensationBasisSchema = z.enum([
  'PerHour',
  'PerSession',
  'PerStudent',
  'Fixed',
]);
export const RateStatusSchema = z.enum(['Active', 'Inactive']);
export const AuthorizationStatusSchema = z.enum([
  'Active',
  'Inactive',
  'Suspended',
  'Expired',
]);
export const QualificationStatusSchema = z.enum(['Active', 'Inactive']);

export type TrainerType = z.infer<typeof TrainerTypeSchema>;
export type TrainerStatus = z.infer<typeof TrainerStatusSchema>;
export type AvailabilityDay = z.infer<typeof AvailabilityDaySchema>;
export type CompensationBasis = z.infer<typeof CompensationBasisSchema>;
export type RateStatus = z.infer<typeof RateStatusSchema>;
export type AuthorizationStatus = z.infer<typeof AuthorizationStatusSchema>;
export type QualificationStatus = z.infer<typeof QualificationStatusSchema>;

export interface TrainerPersonSnapshot {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email?: string | null;
  localizedName?: unknown;
}

export interface BranchSnapshot {
  id: string;
  branchCode: string;
  branchName: string;
}

export interface CourseSnapshot {
  id: string;
  courseCode: string;
  nameEnglish: string;
  nameArabic: string;
}

export interface BatchSnapshot {
  id: string;
  batchCode: string;
  branchId: string;
  courseId: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export interface SessionSnapshot {
  id: string;
  batchId: string;
  sessionNumber: number;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  status: string;
  trainerId?: string | null;
}

export interface TrainerProfileRecord {
  id: string;
  personId: string;
  branchId: string;
  trainerCode: string;
  trainerType: TrainerType;
  specialization: string;
  qualificationSummary?: string | null;
  status: TrainerStatus;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  person?: TrainerPersonSnapshot;
  branch?: BranchSnapshot;
}

export interface TrainerQualificationRecord {
  id: string;
  trainerId: string;
  qualificationName: string;
  institution: string;
  yearCompleted: number;
  documentId?: string | null;
  status: QualificationStatus;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

export interface TrainerAvailabilityRecord {
  id: string;
  trainerId: string;
  branchId: string;
  dayOfWeek: AvailabilityDay;
  startTime: string;
  endTime: string;
  status: RateStatus;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

export interface TrainerAuthorizationRecord {
  id: string;
  trainerId: string;
  courseId: string;
  status: AuthorizationStatus;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  reason?: string | null;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  course?: CourseSnapshot;
}

export interface TrainerCompensationRateRecord {
  id: string;
  trainerId: string;
  batchId?: string | null;
  sessionId?: string | null;
  paymentBasis: CompensationBasis;
  amount: string;
  currency: string;
  status: RateStatus;
  remarks?: string | null;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

export interface TrainerAssignmentReferenceRecord {
  kind: 'Batch' | 'Session';
  referenceId: string;
  code: string;
  courseCode?: string | null;
  branchId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status?: string | null;
}

export interface TrainerReportRow {
  reportCode: string;
  trainerId: string;
  trainerCode: string;
  displayNameEn: string;
  displayNameAr?: string | null;
  branchId: string;
  branchCode?: string | null;
  branchName?: string | null;
  trainerType: TrainerType;
  status: TrainerStatus;
  effectiveStartDate: Date;
  effectiveEndDate?: Date | null;
  authorizationCount?: number;
  availabilityCount?: number;
  assignmentCount?: number;
  utilizationPct?: number | null;
  compensationConfigured?: boolean;
}

export interface TrainerEligibilityResult {
  eligible: boolean;
  reasonCodes: Array<
    | 'TRAINER_NOT_FOUND'
    | 'PROFILE_INACTIVE'
    | 'PROFILE_OUTSIDE_EFFECTIVE_PERIOD'
    | 'COURSE_NOT_AUTHORIZED'
    | 'TRAINER_NOT_AVAILABLE'
    | 'BRANCH_SCOPE_DENIED'
  >;
  authorizationId?: string;
  availabilityId?: string;
  schedulingConflictCheckRequired: boolean;
}

export function validateEffectiveDateRange(
  startDate: Date,
  endDate?: Date | null,
) {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    throw new DomainError('invalid_value', 'Effective start date is invalid.');
  }
  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new DomainError('invalid_value', 'Effective end date is invalid.');
  }
  if (endDate && endDate < startDate) {
    throw new DomainError(
      'invalid_effective_date_range',
      'Effective end date cannot be before the start date.',
    );
  }
}

export function validateTimeOrder(startTime: string, endTime: string) {
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)
  ) {
    throw new DomainError(
      'invalid_value',
      'Time values must use HH:MM format.',
    );
  }
  if (startTime >= endTime) {
    throw new DomainError(
      'invalid_value',
      'Start time must be before end time.',
    );
  }
}

export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function isEffectiveOn(
  rangeStart: Date,
  rangeEnd: Date | null | undefined,
  date: Date,
): boolean {
  if (Number.isNaN(date.getTime())) return false;
  return date >= rangeStart && (!rangeEnd || date <= rangeEnd);
}

export function toMoney(currency: string, amount: number | string) {
  return Money.of(
    currency,
    typeof amount === 'string' ? Number(amount) : amount,
  );
}
