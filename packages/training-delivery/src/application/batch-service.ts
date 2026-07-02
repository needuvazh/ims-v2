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
} from '../domain/errors';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';

const CODE_REGEX = /^[A-Z0-9-]{3,20}$/;

export interface ISchedulingService {
  getSessionsForTrainer(
    trainerId: string,
    start: Date,
    end: Date,
    tx?: any
  ): Promise<{
    sessionDate: Date;
    startTime: string;
    endTime: string;
    batchCode: string;
  }[]>;
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
    private readonly schedulingService?: ISchedulingService
  ) {}

  async createBatch(input: any, actorId?: string, tx?: Prisma.TransactionClient) {
    const execute = async (client: Prisma.TransactionClient) => {
      // Validate code format
      if (!CODE_REGEX.test(input.batchCode)) {
        throw new Error('ERR_CRS_INVALID_CODE_FORMAT');
      }

      // Check unique code
      const existing = await this.batchRepository.findByCode(input.batchCode, client);
      if (existing) {
        throw new DuplicateBatchCode();
      }

      // Check Course exists and is Published
      const course = await client.course.findUnique({
        where: { id: input.courseId, isDeleted: false },
      });
      if (!course) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }
      if (course.status !== 'Published') {
        throw new CourseNotPublished();
      }

      // Check user branch access scoping
      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: { userId: actorId, branchId: input.branchId, status: 'Active' },
        });
        if (!hasAccess) {
          // If not directly scoped, verify if they have global consolidated visibility
          const userRoles = await client.userRole.findMany({
            where: { userId: actorId },
            include: { role: true },
          });
          const isSuperAdmin = userRoles.some(
            (ur) => ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER'
          );
          if (!isSuperAdmin) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      // Verify date range chronologically
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      if (endDate <= startDate) {
        throw new InvalidDateRange('Batch end date must be after start date.');
      }

      // Check dates within parent course effective range
      const courseStart = new Date(course.effectiveStartDate);
      if (startDate < courseStart) {
        throw new InvalidDateRange('Batch start date cannot be before course effective start date.');
      }
      if (course.effectiveEndDate) {
        const courseEnd = new Date(course.effectiveEndDate);
        if (endDate > courseEnd) {
          throw new InvalidDateRange('Batch end date cannot exceed course effective end date.');
        }
      }

      // Classroom validation
      if (input.classroomId) {
        const classroom = await client.classroom.findFirst({
          where: { id: input.classroomId, isDeleted: false, status: 'Active' },
        });
        if (!classroom) {
          throw new Error('ERR_CRS_CLASSROOM_NOT_FOUND');
        }
      }

      // Corporate client validation
      if (input.corporateAccountId) {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(input.corporateAccountId)) {
          throw new Error('ERR_CRS_INVALID_CORPORATE_ACCOUNT');
        }
      }

      const { primaryTrainerId, ...batchInput } = input;
      const id = createUuid(randomUUID());
      const batch = await this.batchRepository.create(
        {
          ...batchInput,
          id,
          status: BATCH_STATUSES.DRAFT,
          currentEnrollmentCount: 0,
          createdBy: actorId,
        },
        client
      );

      if (primaryTrainerId) {
        await this.assignTrainer(
          batch.id,
          {
            trainerId: primaryTrainerId,
            role: 'Primary',
            assignedFrom: batch.startDate,
            assignedTo: batch.endDate,
          },
          actorId,
          client
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

  async updateBatch(id: string, input: any, version: number, actorId?: string, tx?: Prisma.TransactionClient) {
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
          where: { userId: actorId, branchId: existing.branchId, status: 'Active' },
        });
        if (!hasAccess) {
          const userRoles = await client.userRole.findMany({
            where: { userId: actorId },
            include: { role: true },
          });
          const isSuperAdmin = userRoles.some(
            (ur) => ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER'
          );
          if (!isSuperAdmin) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      // Check capacity bounds
      if (input.capacity !== undefined) {
        const newCapacity = Number(input.capacity);
        if (newCapacity < existing.currentEnrollmentCount && !(input.allowOverbooking || existing.allowOverbooking)) {
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
      const startDate = input.startDate ? new Date(input.startDate) : new Date(existing.startDate);
      const endDate = input.endDate ? new Date(input.endDate) : new Date(existing.endDate);
      if (endDate <= startDate) {
        throw new InvalidDateRange('Batch end date must be after start date.');
      }

      // Classroom validation
      if (input.classroomId) {
        const classroom = await client.classroom.findFirst({
          where: { id: input.classroomId, isDeleted: false, status: 'Active' },
        });
        if (!classroom) {
          throw new Error('ERR_CRS_CLASSROOM_NOT_FOUND');
        }
      }

      // Corporate client validation
      if (input.corporateAccountId) {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(input.corporateAccountId)) {
          throw new Error('ERR_CRS_INVALID_CORPORATE_ACCOUNT');
        }
      }

      const updated = await this.batchRepository.update(id, input, version, client);

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

  async transitionBatchStatus(id: string, targetStatus: string, version: number, actorId?: string, tx?: Prisma.TransactionClient) {
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
          where: { userId: actorId, branchId: batch.branchId, status: 'Active' },
        });
        if (!hasAccess) {
          const userRoles = await client.userRole.findMany({
            where: { userId: actorId },
            include: { role: true },
          });
          const isSuperAdmin = userRoles.some(
            (ur) => ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER'
          );
          if (!isSuperAdmin) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      const aggregate = new BatchAggregate(batch);
      
      // Fetch context info
      const primaryTrainer = await this.batchRepository.findPrimaryTrainer(id, client);
      const sessions = await this.batchRepository.findSessions(id, client);
      
      const now = new Date();
      const allSessionsPast = sessions.every((s) => {
        // Simple past checks
        return new Date(s.sessionDate) < now;
      });

      aggregate.validateTransition(targetStatus, {
        primaryTrainerExists: !!primaryTrainer,
        allSessionsPast,
        currentDate: now,
      });

      const updated = await this.batchRepository.update(id, { status: targetStatus }, version, client);

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

  async assignTrainer(batchId: string, input: any, actorId?: string, tx?: Prisma.TransactionClient) {
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

      const hasTrainerRole = trainer.roles.some((ur) => ur.role.roleCode === 'TRAINER');
      if (!hasTrainerRole) {
        throw new Error('ERR_CRS_INVALID_TRAINER_PROFILE');
      }

      // Enforce batch.delivery.assign permission and active branch authorization
      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: { userId: actorId, branchId: batch.branchId, status: 'Active' },
        });
        let isAuthorized = !!hasAccess;

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
          (ur) => ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER'
        );

        if (!isSuperAdmin) {
          const permissions = userRoles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.permissionCode)
          );
          const hasPermission = permissions.includes('batch.delivery.assign');
          if (!isAuthorized || !hasPermission) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }
      }

      // Reject trainer assignment if batch is closed
      if (batch.status === BATCH_STATUSES.COMPLETED || batch.status === BATCH_STATUSES.CANCELLED) {
        throw new InvalidStateTransition('Cannot assign trainer to a completed or cancelled batch.');
      }

      // Verify date ranges
      const assignedFrom = new Date(input.assignedFrom);
      const assignedTo = new Date(input.assignedTo);
      if (assignedTo <= assignedFrom) {
        throw new InvalidDateRange();
      }
      if (assignedFrom < new Date(batch.startDate) || assignedTo > new Date(batch.endDate)) {
        throw new InvalidDateRange('Assignment date range falls outside the batch bounds.');
      }

      // Role check for existing primary trainer
      if (input.role === 'Primary') {
        const trainers = await this.batchRepository.findTrainers(batchId, client);
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
        const trainerSessions = await this.schedulingService.getSessionsForTrainer(
          input.trainerId,
          assignedFrom,
          assignedTo,
          client
        );
        const batchSessions = await this.batchRepository.findSessions(batchId, client);

        const conflicts: ScheduleConflict[] = [];

        for (const bs of batchSessions) {
          const bsDateStr = getGSTDateString(bs.sessionDate);
          for (const ts of trainerSessions) {
            const tsDateStr = getGSTDateString(ts.sessionDate);
            if (bsDateStr === tsDateStr) {
              // Overlap check on time
              if (bs.startTime < ts.endTime && bs.endTime > ts.startTime) {
                conflicts.push({
                  batchCode: ts.batchCode,
                  sessionDate: ts.sessionDate,
                  startTime: ts.startTime,
                  endTime: ts.endTime,
                });
              }
            }
          }
        }

        if (conflicts.length > 0) {
          throw new TrainerScheduleConflict(
            `Trainer is already scheduled: conflicts in ${conflicts.map((c) => c.batchCode).join(', ')}`,
            conflicts
          );
        }
      }

      const id = createUuid(randomUUID());
      const bt = await this.batchRepository.assignTrainer(
        {
          ...input,
          id,
          batchId,
          createdBy: actorId,
        },
        client
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
    tx?: Prisma.TransactionClient
  ): Promise<ScheduleConflict[]> {
    const execute = async (client: Prisma.TransactionClient) => {
      const batch = await this.batchRepository.findById(batchId, client);
      if (!batch) {
        throw new Error('ERR_CRS_BATCH_NOT_FOUND');
      }

      // Enforce batch branch authorization for non-superadmins
      if (actorId) {
        const hasAccess = await client.userBranchAccess.findFirst({
          where: { userId: actorId, branchId: batch.branchId, status: 'Active' },
        });
        let isAuthorized = !!hasAccess;

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
          (ur) => ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER'
        );

        if (!isSuperAdmin) {
          const permissions = userRoles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.permissionCode)
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

      const trainerSessions = await this.schedulingService.getSessionsForTrainer(
        trainerId,
        assignedFrom,
        assignedTo,
        client
      );
      const batchSessions = await this.batchRepository.findSessions(batchId, client);

      const conflicts: ScheduleConflict[] = [];

      for (const bs of batchSessions) {
        const bsDateStr = getGSTDateString(bs.sessionDate);
        for (const ts of trainerSessions) {
          const tsDateStr = getGSTDateString(ts.sessionDate);
          if (bsDateStr === tsDateStr) {
            // Overlap check on time
            if (bs.startTime < ts.endTime && bs.endTime > ts.startTime) {
              conflicts.push({
                batchCode: ts.batchCode,
                sessionDate: ts.sessionDate,
                startTime: ts.startTime,
                endTime: ts.endTime,
              });
            }
          }
        }
      }

      return conflicts;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async allocateSeat(batchId: string, requestedSeats: number, forceOverbook: boolean, tx?: Prisma.TransactionClient) {
    const execute = async (client: Prisma.TransactionClient) => {
      // Pessimistic write lock
      const batches = await client.$queryRawUnsafe<any[]>(
        'SELECT * FROM "batches" WHERE "id" = $1::uuid AND "isDeleted" = false FOR UPDATE',
        batchId
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
        await this.batchRepository.update(batchId, { currentEnrollmentCount: allocation.updatedCount }, batch.version, client);
        
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

  async releaseSeatAndPromote(batchId: string, releasedSeats: number = 1, tx?: Prisma.TransactionClient) {
    const execute = async (client: Prisma.TransactionClient) => {
      const batches = await client.$queryRawUnsafe<any[]>(
        'SELECT * FROM "batches" WHERE "id" = $1::uuid AND "isDeleted" = false FOR UPDATE',
        batchId
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
        const activeWaitlist = await this.batchRepository.findActiveWaitlist(batchId, client);
        if (activeWaitlist.length > 0) {
          // Promote first candidate FIFO
          const candidate = activeWaitlist[0];
          await this.batchRepository.updateWaitlistEntry(candidate.id, { status: 'Promoted' }, client);

          // Shift subsequent candidate positions
          for (let i = 1; i < activeWaitlist.length; i++) {
            const next = activeWaitlist[i];
            await this.batchRepository.updateWaitlistEntry(next.id, { queuePosition: next.queuePosition - 1 }, client);
          }

          // Emit event for Admissions context to create Student Enrollment
          await client.outboxEvent.create({
            data: {
              id: createUuid(randomUUID()),
              eventType: 'WaitlistStudentPromoted',
              aggregateType: 'Batch',
              aggregateId: batchId,
              payload: {
                batchId,
                studentId: candidate.studentId,
                leadId: candidate.leadId,
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
      await this.batchRepository.update(batchId, { currentEnrollmentCount: newCount }, batch.version, client);
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }
}
