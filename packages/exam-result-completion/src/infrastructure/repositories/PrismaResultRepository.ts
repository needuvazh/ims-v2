import { PrismaClient, Result as PrismaResult } from '@prisma/client';
import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { Result, ResultStatus } from '../../domain/aggregates/Result';

export class PrismaResultRepository implements ResultRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Result | null> {
    const record = await this.prisma.result.findUnique({
      where: { id, isDeleted: false },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByExamId(examId: string): Promise<Result[]> {
    const records = await this.prisma.result.findMany({
      where: {
        examId,
        isDeleted: false,
      },
    });

    return records.map(this.toDomain);
  }

  async findByEnrollmentId(enrollmentId: string): Promise<Result[]> {
    const records = await this.prisma.result.findMany({
      where: {
        enrollmentId,
        isDeleted: false,
      },
    });

    return records.map(this.toDomain);
  }

  async findByExamAndEnrollment(
    examId: string,
    enrollmentId: string,
  ): Promise<Result | null> {
    const record = await this.prisma.result.findFirst({
      where: {
        examId,
        enrollmentId,
        isDeleted: false,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async save(result: Result): Promise<void> {
    await this.prisma.result.upsert({
      where: { id: result.id },
      update: this.toPrismaUpdate(result),
      create: this.toPrismaCreate(result),
    });
  }

  async saveMany(results: Result[]): Promise<void> {
    await this.prisma.$transaction(
      results.map((result) =>
        this.prisma.result.upsert({
          where: { id: result.id },
          update: this.toPrismaUpdate(result),
          create: this.toPrismaCreate(result),
        }),
      ),
    );
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.result.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  private toDomain(record: PrismaResult): Result {
    return {
      id: record.id,
      examId: record.examId,
      enrollmentId: record.enrollmentId,
      marksObtained: record.marksObtained.toNumber(),
      resultStatus: record.resultStatus as ResultStatus,
      grade: record.grade,
      finalizedAt: record.finalizedAt,
      finalizedBy: record.finalizedBy,
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

  private toPrismaCreate(result: Result) {
    return {
      id: result.id,
      examId: result.examId,
      enrollmentId: result.enrollmentId,
      marksObtained: result.marksObtained,
      resultStatus: result.resultStatus,
      grade: result.grade,
      finalizedAt: result.finalizedAt,
      finalizedBy: result.finalizedBy,
      version: result.version,
      createdAt: result.createdAt,
      createdBy: result.createdBy,
      isDeleted: result.isDeleted,
    };
  }

  private toPrismaUpdate(result: Result) {
    return {
      marksObtained: result.marksObtained,
      resultStatus: result.resultStatus,
      grade: result.grade,
      finalizedAt: result.finalizedAt,
      finalizedBy: result.finalizedBy,
      version: result.version,
      updatedAt: result.updatedAt,
      updatedBy: result.updatedBy,
      deletedAt: result.deletedAt,
      deletedBy: result.deletedBy,
      isDeleted: result.isDeleted,
    };
  }
}
