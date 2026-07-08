import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { EnrollmentReader } from '../../domain/interfaces/EnrollmentReader';
import {
  ResultAggregate,
  RecordResultCommand,
  RESULT_STATUSES,
} from '../../domain/aggregates/Result';
import {
  ResultInvalidStateError,
  ResultDuplicateError,
} from '../../domain/errors';

export interface RecordResultInput {
  examId: string;
  enrollmentId: string;
  marksObtained: number;
  grade?: string;
  userId: string;
}

export class RecordResultCommandHandler {
  constructor(
    private readonly resultRepository: ResultRepository,
    private readonly examRepository: ExamRepository,
    private readonly enrollmentReader: EnrollmentReader,
  ) {}

  async execute(input: RecordResultInput): Promise<string> {
    const exam = await this.examRepository.findById(input.examId);
    if (!exam) {
      throw new ResultInvalidStateError(`Exam ${input.examId} not found`);
    }

    if (exam.status !== 'OpenForResultEntry') {
      throw new ResultInvalidStateError(
        `Exam ${input.examId} is not open for result entry (status: ${exam.status})`,
      );
    }

    const enrollment = await this.enrollmentReader.getEnrollmentById(
      input.enrollmentId,
    );
    if (!enrollment) {
      throw new ResultInvalidStateError(
        `Enrollment ${input.enrollmentId} not found`,
      );
    }

    if (enrollment.batchId !== exam.batchId) {
      throw new ResultInvalidStateError(
        `Enrollment ${input.enrollmentId} does not belong to exam batch`,
      );
    }

    const existing = await this.resultRepository.findByExamAndEnrollment(
      input.examId,
      input.enrollmentId,
    );
    if (existing && existing.resultStatus !== RESULT_STATUSES.PENDING) {
      throw new ResultDuplicateError(
        `Result already exists for exam ${input.examId} and enrollment ${input.enrollmentId}`,
      );
    }

    const command: RecordResultCommand = {
      examId: input.examId,
      enrollmentId: input.enrollmentId,
      marksObtained: input.marksObtained,
      grade: input.grade,
      createdBy: input.userId,
    };

    const aggregate = ResultAggregate.create(command, exam.maxMarks);
    await this.resultRepository.save(aggregate.state);

    return aggregate.state.id;
  }
}
