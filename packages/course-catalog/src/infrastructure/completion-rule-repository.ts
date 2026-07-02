import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseCompletionRuleRepository } from '../domain/repositories';
import { CourseCompletionRule } from '../domain/course';

export class CourseCompletionRuleRepository implements ICourseCompletionRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any, tx?: Prisma.TransactionClient): Promise<CourseCompletionRule> {
    const client = tx || this.prisma;
    const record = await client.courseCompletionRule.create({
      data: {
        id: data.id,
        courseId: data.courseId,
        minimumAttendancePercent: data.minimumAttendancePercent,
        examRequired: data.examRequired ?? false,
        feeClearanceRequired: data.feeClearanceRequired ?? true,
        manualApprovalRequired: data.manualApprovalRequired ?? false,
        effectiveStartDate: data.effectiveStartDate,
        effectiveEndDate: data.effectiveEndDate || null,
        status: data.status || 'Active',
        createdBy: data.createdBy || null,
        isDeleted: false,
      },
    });
    return record as any as CourseCompletionRule;
  }

  async update(id: string, data: any, tx?: Prisma.TransactionClient): Promise<CourseCompletionRule> {
    const client = tx || this.prisma;
    const record = await client.courseCompletionRule.update({
      where: { id },
      data,
    });
    return record as any as CourseCompletionRule;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<CourseCompletionRule | null> {
    const client = tx || this.prisma;
    const record = await client.courseCompletionRule.findFirst({
      where: { id, isDeleted: false },
    });
    return record as any as CourseCompletionRule | null;
  }

  async findOverlappingRules(
    filters: {
      courseId: string;
      startDate: Date;
      endDate?: Date | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<CourseCompletionRule[]> {
    const client = tx || this.prisma;
    const whereClause: Prisma.CourseCompletionRuleWhereInput = {
      courseId: filters.courseId,
      status: 'Active',
      isDeleted: false,
      OR: [
        { effectiveEndDate: null },
        { effectiveEndDate: { gte: filters.startDate } }
      ]
    };

    if (filters.endDate) {
      whereClause.effectiveStartDate = {
        lte: filters.endDate
      };
    }

    const records = await client.courseCompletionRule.findMany({
      where: whereClause,
    });
    return records as any as CourseCompletionRule[];
  }

  async findAll(
    filters: {
      courseId?: string;
      status?: string;
      activeAt?: Date;
    },
    tx?: Prisma.TransactionClient
  ): Promise<CourseCompletionRule[]> {
    const client = tx || this.prisma;
    const whereClause: Prisma.CourseCompletionRuleWhereInput = { isDeleted: false };

    if (filters.courseId) {
      whereClause.courseId = filters.courseId;
    }
    if (filters.status) {
      whereClause.status = filters.status as any;
    }
    if (filters.activeAt) {
      whereClause.effectiveStartDate = { lte: filters.activeAt };
      whereClause.OR = [
        { effectiveEndDate: null },
        { effectiveEndDate: { gte: filters.activeAt } }
      ];
    }

    const records = await client.courseCompletionRule.findMany({
      where: whereClause,
      orderBy: { effectiveStartDate: 'desc' },
    });
    return records as any as CourseCompletionRule[];
  }
}
