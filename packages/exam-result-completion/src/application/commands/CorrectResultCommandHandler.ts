import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { ResultAggregate, RESULT_STATUSES } from '../../domain/aggregates/Result';
import { ResultInvalidStateError } from '../../domain/errors';

export interface CorrectResultInput {
  resultId: string;
  marksObtained: number;
  grade?: string;
  reason: string;
  userId: string;
}

export class CorrectResultCommandHandler {
  constructor(
    private readonly resultRepository: ResultRepository,
    private readonly examRepository: ExamRepository,
  ) {}

  async execute(input: CorrectResultInput): Promise<void> {
    const result = await this.resultRepository.findById(input.resultId);
    if (!result) {
      throw new ResultInvalidStateError(`Result ${input.resultId} not found`);
    }

    if (result.resultStatus !== RESULT_STATUSES.FINALIZED) {
      throw new ResultInvalidStateError(`Result ${input.resultId} must be finalized before correction (status: ${result.resultStatus})`);
    }

    const exam = await this.examRepository.findById(result.examId);
    if (!exam) {
      throw new ResultInvalidStateError(`Exam ${result.examId} not found`);
    }

    const aggregate = new ResultAggregate(result);
    const updated = aggregate.correct(input.marksObtained, exam.maxMarks, input.grade, input.userId);

    await this.resultRepository.save(updated);
  }
}
