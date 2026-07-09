export interface DatePartition {
  today: Date;
  threeDaysAgo: Date;
  threeDaysFromNow: Date;
}

export function getDateBoundaries(referenceDate?: Date): DatePartition {
  const today = referenceDate ? new Date(referenceDate) : new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  return { today, threeDaysAgo, threeDaysFromNow };
}

export function getGroupWhereClause(
  group: string,
  today: Date,
  threeDaysAgo: Date,
  threeDaysFromNow: Date,
  options: {
    showCompleted?: boolean;
    showCancelled?: boolean;
    showDraft?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const where: any = {};

  if (group === 'active') {
    where.startDate = { lte: threeDaysFromNow };
    where.endDate = { gte: threeDaysAgo };

    const activeStatuses = ['OpenForEnrollment', 'InProgress'];
    if (options.showCompleted) activeStatuses.push('Completed');
    if (options.showCancelled) activeStatuses.push('Cancelled');
    if (options.showDraft) activeStatuses.push('Draft');

    where.status = { in: activeStatuses };
  } else if (group === 'past') {
    where.endDate = { lt: threeDaysAgo };

    if (!options.showCancelled) {
      where.status = { not: 'Cancelled' };
    }

    if (options.dateFrom || options.dateTo) {
      const dateFilters: any[] = [];
      if (options.dateFrom) {
        dateFilters.push({ startDate: { gte: new Date(options.dateFrom) } });
      }
      if (options.dateTo) {
        dateFilters.push({ endDate: { lte: new Date(options.dateTo) } });
      }
      if (dateFilters.length > 0) {
        where.AND = dateFilters;
      }
    }
  } else if (group === 'future') {
    where.startDate = { gt: threeDaysFromNow };

    if (!options.showCancelled) {
      where.status = { not: 'Cancelled' };
    }

    if (options.dateFrom || options.dateTo) {
      const dateFilters: any[] = [];
      if (options.dateFrom) {
        dateFilters.push({ startDate: { gte: new Date(options.dateFrom) } });
      }
      if (options.dateTo) {
        dateFilters.push({ endDate: { lte: new Date(options.dateTo) } });
      }
      if (dateFilters.length > 0) {
        where.AND = dateFilters;
      }
    }
  } else if (group === 'all') {
    if (!options.showCancelled) {
      where.status = { not: 'Cancelled' };
    }

    if (options.dateFrom || options.dateTo) {
      const dateFilters: any[] = [];
      if (options.dateFrom) {
        dateFilters.push({ startDate: { gte: new Date(options.dateFrom) } });
      }
      if (options.dateTo) {
        dateFilters.push({ endDate: { lte: new Date(options.dateTo) } });
      }
      if (dateFilters.length > 0) {
        where.AND = dateFilters;
      }
    }
  }

  return where;
}
