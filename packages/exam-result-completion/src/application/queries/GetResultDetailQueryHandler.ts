import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { Result, ResultStatus } from '../../domain/aggregates/Result';
import { Exam } from '../../domain/aggregates/Exam';

export interface GetResultDetailInput {
  resultId: string;
}

export interface ResultDetail {
  result: Result;
  exam: Exam | null;
}

export class GetResultDetailQueryHandler {
  constructor(
    private readonly resultRepository: ResultRepository,
    private readonly examRepository: ExamRepository,
  ) {}

  async execute(input: GetResultDetailInput): Promise<ResultDetail | null> {
    const result = await this.resultRepository.findById(input.resultId);
    if (!result) {
      return null;
    }

    const exam = await this.examRepository.findById(result.examId);

    return {
      result,
      exam,
    };
  }
}
