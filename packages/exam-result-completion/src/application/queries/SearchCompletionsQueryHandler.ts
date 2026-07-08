import { CourseCompletionRepository } from '../../domain/interfaces/CourseCompletionRepository';
import { CompletionStatus } from '../../domain/aggregates/CourseCompletion';

export interface SearchCompletionsInput {
  enrollmentId?: string;
  status?: CompletionStatus;
  page?: number;
  pageSize?: number;
}

export interface CompletionSummary {
  id: string;
  enrollmentId: string;
  completionStatus: CompletionStatus;
  attendancePercentage?: number | null;
  examRequired: boolean;
  paymentRequired: boolean;
  manualApprovalRequired: boolean;
  certificateAllowed: boolean;
  lastEvaluatedAt?: Date | null;
}

export class SearchCompletionsQueryHandler {
  constructor(
    private readonly completionRepository: CourseCompletionRepository,
  ) {}

  async execute(input: SearchCompletionsInput): Promise<{
    completions: CompletionSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let completions = input.enrollmentId
      ? await this.completionRepository
          .findByEnrollmentId(input.enrollmentId)
          .then((c) => (c ? [c] : []))
      : input.status
        ? await this.completionRepository.findByStatus(input.status)
        : [];

    const total = completions.length;
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const pagedCompletions = completions.slice(start, start + pageSize);

    return {
      completions: pagedCompletions.map((c) => ({
        id: c.id,
        enrollmentId: c.enrollmentId,
        completionStatus: c.completionStatus,
        attendancePercentage: c.attendancePercentage,
        examRequired: c.examRequired,
        paymentRequired: c.paymentRequired,
        manualApprovalRequired: c.manualApprovalRequired,
        certificateAllowed: c.certificateAllowed,
        lastEvaluatedAt: c.lastEvaluatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }
}
