import { PrismaClient, Prisma } from '@prisma/client';
import { IBatchRepository } from '../domain/repositories';
import { Batch, BatchTrainer, WaitingList, Session } from '../domain/batch';

export class BatchRepository implements IBatchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any, tx?: Prisma.TransactionClient): Promise<Batch> {
    const client = tx || this.prisma;
    const batch = await client.batch.create({
      data: {
        id: data.id,
        courseId: data.courseId,
        branchId: data.branchId,
        classroomId: data.classroomId || null,
        batchCode: data.batchCode,
        batchNameEnglish: data.batchNameEnglish,
        batchNameArabic: data.batchNameArabic,
        startDate: data.startDate,
        endDate: data.endDate,
        capacity: data.capacity,
        currentEnrollmentCount: data.currentEnrollmentCount ?? 0,
        waitingListEnabled: data.waitingListEnabled ?? true,
        allowOverbooking: data.allowOverbooking ?? false,
        isWalkIn: data.isWalkIn ?? false,
        corporateAccountId: data.corporateAccountId || null,
        status: data.status || 'Draft',
        version: 1,
        createdBy: data.createdBy || null,
        isDeleted: false,
      },
    });
    return batch as any as Batch;
  }

  async update(id: string, data: any, version: number, tx?: Prisma.TransactionClient): Promise<Batch> {
    const client = tx || this.prisma;
    
    // Concurrency check
    const result = await client.batch.updateMany({
      where: { id, version, isDeleted: false },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new Error('ERR_CRS_CONCURRENCY_VIOLATION');
    }

    const updated = await client.batch.findUnique({
      where: { id },
    });

    if (!updated) {
      throw new Error('ERR_CRS_BATCH_NOT_FOUND');
    }
    return updated as any as Batch;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Batch | null> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return null;
    }
    const client = tx || this.prisma;
    const batch = await client.batch.findUnique({
      where: { id, isDeleted: false },
    });
    return batch as any as Batch | null;
  }

  async findByCode(code: string, tx?: Prisma.TransactionClient): Promise<Batch | null> {
    const client = tx || this.prisma;
    const batch = await client.batch.findFirst({
      where: { batchCode: { equals: code, mode: 'insensitive' }, isDeleted: false },
    });
    return batch as any as Batch | null;
  }

  async findAll(filters: { branchId?: string; courseId?: string; status?: string }, tx?: Prisma.TransactionClient): Promise<Batch[]> {
    const client = tx || this.prisma;
    const where: Prisma.BatchWhereInput = { isDeleted: false };
    
    if (filters.branchId) {
      where.branchId = filters.branchId;
    }
    if (filters.courseId) {
      where.courseId = filters.courseId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const batches = await client.batch.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
    return batches as any as Batch[];
  }

  async delete(id: string, deletedBy: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.batch.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
        status: 'Cancelled',
      },
    });
  }

  // BatchTrainer Mappings
  async assignTrainer(data: any, tx?: Prisma.TransactionClient): Promise<BatchTrainer> {
    const client = tx || this.prisma;
    const bt = await client.batchTrainer.create({
      data: {
        id: data.id,
        batchId: data.batchId,
        trainerId: data.trainerId,
        role: data.role,
        assignedFrom: data.assignedFrom,
        assignedTo: data.assignedTo,
        status: data.status || 'Active',
        isDeleted: false,
        createdBy: data.createdBy || null,
      },
    });
    return bt as any as BatchTrainer;
  }

  async removeTrainer(id: string, deletedBy: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.batchTrainer.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
        status: 'Inactive',
      },
    });
  }

  async findTrainers(batchId: string, tx?: Prisma.TransactionClient): Promise<BatchTrainer[]> {
    const client = tx || this.prisma;
    const trainers = await client.batchTrainer.findMany({
      where: { batchId, isDeleted: false },
    });
    return trainers as any as BatchTrainer[];
  }

  async findPrimaryTrainer(batchId: string, tx?: Prisma.TransactionClient): Promise<BatchTrainer | null> {
    const client = tx || this.prisma;
    const trainer = await client.batchTrainer.findFirst({
      where: { batchId, role: 'Primary', isDeleted: false, status: 'Active' },
    });
    return trainer as any as BatchTrainer | null;
  }

  async addWaitlistEntry(data: any, tx?: Prisma.TransactionClient): Promise<WaitingList> {
    const client = tx || this.prisma;
    const wl = await client.waitingList.create({
      data: {
        id: data.id,
        courseId: data.courseId,
        batchId: data.batchId,
        studentId: data.studentId || null,
        leadId: data.leadId || null,
        queuePosition: data.queuePosition,
        status: data.status || 'Waiting',
        statusReason: data.statusReason || null,
        promotionCorrelationId: data.promotionCorrelationId || null,
        isDeleted: false,
        createdBy: data.createdBy || null,
      },
    });
    return wl as any as WaitingList;
  }

  async updateWaitlistEntry(id: string, data: any, tx?: Prisma.TransactionClient): Promise<WaitingList> {
    const client = tx || this.prisma;
    const wl = await client.waitingList.update({
      where: { id },
      data,
    });
    return wl as any as WaitingList;
  }

  async findWaitlist(batchId: string, tx?: Prisma.TransactionClient): Promise<WaitingList[]> {
    const client = tx || this.prisma;
    const list = await client.waitingList.findMany({
      where: { batchId, isDeleted: false },
      orderBy: { queuePosition: 'asc' },
    });
    return list as any as WaitingList[];
  }

  async findActiveWaitlist(batchId: string, tx?: Prisma.TransactionClient): Promise<WaitingList[]> {
    const client = tx || this.prisma;
    const list = await client.waitingList.findMany({
      where: { batchId, status: 'Waiting', isDeleted: false },
      orderBy: { queuePosition: 'asc' },
    });
    return list as any as WaitingList[];
  }

  // Sessions
  async createSession(data: any, tx?: Prisma.TransactionClient): Promise<Session> {
    const client = tx || this.prisma;
    const session = await client.session.create({
      data: {
        id: data.id,
        batchId: data.batchId,
        sessionNumber: data.sessionNumber,
        titleEnglish: data.titleEnglish,
        titleArabic: data.titleArabic,
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        trainerId: data.trainerId || null,
        classroomId: data.classroomId || null,
        status: data.status || 'Scheduled',
        version: 1,
        createdBy: data.createdBy || null,
        isDeleted: false,
      },
    });
    return session as any as Session;
  }

  async findSessions(batchId: string, tx?: Prisma.TransactionClient): Promise<Session[]> {
    const client = tx || this.prisma;
    const sessions = await client.session.findMany({
      where: { batchId, isDeleted: false },
      orderBy: { sessionNumber: 'asc' },
    });
    return sessions as any as Session[];
  }

  async updateSession(id: string, data: any, tx?: Prisma.TransactionClient): Promise<Session> {
    const client = tx || this.prisma;
    const session = await client.session.update({
      where: { id },
      data,
    });
    return session as any as Session;
  }
}
