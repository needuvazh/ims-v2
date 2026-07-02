export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class DuplicateBatchCode extends DomainError {
  constructor(message = 'A batch with this code already exists.') {
    super(message, 'ERR_CRS_DUPLICATE_BATCH_CODE');
  }
}

export class InvalidDateRange extends DomainError {
  constructor(message = 'Batch date range is invalid.') {
    super(message, 'ERR_CRS_INVALID_DATE_RANGE');
  }
}

export class BatchNoTrainer extends DomainError {
  constructor(message = 'An open batch requires at least one Primary Trainer.') {
    super(message, 'ERR_CRS_BATCH_NO_TRAINER');
  }
}

export class BatchFull extends DomainError {
  constructor(message = 'Batch capacity limit has been reached.') {
    super(message, 'ERR_CRS_BATCH_FULL');
  }
}

export class PrimaryTrainerAlreadyAssigned extends DomainError {
  constructor(message = 'A primary trainer is already assigned for this range.') {
    super(message, 'ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED');
  }
}

export interface ScheduleConflict {
  batchCode: string;
  sessionDate: Date | string;
  startTime: string;
  endTime: string;
}

export class TrainerScheduleConflict extends DomainError {
  constructor(
    message = 'Trainer has a schedule conflict.',
    public readonly conflicts?: ScheduleConflict[]
  ) {
    super(message, 'ERR_CRS_TRAINER_SCHEDULE_CONFLICT');
  }
}

export class InvalidStateTransition extends DomainError {
  constructor(message = 'This state transition is invalid.') {
    super(message, 'ERR_CRS_INVALID_STATE_TRANSITION');
  }
}

export class WalkInCompletionNotAllowed extends DomainError {
  constructor(message = 'This course does not allow walk-in completions.') {
    super(message, 'ERR_CRS_WALKIN_COMPLETION_NOT_ALLOWED');
  }
}

export class CourseNotPublished extends DomainError {
  constructor(message = 'A batch can only be created/updated for active published courses.') {
    super(message, 'ERR_CRS_COURSE_NOT_PUBLISHED');
  }
}

export class WaitlistDisabled extends DomainError {
  constructor(message = 'Waiting list is not enabled for this batch.') {
    super(message, 'ERR_CRS_WAITLIST_DISABLED');
  }
}

export class BatchNotFull extends DomainError {
  constructor(message = 'Cannot enqueue candidate because the batch has not reached capacity.') {
    super(message, 'ERR_CRS_BATCH_NOT_FULL');
  }
}
