import { describe, it, expect } from 'vitest';
import {
  ExamAggregate,
  CreateExamCommand,
  EXAM_STATUSES,
} from '../../src/domain/aggregates/Exam';
import {
  ExamInvalidStateError,
  ExamMarksValidationError,
} from '../../src/domain/errors';

describe('ExamAggregate', () => {
  const createCommand = (
    overrides?: Partial<CreateExamCommand>,
  ): CreateExamCommand => ({
    courseId: 'course-1',
    batchId: 'batch-1',
    examName: 'Final Exam',
    examDate: new Date('2026-08-01'),
    maxMarks: 100,
    passMarks: 50,
    createdBy: 'user-1',
    ...overrides,
  });

  describe('create', () => {
    it('creates exam in Draft status', () => {
      const aggregate = ExamAggregate.create(createCommand());
      expect(aggregate.state.status).toBe(EXAM_STATUSES.DRAFT);
      expect(aggregate.state.version).toBe(1);
    });

    it('throws when maxMarks <= 0', () => {
      expect(() =>
        ExamAggregate.create(createCommand({ maxMarks: 0 })),
      ).toThrow(ExamMarksValidationError);
      expect(() =>
        ExamAggregate.create(createCommand({ maxMarks: -10 })),
      ).toThrow(ExamMarksValidationError);
    });

    it('throws when passMarks < 0', () => {
      expect(() =>
        ExamAggregate.create(createCommand({ passMarks: -1 })),
      ).toThrow(ExamMarksValidationError);
    });

    it('throws when passMarks > maxMarks', () => {
      expect(() =>
        ExamAggregate.create(createCommand({ maxMarks: 50, passMarks: 60 })),
      ).toThrow(ExamMarksValidationError);
    });

    it('allows passMarks equal to maxMarks', () => {
      const aggregate = ExamAggregate.create(
        createCommand({ maxMarks: 100, passMarks: 100 }),
      );
      expect(aggregate.state.status).toBe(EXAM_STATUSES.DRAFT);
    });

    it('allows passMarks equal to 0', () => {
      const aggregate = ExamAggregate.create(createCommand({ passMarks: 0 }));
      expect(aggregate.state.status).toBe(EXAM_STATUSES.DRAFT);
    });
  });

  describe('schedule', () => {
    it('transitions Draft to Scheduled', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const updated = aggregate.schedule();
      expect(updated.status).toBe(EXAM_STATUSES.SCHEDULED);
      expect(updated.version).toBe(2);
    });

    it('throws when not in Draft status', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      expect(() => agg2.schedule()).toThrow(ExamInvalidStateError);
    });
  });

  describe('reschedule', () => {
    it('updates examDate when Scheduled', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const newDate = new Date('2026-09-01');
      const updated = agg2.reschedule(newDate);
      expect(updated.examDate).toEqual(newDate);
    });

    it('throws when not in Scheduled status', () => {
      const aggregate = ExamAggregate.create(createCommand());
      expect(() => aggregate.reschedule(new Date('2026-09-01'))).toThrow(
        ExamInvalidStateError,
      );
    });
  });

  describe('openForResultEntry', () => {
    it('transitions Scheduled to OpenForResultEntry', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const updated = agg2.openForResultEntry();
      expect(updated.status).toBe(EXAM_STATUSES.OPEN_FOR_RESULT_ENTRY);
    });

    it('throws when not in Scheduled status', () => {
      const aggregate = ExamAggregate.create(createCommand());
      expect(() => aggregate.openForResultEntry()).toThrow(
        ExamInvalidStateError,
      );
    });
  });

  describe('close', () => {
    it('transitions OpenForResultEntry to Closed', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const opened = agg2.openForResultEntry();
      const agg3 = new ExamAggregate(opened);
      const updated = agg3.close();
      expect(updated.status).toBe(EXAM_STATUSES.CLOSED);
    });

    it('throws when not in OpenForResultEntry status', () => {
      const aggregate = ExamAggregate.create(createCommand());
      expect(() => aggregate.close()).toThrow(ExamInvalidStateError);
    });
  });

  describe('cancel', () => {
    it('cancels from Draft', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const updated = aggregate.cancel();
      expect(updated.status).toBe(EXAM_STATUSES.CANCELLED);
    });

    it('cancels from Scheduled', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const updated = agg2.cancel();
      expect(updated.status).toBe(EXAM_STATUSES.CANCELLED);
    });

    it('cancels from OpenForResultEntry', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const opened = agg2.openForResultEntry();
      const agg3 = new ExamAggregate(opened);
      const updated = agg3.cancel();
      expect(updated.status).toBe(EXAM_STATUSES.CANCELLED);
    });

    it('throws when Closed', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const opened = agg2.openForResultEntry();
      const agg3 = new ExamAggregate(opened);
      const closed = agg3.close();
      const agg4 = new ExamAggregate(closed);
      expect(() => agg4.cancel()).toThrow(ExamInvalidStateError);
    });

    it('throws when Archived', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const opened = agg2.openForResultEntry();
      const agg3 = new ExamAggregate(opened);
      const closed = agg3.close();
      const agg4 = new ExamAggregate(closed);
      const archived = agg4.archive();
      const agg5 = new ExamAggregate(archived);
      expect(() => agg5.cancel()).toThrow(ExamInvalidStateError);
    });
  });

  describe('archive', () => {
    it('archives from Closed', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const opened = agg2.openForResultEntry();
      const agg3 = new ExamAggregate(opened);
      const closed = agg3.close();
      const agg4 = new ExamAggregate(closed);
      const updated = agg4.archive();
      expect(updated.status).toBe(EXAM_STATUSES.ARCHIVED);
    });

    it('archives from Cancelled', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const cancelled = aggregate.cancel();
      const agg2 = new ExamAggregate(cancelled);
      const updated = agg2.archive();
      expect(updated.status).toBe(EXAM_STATUSES.ARCHIVED);
    });

    it('throws when not Closed or Cancelled', () => {
      const aggregate = ExamAggregate.create(createCommand());
      expect(() => aggregate.archive()).toThrow(ExamInvalidStateError);
    });
  });

  describe('updateDetails', () => {
    it('updates details when Draft', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const updated = aggregate.updateDetails({
        examName: 'Updated Exam',
        maxMarks: 150,
        passMarks: 75,
      });
      expect(updated.examName).toBe('Updated Exam');
      expect(updated.maxMarks).toBe(150);
      expect(updated.passMarks).toBe(75);
    });

    it('updates details when Scheduled', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const updated = agg2.updateDetails({ examName: 'Updated Exam' });
      expect(updated.examName).toBe('Updated Exam');
    });

    it('throws when OpenForResultEntry', () => {
      const aggregate = ExamAggregate.create(createCommand());
      const scheduled = aggregate.schedule();
      const agg2 = new ExamAggregate(scheduled);
      const opened = agg2.openForResultEntry();
      const agg3 = new ExamAggregate(opened);
      expect(() => agg3.updateDetails({ examName: 'Updated' })).toThrow(
        ExamInvalidStateError,
      );
    });

    it('validates marks when updating', () => {
      const aggregate = ExamAggregate.create(createCommand());
      expect(() =>
        aggregate.updateDetails({ maxMarks: 50, passMarks: 60 }),
      ).toThrow(ExamMarksValidationError);
    });
  });

  describe('complete state machine', () => {
    it('follows happy path: Draft -> Scheduled -> OpenForResultEntry -> Closed -> Archived', () => {
      let agg = ExamAggregate.create(createCommand());
      expect(agg.state.status).toBe(EXAM_STATUSES.DRAFT);

      let state = agg.schedule();
      expect(state.status).toBe(EXAM_STATUSES.SCHEDULED);

      agg = new ExamAggregate(state);
      state = agg.openForResultEntry();
      expect(state.status).toBe(EXAM_STATUSES.OPEN_FOR_RESULT_ENTRY);

      agg = new ExamAggregate(state);
      state = agg.close();
      expect(state.status).toBe(EXAM_STATUSES.CLOSED);

      agg = new ExamAggregate(state);
      state = agg.archive();
      expect(state.status).toBe(EXAM_STATUSES.ARCHIVED);
    });

    it('allows cancellation from any non-terminal state', () => {
      // Draft
      let agg = ExamAggregate.create(createCommand());
      let state = agg.cancel();
      expect(state.status).toBe(EXAM_STATUSES.CANCELLED);

      // Scheduled
      agg = ExamAggregate.create(createCommand());
      state = agg.schedule();
      agg = new ExamAggregate(state);
      state = agg.cancel();
      expect(state.status).toBe(EXAM_STATUSES.CANCELLED);

      // OpenForResultEntry
      agg = ExamAggregate.create(createCommand());
      state = agg.schedule();
      agg = new ExamAggregate(state);
      state = agg.openForResultEntry();
      agg = new ExamAggregate(state);
      state = agg.cancel();
      expect(state.status).toBe(EXAM_STATUSES.CANCELLED);
    });
  });
});
