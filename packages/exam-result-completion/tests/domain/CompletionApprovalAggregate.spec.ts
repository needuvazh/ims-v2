import { describe, it, expect } from 'vitest';
import { CompletionApprovalAggregate, CreateApprovalCommand, ActOnApprovalCommand, APPROVAL_LEVELS, APPROVAL_STATUSES } from '../../src/domain/aggregates/CompletionApproval';
import { ApprovalInvalidStateError, ApprovalStageSequenceError, ApprovalActorIneligibleError } from '../../src/domain/errors';

describe('CompletionApprovalAggregate', () => {
  const createCommand = (overrides?: Partial<CreateApprovalCommand>): CreateApprovalCommand => ({
    courseCompletionId: 'completion-1',
    approvalLevel: APPROVAL_LEVELS.TRAINER_RECOMMENDATION,
    actorId: 'trainer-1',
    createdBy: 'user-1',
    ...overrides,
  });

  describe('create', () => {
    it('creates approval in Pending status', () => {
      const aggregate = CompletionApprovalAggregate.create(createCommand());
      expect(aggregate.state.status).toBe(APPROVAL_STATUSES.PENDING);
    });
  });

  describe('validateSequence', () => {
    it('allows TrainerRecommendation as first level', () => {
      const aggregate = CompletionApprovalAggregate.create(createCommand());
      expect(() => aggregate.validateSequence(null)).not.toThrow();
    });

    it('throws when first level is not TrainerRecommendation', () => {
      const aggregate = CompletionApprovalAggregate.create(createCommand({ approvalLevel: APPROVAL_LEVELS.COORDINATOR_REVIEW }));
      expect(() => aggregate.validateSequence(null)).toThrow(ApprovalStageSequenceError);
    });

    it('allows CoordinatorReview after TrainerRecommendation', () => {
      const aggregate = CompletionApprovalAggregate.create(createCommand({ approvalLevel: APPROVAL_LEVELS.COORDINATOR_REVIEW }));
      expect(() => aggregate.validateSequence(APPROVAL_LEVELS.TRAINER_RECOMMENDATION)).not.toThrow();
    });

    it('allows FinalApproval after CoordinatorReview', () => {
      const aggregate = CompletionApprovalAggregate.create(createCommand({ approvalLevel: APPROVAL_LEVELS.FINAL_APPROVAL }));
      expect(() => aggregate.validateSequence(APPROVAL_LEVELS.COORDINATOR_REVIEW)).not.toThrow();
    });

    it('throws when skipping levels', () => {
      const aggregate = CompletionApprovalAggregate.create(createCommand({ approvalLevel: APPROVAL_LEVELS.FINAL_APPROVAL }));
      expect(() => aggregate.validateSequence(APPROVAL_LEVELS.TRAINER_RECOMMENDATION)).toThrow(ApprovalStageSequenceError);
    });
  });

  describe('validateActor', () => {
    it('passes when actor is eligible', () => {
      const aggregate = CompletionApprovalAggregate.create(createCommand());
      expect(() => aggregate.validateActor(['trainer-1', 'trainer-2'])).not.toThrow();
    });

    it('throws when actor is not eligible', () => {
      const aggregate = CompletionApprovalAggregate.create(createCommand());
      expect(() => aggregate.validateActor(['trainer-2', 'trainer-3'])).toThrow(ApprovalActorIneligibleError);
    });
  });

  describe('act', () => {
    const actCommand = (overrides?: Partial<ActOnApprovalCommand>): ActOnApprovalCommand => ({
      approvalId: 'approval-1',
      status: APPROVAL_STATUSES.APPROVED,
      remarks: 'Approved',
      actorId: 'trainer-1',
      ...overrides,
    });

    it('approves when actor matches', () => {
      const approval = {
        id: 'approval-1',
        courseCompletionId: 'completion-1',
        approvalLevel: APPROVAL_LEVELS.TRAINER_RECOMMENDATION,
        status: APPROVAL_STATUSES.PENDING,
        actorId: 'trainer-1',
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new CompletionApprovalAggregate(approval);
      const updated = aggregate.act(actCommand());
      expect(updated.status).toBe(APPROVAL_STATUSES.APPROVED);
      expect(updated.actionDate).toBeDefined();
      expect(updated.remarks).toBe('Approved');
    });

    it('rejects when status is Rejected', () => {
      const approval = {
        id: 'approval-1',
        courseCompletionId: 'completion-1',
        approvalLevel: APPROVAL_LEVELS.TRAINER_RECOMMENDATION,
        status: APPROVAL_STATUSES.PENDING,
        actorId: 'trainer-1',
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new CompletionApprovalAggregate(approval);
      const updated = aggregate.act(actCommand({ status: APPROVAL_STATUSES.REJECTED, remarks: 'Not ready' }));
      expect(updated.status).toBe(APPROVAL_STATUSES.REJECTED);
    });

    it('throws when actor does not match', () => {
      const approval = {
        id: 'approval-1',
        courseCompletionId: 'completion-1',
        approvalLevel: APPROVAL_LEVELS.TRAINER_RECOMMENDATION,
        status: APPROVAL_STATUSES.PENDING,
        actorId: 'trainer-1',
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new CompletionApprovalAggregate(approval);
      expect(() => aggregate.act(actCommand({ actorId: 'trainer-2' }))).toThrow(ApprovalActorIneligibleError);
    });

    it('throws when already acted upon', () => {
      const approval = {
        id: 'approval-1',
        courseCompletionId: 'completion-1',
        approvalLevel: APPROVAL_LEVELS.TRAINER_RECOMMENDATION,
        status: APPROVAL_STATUSES.APPROVED,
        actorId: 'trainer-1',
        actionDate: new Date(),
        version: 2,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new CompletionApprovalAggregate(approval);
      expect(() => aggregate.act(actCommand())).toThrow(ApprovalInvalidStateError);
    });

    it('throws when status is invalid', () => {
      const approval = {
        id: 'approval-1',
        courseCompletionId: 'completion-1',
        approvalLevel: APPROVAL_LEVELS.TRAINER_RECOMMENDATION,
        status: APPROVAL_STATUSES.PENDING,
        actorId: 'trainer-1',
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new CompletionApprovalAggregate(approval);
      expect(() => aggregate.act(actCommand({ status: 'Pending' as any }))).toThrow(ApprovalInvalidStateError);
    });
  });
});
