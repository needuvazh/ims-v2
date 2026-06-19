import { z } from 'zod';

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type Uuid = Brand<string, 'Uuid'>;
export type BranchId = Brand<string, 'BranchId'>;
export type CourseId = Brand<string, 'CourseId'>;
export type EnrollmentId = Brand<string, 'EnrollmentId'>;

const uuidSchema = z.string().uuid();

export function createUuid(value: string): Uuid {
  return uuidSchema.parse(value) as Uuid;
}

export function createBranchId(value: string): BranchId {
  return uuidSchema.parse(value) as unknown as BranchId;
}

export function createCourseId(value: string): CourseId {
  return uuidSchema.parse(value) as unknown as CourseId;
}

export function createEnrollmentId(value: string): EnrollmentId {
  return uuidSchema.parse(value) as unknown as EnrollmentId;
}

export class Money {
  private constructor(
    public readonly currency: string,
    public readonly amount: number,
  ) {}

  static of(currency: string, amount: number) {
    if (!currency || currency.length < 3) {
      throw new Error('Currency code is required.');
    }
    if (!Number.isFinite(amount)) {
      throw new Error('Money amount must be a finite number.');
    }
    return new Money(currency.toUpperCase(), Number(amount.toFixed(2)));
  }

  add(other: Money) {
    this.assertCompatible(other);
    return Money.of(this.currency, this.amount + other.amount);
  }

  subtract(other: Money) {
    this.assertCompatible(other);
    return Money.of(this.currency, this.amount - other.amount);
  }

  private assertCompatible(other: Money) {
    if (other.currency !== this.currency) {
      throw new Error('Money currency mismatch.');
    }
  }
}

export class DateRange {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date | null,
  ) {
    if (Number.isNaN(startDate.getTime())) {
      throw new Error('Start date is invalid.');
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new Error('End date is invalid.');
    }
    if (endDate && endDate < startDate) {
      throw new Error('End date cannot be before start date.');
    }
  }

  includes(date: Date) {
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    return date >= this.startDate && (!this.endDate || date <= this.endDate);
  }
}

export class EffectiveDateRange extends DateRange {
  isEffectiveOn(date: Date) {
    return this.includes(date);
  }
}

export type AuditMetadata = {
  actorId?: Uuid | null;
  branchId?: BranchId | null;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  details?: Record<string, unknown>;
};

export type BranchScope = {
  branchId: BranchId;
  assignedOnly?: boolean;
};
