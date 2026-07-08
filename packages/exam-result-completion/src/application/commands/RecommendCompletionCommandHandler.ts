import { CourseCompletionRepository } from '../../domain/interfaces/CourseCompletionRepository';
import { TrainerAssignmentReader } from '../../domain/interfaces/TrainerAssignmentReader';
import {
  CourseCompletionAggregate,
  COMPLETION_STATUSES,
} from '../../domain/aggregates/CourseCompletion';
import {
  CompletionInvalidStateError,
  CompletionEvidenceStaleError,
} from '../../domain/errors';

export interface RecommendCompletionInput {
  completionId: string;
  trainerId: string;
  userId: string;
}

export class RecommendCompletionCommandHandler {
  constructor(
    private readonly completionRepository: CourseCompletionRepository,
    private readonly trainerReader: TrainerAssignmentReader,
  ) {}

  async execute(input: RecommendCompletionInput): Promise<void> {
    const completion = await this.completionRepository.findById(
      input.completionId,
    );
    if (!completion) {
      throw new CompletionInvalidStateError(
        `Completion ${input.completionId} not found`,
      );
    }

    if (
      completion.completionStatus !==
      COMPLETION_STATUSES.AWAITING_TRAINER_RECOMMENDATION
    ) {
      throw new CompletionInvalidStateError(
        `Completion must be awaiting trainer recommendation (status: ${completion.completionStatus})`,
      );
    }

    if (completion.evidenceStale) {
      throw new CompletionEvidenceStaleError(
        'Cannot recommend completion with stale evidence',
      );
    }

    const aggregate = new CourseCompletionAggregate(completion);
    const updated = aggregate.recommendByTrainer();

    updated.updatedBy = input.userId;
    await this.completionRepository.save(updated);
  }
}
