import { DomainError } from '@ims/shared-kernel';
import type { TrainerManagementRepository, TrainerListFilters, ListQuery } from '../domain/repositories';
import type {
  AuthorizationStatus,
  CompensationBasis,
  TrainerStatus,
  TrainerType,
} from '../domain/trainer';

export type AuthContext = {
  actorId?: string | null;
  branchId?: string | null;
  permissions: string[];
  allowedBranchIds?: string[];
};

function ensurePermission(context: AuthContext, permission: string) {
  if (!context.permissions.includes(permission)) {
    throw new DomainError('forbidden', `Access denied: missing permission '${permission}'.`);
  }
}

function ensureBranchScope(context: AuthContext, branchId: string) {
  if (context.allowedBranchIds && !context.allowedBranchIds.includes(branchId)) {
    throw new DomainError('branch_scope_violation', 'Access denied: branch is outside allowed scope.');
  }
}

export class TrainerManagementService {
  constructor(private readonly repository: TrainerManagementRepository) {}

  async findTrainerByPersonId(personId: string, context: AuthContext) {
    ensurePermission(context, 'trainer.read');
    return this.repository.findTrainerByPersonId(personId);
  }

  async listTrainers(filters: TrainerListFilters, query: ListQuery, context: AuthContext) {
    ensurePermission(context, 'trainer.read');
    if (filters.branchId) ensureBranchScope(context, filters.branchId);
    return this.repository.listTrainers(filters, query);
  }

  async getTrainer(trainerId: string, context: AuthContext) {
    ensurePermission(context, 'trainer.read');
    return this.repository.findTrainerById(trainerId, context.allowedBranchIds);
  }

  async createTrainerProfile(input: Parameters<TrainerManagementRepository['createTrainerProfile']>[0], context: AuthContext) {
    ensurePermission(context, 'trainer.create');
    ensureBranchScope(context, input.branchId);
    const existing = await this.repository.findTrainerByPersonId(input.personId);
    if (existing) {
      throw new DomainError('conflict', 'Trainer profile already exists for this person.');
    }
    return this.repository.createTrainerProfile({ ...input, createdBy: context.actorId ?? null });
  }

  async updateTrainerProfile(trainerId: string, input: Parameters<TrainerManagementRepository['updateTrainerProfile']>[1], context: AuthContext) {
    ensurePermission(context, 'trainer.update');
    return this.repository.updateTrainerProfile(trainerId, input);
  }

  async transitionTrainerStatus(trainerId: string, input: { toStatus: TrainerStatus; effectiveAt: Date; reason: string; version: number }, context: AuthContext) {
    ensurePermission(context, 'trainer.status.manage');
    return this.repository.transitionTrainerStatus(trainerId, input);
  }

  async listQualifications(trainerId: string, query: ListQuery, context: AuthContext) {
    ensurePermission(context, 'trainer.qualification.read');
    return this.repository.listQualifications(trainerId, query);
  }

  async createQualification(trainerId: string, input: Parameters<TrainerManagementRepository['createQualification']>[1], context: AuthContext) {
    ensurePermission(context, 'trainer.qualification.manage');
    return this.repository.createQualification(trainerId, input);
  }

  async updateQualification(trainerId: string, qualificationId: string, input: Parameters<TrainerManagementRepository['updateQualification']>[2], context: AuthContext) {
    ensurePermission(context, 'trainer.qualification.manage');
    return this.repository.updateQualification(trainerId, qualificationId, input);
  }

  async deleteQualification(trainerId: string, qualificationId: string, reason: string, version: number, context: AuthContext) {
    ensurePermission(context, 'trainer.qualification.manage');
    return this.repository.deleteQualification(trainerId, qualificationId, reason, version);
  }

  async listAvailability(trainerId: string, query: ListQuery, context: AuthContext) {
    ensurePermission(context, 'trainer.availability.read');
    return this.repository.listAvailability(trainerId, query);
  }

  async createAvailability(trainerId: string, input: Parameters<TrainerManagementRepository['createAvailability']>[1], context: AuthContext) {
    ensurePermission(context, 'trainer.availability.manage');
    ensureBranchScope(context, input.branchId);
    return this.repository.createAvailability(trainerId, input);
  }

  async updateAvailability(trainerId: string, availabilityId: string, input: Parameters<TrainerManagementRepository['updateAvailability']>[2], context: AuthContext) {
    ensurePermission(context, 'trainer.availability.manage');
    return this.repository.updateAvailability(trainerId, availabilityId, input);
  }

  async deleteAvailability(trainerId: string, availabilityId: string, reason: string, version: number, context: AuthContext) {
    ensurePermission(context, 'trainer.availability.manage');
    return this.repository.deleteAvailability(trainerId, availabilityId, reason, version);
  }

  async validateAvailability(trainerId: string, branchId: string, date: Date, startTime: string, endTime: string, context: AuthContext) {
    ensurePermission(context, 'trainer.eligibility.read');
    ensureBranchScope(context, branchId);
    return this.repository.validateAvailability(trainerId, branchId, date, startTime, endTime);
  }

  async listAuthorizations(trainerId: string, query: ListQuery, context: AuthContext) {
    ensurePermission(context, 'trainer.authorization.read');
    return this.repository.listAuthorizations(trainerId, query);
  }

  async createAuthorization(trainerId: string, input: Parameters<TrainerManagementRepository['createAuthorization']>[1], context: AuthContext) {
    ensurePermission(context, 'trainer.authorization.manage');
    return this.repository.createAuthorization(trainerId, input);
  }

  async transitionAuthorization(trainerId: string, authorizationId: string, input: { toStatus: AuthorizationStatus; effectiveAt: Date; reason: string; version: number }, context: AuthContext) {
    ensurePermission(context, 'trainer.authorization.manage');
    return this.repository.transitionAuthorization(trainerId, authorizationId, input);
  }

  async listCompensationRates(trainerId: string, query: ListQuery, context: AuthContext) {
    ensurePermission(context, 'trainer.compensation.read');
    return this.repository.listCompensationRates(trainerId, query);
  }

  async createCompensationRate(trainerId: string, input: Parameters<TrainerManagementRepository['createCompensationRate']>[1], context: AuthContext) {
    ensurePermission(context, 'trainer.compensation.manage');
    return this.repository.createCompensationRate(trainerId, input);
  }

  async updateCompensationRate(trainerId: string, rateId: string, input: Parameters<TrainerManagementRepository['updateCompensationRate']>[2], context: AuthContext) {
    ensurePermission(context, 'trainer.compensation.manage');
    return this.repository.updateCompensationRate(trainerId, rateId, input);
  }

  async resolveCompensationRate(input: { trainerId: string; paymentBasis: CompensationBasis; effectiveOn: Date; batchId?: string; sessionId?: string }, context: AuthContext) {
    ensurePermission(context, 'trainer.compensation.read');
    return this.repository.resolveCompensationRate(input);
  }

  async listAssignmentReferences(trainerId: string, query: ListQuery & { kind?: 'Batch' | 'Session' | 'All' }, context: AuthContext) {
    ensurePermission(context, 'trainer.read');
    return this.repository.listAssignmentReferences(trainerId, query);
  }

  async listReports(reportCode: string, filters: Record<string, unknown>, query: ListQuery, context: AuthContext) {
    ensurePermission(context, 'trainer.report.view');
    return this.repository.listReports(reportCode, filters, query);
  }

  async exportReport(reportCode: string, filters: Record<string, unknown>, query: ListQuery, context: AuthContext) {
    ensurePermission(context, 'trainer.report.export');
    return this.repository.listReports(reportCode, filters, query);
  }

  async listAuditHistory(trainerId: string, query: ListQuery & { action?: string; entityType?: string; fromDate?: Date; toDate?: Date }, context: AuthContext) {
    ensurePermission(context, 'trainer.audit.read');
    return this.repository.listAuditHistory(trainerId, query);
  }

  async findEligibleTrainers(input: { courseId: string; branchId: string; targetDate: Date; startTime?: string; endTime?: string; trainerType?: TrainerType; q?: string }, query: ListQuery, context: AuthContext) {
    ensurePermission(context, 'trainer.eligibility.read');
    ensureBranchScope(context, input.branchId);
    return this.repository.findEligibleTrainers(input, query);
  }
}
