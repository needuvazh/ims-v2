import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseRepository } from '../domain/repositories';
import {
  DuplicateCourseCode,
  DuplicateCourseName,
  InvalidCodeFormat,
  InvalidDateRange,
  ActiveCourseLocked,
  MissingPricingOrRules,
  ActiveBatchesExist,
} from '../domain/errors';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';

const CODE_REGEX = /^[A-Z0-9-]{3,20}$/;
const ARABIC_SCRIPT_REGEX = /^[\u0600-\u06FF\s0-9\-\.\,\(\)]+$/;

export class CourseService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly courseRepository: ICourseRepository
  ) {}

  async createCourse(input: any, actorId?: string, tx?: Prisma.TransactionClient) {
    const execute = async (activeClient: Prisma.TransactionClient) => {
      // Validate course code format
      if (!CODE_REGEX.test(input.courseCode)) {
        throw new InvalidCodeFormat();
      }

      // Validate duplicate course code
      const existingCode = await this.courseRepository.findByCode(input.courseCode, activeClient);
      if (existingCode) {
        throw new DuplicateCourseCode();
      }

      // Validate Arabic script
      if (!ARABIC_SCRIPT_REGEX.test(input.nameArabic)) {
        throw new Error('ERR_CRS_INVALID_ARABIC_SCRIPT');
      }
      if (input.descriptionArabic && !ARABIC_SCRIPT_REGEX.test(input.descriptionArabic)) {
        throw new Error('ERR_CRS_INVALID_ARABIC_SCRIPT');
      }

      // Validate department exists
      const department = await activeClient.department.findUnique({
        where: { id: input.departmentId },
      });
      if (!department) {
        throw new Error('ERR_CRS_DEPARTMENT_NOT_FOUND');
      }

      // Validate duplicate name in department scope
      const existingName = await this.courseRepository.findByNameInDepartment(
        input.nameEnglish,
        input.nameArabic,
        input.departmentId,
        activeClient
      );
      if (existingName) {
        throw new DuplicateCourseName();
      }

      // Validate date range
      if (input.effectiveEndDate && new Date(input.effectiveEndDate) <= new Date(input.effectiveStartDate)) {
        throw new InvalidDateRange();
      }

      // Validate category exists if provided
      if (input.categoryId) {
        const category = await activeClient.courseCategory.findFirst({
          where: { id: input.categoryId, isDeleted: false },
        });
        if (!category) {
          throw new Error('ERR_CRS_CATEGORY_NOT_FOUND');
        }
      }

      const courseId = createUuid(randomUUID());
      const course = await this.courseRepository.create(
        {
          ...input,
          id: courseId,
          status: 'Draft',
          createdBy: actorId,
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
          entityType: 'Course',
          entityId: course.id,
          action: 'Create',
          newValue: {
            courseCode: course.courseCode,
            nameEnglish: course.nameEnglish,
            departmentId: course.departmentId,
          },
        },
      });

      // Outbox Event
      await activeClient.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'CourseCreated',
          aggregateType: 'Course',
          aggregateId: course.id,
          payload: {
            id: course.id,
            courseCode: course.courseCode,
            nameEnglish: course.nameEnglish,
            status: course.status,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      return course;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async updateCourse(id: string, input: any, version: number, actorId?: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    const execute = async (activeClient: Prisma.TransactionClient) => {
      const course = await this.courseRepository.findById(id, activeClient);
      if (!course) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }

      // Validate Arabic script if updated
      if (input.nameArabic && !ARABIC_SCRIPT_REGEX.test(input.nameArabic)) {
        throw new Error('ERR_CRS_INVALID_ARABIC_SCRIPT');
      }
      if (input.descriptionArabic && !ARABIC_SCRIPT_REGEX.test(input.descriptionArabic)) {
        throw new Error('ERR_CRS_INVALID_ARABIC_SCRIPT');
      }

      // Validate duplicate name in department scope if name/department changed
      const checkDept = input.departmentId || course.departmentId;
      const checkNameEn = input.nameEnglish || course.nameEnglish;
      const checkNameAr = input.nameArabic || course.nameArabic;
      if (input.nameEnglish || input.nameArabic || input.departmentId) {
        const existingName = await this.courseRepository.findByNameInDepartment(
          checkNameEn,
          checkNameAr,
          checkDept,
          activeClient
        );
        if (existingName && existingName.id !== id) {
          throw new DuplicateCourseName();
        }
      }

      // Validate date range
      const checkStartDate = input.effectiveStartDate ? new Date(input.effectiveStartDate) : new Date(course.effectiveStartDate);
      const checkEndDate = input.effectiveEndDate !== undefined ? (input.effectiveEndDate ? new Date(input.effectiveEndDate) : null) : (course.effectiveEndDate ? new Date(course.effectiveEndDate) : null);
      if (checkEndDate && checkEndDate <= checkStartDate) {
        throw new InvalidDateRange();
      }

      // Immutable checks on published courses with active batches
      const isClassificationChanged = input.courseClassification && input.courseClassification !== course.courseClassification;
      const isDurationValueChanged = input.durationValue && input.durationValue !== course.durationValue;
      const isDurationTypeChanged = input.durationType && input.durationType !== course.durationType;
      if (course.status === 'Published' && (isClassificationChanged || isDurationValueChanged || isDurationTypeChanged)) {
        const hasActive = await this.courseRepository.hasActiveBatches(id, activeClient);
        if (hasActive) {
          throw new ActiveCourseLocked();
        }
      }

      // Validate category exists if provided
      if (input.categoryId) {
        const category = await activeClient.courseCategory.findFirst({
          where: { id: input.categoryId, isDeleted: false },
        });
        if (!category) {
          throw new Error('ERR_CRS_CATEGORY_NOT_FOUND');
        }
      }

      const updated = await this.courseRepository.update(
        id,
        {
          ...input,
          updatedBy: actorId,
        },
        version,
        activeClient
      );

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'CourseCatalog',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Course',
          entityId: id,
          action: 'Update',
          oldValue: {
            nameEnglish: course.nameEnglish,
            durationValue: course.durationValue,
          },
          newValue: {
            nameEnglish: updated.nameEnglish,
            durationValue: updated.durationValue,
          },
        },
      });

      // Outbox Event
      await activeClient.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'CourseUpdated',
          aggregateType: 'Course',
          aggregateId: id,
          payload: {
            id,
            nameEnglish: updated.nameEnglish,
            status: updated.status,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      return updated;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async transitionCourseStatus(
    id: string,
    targetStatus: string,
    version: number,
    actorId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;

    const execute = async (activeClient: Prisma.TransactionClient) => {
      const course = await this.courseRepository.findById(id, activeClient);
      if (!course) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }

      const currentStatus = course.status;
      if (currentStatus === targetStatus) {
        return course;
      }

      // Validate pricing and completion rules configured if target is Published
      if (targetStatus === 'Published') {
        const activePricing = await activeClient.coursePricing.findFirst({
          where: { courseId: id, status: 'Active', isDeleted: false },
        });
        const activeRule = await activeClient.courseCompletionRule.findFirst({
          where: { courseId: id, status: 'Active', isDeleted: false },
        });

        if (!activePricing || !activeRule) {
          throw new MissingPricingOrRules();
        }
      }

      // Validate batches if target is Archived
      if (targetStatus === 'Archived') {
        const hasActive = await this.courseRepository.hasActiveBatches(id, activeClient);
        if (hasActive) {
          throw new ActiveBatchesExist();
        }

        // Logical delete Course when transitioning to Archived
        const updated = await this.courseRepository.update(
          id,
          {
            status: 'Archived',
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: actorId,
          },
          version,
          activeClient
        );

        // Audit Log
        await activeClient.auditLog.create({
          data: {
            id: createUuid(randomUUID()),
            module: 'CourseCatalog',
            performedBy: actorId || null,
            performedAt: new Date(),
            entityType: 'Course',
            entityId: id,
            action: 'Archive',
            oldValue: { status: currentStatus },
            newValue: { status: 'Archived', isDeleted: true },
          },
        });

        // Outbox Event
        await activeClient.outboxEvent.create({
          data: {
            id: createUuid(randomUUID()),
            eventType: 'CourseStatusChanged',
            aggregateType: 'Course',
            aggregateId: id,
            payload: { id, oldStatus: currentStatus, newStatus: 'Archived', isDeleted: true },
            status: 'Pending',
            availableAt: new Date(),
          },
        });

        return updated;
      }

      // General transition
      const updated = await this.courseRepository.update(
        id,
        {
          status: targetStatus,
          updatedBy: actorId,
        },
        version,
        activeClient
      );

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'CourseCatalog',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Course',
          entityId: id,
          action: 'StatusChange',
          oldValue: { status: currentStatus },
          newValue: { status: targetStatus },
        },
      });

      // Outbox Event
      await activeClient.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'CourseStatusChanged',
          aggregateType: 'Course',
          aggregateId: id,
          payload: { id, oldStatus: currentStatus, newStatus: targetStatus },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      return updated;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async getCourseById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return this.courseRepository.findById(id, client);
  }

  async findAll(
    filters: { categoryId?: string; status?: string; search?: string },
    pagination: { page: number; limit: number },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    return this.courseRepository.findAll(filters, pagination, client);
  }
}
