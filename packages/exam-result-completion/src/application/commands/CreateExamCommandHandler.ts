import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { EnrollmentReader } from '../../domain/interfaces/EnrollmentReader';
import {
  ExamAggregate,
  CreateExamCommand,
  EXAM_STATUSES,
} from '../../domain/aggregates/Exam';
import {
  ExamInvalidStateError,
  ExamMarksValidationError,
} from '../../domain/errors';

export interface CreateExamInput {
  courseId: string;
  batchId: string;
  examName: string;
  examDate: Date;
  maxMarks: number;
  passMarks: number;
  userId: string;
}

export class CreateExamCommandHandler {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly enrollmentReader: EnrollmentReader,
  ) {}

  async execute(input: CreateExamInput): Promise<string> {
    const batch = await this.enrollmentReader.getEnrollmentsForBatch(
      input.batchId,
    );
    if (!batch || batch.length === 0) {
      throw new ExamInvalidStateError(
        `Batch ${input.batchId} not found or has no enrollments`,
      );
    }

    const command: CreateExamCommand = {
      courseId: input.courseId,
      batchId: input.batchId,
      examName: input.examName,
      examDate: input.examDate,
      maxMarks: input.maxMarks,
      passMarks: input.passMarks,
      createdBy: input.userId,
    };

    const examAggregate = ExamAggregate.create(command);
    await this.examRepository.save(examAggregate.state);

    return examAggregate.state.id;
  }
}
