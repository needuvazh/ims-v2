import { PrismaClient } from '@prisma/client';
import { EnrollmentReader } from '../../domain/interfaces/EnrollmentReader';

export class PrismaEnrollmentReader implements EnrollmentReader {
  constructor(private readonly prisma: PrismaClient) {}

  async getEnrollmentById(enrollmentId: string): Promise<{
    id: string;
    studentProfileId: string;
    courseId: string;
    batchId: string;
    branchId: string;
    enrollmentStatus: string;
  } | null> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        id: enrollmentId,
        isDeleted: false,
      },
    });

    if (!enrollment) {
      return null;
    }

    return {
      id: enrollment.id,
      studentProfileId: enrollment.studentProfileId,
      courseId: enrollment.courseId,
      batchId: enrollment.batchId,
      branchId: enrollment.branchId,
      enrollmentStatus: enrollment.enrollmentStatus,
    };
  }

  async getEnrollmentsForBatch(batchId: string): Promise<Array<{
    id: string;
    studentProfileId: string;
    enrollmentStatus: string;
  }>> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        batchId,
        isDeleted: false,
      },
      select: {
        id: true,
        studentProfileId: true,
        enrollmentStatus: true,
      },
    });

    return enrollments;
  }
}
