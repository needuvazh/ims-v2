export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class DuplicateCourseCode extends DomainError {
  constructor(message = 'A course with this code already exists.') {
    super(message, 'ERR_CRS_DUPLICATE_CODE');
  }
}

export class DuplicateCourseName extends DomainError {
  constructor(message = 'A course with this name already exists in this department.') {
    super(message, 'ERR_CRS_DUPLICATE_NAME');
  }
}

export class InvalidCodeFormat extends DomainError {
  constructor(message = 'Course code must be uppercase alphanumeric and between 3 to 20 characters.') {
    super(message, 'ERR_CRS_INVALID_CODE_FORMAT');
  }
}

export class InvalidDateRange extends DomainError {
  constructor(message = 'Effective end date must be after effective start date.') {
    super(message, 'ERR_CRS_INVALID_DATE_RANGE');
  }
}

export class InvalidCategoryHierarchy extends DomainError {
  constructor(message = 'Cyclic parent-child hierarchy detected in categories.') {
    super(message, 'ERR_CRS_CYCLIC_CATEGORY');
  }
}

export class ActiveCourseLocked extends DomainError {
  constructor(message = 'Duration or classification cannot be changed on a published course with active batches.') {
    super(message, 'ERR_CRS_ACTIVE_COURSE_LOCKED');
  }
}

export class MissingPricingOrRules extends DomainError {
  constructor(message = 'A course must have at least one active pricing rule and one active completion rule configured to be published.') {
    super(message, 'ERR_CRS_MISSING_PRICING_OR_RULES');
  }
}

export class ActiveBatchesExist extends DomainError {
  constructor(message = 'Cannot archive course with active batches in OpenForEnrollment or InProgress status.') {
    super(message, 'ERR_CRS_ACTIVE_BATCHES_EXIST');
  }
}
