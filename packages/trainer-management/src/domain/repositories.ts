import type {
  AuthorizationStatus,
  CompensationBasis,
  TrainerAssignmentReferenceRecord,
  TrainerAuthorizationRecord,
  TrainerAvailabilityRecord,
  TrainerCompensationRateRecord,
  TrainerEligibilityResult,
  TrainerProfileRecord,
  TrainerQualificationRecord,
  TrainerReportRow,
  TrainerStatus,
  TrainerType,
} from './trainer';

export type TrainerListFilters = {
  q?: string;
  branchId?: string;
  trainerType?: TrainerType;
  status?: TrainerStatus;
  specialization?: string;
  effectiveOn?: Date;
  courseId?: string;
  compensationVisible?: boolean;
};

export type ListQuery = {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

export interface TrainerManagementRepository {
  listTrainers(
    filters: TrainerListFilters,
    query: ListQuery,
  ): Promise<{ items: TrainerProfileRecord[]; total: number }>;
  findTrainerById(
    trainerId: string,
    branchScope?: string[],
  ): Promise<TrainerProfileRecord | null>;
  findTrainerByPersonId(
    personId: string,
    branchScope?: string[],
  ): Promise<TrainerProfileRecord | null>;
  createTrainerProfile(
    input: Omit<
      TrainerProfileRecord,
      'id' | 'createdAt' | 'version' | 'isDeleted'
    > & { version?: number },
  ): Promise<TrainerProfileRecord>;
  updateTrainerProfile(
    trainerId: string,
    input: Partial<TrainerProfileRecord> & { version: number },
  ): Promise<TrainerProfileRecord>;
  transitionTrainerStatus(
    trainerId: string,
    input: {
      toStatus: TrainerStatus;
      effectiveAt: Date;
      reason: string;
      version: number;
    },
  ): Promise<TrainerProfileRecord>;

  listQualifications(
    trainerId: string,
    query: ListQuery,
  ): Promise<{ items: TrainerQualificationRecord[]; total: number }>;
  createQualification(
    trainerId: string,
    input: Omit<
      TrainerQualificationRecord,
      'id' | 'trainerId' | 'version' | 'isDeleted' | 'createdAt'
    >,
  ): Promise<TrainerQualificationRecord>;
  updateQualification(
    trainerId: string,
    qualificationId: string,
    input: Partial<TrainerQualificationRecord> & { version: number },
  ): Promise<TrainerQualificationRecord>;
  deleteQualification(
    trainerId: string,
    qualificationId: string,
    reason: string,
    version: number,
  ): Promise<void>;

  listAvailability(
    trainerId: string,
    query: ListQuery,
  ): Promise<{ items: TrainerAvailabilityRecord[]; total: number }>;
  createAvailability(
    trainerId: string,
    input: Omit<
      TrainerAvailabilityRecord,
      'id' | 'trainerId' | 'version' | 'isDeleted' | 'createdAt'
    >,
  ): Promise<TrainerAvailabilityRecord>;
  updateAvailability(
    trainerId: string,
    availabilityId: string,
    input: Partial<TrainerAvailabilityRecord> & { version: number },
  ): Promise<TrainerAvailabilityRecord>;
  deleteAvailability(
    trainerId: string,
    availabilityId: string,
    reason: string,
    version: number,
  ): Promise<void>;
  validateAvailability(
    trainerId: string,
    branchId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<{ available: boolean; availabilityId?: string }>;

  listAuthorizations(
    trainerId: string,
    query: ListQuery,
  ): Promise<{ items: TrainerAuthorizationRecord[]; total: number }>;
  createAuthorization(
    trainerId: string,
    input: Omit<
      TrainerAuthorizationRecord,
      'id' | 'trainerId' | 'version' | 'isDeleted' | 'createdAt'
    >,
  ): Promise<TrainerAuthorizationRecord>;
  transitionAuthorization(
    trainerId: string,
    authorizationId: string,
    input: {
      toStatus: AuthorizationStatus;
      effectiveAt: Date;
      reason: string;
      version: number;
    },
  ): Promise<TrainerAuthorizationRecord>;

  listCompensationRates(
    trainerId: string,
    query: ListQuery,
  ): Promise<{ items: TrainerCompensationRateRecord[]; total: number }>;
  createCompensationRate(
    trainerId: string,
    input: Omit<
      TrainerCompensationRateRecord,
      'id' | 'trainerId' | 'version' | 'isDeleted' | 'createdAt'
    >,
  ): Promise<TrainerCompensationRateRecord>;
  updateCompensationRate(
    trainerId: string,
    rateId: string,
    input: Partial<TrainerCompensationRateRecord> & { version: number },
  ): Promise<TrainerCompensationRateRecord>;
  resolveCompensationRate(input: {
    trainerId: string;
    paymentBasis: CompensationBasis;
    effectiveOn: Date;
    batchId?: string;
    sessionId?: string;
  }): Promise<TrainerCompensationRateRecord | null>;

  listAssignmentReferences(
    trainerId: string,
    query: ListQuery & { kind?: 'Batch' | 'Session' | 'All' },
  ): Promise<{ items: TrainerAssignmentReferenceRecord[]; total: number }>;
  listReports(
    reportCode: string,
    filters: Record<string, unknown>,
    query: ListQuery,
  ): Promise<{ items: TrainerReportRow[]; total: number }>;
  listAuditHistory(
    trainerId: string,
    query: ListQuery & {
      action?: string;
      entityType?: string;
      fromDate?: Date;
      toDate?: Date;
    },
  ): Promise<{ items: Array<Record<string, unknown>>; total: number }>;
  findEligibleTrainers(
    input: {
      courseId: string;
      branchId: string;
      targetDate: Date;
      startTime?: string;
      endTime?: string;
      trainerType?: TrainerType;
      q?: string;
    },
    query: ListQuery,
  ): Promise<{
    items: Array<
      TrainerEligibilityResult & {
        trainerId: string;
        trainerCode: string;
        displayName: { en: string; ar?: string | null };
        trainerType?: string;
        branchName?: string;
        status?: string;
      }
    >;
    total: number;
  }>;
}
