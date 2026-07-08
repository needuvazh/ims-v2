import {
  CompletionApproval,
  ApprovalLevel,
  ApprovalStatus,
} from '../aggregates/CompletionApproval';

export interface CompletionApprovalRepository {
  findById(id: string): Promise<CompletionApproval | null>;
  findByCompletionId(completionId: string): Promise<CompletionApproval[]>;
  findByCompletionAndLevel(
    completionId: string,
    level: ApprovalLevel,
  ): Promise<CompletionApproval | null>;
  findByActorAndStatus(
    actorId: string,
    status: ApprovalStatus,
  ): Promise<CompletionApproval[]>;
  save(approval: CompletionApproval): Promise<void>;
  saveMany(approvals: CompletionApproval[]): Promise<void>;
  delete(id: string, deletedBy: string): Promise<void>;
}
