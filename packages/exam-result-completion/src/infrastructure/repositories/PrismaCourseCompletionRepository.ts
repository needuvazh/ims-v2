import { PrismaClient, CourseCompletion as PrismaCourseCompletion } from '@prisma/client';
import { CourseCompletionRepository } from '../../domain/interfaces/CourseCompletionRepository';
import { CourseCompletion, CompletionStatus } from '../../domain/aggregates/CourseCompletion';

export class PrismaCourseCompletionRepository implements CourseCompletionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CourseCompletion | null> {
    const record = await this.prisma.courseCompletion.findUnique({
      where: { id, isDeleted: false },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByEnrollmentId(enrollmentId: string): Promise<CourseCompletion | null> {
    const record = await this.prisma.courseCompletion.findFirst({
      where: {
        enrollmentId,
        isDeleted: false,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByStatus(status: CompletionStatus): Promise<CourseCompletion[]> {
    const records = await this.prisma.courseCompletion.findMany({
      where: {
        completionStatus: status,
        isDeleted: false,
      },
    });

    return records.map(this.toDomain);
  }

  async findByEnrollmentIds(enrollmentIds: string[]): Promise<CourseCompletion[]> {
    const records = await this.prisma.courseCompletion.findMany({
      where: {
        enrollmentId: { in: enrollmentIds },
        isDeleted: false,
      },
    });

    return records.map(this.toDomain);
  }

  async save(completion: CourseCompletion): Promise<void> {
    await this.prisma.courseCompletion.upsert({
      where: { id: completion.id },
      update: this.toPrismaUpdate(completion),
      create: this.toPrismaCreate(completion),
    });
  }

  async saveMany(completions: CourseCompletion[]): Promise<void> {
    await this.prisma.$transaction(
      completions.map((completion) =>
        this.prisma.courseCompletion.upsert({
          where: { id: completion.id },
          update: this.toPrismaUpdate(completion),
          create: this.toPrismaCreate(completion),
        })
      )
    );
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.courseCompletion.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  private toDomain(record: PrismaCourseCompletion): CourseCompletion {
    return {
      id: record.id,
      enrollmentId: record.enrollmentId,
      attendancePercentage: record.attendancePercentage?.toNumber() ?? null,
      attendanceOutcome: record.attendanceOutcome,
      examRequired: record.examRequired,
      examOutcome: record.examOutcome,
      paymentRequired: record.paymentRequired,
      paymentOutcome: record.paymentOutcome,
      manualApprovalRequired: record.manualApprovalRequired,
      completionStatus: record.completionStatus as CompletionStatus,
      certificateAllowed: record.certificateAllowed,
      attendanceUpdatedAt: record.attendanceUpdatedAt,
      resultUpdatedAt: record.resultUpdatedAt,
      paymentUpdatedAt: record.paymentUpdatedAt,
      lastEvaluatedAt: record.lastEvaluatedAt,
      evidenceStale: record.evidenceStale,
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

  private toPrismaCreate(completion: CourseCompletion) {
    return {
      id: completion.id,
      enrollmentId: completion.enrollmentId,
      attendancePercentage: completion.attendancePercentage,
      attendanceOutcome: completion.attendanceOutcome,
      examRequired: completion.examRequired,
      examOutcome: completion.examOutcome,
      paymentRequired: completion.paymentRequired,
      paymentOutcome: completion.paymentOutcome,
      manualApprovalRequired: completion.manualApprovalRequired,
      completionStatus: completion.completionStatus,
      certificateAllowed: completion.certificateAllowed,
      attendanceUpdatedAt: completion.attendanceUpdatedAt,
      resultUpdatedAt: completion.resultUpdatedAt,
      paymentUpdatedAt: completion.paymentUpdatedAt,
      lastEvaluatedAt: completion.lastEvaluatedAt,
      evidenceStale: completion.evidenceStale,
      version: completion.version,
      createdAt: completion.createdAt,
      createdBy: completion.createdBy,
      isDeleted: completion.isDeleted,
    };
  }

  private toPrismaUpdate(completion: CourseCompletion) {
    return {
      attendancePercentage: completion.attendancePercentage,
      attendanceOutcome: completion.attendanceOutcome,
      examOutcome: completion.examOutcome,
      paymentOutcome: completion.paymentOutcome,
      manualApprovalRequired: completion.manualApprovalRequired,
      completionStatus: completion.completionStatus,
      certificateAllowed: completion.certificateAllowed,
      attendanceUpdatedAt: completion.attendanceUpdatedAt,
      resultUpdatedAt: completion.resultUpdatedAt,
      paymentUpdatedAt: completion.paymentUpdatedAt,
      lastEvaluatedAt: completion.lastEvaluatedAt,
      evidenceStale: completion.evidenceStale,
      version: completion.version,
      updatedAt: completion.updatedAt,
      updatedBy: completion.updatedBy,
      deletedAt: completion.deletedAt,
      deletedBy: completion.deletedBy,
      isDeleted: completion.isDeleted,
    };
  }
}
