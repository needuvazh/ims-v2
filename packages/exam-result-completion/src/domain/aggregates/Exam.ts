import { ExamInvalidStateError, ExamMarksValidationError } from '../errors';

export type ExamStatus = 'Draft' | 'Scheduled' | 'OpenForResultEntry' | 'Closed' | 'Cancelled' | 'Archived';

export const EXAM_STATUSES = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  OPEN_FOR_RESULT_ENTRY: 'OpenForResultEntry',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
} as const;

export interface Exam {
  id: string;
  courseId: string;
  batchId: string;
  examName: string;
  examDate: Date;
  maxMarks: number;
  passMarks: number;
  status: ExamStatus;
  version: number;
  createdAt: Date;
  createdBy?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}

export interface CreateExamCommand {
  courseId: string;
  batchId: string;
  examName: string;
  examDate: Date;
  maxMarks: number;
  passMarks: number;
  createdBy?: string;
}

export class ExamAggregate {
  constructor(public readonly state: Exam) {}

  static create(command: CreateExamCommand, id?: string): ExamAggregate {
    ExamAggregate.validateMarks(command.maxMarks, command.passMarks);

    const exam: Exam = {
      id: id || crypto.randomUUID(),
      courseId: command.courseId,
      batchId: command.batchId,
      examName: command.examName,
      examDate: command.examDate,
      maxMarks: command.maxMarks,
      passMarks: command.passMarks,
      status: EXAM_STATUSES.DRAFT,
      version: 1,
      createdAt: new Date(),
      createdBy: command.createdBy || null,
      isDeleted: false,
    };

    return new ExamAggregate(exam);
  }

  private static validateMarks(maxMarks: number, passMarks: number): void {
    if (maxMarks <= 0) {
      throw new ExamMarksValidationError('maxMarks must be greater than 0');
    }
    if (passMarks < 0) {
      throw new ExamMarksValidationError('passMarks must be >= 0');
    }
    if (passMarks > maxMarks) {
      throw new ExamMarksValidationError('passMarks must be <= maxMarks');
    }
  }

  schedule(): Exam {
    if (this.state.status !== EXAM_STATUSES.DRAFT) {
      throw new ExamInvalidStateError(`Cannot schedule exam in status: ${this.state.status}`);
    }

    const updated: Exam = {
      ...this.state,
      status: EXAM_STATUSES.SCHEDULED,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  reschedule(newDate: Date): Exam {
    if (this.state.status !== EXAM_STATUSES.SCHEDULED) {
      throw new ExamInvalidStateError(`Cannot reschedule exam in status: ${this.state.status}`);
    }

    const updated: Exam = {
      ...this.state,
      examDate: newDate,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  openForResultEntry(): Exam {
    if (this.state.status !== EXAM_STATUSES.SCHEDULED) {
      throw new ExamInvalidStateError(`Cannot open exam for result entry in status: ${this.state.status}`);
    }

    const updated: Exam = {
      ...this.state,
      status: EXAM_STATUSES.OPEN_FOR_RESULT_ENTRY,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  close(): Exam {
    if (this.state.status !== EXAM_STATUSES.OPEN_FOR_RESULT_ENTRY) {
      throw new ExamInvalidStateError(`Cannot close exam in status: ${this.state.status}`);
    }

    const updated: Exam = {
      ...this.state,
      status: EXAM_STATUSES.CLOSED,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  cancel(reason?: string): Exam {
    if (this.state.status === EXAM_STATUSES.CLOSED || this.state.status === EXAM_STATUSES.ARCHIVED) {
      throw new ExamInvalidStateError(`Cannot cancel exam in status: ${this.state.status}`);
    }

    const updated: Exam = {
      ...this.state,
      status: EXAM_STATUSES.CANCELLED,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  archive(): Exam {
    if (this.state.status !== EXAM_STATUSES.CLOSED && this.state.status !== EXAM_STATUSES.CANCELLED) {
      throw new ExamInvalidStateError(`Cannot archive exam in status: ${this.state.status}`);
    }

    const updated: Exam = {
      ...this.state,
      status: EXAM_STATUSES.ARCHIVED,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }

  updateDetails(updates: Partial<Pick<Exam, 'examName' | 'examDate' | 'maxMarks' | 'passMarks'>>): Exam {
    if (this.state.status !== EXAM_STATUSES.DRAFT && this.state.status !== EXAM_STATUSES.SCHEDULED) {
      throw new ExamInvalidStateError(`Cannot update exam details in status: ${this.state.status}`);
    }

    let newMaxMarks = this.state.maxMarks;
    let newPassMarks = this.state.passMarks;

    if (updates.maxMarks !== undefined || updates.passMarks !== undefined) {
      newMaxMarks = updates.maxMarks ?? this.state.maxMarks;
      newPassMarks = updates.passMarks ?? this.state.passMarks;
      ExamAggregate.validateMarks(newMaxMarks, newPassMarks);
    }

    const updated: Exam = {
      ...this.state,
      examName: updates.examName ?? this.state.examName,
      examDate: updates.examDate ?? this.state.examDate,
      maxMarks: newMaxMarks,
      passMarks: newPassMarks,
      version: this.state.version + 1,
      updatedAt: new Date(),
    };

    return updated;
  }
}
