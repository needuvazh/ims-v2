import { PrismaClient, Exam as PrismaExam } from '@prisma/client';
import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { Exam, ExamStatus } from '../../domain/aggregates/Exam';

export class PrismaExamRepository implements ExamRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Exam | null> {
    const record = await this.prisma.exam.findUnique({
      where: { id, isDeleted: false },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByBatchId(batchId: string, status?: ExamStatus): Promise<Exam[]> {
    const records = await this.prisma.exam.findMany({
      where: {
        batchId,
        isDeleted: false,
        ...(status && { status }),
      },
      orderBy: { examDate: 'asc' },
    });

    return records.map(this.toDomain);
  }

  async findByCourseId(courseId: string, status?: ExamStatus): Promise<Exam[]> {
    const records = await this.prisma.exam.findMany({
      where: {
        courseId,
        isDeleted: false,
        ...(status && { status }),
      },
      orderBy: { examDate: 'asc' },
    });

    return records.map(this.toDomain);
  }

  async findByBatchAndDate(batchId: string, examDate: Date): Promise<Exam[]> {
    const records = await this.prisma.exam.findMany({
      where: {
        batchId,
        examDate,
        isDeleted: false,
      },
    });

    return records.map(this.toDomain);
  }

  async save(exam: Exam): Promise<void> {
    await this.prisma.exam.upsert({
      where: { id: exam.id },
      update: this.toPrismaUpdate(exam),
      create: this.toPrismaCreate(exam),
    });
  }

  async saveMany(exams: Exam[]): Promise<void> {
    await this.prisma.$transaction(
      exams.map((exam) =>
        this.prisma.exam.upsert({
          where: { id: exam.id },
          update: this.toPrismaUpdate(exam),
          create: this.toPrismaCreate(exam),
        }),
      ),
    );
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.exam.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  private toDomain(record: PrismaExam): Exam {
    return {
      id: record.id,
      courseId: record.courseId,
      batchId: record.batchId,
      courseExamTemplateId: record.courseExamTemplateId,
      examName: record.examName,
      examDate: record.examDate,
      maxMarks: record.maxMarks.toNumber(),
      passMarks: record.passMarks.toNumber(),
      status: record.status as ExamStatus,
      version: record.version,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
      deletedAt: record.deletedAt,
      deletedBy: record.deletedBy,
      isDeleted: record.isDeleted,
    };
  }

  private toPrismaCreate(exam: Exam) {
    return {
      id: exam.id,
      courseId: exam.courseId,
      batchId: exam.batchId,
      courseExamTemplateId: exam.courseExamTemplateId,
      examName: exam.examName,
      examDate: exam.examDate,
      maxMarks: exam.maxMarks,
      passMarks: exam.passMarks,
      status: exam.status,
      version: exam.version,
      createdAt: exam.createdAt,
      createdBy: exam.createdBy,
      isDeleted: exam.isDeleted,
    };
  }

  private toPrismaUpdate(exam: Exam) {
    return {
      examName: exam.examName,
      examDate: exam.examDate,
      maxMarks: exam.maxMarks,
      passMarks: exam.passMarks,
      status: exam.status,
      version: exam.version,
      courseExamTemplateId: exam.courseExamTemplateId,
      updatedAt: exam.updatedAt,
      updatedBy: exam.updatedBy,
      deletedAt: exam.deletedAt,
      deletedBy: exam.deletedBy,
      isDeleted: exam.isDeleted,
    };
  }
}
