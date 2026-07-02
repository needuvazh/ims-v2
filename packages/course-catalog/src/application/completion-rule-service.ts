import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseCompletionRuleRepository } from '../domain/repositories';
import { CourseCompletionRule } from '../domain/course';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import { parseDateOnly } from './pricing-service';

export class CourseCompletionRuleService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ruleRepository: ICourseCompletionRuleRepository
  ) {}

  async createCompletionRule(input: any, actorId?: string, tx?: Prisma.TransactionClient) {
    const execute = async (activeClient: Prisma.TransactionClient) => {
      // Validate Course exists
      const courseExists = await activeClient.course.findFirst({
        where: { id: input.courseId, isDeleted: false },
      });
      if (!courseExists) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }

      // Validate attendance threshold
      if (input.minimumAttendancePercent < 0 || input.minimumAttendancePercent > 100) {
        throw new Error('ERR_CRS_INVALID_ATTENDANCE_LIMIT');
      }

      // Normalize date boundaries
      const startDate = parseDateOnly(input.effectiveStartDate);
      const endDate = input.effectiveEndDate ? parseDateOnly(input.effectiveEndDate) : null;

      if (endDate && endDate <= startDate) {
        throw new Error('ERR_CRS_INVALID_DATE_RANGE');
      }

      // Check overlaps (only one active completion rule model per course at a time)
      const overlaps = await this.ruleRepository.findOverlappingRules(
        {
          courseId: input.courseId,
          startDate,
          endDate,
        },
        activeClient
      );

      for (const record of overlaps) {
        if (startDate <= new Date(record.effectiveStartDate)) {
          throw new Error('ERR_CRS_MULTIPLE_ACTIVE_RULES');
        }

        const previousEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        await this.ruleRepository.update(
          record.id,
          {
            status: 'Superseded',
            effectiveEndDate: previousEnd,
          },
          activeClient
        );

        // Audit Log
        await activeClient.auditLog.create({
          data: {
            id: createUuid(randomUUID()),
            module: 'CourseCatalog',
            performedBy: actorId || null,
            performedAt: new Date(),
            entityType: 'CourseCompletionRule',
            entityId: record.id,
            action: 'Supersede',
            oldValue: { status: record.status, effectiveEndDate: record.effectiveEndDate },
            newValue: { status: 'Superseded', effectiveEndDate: previousEnd },
          },
        });
      }

      const rule = await this.ruleRepository.create(
        {
          ...input,
          effectiveStartDate: startDate,
          effectiveEndDate: endDate,
          status: 'Active',
        },
        activeClient
      );

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'CourseCatalog',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'CourseCompletionRule',
          entityId: rule.id,
          action: 'Create',
          newValue: {
            courseId: rule.courseId,
            minimumAttendancePercent: rule.minimumAttendancePercent,
            examRequired: rule.examRequired,
          },
        },
      });

      // Outbox Event
      await activeClient.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'CourseCompletionRuleCreated',
          aggregateType: 'CourseCompletionRule',
          aggregateId: rule.id,
          payload: {
            id: rule.id,
            courseId: rule.courseId,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      return rule;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }
}
