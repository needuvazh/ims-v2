import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { ResultStatus } from '../../domain/aggregates/Result';

export interface SearchResultsInput {
  examId?: string;
  enrollmentId?: string;
  status?: ResultStatus;
  page?: number;
  pageSize?: number;
}

export interface ResultSummary {
  id: string;
  examId: string;
  enrollmentId: string;
  marksObtained: number;
  resultStatus: ResultStatus;
  grade?: string | null;
  finalizedAt?: Date | null;
}

export class SearchResultsQueryHandler {
  constructor(private readonly resultRepository: ResultRepository) {}

  async execute(input: SearchResultsInput): Promise<{
    results: ResultSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let results = input.examId
      ? await this.resultRepository.findByExamId(input.examId)
      : input.enrollmentId
        ? await this.resultRepository.findByEnrollmentId(input.enrollmentId)
        : [];

    if (input.status) {
      results = results.filter(r => r.resultStatus === input.status);
    }

    const total = results.length;
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const pagedResults = results.slice(start, start + pageSize);

    return {
      results: pagedResults.map(r => ({
        id: r.id,
        examId: r.examId,
        enrollmentId: r.enrollmentId,
        marksObtained: r.marksObtained,
        resultStatus: r.resultStatus,
        grade: r.grade,
        finalizedAt: r.finalizedAt,
      })),
      total,
      page,
      pageSize,
    };
  }
}
