import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseExamTemplateRepository } from '../domain/repositories';
import { CourseExamTemplate } from '../domain/course';

export class CourseExamTemplateRepository implements ICourseExamTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: Prisma.CourseExamTemplateUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate> {
    const client = tx || this.prisma;
    const template = await client.courseExamTemplate.create({
      data: {
        id: data.id,
        courseId: data.courseId,
        examName: data.examName,
        maxMarks: data.maxMarks,
        passMarks: data.passMarks,
        status: data.status || 'Active',
        createdBy: data.createdBy,
        isDeleted: false,
      },
    });
    return template as unknown as CourseExamTemplate;
  }

  async update(
    id: string,
    data: Prisma.CourseExamTemplateUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate> {
    const client = tx || this.prisma;
    const template = await client.courseExamTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return template as unknown as CourseExamTemplate;
  }

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate | null> {
    const client = tx || this.prisma;
    const template = await client.courseExamTemplate.findFirst({
      where: { id, isDeleted: false },
    });
    return template ? (template as unknown as CourseExamTemplate) : null;
  }

  async findAll(
    filters: { courseId?: string; status?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate[]> {
    const client = tx || this.prisma;
    const where: Prisma.CourseExamTemplateWhereInput = { isDeleted: false };
    
    if (filters.courseId) {
      where.courseId = filters.courseId;
    }
    if (filters.status) {
      where.status = filters.status as any;
    }

    const templates = await client.courseExamTemplate.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return templates as unknown as CourseExamTemplate[];
  }

  async delete(
    id: string,
    deletedBy: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.courseExamTemplate.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }
}
