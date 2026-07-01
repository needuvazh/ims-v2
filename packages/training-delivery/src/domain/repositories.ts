import { Batch, BatchTrainer, WaitingList, Session } from './batch';

export interface IBatchRepository {
  create(data: any, tx?: any): Promise<Batch>;
  update(id: string, data: any, version: number, tx?: any): Promise<Batch>;
  findById(id: string, tx?: any): Promise<Batch | null>;
  findByCode(code: string, tx?: any): Promise<Batch | null>;
  findAll(filters: { branchId?: string; courseId?: string; status?: string }, tx?: any): Promise<Batch[]>;
  delete(id: string, deletedBy: string, tx?: any): Promise<void>;
  
  // BatchTrainer Mappings
  assignTrainer(data: any, tx?: any): Promise<BatchTrainer>;
  removeTrainer(id: string, deletedBy: string, tx?: any): Promise<void>;
  findTrainers(batchId: string, tx?: any): Promise<BatchTrainer[]>;
  findPrimaryTrainer(batchId: string, tx?: any): Promise<BatchTrainer | null>;
  
  // WaitingList Queue
  addWaitlistEntry(data: any, tx?: any): Promise<WaitingList>;
  updateWaitlistEntry(id: string, data: any, tx?: any): Promise<WaitingList>;
  findWaitlist(batchId: string, tx?: any): Promise<WaitingList[]>;
  findActiveWaitlist(batchId: string, tx?: any): Promise<WaitingList[]>;
  
  // Sessions
  createSession(data: any, tx?: any): Promise<Session>;
  findSessions(batchId: string, tx?: any): Promise<Session[]>;
  updateSession(id: string, data: any, tx?: any): Promise<Session>;
}
