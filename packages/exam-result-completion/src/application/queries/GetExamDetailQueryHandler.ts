import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { Exam, ExamStatus } from '../../domain/aggregates/Exam';
import { Result, ResultStatus } from '../../domain/aggregates/Result';

export interface GetExamDetailInput {
  examId: string;
}

export interface ExamDetail {
  exam: Exam;
  results: Array<{
    id: string;
    enrollmentId: string;
    marksObtained: number;
    resultStatus: ResultStatus;
    grade?: string | null;
    finalizedAt?: Date | null;
  }>;
  resultStats: {
    total: number;
    recorded: number;
    finalized: number;
    pending: number;
  };
}

export class GetExamDetailQueryHandler {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly resultRepository: ResultRepository,
  ) {}

  async execute(input: GetExamDetailInput): Promise<ExamDetail | null> {
    const exam = await this.examRepository.findById(input.examId);
    if (!exam) {
      return null;
    }

    const results = await this.resultRepository.findByExamId(exam.id);

    const resultStats = {
      total: results.length,
      recorded: results.filter(r => r.resultStatus === 'Recorded').length,
      finalized: results.filter(r => r.resultStatus === 'Finalized').length,
      pending: results.filter(r => r.resultStatus === 'Pending').length,
    };

    return {
      exam,
      results: results.map(r => ({
        id: r.id,
        enrollmentId: r.enrollmentId,
        marksObtained: r.marksObtained,
        resultStatus: r.resultStatus,
        grade: r.grade,
        finalizedAt: r.finalizedAt,
      })),
      resultStats,
    };
  }
}
