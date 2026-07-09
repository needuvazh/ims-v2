import { describe, it, expect } from 'vitest';
import { getDateBoundaries, getGroupWhereClause } from './date-partition';

describe('getDateBoundaries', () => {
  it('should return correct today, threeDaysAgo, and threeDaysFromNow boundaries', () => {
    const referenceDate = new Date('2026-07-09T12:00:00Z');
    const { today, threeDaysAgo, threeDaysFromNow } = getDateBoundaries(referenceDate);

    expect(today.getFullYear()).toBe(2026);
    expect(today.getMonth()).toBe(6); // July is index 6
    expect(today.getDate()).toBe(9);
    expect(today.getHours()).toBe(0);

    expect(threeDaysAgo.getFullYear()).toBe(2026);
    expect(threeDaysAgo.getMonth()).toBe(6);
    expect(threeDaysAgo.getDate()).toBe(6); // 9 - 3 = 6
    expect(threeDaysAgo.getHours()).toBe(0);

    expect(threeDaysFromNow.getFullYear()).toBe(2026);
    expect(threeDaysFromNow.getMonth()).toBe(6);
    expect(threeDaysFromNow.getDate()).toBe(12); // 9 + 3 = 12
    expect(threeDaysFromNow.getHours()).toBe(0);
  });
});

describe('getGroupWhereClause', () => {
  const today = new Date('2026-07-09T00:00:00Z');
  const threeDaysAgo = new Date('2026-07-06T00:00:00Z');
  const threeDaysFromNow = new Date('2026-07-12T00:00:00Z');

  it('should build where clause for active group by default', () => {
    const where = getGroupWhereClause('active', today, threeDaysAgo, threeDaysFromNow, {});

    expect(where.startDate).toEqual({ lte: threeDaysFromNow });
    expect(where.endDate).toEqual({ gte: threeDaysAgo });
    expect(where.status).toEqual({ in: ['OpenForEnrollment', 'InProgress'] });
  });

  it('should include Completed and Cancelled statuses when toggles are true', () => {
    const where = getGroupWhereClause('active', today, threeDaysAgo, threeDaysFromNow, {
      showCompleted: true,
      showCancelled: true,
      showDraft: true,
    });

    expect(where.status).toEqual({
      in: ['OpenForEnrollment', 'InProgress', 'Completed', 'Cancelled', 'Draft'],
    });
  });

  it('should build where clause for past group default', () => {
    const where = getGroupWhereClause('past', today, threeDaysAgo, threeDaysFromNow, {});

    expect(where.endDate).toEqual({ lt: threeDaysAgo });
    expect(where.status).toEqual({ not: 'Cancelled' });
    expect(where.AND).toBeUndefined();
  });

  it('should include Cancelled status in past group when showCancelled is true', () => {
    const where = getGroupWhereClause('past', today, threeDaysAgo, threeDaysFromNow, {
      showCancelled: true,
    });

    expect(where.status).toBeUndefined();
  });

  it('should append date range filters in past group', () => {
    const where = getGroupWhereClause('past', today, threeDaysAgo, threeDaysFromNow, {
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
    });

    expect(where.AND).toBeDefined();
    expect(where.AND).toHaveLength(2);
    expect(where.AND[0]).toEqual({ startDate: { gte: new Date('2026-06-01') } });
    expect(where.AND[1]).toEqual({ endDate: { lte: new Date('2026-06-30') } });
  });

  it('should build where clause for future group default', () => {
    const where = getGroupWhereClause('future', today, threeDaysAgo, threeDaysFromNow, {});

    expect(where.startDate).toEqual({ gt: threeDaysFromNow });
    expect(where.status).toEqual({ not: 'Cancelled' });
  });

  it('should build where clause for all group default', () => {
    const where = getGroupWhereClause('all', today, threeDaysAgo, threeDaysFromNow, {});

    expect(where.status).toEqual({ not: 'Cancelled' });
    expect(where.startDate).toBeUndefined();
    expect(where.endDate).toBeUndefined();
  });
});
