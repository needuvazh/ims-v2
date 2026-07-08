import { DomainError } from '@ims/shared-kernel';

export class CalendarNotFoundError extends DomainError {
  constructor(message = 'Calendar not found.') {
    super('not_found', message);
  }
}

export class CalendarOverlapError extends DomainError {
  constructor(
    message = 'Another active calendar already overlaps the effective period.',
  ) {
    super('conflict', message);
  }
}

export class CalendarScopeError extends DomainError {
  constructor(
    message = 'The requested calendar is outside your branch scope.',
  ) {
    super('branch_scope_violation', message);
  }
}

export class CalendarTimezoneImmutableError extends DomainError {
  constructor(
    message = 'Timezone is institute-owned and cannot be overridden.',
  ) {
    super('invalid_value', message);
  }
}

export class CalendarDateRangeError extends DomainError {
  constructor(
    message = 'Effective end date must be after or equal to effective start date.',
  ) {
    super('invalid_effective_date_range', message);
  }
}
