import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseCategoryRepository } from '../domain/repositories';
import { CourseCategory } from '../domain/course';

export class CourseCategoryRepository implements ICourseCategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any, tx?: Prisma.TransactionClient): Promise<CourseCategory> {
    const client = tx || this.prisma;
    const category = await client.courseCategory.create({
      data: {
        code: data.code,
        nameEnglish: data.nameEnglish,
        nameArabic: data.nameArabic,
        description: data.description || null,
        parentCategoryId: data.parentCategoryId || null,
        status: data.status || 'Active',
        version: 1,
        createdBy: data.createdBy || null,
        isDeleted: false,
      },
    });
    return category as CourseCategory;
  }

  async update(id: string, data: any, version: number, tx?: Prisma.TransactionClient): Promise<CourseCategory> {
    const client = tx || this.prisma;
    const result = await client.courseCategory.updateMany({
      where: { id, version, isDeleted: false },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new Error('ERR_CRS_CONCURRENCY_VIOLATION');
    }

    const updated = await client.courseCategory.findUnique({
      where: { id },
    });
    if (!updated) {
      throw new Error('ERR_CRS_NOT_FOUND');
    }
    return updated as CourseCategory;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<CourseCategory | null> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return null;
    }
    const client = tx || this.prisma;
    const category = await client.courseCategory.findUnique({
      where: { id, isDeleted: false },
    });
    return category as CourseCategory | null;
  }

  async findByCode(code: string, tx?: Prisma.TransactionClient): Promise<CourseCategory | null> {
    const client = tx || this.prisma;
    const category = await client.courseCategory.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, isDeleted: false },
    });
    return category as CourseCategory | null;
  }

  async findAll(tx?: Prisma.TransactionClient): Promise<CourseCategory[]> {
    const client = tx || this.prisma;
    const items = await client.courseCategory.findMany({
      where: { isDeleted: false },
      orderBy: { nameEnglish: 'asc' },
    });
    return items as CourseCategory[];
  }
}
