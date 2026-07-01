import { InvalidStateTransition, BatchFull } from './errors';

export interface Batch {
  id: string;
  courseId: string;
  branchId: string;
  classroomId?: string | null;
  batchCode: string;
  batchNameEnglish: string;
  batchNameArabic: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
  currentEnrollmentCount: number;
  waitingListEnabled: boolean;
  allowOverbooking: boolean;
  isWalkIn: boolean;
  corporateAccountId?: string | null;
  status: string;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

export interface Session {
  id: string;
  batchId: string;
  sessionNumber: number;
  titleEnglish: string;
  titleArabic: string;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  trainerId?: string | null;
  classroomId?: string | null;
  status: string;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

export interface BatchTrainer {
  id: string;
  batchId: string;
  trainerId: string;
  role: string;
  assignedFrom: Date;
  assignedTo: Date;
  status: string;
  isDeleted: boolean;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

export interface WaitingList {
  id: string;
  courseId: string;
  batchId: string;
  studentId?: string | null;
  leadId?: string | null;
  queuePosition: number;
  status: string;
  isDeleted: boolean;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

export const BATCH_STATUSES = {
  DRAFT: 'Draft',
  OPEN: 'OpenForEnrollment',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
} as const;

export class BatchAggregate {
  constructor(public readonly state: Batch) {}

  allocateSeat(requestedSeats: number = 1, forceOverbook: boolean = false): { status: 'SUCCESS' | 'SUCCESS_OVERBOOKED' | 'WAITLIST_REDIRECT'; updatedCount: number } {
    const status = this.state.status;
    
    // Seat allocation is strictly blocked in Draft, Completed, or Cancelled
    if (status === BATCH_STATUSES.DRAFT || status === BATCH_STATUSES.COMPLETED || status === BATCH_STATUSES.CANCELLED) {
      throw new InvalidStateTransition(`Cannot allocate seats in ${status} status.`);
    }

    const newCount = this.state.currentEnrollmentCount + requestedSeats;
    const capacityExceeded = newCount > this.state.capacity;

    if (capacityExceeded) {
      if (this.state.allowOverbooking || forceOverbook) {
        return { status: 'SUCCESS_OVERBOOKED', updatedCount: newCount };
      }
      if (this.state.waitingListEnabled) {
        return { status: 'WAITLIST_REDIRECT', updatedCount: this.state.currentEnrollmentCount };
      }
      throw new BatchFull();
    }

    return { status: 'SUCCESS', updatedCount: newCount };
  }

  releaseSeat(releasedSeats: number = 1): number {
    const newCount = Math.max(0, this.state.currentEnrollmentCount - releasedSeats);
    return newCount;
  }

  validateTransition(targetStatus: string, context: { primaryTrainerExists: boolean; allSessionsPast: boolean; currentDate: Date }) {
    const current = this.state.status;

    if (current === targetStatus) return;

    if (current === BATCH_STATUSES.CANCELLED) {
      throw new InvalidStateTransition('Cannot transition from Cancelled status.');
    }

    if (targetStatus === BATCH_STATUSES.OPEN) {
      if (current !== BATCH_STATUSES.DRAFT) {
        throw new InvalidStateTransition(`Cannot transition from ${current} to OpenForEnrollment.`);
      }
      if (!context.primaryTrainerExists) {
        throw new InvalidStateTransition('An open batch requires at least one Primary Trainer.');
      }
    } else if (targetStatus === BATCH_STATUSES.IN_PROGRESS) {
      if (current !== BATCH_STATUSES.OPEN) {
        throw new InvalidStateTransition(`Cannot transition from ${current} to InProgress.`);
      }
      if (context.currentDate < new Date(this.state.startDate)) {
        throw new InvalidStateTransition('Cannot start batch before its start date.');
      }
    } else if (targetStatus === BATCH_STATUSES.COMPLETED) {
      if (current !== BATCH_STATUSES.IN_PROGRESS) {
        throw new InvalidStateTransition(`Cannot transition from ${current} to Completed.`);
      }
      if (!context.allSessionsPast) {
        throw new InvalidStateTransition('Cannot complete batch while sessions are still in the future.');
      }
    } else if (targetStatus === BATCH_STATUSES.CANCELLED) {
      // Allowed from any state except Completed
      if (current === BATCH_STATUSES.COMPLETED) {
        throw new InvalidStateTransition('Cannot cancel a completed batch.');
      }
    } else {
      throw new InvalidStateTransition(`Unknown status: ${targetStatus}`);
    }
  }
}
