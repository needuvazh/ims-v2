import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseDiscountRepository } from '../domain/repositories';
import { CourseDiscount } from '../domain/course';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import { parseDateOnly } from './pricing-service';

export class CourseDiscountService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly discountRepository: ICourseDiscountRepository
  ) {}

  async createDiscount(input: any, actorId?: string, tx?: Prisma.TransactionClient) {
    const execute = async (activeClient: Prisma.TransactionClient) => {
      // Validate Course exists
      const courseExists = await activeClient.course.findFirst({
        where: { id: input.courseId, isDeleted: false },
      });
      if (!courseExists) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }

      // Normalize date boundaries
      const startDate = parseDateOnly(input.effectiveStartDate);
      const endDate = input.effectiveEndDate ? parseDateOnly(input.effectiveEndDate) : null;

      if (endDate && endDate <= startDate) {
        throw new Error('ERR_CRS_INVALID_DATE_RANGE');
      }

      // Check overlaps
      const overlaps = await this.discountRepository.findOverlappingDiscounts(
        {
          courseId: input.courseId,
          branchId: input.branchId || null,
          batchId: input.batchId || null,
          discountType: input.discountType,
          startDate,
          endDate,
        },
        activeClient
      );

      for (const record of overlaps) {
        if (startDate <= new Date(record.effectiveStartDate)) {
          throw new Error('ERR_CRS_MULTIPLE_ACTIVE_DISCOUNTS');
        }

        const previousEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        await this.discountRepository.update(
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
            entityType: 'CourseDiscount',
            entityId: record.id,
            action: 'Supersede',
            oldValue: { status: record.status, effectiveEndDate: record.effectiveEndDate },
            newValue: { status: 'Superseded', effectiveEndDate: previousEnd },
          },
        });
      }

      const discount = await this.discountRepository.create(
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
          entityType: 'CourseDiscount',
          entityId: discount.id,
          action: 'Create',
          newValue: {
            courseId: discount.courseId,
            branchId: discount.branchId,
            discountType: discount.discountType,
            discountValue: Number(discount.discountValue),
          },
        },
      });

      // Outbox Event
      await activeClient.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'CourseDiscountCreated',
          aggregateType: 'CourseDiscount',
          aggregateId: discount.id,
          payload: {
            id: discount.id,
            courseId: discount.courseId,
            discountType: discount.discountType,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      return discount;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }
}
