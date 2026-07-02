import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseDiscountRepository } from '../domain/repositories';
import { CourseDiscount } from '../domain/course';

export class CourseDiscountRepository implements ICourseDiscountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any, tx?: Prisma.TransactionClient): Promise<CourseDiscount> {
    const client = tx || this.prisma;
    const record = await client.courseDiscount.create({
      data: {
        id: data.id,
        courseId: data.courseId,
        branchId: data.branchId || null,
        batchId: data.batchId || null,
        discountType: data.discountType,
        discountMode: data.discountMode,
        discountValue: data.discountValue,
        requiresApproval: data.requiresApproval ?? false,
        effectiveStartDate: data.effectiveStartDate,
        effectiveEndDate: data.effectiveEndDate || null,
        status: data.status || 'Active',
        createdBy: data.createdBy || null,
        isDeleted: false,
      },
    });
    return record as any as CourseDiscount;
  }

  async update(id: string, data: any, tx?: Prisma.TransactionClient): Promise<CourseDiscount> {
    const client = tx || this.prisma;
    const record = await client.courseDiscount.update({
      where: { id },
      data,
    });
    return record as any as CourseDiscount;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<CourseDiscount | null> {
    const client = tx || this.prisma;
    const record = await client.courseDiscount.findFirst({
      where: { id, isDeleted: false },
    });
    return record as any as CourseDiscount | null;
  }

  async findOverlappingDiscounts(
    filters: {
      courseId: string;
      branchId?: string | null;
      batchId?: string | null;
      discountType: string;
      startDate: Date;
      endDate?: Date | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<CourseDiscount[]> {
    const client = tx || this.prisma;
    const whereClause: Prisma.CourseDiscountWhereInput = {
      courseId: filters.courseId,
      branchId: filters.branchId || null,
      batchId: filters.batchId || null,
      discountType: filters.discountType,
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

    const records = await client.courseDiscount.findMany({
      where: whereClause,
    });
    return records as any as CourseDiscount[];
  }

  async findAll(
    filters: {
      courseId?: string;
      branchId?: string | null;
      batchId?: string | null;
      status?: string;
      activeAt?: Date;
    },
    tx?: Prisma.TransactionClient
  ): Promise<CourseDiscount[]> {
    const client = tx || this.prisma;
    const whereClause: Prisma.CourseDiscountWhereInput = { isDeleted: false };

    if (filters.courseId) {
      whereClause.courseId = filters.courseId;
    }
    if (filters.branchId !== undefined) {
      whereClause.branchId = filters.branchId || null;
    }
    if (filters.batchId !== undefined) {
      whereClause.batchId = filters.batchId || null;
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

    const records = await client.courseDiscount.findMany({
      where: whereClause,
      orderBy: { effectiveStartDate: 'desc' },
    });
    return records as any as CourseDiscount[];
  }
}
