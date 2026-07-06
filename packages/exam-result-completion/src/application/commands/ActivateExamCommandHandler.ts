import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { ExamAggregate, EXAM_STATUSES } from '../../domain/aggregates/Exam';
import { ExamInvalidStateError } from '../../domain/errors';

export interface ActivateExamInput {
  examId: string;
  userId: string;
}

export class ActivateExamCommandHandler {
  constructor(private readonly examRepository: ExamRepository) {}

  async execute(input: ActivateExamInput): Promise<void> {
    const exam = await this.examRepository.findById(input.examId);
    if (!exam) {
      throw new ExamInvalidStateError(`Exam ${input.examId} not found`);
    }

    const aggregate = new ExamAggregate(exam);
    const updated = aggregate.openForResultEntry();

    updated.updatedBy = input.userId;
    await this.examRepository.save(updated);
  }
}
