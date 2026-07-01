import { PrismaClient, Prisma } from '@prisma/client';
import { IInquiryRepository } from '../domain/repositories';
import { IngestInquiryInput } from '../domain/lead';

export class InquiryRepository implements IInquiryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: IngestInquiryInput & { inquiryNumber: string; isDuplicate?: boolean; duplicateRefId?: string | null; counselorId?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<{
    id: string;
    inquiryNumber: string;
    status: string;
    isDuplicate: boolean;
    duplicateRefId: string | null;
    createdAt: Date;
  }> {
    const client = tx || this.prisma;
    const inquiry = await client.inquiry.create({
      data: {
        inquiryNumber: data.inquiryNumber,
        branchId: data.branchId,
        firstName: data.firstName,
        lastName: data.lastName,
        mobile: data.mobile,
        email: data.email || null,
        source: data.source as any,
        interestedCourseId: data.interestedCourseId || null,
        counselorId: data.counselorId || null,
        priority: data.priority,
        notes: data.notes || null,
        isDuplicate: data.isDuplicate || false,
        duplicateRefId: data.duplicateRefId || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        status: 'Captured',
      },
      select: {
        id: true,
        inquiryNumber: true,
        status: true,
        isDuplicate: true,
        duplicateRefId: true,
        createdAt: true,
      },
    });
    return inquiry;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<any> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return null;
    }
    const client = tx || this.prisma;
    return client.inquiry.findUnique({
      where: { id, isDeleted: false },
      include: {
        branch: { select: { branchName: true, branchCode: true } },
        counselor: { select: { username: true } },
        interestedCourse: { select: { nameEnglish: true } },
      },
    });
  }

  async findByMobileOrEmailInBranch(
    branchId: string,
    mobile: string,
    email: string | null | undefined,
    since: Date,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    const client = tx || this.prisma;
    const conditions: Prisma.InquiryWhereInput[] = [{ mobile }];
    if (email) {
      conditions.push({ email });
    }
    return client.inquiry.findFirst({
      where: {
        branchId,
        isDeleted: false,
        createdAt: { gte: since },
        OR: conditions,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, inquiryNumber: true },
    });
  }

  async updateStatus(id: string, status: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.inquiry.update({
      where: { id },
      data: { status },
    });
  }

  async findAll(
    filters: { branchId?: string; status?: string; search?: string; counselorId?: string; branchIds?: string[] },
    pagination: { page: number; limit: number },
    tx?: Prisma.TransactionClient
  ): Promise<{ items: any[]; total: number }> {
    const client = tx || this.prisma;
    const where: Prisma.InquiryWhereInput = { isDeleted: false };

    if (filters.branchId) {
      where.branchId = filters.branchId;
    } else if (filters.branchIds && filters.branchIds.length > 0) {
      where.branchId = { in: filters.branchIds };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.counselorId) {
      where.counselorId = filters.counselorId;
    }

    if (filters.search) {
      const searchVal = filters.search.trim();
      where.OR = [
        { firstName: { contains: searchVal, mode: 'insensitive' } },
        { lastName: { contains: searchVal, mode: 'insensitive' } },
        { mobile: { contains: searchVal, mode: 'insensitive' } },
        { email: { contains: searchVal, mode: 'insensitive' } },
        { inquiryNumber: { contains: searchVal, mode: 'insensitive' } },
      ];
    }

    const total = await client.inquiry.count({ where });
    const items = await client.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        branch: { select: { branchName: true, branchCode: true } },
        counselor: { select: { username: true } },
        interestedCourse: { select: { nameEnglish: true } },
      },
    });

    return { items, total };
  }
}
