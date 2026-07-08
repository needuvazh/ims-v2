import { CourseCompletionRepository } from '../../domain/interfaces/CourseCompletionRepository';
import {
  CourseCompletionAggregate,
  COMPLETION_STATUSES,
} from '../../domain/aggregates/CourseCompletion';
import {
  CompletionInvalidStateError,
  CompletionEvidenceStaleError,
} from '../../domain/errors';

export interface FinalApproveCompletionInput {
  completionId: string;
  approved: boolean;
  remarks?: string;
  userId: string;
}

export class FinalApproveCompletionCommandHandler {
  constructor(
    private readonly completionRepository: CourseCompletionRepository,
  ) {}

  async execute(input: FinalApproveCompletionInput): Promise<void> {
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
      COMPLETION_STATUSES.AWAITING_FINAL_APPROVAL
    ) {
      throw new CompletionInvalidStateError(
        `Completion must be awaiting final approval (status: ${completion.completionStatus})`,
      );
    }

    if (completion.evidenceStale) {
      throw new CompletionEvidenceStaleError(
        'Cannot approve completion with stale evidence',
      );
    }

    const aggregate = new CourseCompletionAggregate(completion);
    const updated = aggregate.finalApproval(input.approved);

    updated.updatedBy = input.userId;
    await this.completionRepository.save(updated);
  }
}
