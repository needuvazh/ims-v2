import { PrismaClient } from '@prisma/client';

export interface UserContext {
  userId: string;
  activeBranchId: string | null;
  permissions: string[];
}

export class LeadAnalyticsReadService {
  constructor(private readonly prisma: PrismaClient) {}

  private getScopedWhere(userContext: UserContext) {
    const where: any = { isDeleted: false };

    if (userContext.activeBranchId) {
      where.branchId = userContext.activeBranchId;
    }

    if (!userContext.permissions.includes('LEAD_VIEW_ALL_IN_BRANCH')) {
      where.counselorId = userContext.userId;
    }

    return where;
  }

  async getLeadStatusDistribution(userContext: UserContext) {
    const where = this.getScopedWhere(userContext);
    const groups = await this.prisma.lead.groupBy({
      by: ['stage'],
      where,
      _count: {
        id: true,
      },
    });

    return groups.map((g) => ({
      stage: g.stage,
      count: g._count.id,
    }));
  }

  async getLeadConversionRate(userContext: UserContext) {
    const where = this.getScopedWhere(userContext);
    
    const [total, converted] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({
        where: {
          ...where,
          stage: 'Converted',
        },
      }),
    ]);

    const rate = total > 0 ? parseFloat(((converted / total) * 100).toFixed(2)) : 0;

    return {
      rate,
      total,
      converted,
    };
  }

  async getLeadsBySource(userContext: UserContext) {
    const where = this.getScopedWhere(userContext);
    const groups = await this.prisma.lead.groupBy({
      by: ['source'],
      where,
      _count: {
        id: true,
      },
    });

    return groups.map((g) => ({
      source: g.source,
      count: g._count.id,
    }));
  }

  async getLeadsByStage(userContext: UserContext) {
    return this.getLeadStatusDistribution(userContext);
  }

  async getCounselorPerformance(userContext: UserContext) {
    const where = this.getScopedWhere(userContext);
    const groups = await this.prisma.lead.groupBy({
      by: ['counselorId'],
      where: {
        ...where,
        stage: 'Converted',
        counselorId: { not: null },
      },
      _count: {
        id: true,
      },
    });

    const counselorIds = groups
      .map((g) => g.counselorId)
      .filter((id): id is string => id !== null);

    const counselors = await this.prisma.user.findMany({
      where: {
        id: { in: counselorIds },
      },
      select: {
        id: true,
        person: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const counselorMap = new Map(
      counselors.map((c) => [c.id, `${c.person?.firstName ?? ''} ${c.person?.lastName ?? ''}`.trim() || 'Unknown'])
    );

    return groups.map((g) => ({
      counselorId: g.counselorId,
      counselorName: g.counselorId ? (counselorMap.get(g.counselorId) ?? 'Unknown') : 'Unassigned',
      convertedCount: g._count.id,
    }));
  }

  async getTotalLeadsVsTargets(userContext: UserContext) {
    const where = this.getScopedWhere(userContext);
    const actual = await this.prisma.lead.count({
      where,
    });

    // Default static targets based on scoping
    const isManager = userContext.permissions.includes('LEAD_VIEW_ALL_IN_BRANCH');
    const target = isManager ? 150 : 30;

    return {
      actual,
      target,
    };
  }
}
