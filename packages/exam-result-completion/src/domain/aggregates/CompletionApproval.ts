import {
  ApprovalInvalidStateError,
  ApprovalStageSequenceError,
  ApprovalActorIneligibleError,
} from '../errors';

export type ApprovalLevel =
  | 'TrainerRecommendation'
  | 'CoordinatorReview'
  | 'FinalApproval';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export const APPROVAL_LEVELS = {
  TRAINER_RECOMMENDATION: 'TrainerRecommendation',
  COORDINATOR_REVIEW: 'CoordinatorReview',
  FINAL_APPROVAL: 'FinalApproval',
} as const;

export const APPROVAL_STATUSES = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

export const APPROVAL_LEVEL_ORDER: Record<ApprovalLevel, number> = {
  TrainerRecommendation: 1,
  CoordinatorReview: 2,
  FinalApproval: 3,
};

export interface CompletionApproval {
  id: string;
  courseCompletionId: string;
  approvalLevel: ApprovalLevel;
  status: ApprovalStatus;
  actorId: string;
  actionDate?: Date | null;
  remarks?: string | null;
  version: number;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}

export interface CreateApprovalCommand {
  courseCompletionId: string;
  approvalLevel: ApprovalLevel;
  actorId: string;
  createdBy?: string;
}

export interface ActOnApprovalCommand {
  approvalId: string;
  status: ApprovalStatus;
  remarks?: string;
  actorId: string;
}

export class CompletionApprovalAggregate {
  constructor(public readonly state: CompletionApproval) {}

  static create(
    command: CreateApprovalCommand,
    id?: string,
  ): CompletionApprovalAggregate {
    const approval: CompletionApproval = {
      id: id || crypto.randomUUID(),
      courseCompletionId: command.courseCompletionId,
      approvalLevel: command.approvalLevel,
      status: APPROVAL_STATUSES.PENDING,
      actorId: command.actorId,
      version: 1,
      createdAt: new Date(),
      createdBy: command.createdBy || null,
      isDeleted: false,
    };

    return new CompletionApprovalAggregate(approval);
  }

  validateSequence(previousLevel: ApprovalLevel | null): void {
    if (previousLevel === null) {
      if (this.state.approvalLevel !== APPROVAL_LEVELS.TRAINER_RECOMMENDATION) {
        throw new ApprovalStageSequenceError(
          'First approval must be TrainerRecommendation',
        );
      }
      return;
    }

    const currentOrder = APPROVAL_LEVEL_ORDER[this.state.approvalLevel];
    const previousOrder = APPROVAL_LEVEL_ORDER[previousLevel];

    if (currentOrder !== previousOrder + 1) {
      throw new ApprovalStageSequenceError(
        `Approval level ${this.state.approvalLevel} cannot follow ${previousLevel}`,
      );
    }
  }

  validateActor(eligibleActorIds: string[]): void {
    if (!eligibleActorIds.includes(this.state.actorId)) {
      throw new ApprovalActorIneligibleError(
        `Actor ${this.state.actorId} is not eligible for ${this.state.approvalLevel}`,
      );
    }
  }

  act(command: ActOnApprovalCommand): CompletionApproval {
    if (this.state.status !== APPROVAL_STATUSES.PENDING) {
      throw new ApprovalInvalidStateError(
        `Cannot act on approval in status: ${this.state.status}`,
      );
    }

    if (command.actorId !== this.state.actorId) {
      throw new ApprovalActorIneligibleError(
        'Only the assigned actor can act on this approval',
      );
    }

    if (
      command.status !== APPROVAL_STATUSES.APPROVED &&
      command.status !== APPROVAL_STATUSES.REJECTED
    ) {
      throw new ApprovalInvalidStateError(
        'Approval status must be Approved or Rejected',
      );
    }

    const updated: CompletionApproval = {
      ...this.state,
      status: command.status,
      actionDate: new Date(),
      remarks: command.remarks || null,
      version: this.state.version + 1,
      updatedAt: new Date(),
      updatedBy: command.actorId,
    };

    return updated;
  }
}
