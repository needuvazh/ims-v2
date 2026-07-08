import { describe, it, expect } from 'vitest';
import {
  ResultAggregate,
  RecordResultCommand,
  RESULT_STATUSES,
} from '../../src/domain/aggregates/Result';
import {
  ResultInvalidStateError,
  ResultMarksValidationError,
} from '../../src/domain/errors';

describe('ResultAggregate', () => {
  const EXAM_MAX_MARKS = 100;

  const createCommand = (
    overrides?: Partial<RecordResultCommand>,
  ): RecordResultCommand => ({
    examId: 'exam-1',
    enrollmentId: 'enrollment-1',
    marksObtained: 75,
    grade: 'A',
    createdBy: 'user-1',
    ...overrides,
  });

  describe('create', () => {
    it('creates result in Recorded status', () => {
      const aggregate = ResultAggregate.create(createCommand(), EXAM_MAX_MARKS);
      expect(aggregate.state.resultStatus).toBe(RESULT_STATUSES.RECORDED);
      expect(aggregate.state.marksObtained).toBe(75);
    });

    it('throws when marksObtained < 0', () => {
      expect(() =>
        ResultAggregate.create(
          createCommand({ marksObtained: -1 }),
          EXAM_MAX_MARKS,
        ),
      ).toThrow(ResultMarksValidationError);
    });

    it('throws when marksObtained > maxMarks', () => {
      expect(() =>
        ResultAggregate.create(
          createCommand({ marksObtained: 101 }),
          EXAM_MAX_MARKS,
        ),
      ).toThrow(ResultMarksValidationError);
    });

    it('allows marksObtained equal to maxMarks', () => {
      const aggregate = ResultAggregate.create(
        createCommand({ marksObtained: 100 }),
        EXAM_MAX_MARKS,
      );
      expect(aggregate.state.resultStatus).toBe(RESULT_STATUSES.RECORDED);
    });

    it('allows marksObtained equal to 0', () => {
      const aggregate = ResultAggregate.create(
        createCommand({ marksObtained: 0 }),
        EXAM_MAX_MARKS,
      );
      expect(aggregate.state.resultStatus).toBe(RESULT_STATUSES.RECORDED);
    });
  });

  describe('record', () => {
    it('records marks when Pending', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 0,
        resultStatus: RESULT_STATUSES.PENDING,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      const updated = aggregate.record(85, EXAM_MAX_MARKS, 'A');
      expect(updated.marksObtained).toBe(85);
      expect(updated.resultStatus).toBe(RESULT_STATUSES.RECORDED);
      expect(updated.grade).toBe('A');
    });

    it('throws when not Pending', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 75,
        resultStatus: RESULT_STATUSES.RECORDED,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      expect(() => aggregate.record(85, EXAM_MAX_MARKS)).toThrow(
        ResultInvalidStateError,
      );
    });
  });

  describe('finalize', () => {
    it('finalizes when Recorded', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 75,
        resultStatus: RESULT_STATUSES.RECORDED,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      const updated = aggregate.finalize('user-1');
      expect(updated.resultStatus).toBe(RESULT_STATUSES.FINALIZED);
      expect(updated.finalizedBy).toBe('user-1');
      expect(updated.finalizedAt).toBeDefined();
    });

    it('finalizes when Corrected', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 80,
        resultStatus: RESULT_STATUSES.CORRECTED,
        version: 2,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      const updated = aggregate.finalize('user-1');
      expect(updated.resultStatus).toBe(RESULT_STATUSES.FINALIZED);
    });

    it('throws when Pending', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 0,
        resultStatus: RESULT_STATUSES.PENDING,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      expect(() => aggregate.finalize()).toThrow(ResultInvalidStateError);
    });

    it('throws when already Finalized', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 75,
        resultStatus: RESULT_STATUSES.FINALIZED,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      expect(() => aggregate.finalize()).toThrow(ResultInvalidStateError);
    });
  });

  describe('correct', () => {
    it('corrects when Finalized', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 75,
        resultStatus: RESULT_STATUSES.FINALIZED,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      const updated = aggregate.correct(85, EXAM_MAX_MARKS, 'B+', 'user-2');
      expect(updated.marksObtained).toBe(85);
      expect(updated.resultStatus).toBe(RESULT_STATUSES.CORRECTED);
      expect(updated.grade).toBe('B+');
    });

    it('throws when not Finalized', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 75,
        resultStatus: RESULT_STATUSES.RECORDED,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      expect(() => aggregate.correct(85, EXAM_MAX_MARKS)).toThrow(
        ResultInvalidStateError,
      );
    });

    it('validates marks on correction', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 75,
        resultStatus: RESULT_STATUSES.FINALIZED,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      expect(() => aggregate.correct(101, EXAM_MAX_MARKS)).toThrow(
        ResultMarksValidationError,
      );
    });
  });

  describe('isPass', () => {
    it('returns true when marks >= passMarks', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 75,
        resultStatus: RESULT_STATUSES.RECORDED,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      expect(aggregate.isPass(50)).toBe(true);
      expect(aggregate.isPass(75)).toBe(true);
    });

    it('returns false when marks < passMarks', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 45,
        resultStatus: RESULT_STATUSES.RECORDED,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };
      const aggregate = new ResultAggregate(result);
      expect(aggregate.isPass(50)).toBe(false);
    });
  });

  describe('complete state machine', () => {
    it('follows happy path: Pending -> Recorded -> Finalized -> Corrected', () => {
      const result = {
        id: 'result-1',
        examId: 'exam-1',
        enrollmentId: 'enrollment-1',
        marksObtained: 0,
        resultStatus: RESULT_STATUSES.PENDING,
        version: 1,
        createdAt: new Date(),
        isDeleted: false,
      };

      let agg = new ResultAggregate(result);
      let updated = agg.record(75, EXAM_MAX_MARKS, 'A');
      expect(updated.resultStatus).toBe(RESULT_STATUSES.RECORDED);

      agg = new ResultAggregate(updated);
      updated = agg.finalize('user-1');
      expect(updated.resultStatus).toBe(RESULT_STATUSES.FINALIZED);

      agg = new ResultAggregate(updated);
      updated = agg.correct(85, EXAM_MAX_MARKS, 'A+', 'user-2');
      expect(updated.resultStatus).toBe(RESULT_STATUSES.CORRECTED);
    });
  });
});
