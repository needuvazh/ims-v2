import { CompletionInvalidStateError, CompletionDuplicateError, CompletionEvidenceStaleError } from '../errors';

export type CompletionStatus =
  | 'Pending'
  | 'EvidenceIncomplete'
  | 'AwaitingTrainerRecommendation'
  | 'AwaitingCoordinatorReview'
  | 'AwaitingFinalApproval'
  | 'Approved'
  | 'Rejected'
  | 'ReevaluationRequired'
  | 'ExceptionReview';

export const COMPLETION_STATUSES = {
  PENDING: 'Pending',
  EVIDENCE_INCOMPLETE: 'EvidenceIncomplete',
  AWAITING_TRAINER_RECOMMENDATION: 'AwaitingTrainerRecommendation',
  AWAITING_COORDINATOR_REVIEW: 'AwaitingCoordinatorReview',
  AWAITING_FINAL_APPROVAL: 'AwaitingFinalApproval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REEVALUATION_REQUIRED: 'ReevaluationRequired',
  EXCEPTION_REVIEW: 'ExceptionReview',
} as const;

export interface CourseCompletion {
  id: string;
  enrollmentId: string;
  attendancePercentage?: number | null;
  attendanceOutcome?: string | null;
  examRequired: boolean;
  examOutcome?: string | null;
  paymentRequired: boolean;
  paymentOutcome?: string | null;
  manualApprovalRequired: boolean;
  completionStatus: CompletionStatus;
  certificateAllowed: boolean;
  attendanceUpdatedAt?: Date | null;
  resultUpdatedAt?: Date | null;
  paymentUpdatedAt?: Date | null;
  lastEvaluatedAt?: Date | null;
  evidenceStale: boolean;
  version: number;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}

export interface EvaluateCompletionCommand {
  enrollmentId: string;
  attendancePercentage?: number;
  attendanceOutcome?: string;
  examRequired: boolean;
  examOutcome?: string;
  paymentRequired: boolean;
  paymentOutcome?: string;
  manualApprovalRequired: boolean;
  createdBy?: string;
}

export class CourseCompletionAggregate {
  constructor(public readonly state: CourseCompletion) {}

  static create(command: EvaluateCompletionCommand, id?: string): CourseCompletionAggregate {
    const completion: CourseCompletion = {
      id: id || crypto.randomUUID(),
      enrollmentId: command.enrollmentId,
      attendancePercentage: command.attendancePercentage || null,
      attendanceOutcome: command.attendanceOutcome || null,
      examRequired: command.examRequired,
      examOutcome: command.examOutcome || null,
      paymentRequired: command.paymentRequired,
      paymentOutcome: command.paymentOutcome || null,
      manualApprovalRequired: command.manualApprovalRequired,
      completionStatus: COMPLETION_STATUSES.PENDING,
      certificateAllowed: false,
      evidenceStale: false,
      version: 1,
      createdAt: new Date(),
      createdBy: command.createdBy || null,
      isDeleted: false,
    };

    return new CourseCompletionAggregate(completion);
  }

  updateEvidence(evidence: {
    attendancePercentage?: number;
    attendanceOutcome?: string;
    examOutcome?: string;
    paymentOutcome?: string;
    attendanceUpdatedAt?: Date;
    resultUpdatedAt?: Date;
    paymentUpdatedAt?: Date;
  }): CourseCompletion {
    const updated: CourseCompletion = {
      ...this.state,
      attendancePercentage: evidence.attendancePercentage ?? this.state.attendancePercentage,
      attendanceOutcome: evidence.attendanceOutcome ?? this.state.attendanceOutcome,
      examOutcome: evidence.examOutcome ?? this.state.examOutcome,
      paymentOutcome: evidence.paymentOutcome ?? this.state.paymentOutcome,
      attendanceUpdatedAt: evidence.attendanceUpdatedAt ?? this.state.attendanceUpdatedAt,
      resultUpdatedAt: evidence.resultUpdatedAt ?? this.state.resultUpdatedAt,
      paymentUpdatedAt: evidence.paymentUpdatedAt ?? this.state.paymentUpdatedAt,
      lastEvaluatedAt: new Date(),
      evidenceStale: false,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  markEvidenceStale(): CourseCompletion {
    const updated: CourseCompletion = {
      ...this.state,
      evidenceStale: true,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  evaluate(): CourseCompletion {
    if (this.state.evidenceStale) {
      throw new CompletionEvidenceStaleError('Cannot evaluate completion with stale evidence');
    }

    if (
      this.state.completionStatus !== COMPLETION_STATUSES.PENDING &&
      this.state.completionStatus !== COMPLETION_STATUSES.EVIDENCE_INCOMPLETE &&
      this.state.completionStatus !== COMPLETION_STATUSES.REEVALUATION_REQUIRED
    ) {
      throw new CompletionInvalidStateError(`Cannot evaluate completion in status: ${this.state.completionStatus}`);
    }

    const attendanceMet = this.state.attendanceOutcome === 'Met';
    const examMet = !this.state.examRequired || this.state.examOutcome === 'Pass';
    const paymentMet = !this.state.paymentRequired || this.state.paymentOutcome === 'Cleared';

    if (!attendanceMet || !examMet || !paymentMet) {
      const updated: CourseCompletion = {
        ...this.state,
        completionStatus: COMPLETION_STATUSES.EVIDENCE_INCOMPLETE,
        version: this.state.version + 1,
        updatedAt: new Date(),
      };
      return updated;
    }

    if (this.state.manualApprovalRequired) {
      const updated: CourseCompletion = {
        ...this.state,
        completionStatus: COMPLETION_STATUSES.AWAITING_TRAINER_RECOMMENDATION,
        version: this.state.version + 1,
        updatedAt: new Date(),
      };
      return updated;
    }

    const updated: CourseCompletion = {
      ...this.state,
      completionStatus: COMPLETION_STATUSES.APPROVED,
      certificateAllowed: true,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  recommendByTrainer(): CourseCompletion {
    if (this.state.completionStatus !== COMPLETION_STATUSES.AWAITING_TRAINER_RECOMMENDATION) {
      throw new CompletionInvalidStateError(`Cannot recommend completion in status: ${this.state.completionStatus}`);
    }

    const updated: CourseCompletion = {
      ...this.state,
      completionStatus: COMPLETION_STATUSES.AWAITING_COORDINATOR_REVIEW,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  reviewByCoordinator(approved: boolean): CourseCompletion {
    if (this.state.completionStatus !== COMPLETION_STATUSES.AWAITING_COORDINATOR_REVIEW) {
      throw new CompletionInvalidStateError(`Cannot review completion in status: ${this.state.completionStatus}`);
    }

    if (approved) {
      const updated: CourseCompletion = {
        ...this.state,
        completionStatus: COMPLETION_STATUSES.AWAITING_FINAL_APPROVAL,
        version: this.state.version + 1,
        updatedAt: new Date(),
      };
      return updated;
    }

    const updated: CourseCompletion = {
      ...this.state,
      completionStatus: COMPLETION_STATUSES.REJECTED,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  finalApproval(approved: boolean): CourseCompletion {
    if (this.state.completionStatus !== COMPLETION_STATUSES.AWAITING_FINAL_APPROVAL) {
      throw new CompletionInvalidStateError(`Cannot approve completion in status: ${this.state.completionStatus}`);
    }

    if (approved) {
      const updated: CourseCompletion = {
        ...this.state,
        completionStatus: COMPLETION_STATUSES.APPROVED,
        certificateAllowed: true,
        version: this.state.version + 1,
        updatedAt: new Date(),
      };
      return updated;
    }

    const updated: CourseCompletion = {
      ...this.state,
      completionStatus: COMPLETION_STATUSES.REJECTED,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  requestReevaluation(): CourseCompletion {
    if (this.state.completionStatus !== COMPLETION_STATUSES.APPROVED) {
      throw new CompletionInvalidStateError(`Cannot request reevaluation in status: ${this.state.completionStatus}`);
    }

    const updated: CourseCompletion = {
      ...this.state,
      completionStatus: COMPLETION_STATUSES.REEVALUATION_REQUIRED,
      certificateAllowed: false,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  approveException(): CourseCompletion {
    if (this.state.completionStatus !== COMPLETION_STATUSES.REEVALUATION_REQUIRED) {
      throw new CompletionInvalidStateError(`Cannot approve exception in status: ${this.state.completionStatus}`);
    }

    const updated: CourseCompletion = {
      ...this.state,
      completionStatus: COMPLETION_STATUSES.EXCEPTION_REVIEW,
      certificateAllowed: true,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }
}
