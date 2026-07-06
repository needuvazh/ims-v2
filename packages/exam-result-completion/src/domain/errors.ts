export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ExamInvalidStateError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_EXAM_INVALID_STATE');
  }
}

export class ExamMarksValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_EXAM_MARKS_INVALID');
  }
}

export class ResultInvalidStateError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_RESULT_INVALID_STATE');
  }
}

export class ResultMarksValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_RESULT_MARKS_INVALID');
  }
}

export class ResultDuplicateError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_RESULT_DUPLICATE');
  }
}

export class CompletionInvalidStateError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_COMPLETION_INVALID_STATE');
  }
}

export class CompletionDuplicateError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_COMPLETION_DUPLICATE');
  }
}

export class CompletionEvidenceStaleError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_COMPLETION_EVIDENCE_STALE');
  }
}

export class ApprovalInvalidStateError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_APPROVAL_INVALID_STATE');
  }
}

export class ApprovalStageSequenceError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_APPROVAL_STAGE_SEQUENCE');
  }
}

export class ApprovalActorIneligibleError extends DomainError {
  constructor(message: string) {
    super(message, 'ERR_APPROVAL_ACTOR_INELIGIBLE');
  }
}
