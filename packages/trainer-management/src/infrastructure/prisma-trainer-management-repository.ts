import { Prisma, PrismaClient } from '@prisma/client';
import { DomainError, type Uuid } from '@ims/shared-kernel';
import {
  isEffectiveOn,
  overlaps,
  TrainerTypeSchema,
  TrainerStatusSchema,
  AvailabilityDaySchema,
  CompensationBasisSchema,
  RateStatusSchema,
  AuthorizationStatusSchema,
  QualificationStatusSchema,
  validateEffectiveDateRange,
  validateTimeOrder,
  type TrainerAssignmentReferenceRecord,
  type TrainerAuthorizationRecord,
  type TrainerAvailabilityRecord,
  type TrainerCompensationRateRecord,
  type TrainerEligibilityResult,
  type TrainerProfileRecord,
  type TrainerQualificationRecord,
  type TrainerReportRow,
  type TrainerStatus,
  type TrainerType,
  type AvailabilityDay,
  type CompensationBasis,
  type AuthorizationStatus,
} from '../domain/trainer';
import type { TrainerListFilters, ListQuery, TrainerManagementRepository } from '../domain/repositories';

type TrainerProfileRow = Prisma.TrainerProfileGetPayload<{
  include: {
    person: true;
    branch: true;
  };
}>;

type QualificationRow = Prisma.TrainerQualificationGetPayload<{
  include: {
    trainer: {
      select: {
        id: true;
        branchId: true;
      };
    };
  };
}>;

type AvailabilityRow = Prisma.TrainerAvailabilityGetPayload<{
  include: {
    trainer: {
      select: {
        id: true;
        branchId: true;
      };
    };
  };
}>;

type AuthorizationRow = Prisma.TrainerCourseAuthorizationGetPayload<{
  include: {
    course: true;
  };
}>;

type CompensationRow = Prisma.TrainerCompensationRateGetPayload<{
  include: {
    batch: {
      select: {
        id: true;
        batchCode: true;
        branchId: true;
        courseId: true;
        startDate: true;
        endDate: true;
        status: true;
      };
    };
    session: {
      select: {
        id: true;
        batchId: true;
        sessionNumber: true;
        sessionDate: true;
        startTime: true;
        endTime: true;
        status: true;
      };
    };
  };
}>;

function assertQueryPage(query: ListQuery) {
  if (!Number.isFinite(query.page) || query.page < 1) {
    throw new DomainError('invalid_value', 'Page must be a positive number.');
  }
  if (!Number.isFinite(query.pageSize) || query.pageSize < 1) {
    throw new DomainError('invalid_value', 'Page size must be a positive number.');
  }
}

function mapTrainerProfile(row: TrainerProfileRow): TrainerProfileRecord {
  return {
    id: row.id as Uuid,
    personId: row.personId as Uuid,
    branchId: row.branchId as Uuid,
    trainerCode: row.trainerCode,
    trainerType: TrainerTypeSchema.parse(row.trainerType),
    specialization: row.specialization,
    qualificationSummary: row.qualificationSummary,
    status: TrainerStatusSchema.parse(row.status),
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    version: row.version,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
    person: row.person
      ? {
          id: row.person.id as Uuid,
          firstName: row.person.firstName,
          lastName: row.person.lastName,
          mobile: row.person.mobile,
          email: row.person.email,
          localizedName: row.person.localizedName,
        }
      : undefined,
    branch: row.branch
      ? {
          id: row.branch.id as Uuid,
          branchCode: row.branch.branchCode,
          branchName: row.branch.branchName,
        }
      : undefined,
  };
}

function mapQualification(row: QualificationRow): TrainerQualificationRecord {
  return {
    id: row.id as Uuid,
    trainerId: row.trainerId as Uuid,
    qualificationName: row.qualificationName,
    institution: row.institution,
    yearCompleted: row.yearCompleted,
    documentId: row.documentId,
    status: QualificationStatusSchema.parse(row.status),
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    version: row.version,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
  };
}

function mapAvailability(row: AvailabilityRow): TrainerAvailabilityRecord {
  return {
    id: row.id as Uuid,
    trainerId: row.trainerId as Uuid,
    branchId: row.branchId as Uuid,
    dayOfWeek: AvailabilityDaySchema.parse(row.dayOfWeek),
    startTime: row.startTime,
    endTime: row.endTime,
    status: RateStatusSchema.parse(row.status),
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    version: row.version,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
  };
}

function mapAuthorization(row: AuthorizationRow): TrainerAuthorizationRecord {
  return {
    id: row.id as Uuid,
    trainerId: row.trainerId as Uuid,
    courseId: row.courseId as Uuid,
    status: AuthorizationStatusSchema.parse(row.status),
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    reason: row.reason,
    version: row.version,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
    course: row.course
      ? {
          id: row.course.id as Uuid,
          courseCode: row.course.courseCode,
          nameEnglish: row.course.nameEnglish,
          nameArabic: row.course.nameArabic,
        }
      : undefined,
  };
}

function mapCompensation(row: CompensationRow): TrainerCompensationRateRecord {
  return {
    id: row.id as Uuid,
    trainerId: row.trainerId as Uuid,
    batchId: row.batchId,
    sessionId: row.sessionId,
    paymentBasis: CompensationBasisSchema.parse(row.paymentBasis),
    amount: row.amount.toString(),
    currency: row.currency,
    status: RateStatusSchema.parse(row.status),
    remarks: row.remarks,
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    version: row.version,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
  };
}

function normalizePage(query: ListQuery) {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

function buildTrainerWhere(filters: TrainerListFilters) {
  const conditions: Prisma.TrainerProfileWhereInput[] = [];

  if (filters.branchId) conditions.push({ branchId: filters.branchId });
  if (filters.status) conditions.push({ status: filters.status });
  if (filters.trainerType) conditions.push({ trainerType: filters.trainerType });
  if (filters.specialization) {
    conditions.push({ specialization: { contains: filters.specialization, mode: 'insensitive' } });
  }
  if (filters.effectiveOn) {
    conditions.push({
      effectiveStartDate: { lte: filters.effectiveOn },
      OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: filters.effectiveOn } }],
    });
  }
  if (filters.courseId) {
    conditions.push({
      authorizations: {
        some: {
          courseId: filters.courseId,
          isDeleted: false,
          status: 'Active',
        },
      },
    });
  }
  if (filters.q) {
    conditions.push({
      OR: [
        { trainerCode: { contains: filters.q, mode: 'insensitive' } },
        { specialization: { contains: filters.q, mode: 'insensitive' } },
        { person: { firstName: { contains: filters.q, mode: 'insensitive' } } },
        { person: { lastName: { contains: filters.q, mode: 'insensitive' } } },
        { person: { mobile: { contains: filters.q, mode: 'insensitive' } } },
        { person: { email: { contains: filters.q, mode: 'insensitive' } } },
      ],
    });
  }

  return { isDeleted: false, AND: conditions };
}

function trainerSelect() {
  return {
    person: true,
    branch: true,
  } as const;
}

export class PrismaTrainerManagementRepository implements TrainerManagementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listTrainers(filters: TrainerListFilters, query: ListQuery) {
    assertQueryPage(query);
    const where = buildTrainerWhere(filters);
    const direction = query.sortDirection ?? 'desc';
    const orderBy =
      query.sortBy === 'trainerCode'
        ? { trainerCode: direction }
        : query.sortBy === 'fullName'
          ? [{ person: { firstName: direction } }, { person: { lastName: direction } }]
          : query.sortBy === 'branchName'
            ? { branch: { branchName: direction } }
            : query.sortBy === 'trainerType'
              ? { trainerType: direction }
              : query.sortBy === 'specialization'
                ? { specialization: direction }
                : query.sortBy === 'status'
                  ? { status: direction }
                  : query.sortBy === 'updatedAt'
                    ? { updatedAt: direction }
                    : { createdAt: direction };

    const [items, total] = await Promise.all([
      this.prisma.trainerProfile.findMany({
        where,
        include: trainerSelect(),
        ...normalizePage(query),
        orderBy,
      }),
      this.prisma.trainerProfile.count({ where }),
    ]);

    return { items: items.map(mapTrainerProfile), total };
  }

  async findTrainerById(trainerId: string, branchScope?: string[]) {
    const row = await this.prisma.trainerProfile.findFirst({
      where: {
        id: trainerId,
        isDeleted: false,
        ...(branchScope && branchScope.length > 0 ? { branchId: { in: branchScope } } : {}),
      },
      include: trainerSelect(),
    });
    return row ? mapTrainerProfile(row) : null;
  }

  async findTrainerByPersonId(personId: string, branchScope?: string[]) {
    const row = await this.prisma.trainerProfile.findFirst({
      where: {
        personId,
        isDeleted: false,
        ...(branchScope && branchScope.length > 0 ? { branchId: { in: branchScope } } : {}),
      },
      include: trainerSelect(),
    });
    return row ? mapTrainerProfile(row) : null;
  }

  async createTrainerProfile(input: Omit<TrainerProfileRecord, 'createdAt' | 'version' | 'isDeleted'> & { version?: number }): Promise<TrainerProfileRecord> {
    validateEffectiveDateRange(input.effectiveStartDate, input.effectiveEndDate);
    const row = await this.prisma.trainerProfile.create({
      data: {
        personId: input.personId,
        branchId: input.branchId,
        trainerCode: input.trainerCode,
        trainerType: input.trainerType,
        specialization: input.specialization,
        qualificationSummary: input.qualificationSummary,
        status: input.status,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: input.effectiveEndDate,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedBy: input.deletedBy ?? null,
        deletedAt: input.deletedAt ?? null,
        isDeleted: false,
      },
      include: trainerSelect(),
    }) as TrainerProfileRow;
    return mapTrainerProfile(row);
  }

  async updateTrainerProfile(trainerId: string, input: Partial<TrainerProfileRecord> & { version: number }): Promise<TrainerProfileRecord> {
    const existing = await this.prisma.trainerProfile.findFirst({ where: { id: trainerId, isDeleted: false } });
    if (!existing) {
      throw new DomainError('not_found', 'Trainer profile not found.');
    }
    if (existing.version !== input.version) {
      throw new DomainError('precondition_failed', 'Trainer profile was modified by another process.');
    }

    validateEffectiveDateRange(input.effectiveStartDate ?? existing.effectiveStartDate, input.effectiveEndDate ?? existing.effectiveEndDate);

    const row = await this.prisma.trainerProfile.update({
      where: { id: trainerId },
      data: {
        ...(input.personId ? { personId: input.personId } : {}),
        ...(input.branchId ? { branchId: input.branchId } : {}),
        ...(input.trainerCode ? { trainerCode: input.trainerCode } : {}),
        ...(input.trainerType ? { trainerType: input.trainerType } : {}),
        ...(input.specialization ? { specialization: input.specialization } : {}),
        ...(input.qualificationSummary !== undefined ? { qualificationSummary: input.qualificationSummary } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.effectiveStartDate ? { effectiveStartDate: input.effectiveStartDate } : {}),
        ...(input.effectiveEndDate !== undefined ? { effectiveEndDate: input.effectiveEndDate } : {}),
        ...(input.deletedAt !== undefined ? { deletedAt: input.deletedAt } : {}),
        ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy } : {}),
        ...(input.isDeleted !== undefined ? { isDeleted: input.isDeleted } : {}),
        updatedAt: new Date(),
        version: { increment: 1 },
      },
      include: trainerSelect(),
    });
    return mapTrainerProfile(row);
  }

  async transitionTrainerStatus(trainerId: string, input: { toStatus: TrainerStatus; effectiveAt: Date; reason: string; version: number }): Promise<TrainerProfileRecord> {
    const existing = await this.prisma.trainerProfile.findFirst({ where: { id: trainerId, isDeleted: false } });
    if (!existing) {
      throw new DomainError('not_found', 'Trainer profile not found.');
    }
    if (existing.version !== input.version) {
      throw new DomainError('precondition_failed', 'Trainer profile was modified by another process.');
    }
    validateEffectiveDateRange(existing.effectiveStartDate, existing.effectiveEndDate);

    const row = await this.prisma.trainerProfile.update({
      where: { id: trainerId },
      data: {
        status: input.toStatus,
        effectiveStartDate: input.effectiveAt,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
      include: trainerSelect(),
    });
    return mapTrainerProfile(row);
  }

  async listQualifications(trainerId: string, query: ListQuery) {
    assertQueryPage(query);
    const where = { trainerId, isDeleted: false };
    const [items, total] = await Promise.all([
      this.prisma.trainerQualification.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { trainer: { select: { id: true, branchId: true } } },
      }),
      this.prisma.trainerQualification.count({ where }),
    ]);
    return { items: items.map(mapQualification), total };
  }

  async createQualification(trainerId: string, input: Omit<TrainerQualificationRecord, 'id' | 'trainerId' | 'version' | 'isDeleted' | 'createdAt'>): Promise<TrainerQualificationRecord> {
    validateEffectiveDateRange(input.effectiveStartDate, input.effectiveEndDate);
    const row = await this.prisma.trainerQualification.create({
      data: {
        trainerId,
        qualificationName: input.qualificationName,
        institution: input.institution,
        yearCompleted: input.yearCompleted,
        documentId: input.documentId,
        status: input.status,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: input.effectiveEndDate,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedBy: input.deletedBy ?? null,
        deletedAt: input.deletedAt ?? null,
        isDeleted: false,
      },
      include: { trainer: { select: { id: true, branchId: true } } },
    }) as QualificationRow;
    return mapQualification(row);
  }

  async updateQualification(trainerId: string, qualificationId: string, input: Partial<TrainerQualificationRecord> & { version: number }): Promise<TrainerQualificationRecord> {
    const existing = await this.prisma.trainerQualification.findFirst({ where: { id: qualificationId, trainerId, isDeleted: false } });
    if (!existing) throw new DomainError('not_found', 'Qualification not found.');
    if (existing.version !== input.version) throw new DomainError('precondition_failed', 'Qualification was modified by another process.');

    validateEffectiveDateRange(input.effectiveStartDate ?? existing.effectiveStartDate, input.effectiveEndDate ?? existing.effectiveEndDate);

    const row = await this.prisma.trainerQualification.update({
      where: { id: qualificationId },
      data: {
        ...(input.qualificationName ? { qualificationName: input.qualificationName } : {}),
        ...(input.institution ? { institution: input.institution } : {}),
        ...(input.yearCompleted ? { yearCompleted: input.yearCompleted } : {}),
        ...(input.documentId !== undefined ? { documentId: input.documentId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.effectiveStartDate ? { effectiveStartDate: input.effectiveStartDate } : {}),
        ...(input.effectiveEndDate !== undefined ? { effectiveEndDate: input.effectiveEndDate } : {}),
        ...(input.deletedAt !== undefined ? { deletedAt: input.deletedAt } : {}),
        ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy } : {}),
        ...(input.isDeleted !== undefined ? { isDeleted: input.isDeleted } : {}),
        updatedAt: new Date(),
        version: { increment: 1 },
      },
      include: { trainer: { select: { id: true, branchId: true } } },
    });
    return mapQualification(row);
  }

  async deleteQualification(trainerId: string, qualificationId: string, reason: string, version: number): Promise<void> {
    const existing = await this.prisma.trainerQualification.findFirst({ where: { id: qualificationId, trainerId, isDeleted: false } });
    if (!existing) throw new DomainError('not_found', 'Qualification not found.');
    if (existing.version !== version) throw new DomainError('precondition_failed', 'Qualification was modified by another process.');
    await this.prisma.trainerQualification.update({
      where: { id: qualificationId },
      data: {
        status: 'Inactive',
        isDeleted: true,
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async listAvailability(trainerId: string, query: ListQuery) {
    assertQueryPage(query);
    const where = { trainerId, isDeleted: false };
    const [items, total] = await Promise.all([
      this.prisma.trainerAvailability.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { dayOfWeek: 'asc' },
        include: { trainer: { select: { id: true, branchId: true } } },
      }),
      this.prisma.trainerAvailability.count({ where }),
    ]);
    return { items: items.map(mapAvailability), total };
  }

  async createAvailability(trainerId: string, input: Omit<TrainerAvailabilityRecord, 'id' | 'trainerId' | 'version' | 'isDeleted' | 'createdAt'>): Promise<TrainerAvailabilityRecord> {
    validateTimeOrder(input.startTime, input.endTime);
    validateEffectiveDateRange(input.effectiveStartDate, input.effectiveEndDate);

    const overlap = await this.prisma.trainerAvailability.findFirst({
      where: {
        trainerId,
        branchId: input.branchId,
        dayOfWeek: input.dayOfWeek,
        isDeleted: false,
        status: 'Active',
        effectiveStartDate: { lte: input.effectiveEndDate ?? input.effectiveStartDate },
        OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: input.effectiveStartDate } }],
      },
    });
    if (overlap && overlaps(overlap.startTime, overlap.endTime, input.startTime, input.endTime)) {
      throw new DomainError('conflict', 'Trainer availability overlaps an existing window.');
    }

    const row = await this.prisma.trainerAvailability.create({
      data: {
        trainerId,
        branchId: input.branchId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        status: input.status,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: input.effectiveEndDate,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedBy: input.deletedBy ?? null,
        deletedAt: input.deletedAt ?? null,
        isDeleted: false,
      },
      include: { trainer: { select: { id: true, branchId: true } } },
    }) as AvailabilityRow;
    return mapAvailability(row);
  }

  async updateAvailability(trainerId: string, availabilityId: string, input: Partial<TrainerAvailabilityRecord> & { version: number }): Promise<TrainerAvailabilityRecord> {
    const existing = await this.prisma.trainerAvailability.findFirst({ where: { id: availabilityId, trainerId, isDeleted: false } });
    if (!existing) throw new DomainError('not_found', 'Availability not found.');
    if (existing.version !== input.version) throw new DomainError('precondition_failed', 'Availability was modified by another process.');

    const startTime = input.startTime ?? existing.startTime;
    const endTime = input.endTime ?? existing.endTime;
    validateTimeOrder(startTime, endTime);
    validateEffectiveDateRange(input.effectiveStartDate ?? existing.effectiveStartDate, input.effectiveEndDate ?? existing.effectiveEndDate);

    const row = await this.prisma.trainerAvailability.update({
      where: { id: availabilityId },
      data: {
        ...(input.branchId ? { branchId: input.branchId } : {}),
        ...(input.dayOfWeek ? { dayOfWeek: input.dayOfWeek } : {}),
        ...(input.startTime ? { startTime: input.startTime } : {}),
        ...(input.endTime ? { endTime: input.endTime } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.effectiveStartDate ? { effectiveStartDate: input.effectiveStartDate } : {}),
        ...(input.effectiveEndDate !== undefined ? { effectiveEndDate: input.effectiveEndDate } : {}),
        ...(input.deletedAt !== undefined ? { deletedAt: input.deletedAt } : {}),
        ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy } : {}),
        ...(input.isDeleted !== undefined ? { isDeleted: input.isDeleted } : {}),
        updatedAt: new Date(),
        version: { increment: 1 },
      },
      include: { trainer: { select: { id: true, branchId: true } } },
    });
    return mapAvailability(row);
  }

  async deleteAvailability(trainerId: string, availabilityId: string, reason: string, version: number): Promise<void> {
    const existing = await this.prisma.trainerAvailability.findFirst({ where: { id: availabilityId, trainerId, isDeleted: false } });
    if (!existing) throw new DomainError('not_found', 'Availability not found.');
    if (existing.version !== version) throw new DomainError('precondition_failed', 'Availability was modified by another process.');
    await this.prisma.trainerAvailability.update({
      where: { id: availabilityId },
      data: {
        status: 'Inactive',
        isDeleted: true,
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async validateAvailability(trainerId: string, branchId: string, date: Date, startTime: string, endTime: string) {
    validateTimeOrder(startTime, endTime);
    const trainer = await this.prisma.trainerProfile.findFirst({
      where: { id: trainerId, branchId, isDeleted: false, status: 'Active' },
      select: { id: true, effectiveStartDate: true, effectiveEndDate: true },
    });
    if (!trainer || !isEffectiveOn(trainer.effectiveStartDate, trainer.effectiveEndDate, date)) {
      return { available: false };
    }

    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()] as AvailabilityDay;
    const availability = await this.prisma.trainerAvailability.findFirst({
      where: {
        trainerId,
        branchId,
        dayOfWeek,
        isDeleted: false,
        status: 'Active',
        effectiveStartDate: { lte: date },
        OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: date } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!availability || !overlaps(availability.startTime, availability.endTime, startTime, endTime)) {
      return { available: false };
    }

    const conflictingSession = await this.prisma.session.findFirst({
      where: {
        trainerId,
        isDeleted: false,
        status: { in: ['Scheduled', 'Completed', 'Rescheduled'] },
        sessionDate: date,
        OR: [
          {
            AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
          },
        ],
      },
      select: { id: true },
    });

    if (conflictingSession) {
      return { available: false };
    }

    return { available: true, availabilityId: availability.id as Uuid };
  }

  async listAuthorizations(trainerId: string, query: ListQuery) {
    assertQueryPage(query);
    const where = { trainerId, isDeleted: false };
    const [items, total] = await Promise.all([
      this.prisma.trainerCourseAuthorization.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { course: true },
      }),
      this.prisma.trainerCourseAuthorization.count({ where }),
    ]);
    return { items: items.map(mapAuthorization), total };
  }

  async createAuthorization(trainerId: string, input: Omit<TrainerAuthorizationRecord, 'id' | 'trainerId' | 'version' | 'isDeleted' | 'createdAt'>): Promise<TrainerAuthorizationRecord> {
    validateEffectiveDateRange(input.effectiveStartDate, input.effectiveEndDate);
    const row = await this.prisma.trainerCourseAuthorization.create({
      data: {
        trainerId,
        courseId: input.courseId,
        status: input.status,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: input.effectiveEndDate,
        reason: input.reason,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedBy: input.deletedBy ?? null,
        deletedAt: input.deletedAt ?? null,
        isDeleted: false,
      },
      include: { course: true },
    }) as AuthorizationRow;
    return mapAuthorization(row);
  }

  async transitionAuthorization(trainerId: string, authorizationId: string, input: { toStatus: AuthorizationStatus; effectiveAt: Date; reason: string; version: number }): Promise<TrainerAuthorizationRecord> {
    const existing = await this.prisma.trainerCourseAuthorization.findFirst({ where: { id: authorizationId, trainerId, isDeleted: false } });
    if (!existing) throw new DomainError('not_found', 'Authorization not found.');
    if (existing.version !== input.version) throw new DomainError('precondition_failed', 'Authorization was modified by another process.');
    const row = await this.prisma.trainerCourseAuthorization.update({
      where: { id: authorizationId },
      data: {
        status: input.toStatus,
        effectiveStartDate: input.effectiveAt,
        reason: input.reason,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
      include: { course: true },
    });
    return mapAuthorization(row);
  }

  async listCompensationRates(trainerId: string, query: ListQuery) {
    assertQueryPage(query);
    const where = { trainerId, isDeleted: false };
    const [items, total] = await Promise.all([
      this.prisma.trainerCompensationRate.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ effectiveStartDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          batch: {
            select: {
              id: true,
              batchCode: true,
              branchId: true,
              courseId: true,
              startDate: true,
              endDate: true,
              status: true,
            },
          },
          session: {
            select: {
              id: true,
              batchId: true,
              sessionNumber: true,
              sessionDate: true,
              startTime: true,
              endTime: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.trainerCompensationRate.count({ where }),
    ]);
    return { items: items.map(mapCompensation), total };
  }

  async createCompensationRate(trainerId: string, input: Omit<TrainerCompensationRateRecord, 'id' | 'trainerId' | 'version' | 'isDeleted' | 'createdAt'>): Promise<TrainerCompensationRateRecord> {
    validateEffectiveDateRange(input.effectiveStartDate, input.effectiveEndDate);
    const row = await this.prisma.trainerCompensationRate.create({
      data: {
        trainerId,
        batchId: input.batchId,
        sessionId: input.sessionId,
        paymentBasis: input.paymentBasis,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        status: input.status,
        remarks: input.remarks,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: input.effectiveEndDate,
        createdBy: input.createdBy ?? null,
        updatedBy: input.updatedBy ?? null,
        deletedBy: input.deletedBy ?? null,
        deletedAt: input.deletedAt ?? null,
        isDeleted: false,
      },
      include: {
        batch: {
          select: {
            id: true,
            batchCode: true,
            branchId: true,
            courseId: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        session: {
          select: {
            id: true,
            batchId: true,
            sessionNumber: true,
            sessionDate: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
      },
    }) as CompensationRow;
    return mapCompensation(row);
  }

  async updateCompensationRate(trainerId: string, rateId: string, input: Partial<TrainerCompensationRateRecord> & { version: number }): Promise<TrainerCompensationRateRecord> {
    const existing = await this.prisma.trainerCompensationRate.findFirst({ where: { id: rateId, trainerId, isDeleted: false } });
    if (!existing) throw new DomainError('not_found', 'Compensation rate not found.');
    if (existing.version !== input.version) throw new DomainError('precondition_failed', 'Compensation rate was modified by another process.');

    validateEffectiveDateRange(input.effectiveStartDate ?? existing.effectiveStartDate, input.effectiveEndDate ?? existing.effectiveEndDate);

    const row = await this.prisma.trainerCompensationRate.update({
      where: { id: rateId },
      data: {
        ...(input.batchId !== undefined ? { batchId: input.batchId } : {}),
        ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
        ...(input.paymentBasis ? { paymentBasis: input.paymentBasis } : {}),
        ...(input.amount !== undefined ? { amount: new Prisma.Decimal(input.amount) } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
        ...(input.effectiveStartDate ? { effectiveStartDate: input.effectiveStartDate } : {}),
        ...(input.effectiveEndDate !== undefined ? { effectiveEndDate: input.effectiveEndDate } : {}),
        ...(input.deletedAt !== undefined ? { deletedAt: input.deletedAt } : {}),
        ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy } : {}),
        ...(input.isDeleted !== undefined ? { isDeleted: input.isDeleted } : {}),
        updatedAt: new Date(),
        version: { increment: 1 },
      },
      include: {
        batch: {
          select: {
            id: true,
            batchCode: true,
            branchId: true,
            courseId: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        session: {
          select: {
            id: true,
            batchId: true,
            sessionNumber: true,
            sessionDate: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
      },
    });
    return mapCompensation(row);
  }

  async resolveCompensationRate(input: { trainerId: string; paymentBasis: CompensationBasis; effectiveOn: Date; batchId?: string; sessionId?: string }) {
    const candidates = await this.prisma.trainerCompensationRate.findMany({
      where: {
        trainerId: input.trainerId,
        paymentBasis: input.paymentBasis,
        isDeleted: false,
        status: 'Active',
        effectiveStartDate: { lte: input.effectiveOn },
        OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: input.effectiveOn } }],
      },
      orderBy: [{ effectiveStartDate: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      include: {
        batch: {
          select: {
            id: true,
            batchCode: true,
            branchId: true,
            courseId: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        session: {
          select: {
            id: true,
            batchId: true,
            sessionNumber: true,
            sessionDate: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
      },
    });

    const exact =
      candidates.find((rate) => input.sessionId && rate.sessionId === input.sessionId) ??
      candidates.find((rate) => input.batchId && rate.batchId === input.batchId) ??
      candidates.find((rate) => !rate.sessionId && !rate.batchId) ??
      candidates[0];
    return exact ? mapCompensation(exact) : null;
  }

  async listAssignmentReferences(trainerId: string, query: ListQuery & { kind?: 'Batch' | 'Session' | 'All' }) {
    assertQueryPage(query);
    const batchAssignments = await this.prisma.batchTrainer.findMany({
      where: { trainerId, isDeleted: false },
      include: {
        batch: {
          include: { course: true },
        },
      },
      orderBy: { assignedFrom: 'desc' },
    });
    const sessionAssignments = await this.prisma.session.findMany({
      where: { trainerId, isDeleted: false },
      include: {
        batch: {
          include: { course: true },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    const items: TrainerAssignmentReferenceRecord[] = [
      ...(query.kind === 'Session'
        ? []
        : batchAssignments.map((assignment) => ({
            kind: 'Batch' as const,
            referenceId: assignment.batchId,
            code: assignment.batch.batchCode,
            courseCode: assignment.batch.course.courseCode,
            branchId: assignment.batch.branchId,
            startDate: assignment.assignedFrom,
            endDate: assignment.assignedTo,
            status: assignment.status,
          }))),
      ...(query.kind === 'Batch'
        ? []
        : sessionAssignments.map((session) => ({
            kind: 'Session' as const,
            referenceId: session.id,
            code: `${session.batch.batchCode}-${session.sessionNumber}`,
            courseCode: session.batch.course.courseCode,
            branchId: session.batch.branchId,
            startDate: session.sessionDate,
            endDate: session.sessionDate,
            status: session.status,
          }))),
    ];

    const filtered = items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    return { items: filtered, total: items.length };
  }

  async listReports(reportCode: string, filters: Record<string, unknown>, query: ListQuery) {
    assertQueryPage(query);
    const where: Prisma.TrainerProfileWhereInput = {
      isDeleted: false,
      ...(typeof filters.branchId === 'string' ? { branchId: filters.branchId } : {}),
      ...(typeof filters.trainerType === 'string' ? { trainerType: filters.trainerType } : {}),
      ...(typeof filters.status === 'string' ? { status: filters.status } : {}),
    };

    const trainers = await this.prisma.trainerProfile.findMany({
      where,
      include: {
        branch: true,
        person: true,
        authorizations: { where: { isDeleted: false } },
        availability: { where: { isDeleted: false } },
        compensationRates: { where: { isDeleted: false } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows: TrainerReportRow[] = trainers.map((trainer) => ({
      reportCode,
      trainerId: trainer.id as Uuid,
      trainerCode: trainer.trainerCode,
      displayNameEn: `${trainer.person.firstName} ${trainer.person.lastName}`.trim(),
      displayNameAr: null,
      branchId: trainer.branchId as Uuid,
      branchCode: trainer.branch.branchCode,
      branchName: trainer.branch.branchName,
      trainerType: TrainerTypeSchema.parse(trainer.trainerType),
      status: TrainerStatusSchema.parse(trainer.status),
      effectiveStartDate: trainer.effectiveStartDate,
      effectiveEndDate: trainer.effectiveEndDate,
      authorizationCount: trainer.authorizations.length,
      availabilityCount: trainer.availability.length,
      assignmentCount: 0,
      utilizationPct: reportCode === 'trainer.utilization.reference' ? 0 : null,
      compensationConfigured: trainer.compensationRates.length > 0,
    }));

    const slice = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    return { items: slice, total: rows.length };
  }

  async listAuditHistory(trainerId: string, query: ListQuery & { action?: string; entityType?: string; fromDate?: Date; toDate?: Date }) {
    assertQueryPage(query);
    const where: Prisma.AuditLogWhereInput = {
      OR: [{ entityId: trainerId }, { entityType: 'TrainerProfile', entityId: trainerId }],
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.fromDate || query.toDate
        ? {
            performedAt: {
              ...(query.fromDate ? { gte: query.fromDate } : {}),
              ...(query.toDate ? { lte: query.toDate } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { performedAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }

  async findEligibleTrainers(input: { courseId: string; branchId: string; targetDate: Date; startTime?: string; endTime?: string; trainerType?: TrainerType; q?: string }, query: ListQuery) {
    assertQueryPage(query);
    const trainers = await this.prisma.trainerProfile.findMany({
      where: {
        branchId: input.branchId,
        isDeleted: false,
        status: 'Active',
        ...(input.trainerType ? { trainerType: input.trainerType } : {}),
        ...(input.q
          ? {
              OR: [
                { trainerCode: { contains: input.q, mode: 'insensitive' } },
                { specialization: { contains: input.q, mode: 'insensitive' } },
                { person: { firstName: { contains: input.q, mode: 'insensitive' } } },
                { person: { lastName: { contains: input.q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        person: true,
        branch: true,
        authorizations: {
          where: {
            courseId: input.courseId,
            isDeleted: false,
            status: 'Active',
            effectiveStartDate: { lte: input.targetDate },
            OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: input.targetDate } }],
          },
        },
        availability: {
          where: {
            branchId: input.branchId,
            isDeleted: false,
            status: 'Active',
            effectiveStartDate: { lte: input.targetDate },
            OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: input.targetDate } }],
          },
        },
      },
    });

    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][input.targetDate.getDay()];
    const results: Array<TrainerEligibilityResult & { trainerId: string; trainerCode: string; displayName: { en: string; ar?: string | null }; trainerType?: string; branchName?: string; status?: string }> = [];

    for (const trainer of trainers) {
      const authorization = trainer.authorizations[0];
      const availability = trainer.availability.find((slot) => slot.dayOfWeek === dayOfWeek && (!input.startTime || !input.endTime || overlaps(slot.startTime, slot.endTime, input.startTime, input.endTime)));
      results.push({
        trainerId: trainer.id,
        trainerCode: trainer.trainerCode,
        displayName: { en: `${trainer.person.firstName} ${trainer.person.lastName}`.trim(), ar: null },
        trainerType: trainer.trainerType,
        branchName: trainer.branch?.branchName,
        status: trainer.status,
        eligible: Boolean(authorization && availability),
        reasonCodes: authorization && availability ? [] : [
          !authorization ? 'COURSE_NOT_AUTHORIZED' : 'TRAINER_NOT_AVAILABLE',
        ],
        authorizationId: authorization?.id,
        availabilityId: availability?.id,
        schedulingConflictCheckRequired: Boolean(input.startTime && input.endTime),
      });
    }

    const slice = results.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    return { items: slice, total: results.length };
  }
}
