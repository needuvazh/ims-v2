import { describe, it, expect } from 'vitest';
import {
  CourseCompletionAggregate,
  EvaluateCompletionCommand,
  COMPLETION_STATUSES,
} from '../../src/domain/aggregates/CourseCompletion';
import {
  CompletionInvalidStateError,
  CompletionEvidenceStaleError,
} from '../../src/domain/errors';

describe('CourseCompletionAggregate', () => {
  const createCommand = (
    overrides?: Partial<EvaluateCompletionCommand>,
  ): EvaluateCompletionCommand => ({
    enrollmentId: 'enrollment-1',
    attendancePercentage: 85,
    attendanceOutcome: 'Met',
    examRequired: true,
    examOutcome: 'Pass',
    paymentRequired: true,
    paymentOutcome: 'Cleared',
    manualApprovalRequired: false,
    createdBy: 'user-1',
    ...overrides,
  });

  describe('create', () => {
    it('creates completion in Pending status', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      expect(aggregate.state.completionStatus).toBe(
        COMPLETION_STATUSES.PENDING,
      );
      expect(aggregate.state.certificateAllowed).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('approves when all requirements met and no manual approval', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      const updated = aggregate.evaluate();
      expect(updated.completionStatus).toBe(COMPLETION_STATUSES.APPROVED);
      expect(updated.certificateAllowed).toBe(true);
    });

    it('moves to AwaitingTrainerRecommendation when manual approval required', () => {
      const aggregate = CourseCompletionAggregate.create(
        createCommand({ manualApprovalRequired: true }),
      );
      const updated = aggregate.evaluate();
      expect(updated.completionStatus).toBe(
        COMPLETION_STATUSES.AWAITING_TRAINER_RECOMMENDATION,
      );
    });

    it('marks as EvidenceIncomplete when attendance not met', () => {
      const aggregate = CourseCompletionAggregate.create(
        createCommand({ attendanceOutcome: 'NotMet' }),
      );
      const updated = aggregate.evaluate();
      expect(updated.completionStatus).toBe(
        COMPLETION_STATUSES.EVIDENCE_INCOMPLETE,
      );
    });

    it('throws when evidence is stale', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      const stale = aggregate.markEvidenceStale();
      const agg2 = new CourseCompletionAggregate(stale);
      expect(() => agg2.evaluate()).toThrow(CompletionEvidenceStaleError);
    });

    it('throws when already approved', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      const approved = aggregate.evaluate();
      const agg2 = new CourseCompletionAggregate(approved);
      expect(() => agg2.evaluate()).toThrow(CompletionInvalidStateError);
    });
  });

  describe('recommendByTrainer', () => {
    it('moves to AwaitingCoordinatorReview', () => {
      const aggregate = CourseCompletionAggregate.create(
        createCommand({ manualApprovalRequired: true }),
      );
      const evaluated = aggregate.evaluate();
      const agg2 = new CourseCompletionAggregate(evaluated);
      const updated = agg2.recommendByTrainer();
      expect(updated.completionStatus).toBe(
        COMPLETION_STATUSES.AWAITING_COORDINATOR_REVIEW,
      );
    });

    it('throws when not awaiting trainer recommendation', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      expect(() => aggregate.recommendByTrainer()).toThrow(
        CompletionInvalidStateError,
      );
    });
  });

  describe('reviewByCoordinator', () => {
    it('moves to AwaitingFinalApproval when approved', () => {
      const aggregate = CourseCompletionAggregate.create(
        createCommand({ manualApprovalRequired: true }),
      );
      const evaluated = aggregate.evaluate();
      const agg2 = new CourseCompletionAggregate(evaluated);
      const recommended = agg2.recommendByTrainer();
      const agg3 = new CourseCompletionAggregate(recommended);
      const updated = agg3.reviewByCoordinator(true);
      expect(updated.completionStatus).toBe(
        COMPLETION_STATUSES.AWAITING_FINAL_APPROVAL,
      );
    });

    it('moves to Rejected when not approved', () => {
      const aggregate = CourseCompletionAggregate.create(
        createCommand({ manualApprovalRequired: true }),
      );
      const evaluated = aggregate.evaluate();
      const agg2 = new CourseCompletionAggregate(evaluated);
      const recommended = agg2.recommendByTrainer();
      const agg3 = new CourseCompletionAggregate(recommended);
      const updated = agg3.reviewByCoordinator(false);
      expect(updated.completionStatus).toBe(COMPLETION_STATUSES.REJECTED);
    });

    it('throws when not awaiting coordinator review', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      expect(() => aggregate.reviewByCoordinator(true)).toThrow(
        CompletionInvalidStateError,
      );
    });
  });

  describe('finalApproval', () => {
    it('approves when approved', () => {
      const aggregate = CourseCompletionAggregate.create(
        createCommand({ manualApprovalRequired: true }),
      );
      const evaluated = aggregate.evaluate();
      const agg2 = new CourseCompletionAggregate(evaluated);
      const recommended = agg2.recommendByTrainer();
      const agg3 = new CourseCompletionAggregate(recommended);
      const reviewed = agg3.reviewByCoordinator(true);
      const agg4 = new CourseCompletionAggregate(reviewed);
      const updated = agg4.finalApproval(true);
      expect(updated.completionStatus).toBe(COMPLETION_STATUSES.APPROVED);
      expect(updated.certificateAllowed).toBe(true);
    });

    it('rejects when not approved', () => {
      const aggregate = CourseCompletionAggregate.create(
        createCommand({ manualApprovalRequired: true }),
      );
      const evaluated = aggregate.evaluate();
      const agg2 = new CourseCompletionAggregate(evaluated);
      const recommended = agg2.recommendByTrainer();
      const agg3 = new CourseCompletionAggregate(recommended);
      const reviewed = agg3.reviewByCoordinator(true);
      const agg4 = new CourseCompletionAggregate(reviewed);
      const updated = agg4.finalApproval(false);
      expect(updated.completionStatus).toBe(COMPLETION_STATUSES.REJECTED);
    });

    it('throws when not awaiting final approval', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      expect(() => aggregate.finalApproval(true)).toThrow(
        CompletionInvalidStateError,
      );
    });
  });

  describe('requestReevaluation', () => {
    it('moves to ReevaluationRequired when approved', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      const approved = aggregate.evaluate();
      const agg2 = new CourseCompletionAggregate(approved);
      const updated = agg2.requestReevaluation();
      expect(updated.completionStatus).toBe(
        COMPLETION_STATUSES.REEVALUATION_REQUIRED,
      );
      expect(updated.certificateAllowed).toBe(false);
    });

    it('throws when not approved', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      expect(() => aggregate.requestReevaluation()).toThrow(
        CompletionInvalidStateError,
      );
    });
  });

  describe('approveException', () => {
    it('moves to ExceptionReview when reevaluation required', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      const approved = aggregate.evaluate();
      const agg2 = new CourseCompletionAggregate(approved);
      const reeval = agg2.requestReevaluation();
      const agg3 = new CourseCompletionAggregate(reeval);
      const updated = agg3.approveException();
      expect(updated.completionStatus).toBe(
        COMPLETION_STATUSES.EXCEPTION_REVIEW,
      );
      expect(updated.certificateAllowed).toBe(true);
    });

    it('throws when not reevaluation required', () => {
      const aggregate = CourseCompletionAggregate.create(createCommand());
      expect(() => aggregate.approveException()).toThrow(
        CompletionInvalidStateError,
      );
    });
  });

  describe('complete state machine - manual approval path', () => {
    it('follows full approval path', () => {
      let agg = CourseCompletionAggregate.create(
        createCommand({ manualApprovalRequired: true }),
      );
      expect(agg.state.completionStatus).toBe(COMPLETION_STATUSES.PENDING);

      let state = agg.evaluate();
      expect(state.completionStatus).toBe(
        COMPLETION_STATUSES.AWAITING_TRAINER_RECOMMENDATION,
      );

      agg = new CourseCompletionAggregate(state);
      state = agg.recommendByTrainer();
      expect(state.completionStatus).toBe(
        COMPLETION_STATUSES.AWAITING_COORDINATOR_REVIEW,
      );

      agg = new CourseCompletionAggregate(state);
      state = agg.reviewByCoordinator(true);
      expect(state.completionStatus).toBe(
        COMPLETION_STATUSES.AWAITING_FINAL_APPROVAL,
      );

      agg = new CourseCompletionAggregate(state);
      state = agg.finalApproval(true);
      expect(state.completionStatus).toBe(COMPLETION_STATUSES.APPROVED);
      expect(state.certificateAllowed).toBe(true);
    });
  });

  describe('complete state machine - auto approval path', () => {
    it('auto-approves when no manual approval required', () => {
      const aggregate = CourseCompletionAggregate.create(
        createCommand({ manualApprovalRequired: false }),
      );
      const updated = aggregate.evaluate();
      expect(updated.completionStatus).toBe(COMPLETION_STATUSES.APPROVED);
      expect(updated.certificateAllowed).toBe(true);
    });
  });
});
