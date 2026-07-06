import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { ExamAggregate, EXAM_STATUSES } from '../../domain/aggregates/Exam';
import { ExamInvalidStateError } from '../../domain/errors';

export interface UpdateExamInput {
  examId: string;
  examName?: string;
  examDate?: Date;
  maxMarks?: number;
  passMarks?: number;
  userId: string;
}

export class UpdateExamCommandHandler {
  constructor(private readonly examRepository: ExamRepository) {}

  async execute(input: UpdateExamInput): Promise<void> {
    const exam = await this.examRepository.findById(input.examId);
    if (!exam) {
      throw new ExamInvalidStateError(`Exam ${input.examId} not found`);
    }

    if (exam.status !== EXAM_STATUSES.DRAFT && exam.status !== EXAM_STATUSES.SCHEDULED) {
      throw new ExamInvalidStateError(`Cannot update exam in status: ${exam.status}`);
    }

    const aggregate = new ExamAggregate(exam);
    const updated = aggregate.updateDetails({
      examName: input.examName,
      examDate: input.examDate,
      maxMarks: input.maxMarks,
      passMarks: input.passMarks,
    });

    updated.updatedBy = input.userId;
    await this.examRepository.save(updated);
  }
}
