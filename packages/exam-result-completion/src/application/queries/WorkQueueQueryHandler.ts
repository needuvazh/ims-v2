import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { CourseCompletionRepository } from '../../domain/interfaces/CourseCompletionRepository';
import { CompletionApprovalRepository } from '../../domain/interfaces/CompletionApprovalRepository';
import { RESULT_STATUSES, ResultStatus } from '../../domain/aggregates/Result';
import { COMPLETION_STATUSES, CompletionStatus } from '../../domain/aggregates/CourseCompletion';
import { APPROVAL_STATUSES, APPROVAL_LEVELS, ApprovalLevel, ApprovalStatus } from '../../domain/aggregates/CompletionApproval';

export interface WorkQueueInput {
  userId: string;
  branchId?: string;
}

export interface WorkQueueItem {
  type: 'missing_result' | 'evaluation' | 'trainer_recommendation' | 'coordinator_review' | 'final_approval' | 'reevaluation';
  id: string;
  enrollmentId: string;
  examId?: string;
  completionId?: string;
  status: string;
  priority: number;
  createdAt: Date;
}

export class WorkQueueQueryHandler {
  constructor(
    private readonly resultRepository: ResultRepository,
    private readonly examRepository: ExamRepository,
    private readonly completionRepository: CourseCompletionRepository,
    private readonly approvalRepository: CompletionApprovalRepository,
  ) {}

  async execute(input: WorkQueueInput): Promise<{
    missingResults: WorkQueueItem[];
    evaluationQueue: WorkQueueItem[];
    trainerQueue: WorkQueueItem[];
    coordinatorQueue: WorkQueueItem[];
    finalApprovalQueue: WorkQueueItem[];
    reevaluationQueue: WorkQueueItem[];
  }> {
    const closedExams = await this.examRepository.findByBatchId('', 'Closed');
    const missingResults: WorkQueueItem[] = [];

    const pendingCompletions = await this.completionRepository.findByStatus(COMPLETION_STATUSES.PENDING);
    const evaluationQueue: WorkQueueItem[] = pendingCompletions.map(c => ({
      type: 'evaluation' as const,
      id: c.id,
      enrollmentId: c.enrollmentId,
      completionId: c.id,
      status: c.completionStatus,
      priority: 1,
      createdAt: c.createdAt,
    }));

    const trainerRecommendations = await this.completionRepository.findByStatus(COMPLETION_STATUSES.AWAITING_TRAINER_RECOMMENDATION);
    const trainerQueue: WorkQueueItem[] = trainerRecommendations.map(c => ({
      type: 'trainer_recommendation' as const,
      id: c.id,
      enrollmentId: c.enrollmentId,
      completionId: c.id,
      status: c.completionStatus,
      priority: 2,
      createdAt: c.createdAt,
    }));

    const coordinatorReviews = await this.completionRepository.findByStatus(COMPLETION_STATUSES.AWAITING_COORDINATOR_REVIEW);
    const coordinatorQueue: WorkQueueItem[] = coordinatorReviews.map(c => ({
      type: 'coordinator_review' as const,
      id: c.id,
      enrollmentId: c.enrollmentId,
      completionId: c.id,
      status: c.completionStatus,
      priority: 3,
      createdAt: c.createdAt,
    }));

    const finalApprovals = await this.completionRepository.findByStatus(COMPLETION_STATUSES.AWAITING_FINAL_APPROVAL);
    const finalApprovalQueue: WorkQueueItem[] = finalApprovals.map(c => ({
      type: 'final_approval' as const,
      id: c.id,
      enrollmentId: c.enrollmentId,
      completionId: c.id,
      status: c.completionStatus,
      priority: 4,
      createdAt: c.createdAt,
    }));

    const reevaluations = await this.completionRepository.findByStatus(COMPLETION_STATUSES.REEVALUATION_REQUIRED);
    const reevaluationQueue: WorkQueueItem[] = reevaluations.map(c => ({
      type: 'reevaluation' as const,
      id: c.id,
      enrollmentId: c.enrollmentId,
      completionId: c.id,
      status: c.completionStatus,
      priority: 5,
      createdAt: c.createdAt,
    }));

    return {
      missingResults,
      evaluationQueue,
      trainerQueue,
      coordinatorQueue,
      finalApprovalQueue,
      reevaluationQueue,
    };
  }
}
