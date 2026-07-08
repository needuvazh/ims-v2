import { Prisma } from '@prisma/client';
import { Batch, BatchTrainer, WaitingList, Session } from './batch';

export interface IBatchRepository {
  create(
    data: Prisma.BatchUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Batch>;
  update(
    id: string,
    data: Prisma.BatchUncheckedUpdateInput,
    version: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Batch>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Batch | null>;
  findByCode(
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Batch | null>;
  findAll(
    filters: { branchId?: string; courseId?: string; status?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Batch[]>;
  delete(
    id: string,
    deletedBy: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  // BatchTrainer Mappings
  assignTrainer(
    data: Prisma.BatchTrainerUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BatchTrainer>;
  removeTrainer(
    id: string,
    deletedBy: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
  findTrainers(
    batchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BatchTrainer[]>;
  findPrimaryTrainer(
    batchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BatchTrainer | null>;

  // WaitingList Queue
  addWaitlistEntry(
    data: Prisma.WaitingListUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<WaitingList>;
  updateWaitlistEntry(
    id: string,
    data: Prisma.WaitingListUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<WaitingList>;
  findWaitlist(
    batchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WaitingList[]>;
  findActiveWaitlist(
    batchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WaitingList[]>;

  // Sessions
  createSession(
    data: Prisma.SessionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Session>;
  findSessions(
    batchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Session[]>;
  updateSession(
    id: string,
    data: Prisma.SessionUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Session>;
}
