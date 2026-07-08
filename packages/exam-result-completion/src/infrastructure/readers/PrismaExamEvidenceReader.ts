import { PrismaClient } from '@prisma/client';
import { ExamEvidenceReader } from '../../domain/interfaces/ExamEvidenceReader';

export class PrismaExamEvidenceReader implements ExamEvidenceReader {
  constructor(private readonly prisma: PrismaClient) {}

  async getExamSummaryForEnrollment(
    enrollmentId: string,
    batchId: string,
  ): Promise<{
    outcome: 'Pass' | 'Fail' | 'Pending' | 'NotRequired';
    lastUpdated: Date | null;
  } | null> {
    // 1. Fetch active, non-deleted exams for this batch
    const exams = await this.prisma.exam.findMany({
      where: {
        batchId,
        isDeleted: false,
        status: { not: 'Cancelled' },
      },
    });

    if (exams.length === 0) {
      return {
        outcome: 'Pending',
        lastUpdated: null,
      };
    }

    // 2. Fetch the student's results for this enrollment
    const results = await this.prisma.result.findMany({
      where: {
        enrollmentId,
        isDeleted: false,
      },
    });

    let passCount = 0;
    let pendingCount = 0;
    let failCount = 0;
    let maxTimestamp: Date | null = null;

    for (const exam of exams) {
      const result = results.find((r) => r.examId === exam.id);

      if (!result) {
        pendingCount++;
        continue;
      }

      // Check the latest updated timestamp
      const resultDate = result.updatedAt ?? result.createdAt;
      if (!maxTimestamp || resultDate > maxTimestamp) {
        maxTimestamp = resultDate;
      }

      // Result must be finalized or corrected to count as a final outcome
      if (
        result.resultStatus !== 'Finalized' &&
        result.resultStatus !== 'Corrected'
      ) {
        pendingCount++;
      } else {
        const passMarks = exam.passMarks.toNumber();
        const marksObtained = result.marksObtained.toNumber();

        if (marksObtained >= passMarks) {
          passCount++;
        } else {
          failCount++;
        }
      }
    }

    let outcome: 'Pass' | 'Fail' | 'Pending';

    if (failCount > 0) {
      outcome = 'Fail';
    } else if (pendingCount > 0) {
      outcome = 'Pending';
    } else {
      outcome = 'Pass';
    }

    return {
      outcome,
      lastUpdated: maxTimestamp,
    };
  }
}
