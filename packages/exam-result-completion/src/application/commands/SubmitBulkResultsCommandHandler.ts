import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { ResultAggregate, RecordResultCommand, RESULT_STATUSES } from '../../domain/aggregates/Result';
import { ResultInvalidStateError } from '../../domain/errors';

export interface SubmitBulkResultsInput {
  examId: string;
  validationToken?: string;
  results: Array<{
    enrollmentId: string;
    marksObtained: number;
    grade?: string;
  }>;
  userId: string;
}

export class SubmitBulkResultsCommandHandler {
  constructor(
    private readonly resultRepository: ResultRepository,
    private readonly examRepository: ExamRepository,
  ) {}

  async execute(input: SubmitBulkResultsInput): Promise<number> {
    const exam = await this.examRepository.findById(input.examId);
    if (!exam) {
      throw new ResultInvalidStateError(`Exam ${input.examId} not found`);
    }

    if (exam.status !== 'OpenForResultEntry') {
      throw new ResultInvalidStateError(`Exam ${input.examId} is not open for result entry (status: ${exam.status})`);
    }

    const newResults: ResultAggregate[] = [];
    const updatedResults: ResultAggregate[] = [];

    for (const row of input.results) {
      const existing = await this.resultRepository.findByExamAndEnrollment(input.examId, row.enrollmentId);

      if (existing && existing.resultStatus === RESULT_STATUSES.PENDING) {
        const aggregate = new ResultAggregate(existing);
        const updated = aggregate.record(row.marksObtained, exam.maxMarks, row.grade);
        updated.updatedBy = input.userId;
        updatedResults.push(new ResultAggregate(updated));
      } else if (!existing) {
        const command: RecordResultCommand = {
          examId: input.examId,
          enrollmentId: row.enrollmentId,
          marksObtained: row.marksObtained,
          grade: row.grade,
          createdBy: input.userId,
        };
        newResults.push(ResultAggregate.create(command, exam.maxMarks));
      }
    }

    await this.resultRepository.saveMany([
      ...newResults.map(r => r.state),
      ...updatedResults.map(r => r.state),
    ]);

    return newResults.length + updatedResults.length;
  }
}
