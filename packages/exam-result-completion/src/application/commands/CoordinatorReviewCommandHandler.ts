import { CourseCompletionRepository } from '../../domain/interfaces/CourseCompletionRepository';
import { CourseCompletionAggregate, COMPLETION_STATUSES } from '../../domain/aggregates/CourseCompletion';
import { CompletionInvalidStateError, CompletionEvidenceStaleError } from '../../domain/errors';

export interface CoordinatorReviewInput {
  completionId: string;
  approved: boolean;
  remarks?: string;
  userId: string;
}

export class CoordinatorReviewCommandHandler {
  constructor(private readonly completionRepository: CourseCompletionRepository) {}

  async execute(input: CoordinatorReviewInput): Promise<void> {
    const completion = await this.completionRepository.findById(input.completionId);
    if (!completion) {
      throw new CompletionInvalidStateError(`Completion ${input.completionId} not found`);
    }

    if (completion.completionStatus !== COMPLETION_STATUSES.AWAITING_COORDINATOR_REVIEW) {
      throw new CompletionInvalidStateError(`Completion must be awaiting coordinator review (status: ${completion.completionStatus})`);
    }

    if (completion.evidenceStale) {
      throw new CompletionEvidenceStaleError('Cannot review completion with stale evidence');
    }

    const aggregate = new CourseCompletionAggregate(completion);
    const updated = aggregate.reviewByCoordinator(input.approved);

    updated.updatedBy = input.userId;
    await this.completionRepository.save(updated);
  }
}
