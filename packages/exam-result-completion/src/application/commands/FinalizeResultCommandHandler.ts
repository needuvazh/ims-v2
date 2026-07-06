import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { ResultAggregate, RESULT_STATUSES } from '../../domain/aggregates/Result';
import { ResultInvalidStateError } from '../../domain/errors';

export interface FinalizeResultInput {
  resultId: string;
  userId: string;
}

export class FinalizeResultCommandHandler {
  constructor(private readonly resultRepository: ResultRepository) {}

  async execute(input: FinalizeResultInput): Promise<void> {
    const result = await this.resultRepository.findById(input.resultId);
    if (!result) {
      throw new ResultInvalidStateError(`Result ${input.resultId} not found`);
    }

    const aggregate = new ResultAggregate(result);
    const updated = aggregate.finalize(input.userId);

    await this.resultRepository.save(updated);
  }
}
