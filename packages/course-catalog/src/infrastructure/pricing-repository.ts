import { PrismaClient, Prisma } from '@prisma/client';
import { ICoursePricingRepository } from '../domain/repositories';
import { CoursePricing } from '../domain/course';

export class CoursePricingRepository implements ICoursePricingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any, tx?: Prisma.TransactionClient): Promise<CoursePricing> {
    const client = tx || this.prisma;
    const record = await client.coursePricing.create({
      data: {
        id: data.id,
        courseId: data.courseId,
        branchId: data.branchId || null,
        batchId: data.batchId || null,
        customerType: data.customerType,
        batchType: data.batchType,
        currency: data.currency || 'OMR',
        basePrice: data.basePrice,
        taxPercentage: data.taxPercentage ?? 5.000,
        isTaxExempt: data.isTaxExempt ?? false,
        taxExemptionReason: data.taxExemptionReason || null,
        taxExemptionCode: data.taxExemptionCode || null,
        effectiveStartDate: data.effectiveStartDate,
        effectiveEndDate: data.effectiveEndDate || null,
        status: data.status || 'Active',
        version: 1,
        createdBy: data.createdBy || null,
        isDeleted: false,
      },
    });
    return record as any as CoursePricing;
  }

  async update(id: string, data: any, tx?: Prisma.TransactionClient): Promise<CoursePricing> {
    const client = tx || this.prisma;
    const record = await client.coursePricing.update({
      where: { id },
      data: {
        ...data,
        version: data.version ? { increment: 1 } : undefined,
      },
    });
    return record as any as CoursePricing;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<CoursePricing | null> {
    const client = tx || this.prisma;
    const record = await client.coursePricing.findFirst({
      where: { id, isDeleted: false },
    });
    return record as any as CoursePricing | null;
  }

  async findOverlappingPricing(
    filters: {
      courseId: string;
      branchId?: string | null;
      batchId?: string | null;
      customerType: string;
      batchType: string;
      currency: string;
      startDate: Date;
      endDate?: Date | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<CoursePricing[]> {
    const client = tx || this.prisma;
    const whereClause: Prisma.CoursePricingWhereInput = {
      courseId: filters.courseId,
      branchId: filters.branchId || null,
      batchId: filters.batchId || null,
      customerType: filters.customerType,
      batchType: filters.batchType,
      currency: filters.currency,
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

    const records = await client.coursePricing.findMany({
      where: whereClause,
    });
    return records as any as CoursePricing[];
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
  ): Promise<CoursePricing[]> {
    const client = tx || this.prisma;
    const whereClause: Prisma.CoursePricingWhereInput = { isDeleted: false };

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

    const records = await client.coursePricing.findMany({
      where: whereClause,
      orderBy: { effectiveStartDate: 'desc' },
    });
    return records as any as CoursePricing[];
  }
}
