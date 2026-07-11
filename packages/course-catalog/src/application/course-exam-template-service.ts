import { PrismaClient, Prisma } from '@prisma/client';
import { ICourseExamTemplateRepository, ICourseRepository } from '../domain/repositories';
import { CourseExamTemplate } from '../domain/course';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import { ActiveCourseLocked } from '../domain/errors';

export interface CreateCourseExamTemplateInput {
  courseId: string;
  examName: string;
  maxMarks: number;
  passMarks: number;
  status?: string;
}

export interface UpdateCourseExamTemplateInput {
  examName?: string;
  maxMarks?: number;
  passMarks?: number;
  status?: string;
}

export class CourseExamTemplateService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly templateRepository: ICourseExamTemplateRepository,
    private readonly courseRepository: ICourseRepository,
  ) {}

  async createTemplate(
    input: CreateCourseExamTemplateInput,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate> {
    const execute = async (activeClient: Prisma.TransactionClient) => {
      // Validate Course exists
      const course = await activeClient.course.findFirst({
        where: { id: input.courseId, isDeleted: false },
      });
      if (!course) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }

      // Check course status lock
      if (course.status === 'Published') {
        const hasActive = await this.courseRepository.hasActiveBatches(
          input.courseId,
          activeClient,
        );
        if (hasActive) {
          throw new ActiveCourseLocked('Cannot add exam templates on a published course with active batches.');
        }
      }

      if (course.status === 'Archived') {
        throw new Error('ERR_CRS_ARCHIVED_COURSE_LOCKED');
      }

      // Validate marks
      if (input.maxMarks <= 0) {
        throw new Error('ERR_CRS_INVALID_MAX_MARKS');
      }
      if (input.passMarks < 0) {
        throw new Error('ERR_CRS_INVALID_PASS_MARKS');
      }
      if (input.passMarks > input.maxMarks) {
        throw new Error('Passing marks cannot exceed maximum marks');
      }

      const id = createUuid(randomUUID());
      const template = await this.templateRepository.create(
        {
          id,
          courseId: input.courseId,
          examName: input.examName,
          maxMarks: new Prisma.Decimal(input.maxMarks),
          passMarks: new Prisma.Decimal(input.passMarks),
          status: (input.status as any) || 'Active',
          createdBy: actorId,
        },
        activeClient,
      );

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'CourseCatalog',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'CourseExamTemplate',
          entityId: id,
          action: 'Create',
          newValue: {
            courseId: input.courseId,
            examName: input.examName,
            maxMarks: input.maxMarks,
            passMarks: input.passMarks,
            status: template.status,
          },
        },
      });

      return template;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async updateTemplate(
    id: string,
    input: UpdateCourseExamTemplateInput,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate> {
    const execute = async (activeClient: Prisma.TransactionClient) => {
      const template = await this.templateRepository.findById(id, activeClient);
      if (!template) {
        throw new Error('ERR_CRS_TEMPLATE_NOT_FOUND');
      }

      // Validate Course exists and check status lock
      const course = await activeClient.course.findFirst({
        where: { id: template.courseId, isDeleted: false },
      });
      if (!course) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }

      if (course.status === 'Published') {
        const hasActive = await this.courseRepository.hasActiveBatches(
          template.courseId,
          activeClient,
        );
        if (hasActive) {
          throw new ActiveCourseLocked('Cannot update exam templates on a published course with active batches.');
        }
      }

      if (course.status === 'Archived') {
        throw new Error('ERR_CRS_ARCHIVED_COURSE_LOCKED');
      }

      // Validate marks if updated
      const nextMax = input.maxMarks !== undefined ? input.maxMarks : template.maxMarks.toNumber();
      const nextPass = input.passMarks !== undefined ? input.passMarks : template.passMarks.toNumber();

      if (nextMax <= 0) {
        throw new Error('ERR_CRS_INVALID_MAX_MARKS');
      }
      if (nextPass < 0) {
        throw new Error('ERR_CRS_INVALID_PASS_MARKS');
      }
      if (nextPass > nextMax) {
        throw new Error('Passing marks cannot exceed maximum marks');
      }

      const updatedData: Prisma.CourseExamTemplateUncheckedUpdateInput = {};
      if (input.examName !== undefined) updatedData.examName = input.examName;
      if (input.maxMarks !== undefined) updatedData.maxMarks = new Prisma.Decimal(input.maxMarks);
      if (input.passMarks !== undefined) updatedData.passMarks = new Prisma.Decimal(input.passMarks);
      if (input.status !== undefined) updatedData.status = input.status as any;
      updatedData.updatedBy = actorId;

      const updated = await this.templateRepository.update(id, updatedData, activeClient);

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'CourseCatalog',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'CourseExamTemplate',
          entityId: id,
          action: 'Update',
          oldValue: {
            examName: template.examName,
            maxMarks: template.maxMarks.toString(),
            passMarks: template.passMarks.toString(),
            status: template.status,
          },
          newValue: {
            examName: updated.examName,
            maxMarks: updated.maxMarks.toString(),
            passMarks: updated.passMarks.toString(),
            status: updated.status,
          },
        },
      });

      return updated;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async deleteTemplate(
    id: string,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const execute = async (activeClient: Prisma.TransactionClient) => {
      const template = await this.templateRepository.findById(id, activeClient);
      if (!template) {
        throw new Error('ERR_CRS_TEMPLATE_NOT_FOUND');
      }

      const course = await activeClient.course.findFirst({
        where: { id: template.courseId, isDeleted: false },
      });
      if (!course) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }

      if (course.status === 'Published') {
        const hasActive = await this.courseRepository.hasActiveBatches(
          template.courseId,
          activeClient,
        );
        if (hasActive) {
          throw new ActiveCourseLocked('Cannot delete exam templates on a published course with active batches.');
        }
      }

      if (course.status === 'Archived') {
        throw new Error('ERR_CRS_ARCHIVED_COURSE_LOCKED');
      }

      await this.templateRepository.delete(id, actorId || '', activeClient);

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'CourseCatalog',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'CourseExamTemplate',
          entityId: id,
          action: 'Delete',
          oldValue: {
            examName: template.examName,
            isDeleted: false,
          },
          newValue: {
            isDeleted: true,
          },
        },
      });
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async getTemplateById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate | null> {
    return this.templateRepository.findById(id, tx);
  }

  async listTemplatesForCourse(
    courseId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CourseExamTemplate[]> {
    return this.templateRepository.findAll({ courseId }, tx);
  }
}
