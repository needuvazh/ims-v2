import type { AuditLogRepository } from '@ims/audit';
import type { BranchId, Uuid } from '@ims/shared-kernel';
import {
  createBranchCommandSchema,
  createInstituteCommandSchema,
  type Branch,
  type CreateBranchCommand,
  type CreateInstituteCommand,
  type Institute,
} from '../domain/organization';

export interface OrganizationRepository {
  createInstitute(input: Institute): Promise<Institute>;
  createBranch(input: Branch): Promise<Branch>;
  listInstitutes(): Promise<Institute[]>;
  listBranches(): Promise<Branch[]>;
}

export type OrganizationAuditAction = 'organization.institute_created' | 'organization.branch_created';

export type OrganizationCommandContext = {
  actorId: Uuid;
  branchId?: BranchId | null;
};

export type CreateInstituteResult = {
  institute: Institute;
};

export type CreateBranchResult = {
  branch: Branch;
};

export class OrganizationService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async createInstitute(command: CreateInstituteCommand, context: OrganizationCommandContext): Promise<CreateInstituteResult> {
    const validated = createInstituteCommandSchema.parse(command);
    const institute: Institute = {
      id: crypto.randomUUID() as Uuid,
      instituteCode: validated.instituteCode,
      instituteName: validated.instituteName,
      primaryEmail: validated.primaryEmail ?? null,
      status: 'Active',
    };

    const saved = await this.repository.createInstitute(institute);
    await this.auditLogRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: context.branchId ?? null,
      action: 'organization.institute_created',
      entityType: 'Institute',
      entityId: saved.id,
      occurredAt: new Date(),
      details: { instituteCode: saved.instituteCode },
    });

    return { institute: saved };
  }

  async createBranch(command: CreateBranchCommand, context: OrganizationCommandContext): Promise<CreateBranchResult> {
    const validated = createBranchCommandSchema.parse(command);
    const branch: Branch = {
      id: crypto.randomUUID() as BranchId,
      instituteId: validated.instituteId as Uuid,
      branchCode: validated.branchCode,
      branchName: validated.branchName,
      city: validated.city ?? null,
      status: 'Active',
    };

    const saved = await this.repository.createBranch(branch);
    await this.auditLogRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: saved.id,
      action: 'organization.branch_created',
      entityType: 'Branch',
      entityId: saved.id,
      occurredAt: new Date(),
      details: { branchCode: saved.branchCode },
    });

    return { branch: saved };
  }

  async listDashboardSummary() {
    const [institutes, branches] = await Promise.all([this.repository.listInstitutes(), this.repository.listBranches()]);
    return {
      institutes,
      branches,
    };
  }
}

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private institutes: Institute[] = [];
  private branches: Branch[] = [];

  async createInstitute(input: Institute) {
    this.institutes = [...this.institutes, input];
    return input;
  }

  async createBranch(input: Branch) {
    this.branches = [...this.branches, input];
    return input;
  }

  async listInstitutes() {
    return [...this.institutes];
  }

  async listBranches() {
    return [...this.branches];
  }
}
