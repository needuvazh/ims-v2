import { CourseCompletionRepository } from '../../domain/interfaces/CourseCompletionRepository';
import {
  CourseCompletionAggregate,
  COMPLETION_STATUSES,
} from '../../domain/aggregates/CourseCompletion';
import {
  CompletionInvalidStateError,
  CompletionEvidenceStaleError,
} from '../../domain/errors';

export interface ReevaluateCompletionInput {
  completionId: string;
  userId: string;
}

export class ReevaluateCompletionCommandHandler {
  constructor(
    private readonly completionRepository: CourseCompletionRepository,
  ) {}

  async execute(input: ReevaluateCompletionInput): Promise<void> {
    const completion = await this.completionRepository.findById(
      input.completionId,
    );
    if (!completion) {
      throw new CompletionInvalidStateError(
        `Completion ${input.completionId} not found`,
      );
    }

    if (completion.completionStatus !== COMPLETION_STATUSES.APPROVED) {
      throw new CompletionInvalidStateError(
        `Completion must be approved before reevaluation (status: ${completion.completionStatus})`,
      );
    }

    if (completion.evidenceStale) {
      throw new CompletionEvidenceStaleError(
        'Cannot reevaluate completion with stale evidence',
      );
    }

    const aggregate = new CourseCompletionAggregate(completion);
    const updated = aggregate.requestReevaluation();

    updated.updatedBy = input.userId;
    await this.completionRepository.save(updated);
  }
}
