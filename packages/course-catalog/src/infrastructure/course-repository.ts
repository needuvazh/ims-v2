import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseRepository } from '../domain/repositories';
import { Course } from '../domain/course';

export class CourseRepository implements ICourseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any, tx?: Prisma.TransactionClient): Promise<Course> {
    const client = tx || this.prisma;
    const course = await client.course.create({
      data: {
        courseCode: data.courseCode,
        nameEnglish: data.nameEnglish,
        nameArabic: data.nameArabic,
        descriptionEnglish: data.descriptionEnglish || null,
        descriptionArabic: data.descriptionArabic || null,
        departmentId: data.departmentId,
        categoryId: data.categoryId || null,
        courseClassification: data.courseClassification,
        durationType: data.durationType,
        durationValue: data.durationValue,
        allowWalkInCompletion: data.allowWalkInCompletion,
        status: data.status || 'Draft',
        effectiveStartDate: data.effectiveStartDate,
        effectiveEndDate: data.effectiveEndDate || null,
        version: 1,
        createdBy: data.createdBy || null,
        isDeleted: false,
      },
    });
    return course as Course;
  }

  async update(id: string, data: any, version: number, tx?: Prisma.TransactionClient): Promise<Course> {
    const client = tx || this.prisma;
    
    // Optimistic concurrency check using updateMany
    const result = await client.course.updateMany({
      where: { id, version, isDeleted: false },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new Error('ERR_CRS_CONCURRENCY_VIOLATION');
    }

    const updated = await client.course.findUnique({
      where: { id },
    });
    if (!updated) {
      throw new Error('ERR_CRS_NOT_FOUND');
    }
    return updated as Course;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Course | null> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return null;
    }
    const client = tx || this.prisma;
    const course = await client.course.findUnique({
      where: { id, isDeleted: false },
    });
    return course as Course | null;
  }

  async findByCode(code: string, tx?: Prisma.TransactionClient): Promise<Course | null> {
    const client = tx || this.prisma;
    const course = await client.course.findFirst({
      where: { courseCode: { equals: code, mode: 'insensitive' }, isDeleted: false },
    });
    return course as Course | null;
  }

  async findByNameInDepartment(
    nameEnglish: string,
    nameArabic: string,
    departmentId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Course | null> {
    const client = tx || this.prisma;
    const course = await client.course.findFirst({
      where: {
        departmentId,
        isDeleted: false,
        OR: [
          { nameEnglish: { equals: nameEnglish, mode: 'insensitive' } },
          { nameArabic: { equals: nameArabic } },
        ],
      },
    });
    return course as Course | null;
  }

  async findAll(
    filters: { categoryId?: string; status?: string; search?: string },
    pagination: { page: number; limit: number },
    tx?: Prisma.TransactionClient
  ): Promise<{ items: Course[]; total: number }> {
    const client = tx || this.prisma;
    const where: Prisma.CourseWhereInput = { isDeleted: false };

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      const searchVal = filters.search.trim();
      where.OR = [
        { courseCode: { contains: searchVal, mode: 'insensitive' } },
        { nameEnglish: { contains: searchVal, mode: 'insensitive' } },
        { nameArabic: { contains: searchVal } },
      ];
    }

    const total = await client.course.count({ where });
    const items = await client.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    return { items: items as Course[], total };
  }

  async delete(id: string, deletedBy: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.course.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
        status: 'Archived',
      },
    });
  }

  async hasActiveBatches(id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = tx || this.prisma;
    // Query dynamic model 'batch' if it gets added in subsequent phases
    const batchDelegate = (client as any).batch;
    if (batchDelegate) {
      const activeBatchesCount = await batchDelegate.count({
        where: {
          courseId: id,
          status: { in: ['OpenForEnrollment', 'InProgress'] },
          isDeleted: false,
        },
      });
      return activeBatchesCount > 0;
    }
    return false;
  }
}
