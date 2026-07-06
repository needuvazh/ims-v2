import { PrismaClient } from '@prisma/client';
import { CourseCompletionRuleReader } from '../../domain/interfaces/CourseCompletionRuleReader';

export class PrismaCourseCompletionRuleReader implements CourseCompletionRuleReader {
  constructor(private readonly prisma: PrismaClient) {}

  async getCompletionRuleForCourse(courseId: string): Promise<{
    minimumAttendancePercent: number;
    examRequired: boolean;
    feeClearanceRequired: boolean;
    manualApprovalRequired: boolean;
  } | null> {
    const rule = await this.prisma.courseCompletionRule.findFirst({
      where: {
        courseId,
        status: 'Active',
        isDeleted: false,
      },
      orderBy: { effectiveStartDate: 'desc' },
    });

    if (!rule) {
      return null;
    }

    return {
      minimumAttendancePercent: rule.minimumAttendancePercent,
      examRequired: rule.examRequired,
      feeClearanceRequired: rule.feeClearanceRequired,
      manualApprovalRequired: rule.manualApprovalRequired,
    };
  }
}
