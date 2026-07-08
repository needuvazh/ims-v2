import {
  ResultInvalidStateError,
  ResultMarksValidationError,
  ResultDuplicateError,
} from '../errors';

export type ResultStatus = 'Pending' | 'Recorded' | 'Finalized' | 'Corrected';

export const RESULT_STATUSES = {
  PENDING: 'Pending',
  RECORDED: 'Recorded',
  FINALIZED: 'Finalized',
  CORRECTED: 'Corrected',
} as const;

export interface Result {
  id: string;
  examId: string;
  enrollmentId: string;
  marksObtained: number;
  resultStatus: ResultStatus;
  grade?: string | null;
  finalizedAt?: Date | null;
  finalizedBy?: string | null;
  version: number;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}

export interface RecordResultCommand {
  examId: string;
  enrollmentId: string;
  marksObtained: number;
  grade?: string;
  createdBy?: string;
}

export interface CorrectResultCommand {
  resultId: string;
  marksObtained: number;
  grade?: string;
  correctedBy?: string;
}

export class ResultAggregate {
  constructor(public readonly state: Result) {}

  static create(
    command: RecordResultCommand,
    examMaxMarks: number,
    id?: string,
  ): ResultAggregate {
    ResultAggregate.validateMarks(command.marksObtained, examMaxMarks);

    const result: Result = {
      id: id || crypto.randomUUID(),
      examId: command.examId,
      enrollmentId: command.enrollmentId,
      marksObtained: command.marksObtained,
      resultStatus: RESULT_STATUSES.RECORDED,
      grade: command.grade || null,
      version: 1,
      createdAt: new Date(),
      createdBy: command.createdBy || null,
      isDeleted: false,
    };

    return new ResultAggregate(result);
  }

  private static validateMarks(marksObtained: number, maxMarks: number): void {
    if (marksObtained < 0) {
      throw new ResultMarksValidationError('marksObtained must be >= 0');
    }
    if (marksObtained > maxMarks) {
      throw new ResultMarksValidationError('marksObtained must be <= maxMarks');
    }
  }

  record(marksObtained: number, examMaxMarks: number, grade?: string): Result {
    if (this.state.resultStatus !== RESULT_STATUSES.PENDING) {
      throw new ResultInvalidStateError(
        `Cannot record result in status: ${this.state.resultStatus}`,
      );
    }

    ResultAggregate.validateMarks(marksObtained, examMaxMarks);

    const updated: Result = {
      ...this.state,
      marksObtained,
      grade: grade ?? this.state.grade,
      resultStatus: RESULT_STATUSES.RECORDED,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  finalize(finalizedBy?: string): Result {
    if (
      this.state.resultStatus !== RESULT_STATUSES.RECORDED &&
      this.state.resultStatus !== RESULT_STATUSES.CORRECTED
    ) {
      throw new ResultInvalidStateError(
        `Cannot finalize result in status: ${this.state.resultStatus}`,
      );
    }

    const updated: Result = {
      ...this.state,
      resultStatus: RESULT_STATUSES.FINALIZED,
      finalizedAt: new Date(),
      finalizedBy: finalizedBy || null,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  correct(
    marksObtained: number,
    examMaxMarks: number,
    grade?: string,
    correctedBy?: string,
  ): Result {
    if (this.state.resultStatus !== RESULT_STATUSES.FINALIZED) {
      throw new ResultInvalidStateError(
        `Cannot correct result in status: ${this.state.resultStatus}`,
      );
    }

    ResultAggregate.validateMarks(marksObtained, examMaxMarks);

    const updated: Result = {
      ...this.state,
      marksObtained,
      grade: grade ?? this.state.grade,
      resultStatus: RESULT_STATUSES.CORRECTED,
      version: this.state.version + 1,
      updatedAt: new Date(),
      updatedBy: correctedBy || null,
    };

    return updated;
  }

  isPass(passMarks: number): boolean {
    return this.state.marksObtained >= passMarks;
  }
}
