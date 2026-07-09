import { PrismaClient, Prisma } from '@prisma/client';
import { IBatchRepository } from '../domain/repositories';
import { BatchAggregate, Batch, BATCH_STATUSES } from '../domain/batch';
import {
  DuplicateBatchCode,
  InvalidDateRange,
  BatchNoTrainer,
  InvalidStateTransition,
  PrimaryTrainerAlreadyAssigned,
  TrainerScheduleConflict,
  CourseNotPublished,
  ScheduleConflict,
  TrainerBranchMismatch,
} from '../domain/errors';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';

const CODE_REGEX = /^[A-Z0-9-]{3,20}$/;

export interface EnqueueWaitlistInput {
  batchId: string;
  studentProfileId?: string | null;
  leadId?: string | null;
  enrollmentId?: string | null;
  actorId?: string;
}

export interface CreateBatchInput extends Omit<Prisma.BatchUncheckedCreateInput, 'batchCode'> {
  batchCode?: string;
  primaryTrainerId?: string | null;
}

export interface UpdateBatchInput extends Prisma.BatchUncheckedUpdateInput {
  allowOverbooking?: boolean;
  capacity?: number;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface SessionConflict {
  sessionDate: string;
  startTime: string;
  endTime: string;
  batchCode: string;
  sessionNumber?: number;
}

export interface FacultyEligibilityResult {
  trainerId: string;
  trainerCode: string;
  displayName: {
    en: string;
    ar?: string | null;
  };
  trainerType: string;
  branchName?: string;
  status: string;
  eligible: boolean;
  isAssignable: boolean;
  alreadyAssigned: boolean;
  reasonCodes: string[];
  reasons: string[];
  sessionConflicts?: SessionConflict[];
  assignment?: {
    role: string;
    assignedFrom: string;
    assignedTo: string;
  } | null;
}

type BatchLockRow = Batch & {
  startDate: string | Date;
  endDate: string | Date;
  createdAt: string | Date;
};

type BatchBranchRow = {
  instituteId: string;
};

export interface ISchedulingService {
  getSessionsForTrainer(
    trainerId: string,
    start: Date,
    end: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<
    {
      sessionDate: Date;
      startTime: string;
      endTime: string;
      batchCode: string;
    }[]
  >;
  validateSession(
    input: {
      branchId: string;
      instituteId: string;
      scheduledDate: Date;
      startTime: string;
      endTime: string;
      trainerId?: string | null;
      classroomId?: string | null;
      batchId?: string | null;
      sessionId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{
    isValid: boolean;
    conflicts: { type: string; message: string; severity: string }[];
  }>;
}

export function getGSTDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Muscat', // Asia/Muscat is UTC+4
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export class BatchService {
  constructor(
    private readonly prisma: PrismaClient,
    public readonly batchRepository: IBatchRepository,
    private readonly schedulingService?: ISchedulingService,
  ) {}

  private async resolveInstituteId(
    branchId: string,
    client: Prisma.TransactionClient,
  ): Promise<string> {
    const branch = await client.branch.findUnique({
      where: { id: branchId, isDeleted: false },
      select: { instituteId: true },
    });

    if (!branch) {
      throw new Error('ERR_CRS_BRANCH_NOT_FOUND');
    }

    return (branch as BatchBranchRow).instituteId;
  }

  async createBatch(
    input: CreateBatchInput,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      // Check Course exists and is Published first
      const course = await client.course.findUnique({
        where: { id: input.courseId, isDeleted: false },
      });
      if (!course) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }
      if (course.status !== 'Published') {
        throw new CourseNotPublished();
      }

      let finalBatchCode = input.batchCode;
      if (!finalBatchCode || finalBatchCode.trim() === '') {
        const courseCode = course.courseCode.toUpperCase();
        // Count existing batches for this course to generate next sequence suffix
        const count = await client.batch.count({
          where: { courseId: input.courseId },
        });
        const serial = (count + 1).toString().padStart(3, '0');
        finalBatchCode = `${courseCode}-${serial}`;
      }

      // Validate code format
      if (!CODE_REGEX.test(finalBatchCode)) {
        throw new Error('ERR_CRS_INVALID_CODE_FORMAT');
      }

      // Check unique code
      const existing = await this.batchRepository.findByCode(
        finalBatchCode,
        client,
      );
      if (existing) {
        throw new DuplicateBatchCode();
      }

      // Check user branch access scoping
      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: {
            userId: actorId,
            branchId: input.branchId,
            status: 'Active',
          },
        });
        if (!hasAccess) {
          // If not directly scoped, verify if they have global consolidated visibility
          const userRoles = await client.userRole.findMany({
            where: { userId: actorId },
            include: { role: true },
          });
          const isSuperAdmin = userRoles.some(
            (ur) =>
              ur.role.roleCode === 'SUPER_ADMIN' ||
              ur.role.roleCode === 'OWNER',
          );
          if (!isSuperAdmin) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      // Verify date range chronologically
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      if (endDate < startDate) {
        throw new InvalidDateRange(
          'Batch end date must be greater than or equal to start date.',
        );
      }

      // Check dates within parent course effective range
      const courseStart = new Date(course.effectiveStartDate);
      if (startDate < courseStart) {
        throw new InvalidDateRange(
          'Batch start date cannot be before course effective start date.',
        );
      }
      if (course.effectiveEndDate) {
        const courseEnd = new Date(course.effectiveEndDate);
        if (endDate > courseEnd) {
          throw new InvalidDateRange(
            'Batch end date cannot exceed course effective end date.',
          );
        }
      }

      // Classroom validation
      const classroomId =
        typeof input.classroomId === 'string' ? input.classroomId : null;
      if (classroomId) {
        const classroom = await client.classroom.findFirst({
          where: { id: classroomId, isDeleted: false, status: 'Active' },
        });
        if (!classroom) {
          throw new Error('ERR_CRS_CLASSROOM_NOT_FOUND');
        }
      }

      // Corporate client validation
      const corporateAccountId =
        typeof input.corporateAccountId === 'string'
          ? input.corporateAccountId
          : null;
      if (corporateAccountId) {
        const UUID_REGEX =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(corporateAccountId)) {
          throw new Error('ERR_CRS_INVALID_CORPORATE_ACCOUNT');
        }
      }

      const { primaryTrainerId, ...batchInput } = input;
      const id = createUuid(randomUUID());
      const batch = await this.batchRepository.create(
        {
          ...batchInput,
          batchCode: finalBatchCode,
          id,
          status: BATCH_STATUSES.DRAFT,
          currentEnrollmentCount: 0,
          createdBy: actorId,
        },
        client,
      );

      if (primaryTrainerId) {
        await this.assignTrainer(
          batch.id,
          {
            trainerId: primaryTrainerId,
            batchId: batch.id,
            role: 'Primary',
            assignedFrom: batch.startDate,
            assignedTo: batch.endDate,
          },
          actorId,
          client,
        );
      }

      // Audit log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Batch',
          entityId: batch.id,
          action: 'Create',
          newValue: { ...batch },
        },
      });

      // Outbox Event
      await client.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'BatchCreated',
          aggregateType: 'Batch',
          aggregateId: batch.id,
          payload: {
            batchId: batch.id,
            batchCode: batch.batchCode,
            courseId: batch.courseId,
            branchId: batch.branchId,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      return batch;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async updateBatch(
    id: string,
    input: UpdateBatchInput,
    version: number,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const existing = await this.batchRepository.findById(id, client);
      if (!existing) {
        throw new Error('ERR_CRS_BATCH_NOT_FOUND');
      }

      if (existing.version !== version) {
        throw new Error('ERR_CRS_CONCURRENCY_VIOLATION');
      }

      // Scoping check
      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: {
            userId: actorId,
            branchId: existing.branchId,
            status: 'Active',
          },
        });
        if (!hasAccess) {
          const userRoles = await client.userRole.findMany({
            where: { userId: actorId },
            include: { role: true },
          });
          const isSuperAdmin = userRoles.some(
            (ur) =>
              ur.role.roleCode === 'SUPER_ADMIN' ||
              ur.role.roleCode === 'OWNER',
          );
          if (!isSuperAdmin) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      // Check capacity bounds
      if (input.capacity !== undefined) {
        const newCapacity = Number(input.capacity);
        if (
          newCapacity < existing.currentEnrollmentCount &&
          !(input.allowOverbooking || existing.allowOverbooking)
        ) {
          throw new Error('ERR_CRS_CAPACITY_UNDER_ENROLLMENT');
        }
      }

      // Check date bounds if active
      if (input.startDate || input.endDate) {
        const status = existing.status;
        if (
          status === BATCH_STATUSES.IN_PROGRESS ||
          status === BATCH_STATUSES.COMPLETED ||
          status === BATCH_STATUSES.CANCELLED
        ) {
          throw new Error('ERR_CRS_ACTIVE_BATCH_DATES_LOCKED');
        }
      }

      // Verify date range chronologically
      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(existing.startDate);
      const endDate = input.endDate
        ? new Date(input.endDate)
        : new Date(existing.endDate);
      if (endDate < startDate) {
        throw new InvalidDateRange(
          'Batch end date must be greater than or equal to start date.',
        );
      }

      // Classroom validation
      const classroomId =
        typeof input.classroomId === 'string' ? input.classroomId : null;
      if (classroomId) {
        const classroom = await client.classroom.findFirst({
          where: { id: classroomId, isDeleted: false, status: 'Active' },
        });
        if (!classroom) {
          throw new Error('ERR_CRS_CLASSROOM_NOT_FOUND');
        }
      }

      // Corporate client validation
      if (input.corporateAccountId) {
        const corporateAccountId =
          typeof input.corporateAccountId === 'string'
            ? input.corporateAccountId
            : null;
        const UUID_REGEX =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(corporateAccountId || '')) {
          throw new Error('ERR_CRS_INVALID_CORPORATE_ACCOUNT');
        }
      }

      const updated = await this.batchRepository.update(
        id,
        input,
        version,
        client,
      );

      // Capacity increase hook
      if (input.capacity !== undefined && existing.waitingListEnabled) {
        const oldCapacity = existing.capacity;
        const newCapacity = Number(input.capacity);
        if (newCapacity > oldCapacity) {
          const addedSeats = newCapacity - oldCapacity;
          const activeWaitlist = await this.batchRepository.findActiveWaitlist(
            id,
            client,
          );
          if (activeWaitlist.length > 0) {
            const promoteCount = Math.min(addedSeats, activeWaitlist.length);

            // Promote candidates FIFO
            for (let i = 0; i < promoteCount; i++) {
              const candidate = activeWaitlist[i];
              const promoCorrelationId = createUuid(randomUUID());
              await this.batchRepository.updateWaitlistEntry(
                candidate.id,
                {
                  status: 'Promoted',
                  promotionCorrelationId: promoCorrelationId,
                  queuePosition: 0,
                },
                client,
              );

              // Emit event
              await client.outboxEvent.create({
                data: {
                  id: createUuid(randomUUID()),
                  eventType: 'WaitlistEntryPromoted',
                  aggregateType: 'Batch',
                  aggregateId: id,
                  payload: {
                    batchId: id,
                    studentProfileId: candidate.studentProfileId,
                    leadId: candidate.leadId,
                    enrollmentId: candidate.enrollmentId,
                    promotionCorrelationId: promoCorrelationId,
                  },
                  status: 'Pending',
                  availableAt: new Date(),
                },
              });
            }

            // Shift remaining candidate positions
            for (let i = promoteCount; i < activeWaitlist.length; i++) {
              const remaining = activeWaitlist[i];
              await this.batchRepository.updateWaitlistEntry(
                remaining.id,
                {
                  queuePosition: remaining.queuePosition - promoteCount,
                },
                client,
              );
            }

            // Update batch enrollment count with latest version
            await this.batchRepository.update(
              id,
              {
                currentEnrollmentCount:
                  updated.currentEnrollmentCount + promoteCount,
              },
              updated.version,
              client,
            );
          }
        }
      }

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Batch',
          entityId: id,
          action: 'Update',
          oldValue: { ...existing },
          newValue: { ...updated },
        },
      });

      return updated;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async transitionBatchStatus(
    id: string,
    targetStatus: string,
    version: number,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.batchRepository.findById(id, client);
      if (!batch) {
        throw new Error('ERR_CRS_BATCH_NOT_FOUND');
      }

      if (batch.version !== version) {
        throw new Error('ERR_CRS_CONCURRENCY_VIOLATION');
      }

      // Scoping Check
      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: {
            userId: actorId,
            branchId: batch.branchId,
            status: 'Active',
          },
        });
        if (!hasAccess) {
          const userRoles = await client.userRole.findMany({
            where: { userId: actorId },
            include: { role: true },
          });
          const isSuperAdmin = userRoles.some(
            (ur) =>
              ur.role.roleCode === 'SUPER_ADMIN' ||
              ur.role.roleCode === 'OWNER',
          );
          if (!isSuperAdmin) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      const aggregate = new BatchAggregate(batch);

      // Fetch context info
      const primaryTrainer = await this.batchRepository.findPrimaryTrainer(
        id,
        client,
      );
      const sessions = await this.batchRepository.findSessions(id, client);

      const trainers = (await this.batchRepository.findTrainers(id, client)) || [];

      const now = new Date();
      const allSessionsPast = sessions.every((s) => {
        // Simple past checks
        return new Date(s.sessionDate) < now;
      });

      aggregate.validateTransition(targetStatus, {
        primaryTrainerExists: !!primaryTrainer,
        allSessionsPast,
        currentDate: now,
        sessionsCount: sessions.length,
        trainersCount: trainers.length,
      });

      const updated = await this.batchRepository.update(
        id,
        { status: targetStatus },
        version,
        client,
      );

      // Cascades and Event publish
      if (targetStatus === BATCH_STATUSES.CANCELLED) {
        // Cascade session cancellation
        await client.session.updateMany({
          where: { batchId: id, isDeleted: false },
          data: {
            status: 'Cancelled',
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: actorId || null,
          },
        });
        // Release trainer assignments
        await client.batchTrainer.updateMany({
          where: { batchId: id, isDeleted: false },
          data: {
            status: 'Inactive',
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: actorId || null,
          },
        });

        // Publish Outbox Event
        await client.outboxEvent.create({
          data: {
            id: createUuid(randomUUID()),
            eventType: 'BatchCancelled',
            aggregateType: 'Batch',
            aggregateId: id,
            payload: { batchId: id, batchCode: batch.batchCode },
            status: 'Pending',
            availableAt: new Date(),
          },
        });
      } else if (targetStatus === BATCH_STATUSES.COMPLETED) {
        await client.outboxEvent.create({
          data: {
            id: createUuid(randomUUID()),
            eventType: 'BatchCompleted',
            aggregateType: 'Batch',
            aggregateId: id,
            payload: { batchId: id, batchCode: batch.batchCode },
            status: 'Pending',
            availableAt: new Date(),
          },
        });
      }

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Batch',
          entityId: id,
          action: 'StatusTransition',
          oldValue: { status: batch.status },
          newValue: { status: targetStatus },
        },
      });

      return updated;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async assignTrainer(
    batchId: string,
    input: Prisma.BatchTrainerUncheckedCreateInput,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.batchRepository.findById(batchId, client);
      if (!batch) {
        throw new Error('ERR_CRS_BATCH_NOT_FOUND');
      }

      // Validate role type
      const ALLOWED_ROLES = ['Primary', 'Assistant', 'Observer'];
      if (!input.role || !ALLOWED_ROLES.includes(input.role)) {
        throw new Error('ERR_CRS_INVALID_TRAINER_ROLE');
      }

      // Verify trainer is active and has the TRAINER role
      const trainer = await client.user.findUnique({
        where: { id: input.trainerId, isDeleted: false },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!trainer || trainer.status !== 'Active') {
        throw new Error('ERR_CRS_TRAINER_NOT_ACTIVE');
      }

      const hasTrainerRole = trainer.roles.some(
        (ur) => ur.role.roleCode === 'TRAINER',
      );
      if (!hasTrainerRole) {
        throw new Error('ERR_CRS_INVALID_TRAINER_PROFILE');
      }

      // Verify trainer's branch matches the batch's branch
      const trainerProfile = await client.trainerProfile.findFirst({
        where: { personId: trainer.personId, isDeleted: false },
      });
      if (!trainerProfile) {
        throw new Error('ERR_CRS_INVALID_TRAINER_PROFILE');
      }
      if (trainerProfile.branchId !== batch.branchId) {
        throw new TrainerBranchMismatch();
      }

      // Enforce batch.delivery.assign permission and active branch authorization
      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: {
            userId: actorId,
            branchId: batch.branchId,
            status: 'Active',
          },
        });
        const isAuthorized = !!hasAccess;

        const userRoles = await client.userRole.findMany({
          where: { userId: actorId },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        const isSuperAdmin = userRoles.some(
          (ur) =>
            ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER',
        );

        if (!isSuperAdmin) {
          const permissions = userRoles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.permissionCode),
          );
          const hasPermission = permissions.includes('batch.delivery.assign');
          if (!isAuthorized || !hasPermission) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      // Reject trainer assignment if batch is closed
      if (
        batch.status === BATCH_STATUSES.COMPLETED ||
        batch.status === BATCH_STATUSES.CANCELLED
      ) {
        throw new InvalidStateTransition(
          'Cannot assign trainer to a completed or cancelled batch.',
        );
      }

      // Verify date ranges
      const assignedFrom = new Date(input.assignedFrom);
      const assignedTo = new Date(input.assignedTo);
      if (assignedTo < assignedFrom) {
        throw new InvalidDateRange(
          'Trainer assignment end date must be greater than or equal to start date.',
        );
      }
      if (
        assignedFrom < new Date(batch.startDate) ||
        assignedTo > new Date(batch.endDate)
      ) {
        throw new InvalidDateRange(
          'Assignment date range falls outside the batch bounds.',
        );
      }

      // Role check for existing primary trainer
      if (input.role === 'Primary') {
        const trainers = await this.batchRepository.findTrainers(
          batchId,
          client,
        );
        const hasPrimaryOverlap = trainers.some((t) => {
          return (
            t.role === 'Primary' &&
            t.status === 'Active' &&
            assignedFrom <= new Date(t.assignedTo) &&
            assignedTo >= new Date(t.assignedFrom)
          );
        });
        if (hasPrimaryOverlap) {
          throw new PrimaryTrainerAlreadyAssigned();
        }
      }

      // Intercept schedule conflicts
      if (this.schedulingService) {
        const batchSessions = await this.batchRepository.findSessions(
          batchId,
          client,
        );
        const instituteId = await this.resolveInstituteId(
          batch.branchId,
          client,
        );
        const conflicts: ScheduleConflict[] = [];

        for (const bs of batchSessions) {
          const result = await this.schedulingService.validateSession(
            {
              branchId: batch.branchId,
              instituteId,
              scheduledDate: bs.sessionDate,
              startTime: bs.startTime,
              endTime: bs.endTime,
              trainerId: input.trainerId,
              classroomId: bs.classroomId,
              batchId: batch.id,
              sessionId: bs.id,
            },
            client,
          );

          if (!result.isValid) {
            for (const conflict of result.conflicts) {
              if (
                conflict.type === 'TRAINER_OVERLAP' ||
                conflict.type === 'HOLIDAY' ||
                conflict.type === 'OPERATING_HOURS'
              ) {
                conflicts.push({
                  batchCode: 'Conflict', // The engine should ideally return the conflicting batch code
                  sessionDate: bs.sessionDate,
                  startTime: bs.startTime,
                  endTime: bs.endTime,
                });
              }
            }
          }
        }

        // Session conflicts are non-blocking for assignments
        /*
        if (conflicts.length > 0) {
          throw new TrainerScheduleConflict(
            `Trainer schedule conflict detected by Scheduling Engine`,
            conflicts,
          );
        }
        */
      }

      const id = createUuid(randomUUID());
      const bt = await this.batchRepository.assignTrainer(
        {
          ...input,
          id,
          batchId,
          createdBy: actorId,
        },
        client,
      );

      // Record outbox event to notify calendar
      await client.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'TrainerAssignedToBatch',
          aggregateType: 'Batch',
          aggregateId: batchId,
          payload: {
            batchId,
            trainerId: input.trainerId,
            role: input.role,
            assignedFrom: input.assignedFrom,
            assignedTo: input.assignedTo,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'BatchTrainer',
          entityId: bt.id,
          action: 'AssignTrainer',
          newValue: { ...bt },
        },
      });

      return bt;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async checkTrainerConflicts(
    batchId: string,
    trainerId: string,
    assignedFrom: Date,
    assignedTo: Date,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ScheduleConflict[]> {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.batchRepository.findById(batchId, client);
      if (!batch) {
        throw new Error('ERR_CRS_BATCH_NOT_FOUND');
      }

      // Enforce batch branch authorization for non-superadmins
      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: {
            userId: actorId,
            branchId: batch.branchId,
            status: 'Active',
          },
        });
        const isAuthorized = !!hasAccess;

        const userRoles = await client.userRole.findMany({
          where: { userId: actorId },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        const isSuperAdmin = userRoles.some(
          (ur) =>
            ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER',
        );

        if (!isSuperAdmin) {
          const permissions = userRoles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.permissionCode),
          );
          const hasPermission = permissions.includes('batch.delivery.assign');
          if (!isAuthorized || !hasPermission) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      if (!this.schedulingService) {
        return [];
      }

      const batchSessions = await this.batchRepository.findSessions(
        batchId,
        client,
      );
      const instituteId = await this.resolveInstituteId(batch.branchId, client);
      const conflicts: ScheduleConflict[] = [];

      for (const bs of batchSessions) {
        const result = await this.schedulingService.validateSession(
          {
            branchId: batch.branchId,
            instituteId,
            scheduledDate: bs.sessionDate,
            startTime: bs.startTime,
            endTime: bs.endTime,
            trainerId: trainerId,
            classroomId: bs.classroomId,
            batchId: batch.id,
            sessionId: bs.id,
          },
          client,
        );

        if (!result.isValid) {
          conflicts.push({
            batchCode: 'Conflict',
            sessionDate: bs.sessionDate,
            startTime: bs.startTime,
            endTime: bs.endTime,
          });
        }
      }

      return conflicts;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async getFacultyEligibilityForBatch(
    batchId: string,
    options?: {
      courseId?: string;
      targetDate?: Date;
    },
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FacultyEligibilityResult[]> {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.batchRepository.findById(batchId, client);
      if (!batch) {
        throw new Error('ERR_CRS_BATCH_NOT_FOUND');
      }

      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: {
            userId: actorId,
            branchId: batch.branchId,
            status: 'Active',
          },
        });
        const isAuthorized = !!hasAccess;

        const userRoles = await client.userRole.findMany({
          where: { userId: actorId },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        const isSuperAdmin = userRoles.some(
          (ur) =>
            ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER',
        );

        if (!isSuperAdmin) {
          const permissions = userRoles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.permissionCode),
          );
          const hasPermission = permissions.includes('batch.delivery.assign');
          if (!isAuthorized || !hasPermission) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      const batchSessions = await this.batchRepository.findSessions(batchId, client);
      const targetCourseId = options?.courseId || batch.courseId;

      const trainers = await client.trainerProfile.findMany({
        where: {
          isDeleted: false,
          branchId: batch.branchId,
        },
        include: {
          person: {
            include: {
              user: {
                include: {
                  roles: {
                    include: {
                      role: true,
                    },
                  },
                },
              },
            },
          },
          branch: true,
          authorizations: {
            where: {
              courseId: targetCourseId,
              isDeleted: false,
              status: 'Active',
            },
          },
          availability: {
            where: {
              isDeleted: false,
              status: 'Active',
            },
          },
        },
      });

      const personIds = trainers.map((t) => t.personId);

      const leaves = await client.leaveRequest.findMany({
        where: {
          personId: { in: personIds },
          status: 'Approved',
          isDeleted: false,
        },
      });

      const currentAssignments = await client.batchTrainer.findMany({
        where: { batchId, isDeleted: false },
      });

      const batchDates = batchSessions.map((s) => s.sessionDate);
      const otherSessions = await client.session.findMany({
        where: {
          trainerId: { in: trainers.map((t) => t.id) },
          batchId: { not: batchId },
          status: 'Scheduled',
          isDeleted: false,
          sessionDate: { in: batchDates },
        },
        include: {
          batch: {
            select: {
              batchCode: true,
            },
          },
        },
      });

      const results: FacultyEligibilityResult[] = [];

      for (const trainer of trainers) {
        const reasonCodes: string[] = [];
        const reasons: string[] = [];
        let alreadyAssigned = false;

        const user = trainer.person.user;
        if (!user) {
          reasonCodes.push('PROFILE_INACTIVE');
          reasons.push(`Trainer does not have a user account registered in the system.`);
        } else {
          const hasTrainerRole = user.roles.some((ur) => ur.role.roleCode === 'TRAINER');
          if (user.status !== 'Active') {
            reasonCodes.push('PROFILE_INACTIVE');
            reasons.push(`Trainer user account status is ${user.status}.`);
          }
          if (!hasTrainerRole) {
            reasonCodes.push('PROFILE_INACTIVE');
            reasons.push(`Trainer user account lacks the TRAINER role.`);
          }
        }

        if (trainer.status !== 'Active') {
          reasonCodes.push('PROFILE_INACTIVE');
          reasons.push(`Trainer profile status is ${trainer.status}.`);
        }
        const targetIdForAssignment = user ? user.id : trainer.id;
        const assignment = currentAssignments.find((a) => a.trainerId === targetIdForAssignment);
        let assignmentDetail = null;
        if (assignment) {
          alreadyAssigned = true;
          reasonCodes.push('ALREADY_ASSIGNED');
          reasons.push(
            `Trainer is already assigned to this batch as ${assignment.role} (from ${new Date(assignment.assignedFrom).toLocaleDateString()} to ${new Date(assignment.assignedTo).toLocaleDateString()}).`
          );
          assignmentDetail = {
            role: assignment.role,
            assignedFrom: assignment.assignedFrom.toISOString(),
            assignedTo: assignment.assignedTo.toISOString(),
          };
        }

        const auth = trainer.authorizations[0];
        if (!auth) {
          reasonCodes.push('COURSE_NOT_AUTHORIZED');
          reasons.push(`Trainer is not authorized to teach this course.`);
        }

        if (trainer.branchId !== batch.branchId) {
          reasonCodes.push('BRANCH_MISMATCH');
          reasons.push(
            `Trainer is registered to branch ${trainer.branch?.branchName || trainer.branchId}, which does not match batch branch.`
          );
        }

        for (const session of batchSessions) {
          const trainerLeaves = leaves.filter((l) => l.personId === trainer.personId);
          const overlappingLeave = trainerLeaves.find((leave) => {
            const sameDate =
              session.sessionDate.toISOString().split('T')[0] >= leave.startDate.toISOString().split('T')[0] &&
              session.sessionDate.toISOString().split('T')[0] <= leave.endDate.toISOString().split('T')[0];

            if (!sameDate) return false;
            if (leave.isFullDay) return true;

            if (leave.startTime && leave.endTime) {
              return session.startTime < leave.endTime && session.endTime > leave.startTime;
            }
            return false;
          });

          if (overlappingLeave) {
            reasonCodes.push('LEAVE_OVERLAP');
            const timeStr = overlappingLeave.isFullDay
              ? 'Full Day'
              : `${overlappingLeave.startTime}-${overlappingLeave.endTime}`;
            reasons.push(
              `Trainer has approved leave on ${session.sessionDate.toLocaleDateString()} (${timeStr}) for reason: ${overlappingLeave.reason || 'None'}.`
            );
          }
        }

        // Check for approved leave on specific Target Assessment Date
        if (options?.targetDate) {
          const targetDateStr = options.targetDate.toISOString().split('T')[0];
          const trainerLeaves = leaves.filter((l) => l.personId === trainer.personId);
          const overlappingLeave = trainerLeaves.find((leave) => {
            const startStr = leave.startDate.toISOString().split('T')[0];
            const endStr = leave.endDate.toISOString().split('T')[0];
            return targetDateStr >= startStr && targetDateStr <= endStr;
          });

          if (overlappingLeave) {
            reasonCodes.push('LEAVE_ON_TARGET_DATE');
            const timeStr = overlappingLeave.isFullDay
              ? 'Full Day'
              : `${overlappingLeave.startTime}-${overlappingLeave.endTime}`;
            reasons.push(
              `Trainer has approved leave on Target Assessment Date ${options.targetDate.toLocaleDateString()} (${timeStr}) for reason: ${overlappingLeave.reason || 'None'}.`
            );
          }
        }

        const sessionConflicts: SessionConflict[] = [];

        for (const session of batchSessions) {
          const trainerSessions = otherSessions.filter(
            (os) => os.trainerId === trainer.id &&
              os.sessionDate.toISOString().split('T')[0] === session.sessionDate.toISOString().split('T')[0]
          );

          const overlappingSession = trainerSessions.find((os) => {
            return session.startTime < os.endTime && session.endTime > os.startTime;
          });

          if (overlappingSession) {
            reasonCodes.push('SESSION_OVERLAP');
            reasons.push(
              `Schedule conflict on ${session.sessionDate.toLocaleDateString()} at ${session.startTime}-${session.endTime}: Booked for Batch ${overlappingSession.batch.batchCode} (Session ${overlappingSession.sessionNumber}).`
            );
            sessionConflicts.push({
              sessionDate: session.sessionDate.toISOString(),
              startTime: session.startTime,
              endTime: session.endTime,
              batchCode: overlappingSession.batch.batchCode,
              sessionNumber: overlappingSession.sessionNumber ?? undefined,
            });
          }
        }

        const uniqueReasonCodes = Array.from(new Set(reasonCodes));
        const blockingReasonCodes = uniqueReasonCodes.filter((code) => code !== 'SESSION_OVERLAP');
        const isAssignable = blockingReasonCodes.length === 0;

        results.push({
          trainerId: user ? user.id : trainer.id,
          trainerCode: trainer.trainerCode,
          displayName: {
            en: `${trainer.person.firstName} ${trainer.person.lastName}`.trim(),
            ar: null,
          },
          trainerType: trainer.trainerType,
          branchName: trainer.branch?.branchName,
          status: trainer.status,
          eligible: isAssignable,
          isAssignable,
          alreadyAssigned,
          reasonCodes: uniqueReasonCodes,
          reasons,
          sessionConflicts,
          assignment: assignmentDetail,
        });
      }

      results.sort((a, b) => {
        if (a.alreadyAssigned && !b.alreadyAssigned) return -1;
        if (!a.alreadyAssigned && b.alreadyAssigned) return 1;
        if (a.eligible && !b.eligible) return -1;
        if (!a.eligible && b.eligible) return 1;
        return a.displayName.en.localeCompare(b.displayName.en);
      });

      return results;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async removeTrainer(
    batchId: string,
    assignmentId: string,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.batchRepository.findById(batchId, client);
      if (!batch) {
        throw new Error('ERR_CRS_BATCH_NOT_FOUND');
      }

      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: {
            userId: actorId,
            branchId: batch.branchId,
            status: 'Active',
          },
        });
        const isAuthorized = !!hasAccess;

        const userRoles = await client.userRole.findMany({
          where: { userId: actorId },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        const isSuperAdmin = userRoles.some(
          (ur) =>
            ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER',
        );

        if (!isSuperAdmin) {
          const permissions = userRoles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.permissionCode),
          );
          const hasPermission = permissions.includes('batch.delivery.assign');
          if (!isAuthorized || !hasPermission) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      const assignments = await this.batchRepository.findTrainers(batchId, client);
      const assignment = assignments.find((a) => a.id === assignmentId && a.status === 'Active');
      if (!assignment) {
        throw new Error('ERR_CRS_TRAINER_ASSIGNMENT_NOT_FOUND');
      }

      await this.batchRepository.removeTrainer(assignmentId, actorId || 'system', client);

      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'BatchTrainer',
          entityId: assignmentId,
          action: 'UnassignTrainer',
          newValue: { ...assignment, status: 'Inactive', isDeleted: true },
        },
      });
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async allocateSeat(
    batchId: string,
    requestedSeats: number,
    forceOverbook: boolean,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      // Pessimistic write lock
      const batches = await client.$queryRawUnsafe<BatchLockRow[]>(
        'SELECT * FROM "batches" WHERE "id" = $1::uuid AND "isDeleted" = false FOR UPDATE',
        batchId,
      );
      if (batches.length === 0) {
        throw new Error('ERR_CRS_BATCH_NOT_FOUND');
      }
      const batchData = batches[0];
      const batch: Batch = {
        ...batchData,
        startDate: new Date(batchData.startDate),
        endDate: new Date(batchData.endDate),
        createdAt: new Date(batchData.createdAt),
      };

      const aggregate = new BatchAggregate(batch);
      const allocation = aggregate.allocateSeat(requestedSeats, forceOverbook);

      if (allocation.status !== 'WAITLIST_REDIRECT') {
        await this.batchRepository.update(
          batchId,
          { currentEnrollmentCount: allocation.updatedCount },
          batch.version,
          client,
        );

        // Check Capacity limit alerts
        if (allocation.updatedCount === batch.capacity) {
          await client.outboxEvent.create({
            data: {
              id: createUuid(randomUUID()),
              eventType: 'BatchCapacityReached',
              aggregateType: 'Batch',
              aggregateId: batchId,
              payload: { batchId, capacity: batch.capacity },
              status: 'Pending',
              availableAt: new Date(),
            },
          });
        }
      }

      return allocation;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async releaseSeatAndPromote(
    batchId: string,
    releasedSeats: number = 1,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batches = await client.$queryRawUnsafe<BatchLockRow[]>(
        'SELECT * FROM "batches" WHERE "id" = $1::uuid AND "isDeleted" = false FOR UPDATE',
        batchId,
      );
      if (batches.length === 0) {
        throw new Error('ERR_CRS_BATCH_NOT_FOUND');
      }
      const batchData = batches[0];
      const batch: Batch = {
        ...batchData,
        startDate: new Date(batchData.startDate),
        endDate: new Date(batchData.endDate),
        createdAt: new Date(batchData.createdAt),
      };

      const aggregate = new BatchAggregate(batch);
      const newCount = aggregate.releaseSeat(releasedSeats);

      if (batch.waitingListEnabled) {
        const activeWaitlist = await this.batchRepository.findActiveWaitlist(
          batchId,
          client,
        );
        if (activeWaitlist.length > 0) {
          // Promote first candidate FIFO
          const candidate = activeWaitlist[0];
          const promoCorrelationId = createUuid(randomUUID());
          await this.batchRepository.updateWaitlistEntry(
            candidate.id,
            {
              status: 'Promoted',
              promotionCorrelationId: promoCorrelationId,
              queuePosition: 0,
            },
            client,
          );

          // Shift subsequent candidate positions
          for (let i = 1; i < activeWaitlist.length; i++) {
            const next = activeWaitlist[i];
            await this.batchRepository.updateWaitlistEntry(
              next.id,
              { queuePosition: next.queuePosition - 1 },
              client,
            );
          }

          // Emit event for Admissions context to create Student Enrollment
          await client.outboxEvent.create({
            data: {
              id: createUuid(randomUUID()),
              eventType: 'WaitlistEntryPromoted',
              aggregateType: 'Batch',
              aggregateId: batchId,
              payload: {
                batchId,
                studentProfileId: candidate.studentProfileId,
                leadId: candidate.leadId,
                enrollmentId: candidate.enrollmentId,
                promotionCorrelationId: promoCorrelationId,
              },
              status: 'Pending',
              availableAt: new Date(),
            },
          });

          // Waitlist candidate promoted takes the vacated seat, currentEnrollmentCount remains same
          return;
        }
      }

      // No waitlist promo occurred, simply decrement the count
      await this.batchRepository.update(
        batchId,
        { currentEnrollmentCount: newCount },
        batch.version,
        client,
      );
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async enqueueWaitlist(
    input: EnqueueWaitlistInput,
    tx?: Prisma.TransactionClient,
  ) {
    const { batchId, studentProfileId, leadId, enrollmentId, actorId } = input;
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.acquireBatchLock(batchId, client);

      if (!studentProfileId && !leadId) {
        throw new Error('ERR_CRS_CANDIDATE_REQUIRED');
      }
      if (studentProfileId && leadId) {
        throw new Error('ERR_CRS_AMBIGUOUS_CANDIDATE');
      }

      // Validate status
      const aggregate = new BatchAggregate(batch);
      aggregate.validateWaitlistEnqueue();

      // Enforce Candidate Validations & Branch Scoping Checks transactionally
      if (studentProfileId) {
        const studentProfile = await client.studentProfile.findFirst({
          where: { id: studentProfileId, isDeleted: false },
        });
        if (!studentProfile) {
          throw new Error('ERR_STU_PROFILE_NOT_FOUND');
        }
        if (studentProfile.status !== 'Active') {
          throw new Error('ERR_STU_PROFILE_INACTIVE');
        }

        // Verify Student Branch Admission scope
        const hasAdmissionInBranch = await client.admission.findFirst({
          where: {
            studentProfileId,
            branchId: batch.branchId,
            admissionStatus: { in: ['Submitted', 'Approved'] },
            isDeleted: false,
          },
        });
        if (!hasAdmissionInBranch) {
          throw new Error('ERR_AUTH_BRANCH_DENIED');
        }
      }

      if (leadId) {
        const lead = await client.lead.findFirst({
          where: { id: leadId, isDeleted: false },
        });
        if (!lead) {
          throw new Error('ERR_CRS_LEAD_NOT_FOUND');
        }
        if (lead.stage === 'Converted') {
          throw new Error('ERR_CRM_LEAD_ALREADY_CONVERTED');
        }
        if (lead.stage === 'Lost' || lead.status !== 'Active') {
          throw new Error('ERR_CRM_LEAD_INACTIVE');
        }
        if (lead.branchId !== batch.branchId) {
          throw new Error('ERR_AUTH_BRANCH_DENIED');
        }
      }

      // Check duplicates
      const active = await this.batchRepository.findActiveWaitlist(
        batchId,
        client,
      );
      const isDuplicate = active.some(
        (entry) =>
          (studentProfileId && entry.studentProfileId === studentProfileId) ||
          (leadId && entry.leadId === leadId),
      );
      if (isDuplicate) {
        throw new Error('ERR_CRS_DUPLICATE_WAITLIST');
      }

      const queuePosition = active.length + 1;
      const wl = await this.batchRepository.addWaitlistEntry(
        {
          id: createUuid(randomUUID()),
          courseId: batch.courseId,
          batchId,
          studentProfileId,
          leadId,
          enrollmentId: enrollmentId || null,
          queuePosition,
          status: 'Waiting',
          createdBy: actorId,
        },
        client,
      );

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'WaitingList',
          entityId: wl.id,
          action: 'ENQUEUE_WAITLIST',
          newValue: {
            batchId,
            studentProfileId,
            leadId,
            enrollmentId,
            queuePosition,
          },
        },
      });

      return wl;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async reorderWaitlist(
    batchId: string,
    waitlistIds: string[],
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.acquireBatchLock(batchId, client);
      const active = await this.batchRepository.findActiveWaitlist(
        batchId,
        client,
      );

      // Ensure all waitlistIds are active and correct count without duplicates
      const activeIds = active.map((x) => x.id);
      const hasDuplicates = new Set(waitlistIds).size !== waitlistIds.length;
      const isValid =
        !hasDuplicates &&
        waitlistIds.length === activeIds.length &&
        waitlistIds.every((id) => activeIds.includes(id));
      if (!isValid) {
        throw new Error('ERR_CRS_INVALID_REORDER_PAYLOAD');
      }

      // Update positions
      for (let i = 0; i < waitlistIds.length; i++) {
        const id = waitlistIds[i];
        await this.batchRepository.updateWaitlistEntry(
          id,
          { queuePosition: i + 1 },
          client,
        );
      }

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'WaitingList',
          entityId: batchId,
          action: 'REORDER_WAITLIST',
          newValue: { batchId, newSequence: waitlistIds },
        },
      });
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async manualPromoteWaitlist(
    batchId: string,
    waitlistId: string,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.acquireBatchLock(batchId, client);
      const list = await this.batchRepository.findWaitlist(batchId, client);
      const entry = list.find((x) => x.id === waitlistId);
      if (!entry || entry.isDeleted) {
        throw new Error('ERR_CRS_WAITLIST_ENTRY_NOT_FOUND');
      }

      const correlationId = createUuid(randomUUID());
      const aggregate = new BatchAggregate(batch);
      const { updatedEntry, updatedCount } = aggregate.promoteWaitlistEntry(
        entry,
        correlationId,
        { force: false },
      );

      // Update waitlist entry status
      await this.batchRepository.updateWaitlistEntry(
        waitlistId,
        {
          status: updatedEntry.status,
          promotionCorrelationId: updatedEntry.promotionCorrelationId,
          queuePosition: 0,
        },
        client,
      );

      // Update batch enrollment count
      await this.batchRepository.update(
        batchId,
        { currentEnrollmentCount: updatedCount },
        batch.version,
        client,
      );

      // Shift subsequent active entries
      const active = await this.batchRepository.findActiveWaitlist(
        batchId,
        client,
      );
      const remaining = active.filter((x) => x.id !== waitlistId);
      for (let i = 0; i < remaining.length; i++) {
        await this.batchRepository.updateWaitlistEntry(
          remaining[i].id,
          { queuePosition: i + 1 },
          client,
        );
      }

      // Emit event
      await client.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'WaitlistEntryPromoted',
          aggregateType: 'Batch',
          aggregateId: batchId,
          payload: {
            batchId,
            studentProfileId: entry.studentProfileId,
            leadId: entry.leadId,
            enrollmentId: entry.enrollmentId,
            promotionCorrelationId: correlationId,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'WaitingList',
          entityId: waitlistId,
          action: 'MANUAL_PROMOTE_WAITLIST',
          newValue: { batchId, waitlistId, correlationId, updatedCount },
        },
      });

      return updatedEntry;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async skipWaitlistEntry(
    batchId: string,
    waitlistId: string,
    reason: string,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.acquireBatchLock(batchId, client);
      const list = await this.batchRepository.findWaitlist(batchId, client);
      const entry = list.find((x) => x.id === waitlistId);
      if (!entry || entry.isDeleted) {
        throw new Error('ERR_CRS_WAITLIST_ENTRY_NOT_FOUND');
      }

      const aggregate = new BatchAggregate(batch);
      const updatedEntry = aggregate.skipWaitlistEntry(entry, reason);

      await this.batchRepository.updateWaitlistEntry(
        waitlistId,
        {
          status: updatedEntry.status,
          statusReason: updatedEntry.statusReason,
          queuePosition: 0,
        },
        client,
      );

      // Shift subsequent active entries
      const active = await this.batchRepository.findActiveWaitlist(
        batchId,
        client,
      );
      const remaining = active.filter((x) => x.id !== waitlistId);
      for (let i = 0; i < remaining.length; i++) {
        await this.batchRepository.updateWaitlistEntry(
          remaining[i].id,
          { queuePosition: i + 1 },
          client,
        );
      }

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'WaitingList',
          entityId: waitlistId,
          action: 'SKIP_WAITLIST_ENTRY',
          newValue: { batchId, waitlistId, reason },
        },
      });

      return updatedEntry;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async reactivateWaitlistEntry(
    batchId: string,
    waitlistId: string,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.acquireBatchLock(batchId, client);
      const list = await this.batchRepository.findWaitlist(batchId, client);
      const entry = list.find((x) => x.id === waitlistId);
      if (!entry || entry.isDeleted) {
        throw new Error('ERR_CRS_WAITLIST_ENTRY_NOT_FOUND');
      }

      const aggregate = new BatchAggregate(batch);
      const updatedEntry = aggregate.reactivateWaitlistEntry(entry);

      const active = await this.batchRepository.findActiveWaitlist(
        batchId,
        client,
      );
      const queuePosition = active.length + 1;

      const updated = await this.batchRepository.updateWaitlistEntry(
        waitlistId,
        {
          status: updatedEntry.status,
          statusReason: null,
          queuePosition,
        },
        client,
      );

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'WaitingList',
          entityId: waitlistId,
          action: 'REACTIVATE_WAITLIST_ENTRY',
          newValue: { batchId, waitlistId, queuePosition },
        },
      });

      return updated;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async removeWaitlistEntry(
    batchId: string,
    waitlistId: string,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.acquireBatchLock(batchId, client);
      const list = await this.batchRepository.findWaitlist(batchId, client);
      const entry = list.find((x) => x.id === waitlistId);
      if (!entry || entry.isDeleted) {
        throw new Error('ERR_CRS_WAITLIST_ENTRY_NOT_FOUND');
      }
      if (entry.status === 'Removed' || entry.status === 'Promoted') {
        throw new InvalidStateTransition(
          'Cannot remove a waitlist entry that has already been removed or promoted.',
        );
      }

      const isWaiting = entry.status === 'Waiting';

      await this.batchRepository.updateWaitlistEntry(
        waitlistId,
        {
          status: 'Removed',
          queuePosition: 0,
        },
        client,
      );

      if (isWaiting) {
        // Shift subsequent active entries
        const active = await this.batchRepository.findActiveWaitlist(
          batchId,
          client,
        );
        const remaining = active.filter((x) => x.id !== waitlistId);
        for (let i = 0; i < remaining.length; i++) {
          await this.batchRepository.updateWaitlistEntry(
            remaining[i].id,
            { queuePosition: i + 1 },
            client,
          );
        }
      }

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'WaitingList',
          entityId: waitlistId,
          action: 'REMOVE_WAITLIST_ENTRY',
          newValue: { batchId, waitlistId },
        },
      });
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async revertPromotion(
    batchId: string,
    studentProfileId: string | null,
    leadId: string | null,
    correlationId?: string | null,
    reason?: string | null,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.acquireBatchLock(batchId, client);
      const list = await this.batchRepository.findWaitlist(batchId, client);
      const entry = list.find(
        (x) =>
          x.status === 'Promoted' &&
          ((studentProfileId && x.studentProfileId === studentProfileId) ||
            (leadId && x.leadId === leadId)),
      );

      if (!entry) {
        throw new Error('ERR_CRS_WAITLIST_ENTRY_NOT_FOUND');
      }

      const aggregate = new BatchAggregate(batch);
      const { updatedEntry, updatedCount } = aggregate.revertPromotion(
        entry,
        correlationId,
        reason,
      );

      await this.batchRepository.updateWaitlistEntry(
        entry.id,
        {
          status: updatedEntry.status,
          statusReason: updatedEntry.statusReason,
          promotionCorrelationId: null,
        },
        client,
      );

      // Decrement enrollment count
      const updatedBatch = await this.batchRepository.update(
        batchId,
        { currentEnrollmentCount: updatedCount },
        batch.version,
        client,
      );

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'TrainingDelivery',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'WaitingList',
          entityId: entry.id,
          action: 'REVERT_WAITLIST_PROMOTION',
          newValue: { batchId, waitlistId: entry.id, correlationId, reason },
        },
      });

      // Promote next candidate FIFO if waitlist enabled
      if (updatedBatch.waitingListEnabled) {
        const activeWaitlist = await this.batchRepository.findActiveWaitlist(
          batchId,
          client,
        );
        if (activeWaitlist.length > 0) {
          const nextCandidate = activeWaitlist[0];
          const promoCorrelationId = createUuid(randomUUID());
          await this.batchRepository.updateWaitlistEntry(
            nextCandidate.id,
            {
              status: 'Promoted',
              promotionCorrelationId: promoCorrelationId,
              queuePosition: 0,
            },
            client,
          );

          // Shift subsequent positions
          for (let i = 1; i < activeWaitlist.length; i++) {
            const next = activeWaitlist[i];
            await this.batchRepository.updateWaitlistEntry(
              next.id,
              { queuePosition: next.queuePosition - 1 },
              client,
            );
          }

          // Emit outbox event
          await client.outboxEvent.create({
            data: {
              id: createUuid(randomUUID()),
              eventType: 'WaitlistEntryPromoted',
              aggregateType: 'Batch',
              aggregateId: batchId,
              payload: {
                batchId,
                studentProfileId: nextCandidate.studentProfileId,
                leadId: nextCandidate.leadId,
                enrollmentId: nextCandidate.enrollmentId,
                promotionCorrelationId: promoCorrelationId,
              },
              status: 'Pending',
              availableAt: new Date(),
            },
          });
        }
      }
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async resolveWaitlistEntry(
    studentProfileId: string | null,
    batchId: string,
    tx?: Prisma.TransactionClient,
    leadId?: string | null,
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      const list = await this.batchRepository.findWaitlist(batchId, client);
      const entry = list.find(
        (x) =>
          x.status === 'Promoted' &&
          ((studentProfileId && x.studentProfileId === studentProfileId) ||
            (leadId && x.leadId === leadId)),
      );

      if (entry) {
        await this.batchRepository.updateWaitlistEntry(
          entry.id,
          {
            status: 'Removed',
            statusReason: 'ConsumedByEnrollment',
            promotionCorrelationId: null,
            isDeleted: true,
          },
          client,
        );
      }
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  private async acquireBatchLock(
    batchId: string,
    client: Prisma.TransactionClient,
  ): Promise<Batch> {
    const batches = await client.$queryRawUnsafe<BatchLockRow[]>(
      'SELECT * FROM "batches" WHERE "id" = $1::uuid AND "isDeleted" = false FOR UPDATE',
      batchId,
    );
    if (batches.length === 0) {
      throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    }
    const batchData = batches[0];
    return {
      ...batchData,
      startDate: new Date(batchData.startDate),
      endDate: new Date(batchData.endDate),
      createdAt: new Date(batchData.createdAt),
    };
  }
}
