import type { AuditLogRepository } from '@ims/audit';
import type { BranchId, Uuid } from '@ims/shared-kernel';
import { DomainError } from '@ims/shared-kernel';
import {
  createInstituteCommandSchema,
  updateInstituteCommandSchema,
  createBranchCommandSchema,
  updateBranchCommandSchema,
  createDepartmentCommandSchema,
  type Institute,
  type Branch,
  type Department,
  type CreateInstituteCommand,
  type UpdateInstituteCommand,
  type CreateBranchCommand,
  type UpdateBranchCommand,
  type CreateDepartmentCommand,
  type PaginatedResult,
  type ListFilters,
} from '../domain/organization';

// ─── Repository Interfaces ───────────────────────────────────────────────────

export interface OrganizationRepository {
  // Institute
  createInstitute(input: Institute): Promise<Institute>;
  findInstituteById(id: string): Promise<Institute | null>;
  updateInstitute(id: string, updates: Partial<Institute>): Promise<Institute>;
  listInstitutes(filters?: ListFilters): Promise<PaginatedResult<Institute>>;

  // Branch
  createBranch(input: Branch): Promise<Branch>;
  findBranchById(id: string): Promise<Branch | null>;
  updateBranch(id: string, updates: Partial<Branch>): Promise<Branch>;
  listBranches(filters?: ListFilters & { instituteId?: string }): Promise<PaginatedResult<Branch>>;

  // Department
  createDepartment(input: Department): Promise<Department>;
  listDepartments(branchId: string): Promise<Department[]>;
}

export type OrganizationAuditAction =
  | 'organization.institute_created'
  | 'organization.institute_updated'
  | 'organization.branch_created'
  | 'organization.branch_updated'
  | 'organization.department_created';

export type OrgCommandContext = {
  actorId: Uuid;
  branchId?: BranchId | null;
};

// ─── Service ─────────────────────────────────────────────────────────────────

export class OrganizationService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  // ── Institute ──

  async createInstitute(command: CreateInstituteCommand, context: OrgCommandContext): Promise<Institute> {
    const validated = createInstituteCommandSchema.parse(command);
    const institute: Institute = {
      id: crypto.randomUUID() as Uuid,
      instituteCode: validated.instituteCode,
      instituteName: validated.instituteName,
      registrationNumber: validated.registrationNumber ?? null,
      primaryEmail: validated.primaryEmail ?? null,
      primaryPhone: validated.primaryPhone ?? null,
      website: validated.website ?? null,
      address: validated.address ?? null,
      country: validated.country ?? null,
      status: 'Active',
    };

    const saved = await this.repository.createInstitute(institute);
    await this.auditLogRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'organization.institute_created',
      entityType: 'Institute',
      entityId: saved.id,
      occurredAt: new Date(),
      details: { instituteCode: saved.instituteCode },
    });

    return saved;
  }

  async getInstitute(instituteId: string): Promise<Institute> {
    const institute = await this.repository.findInstituteById(instituteId);
    if (!institute) throw new DomainError('not_found', `Institute ${instituteId} not found.`);
    return institute;
  }

  async updateInstitute(
    instituteId: string,
    command: UpdateInstituteCommand,
    context: OrgCommandContext,
  ): Promise<Institute> {
    const validated = updateInstituteCommandSchema.parse(command);
    const existing = await this.repository.findInstituteById(instituteId);
    if (!existing) throw new DomainError('not_found', `Institute ${instituteId} not found.`);

    const updated = await this.repository.updateInstitute(instituteId, validated);
    await this.auditLogRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'organization.institute_updated',
      entityType: 'Institute',
      entityId: instituteId,
      occurredAt: new Date(),
      details: validated,
    });
    return updated;
  }

  async listInstitutes(filters?: ListFilters): Promise<PaginatedResult<Institute>> {
    return this.repository.listInstitutes(filters);
  }

  // ── Branch ──

  async createBranch(command: CreateBranchCommand, context: OrgCommandContext): Promise<Branch> {
    const validated = createBranchCommandSchema.parse(command);
    const branch: Branch = {
      id: crypto.randomUUID() as BranchId,
      instituteId: validated.instituteId as Uuid,
      branchCode: validated.branchCode,
      branchName: validated.branchName,
      address: validated.address ?? null,
      city: validated.city ?? null,
      country: validated.country ?? null,
      phone: validated.phone ?? null,
      email: validated.email ?? null,
      branchManagerId: null,
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
    return saved;
  }

  async getBranch(branchId: string): Promise<Branch> {
    const branch = await this.repository.findBranchById(branchId);
    if (!branch) throw new DomainError('not_found', `Branch ${branchId} not found.`);
    return branch;
  }

  async updateBranch(
    branchId: string,
    command: UpdateBranchCommand,
    context: OrgCommandContext,
  ): Promise<Branch> {
    const validated = updateBranchCommandSchema.parse(command);
    const existing = await this.repository.findBranchById(branchId);
    if (!existing) throw new DomainError('not_found', `Branch ${branchId} not found.`);

    const updated = await this.repository.updateBranch(branchId, validated);
    await this.auditLogRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: existing.id,
      action: 'organization.branch_updated',
      entityType: 'Branch',
      entityId: branchId,
      occurredAt: new Date(),
      details: validated,
    });
    return updated;
  }

  async listBranches(filters?: ListFilters & { instituteId?: string }): Promise<PaginatedResult<Branch>> {
    return this.repository.listBranches(filters);
  }

  // ── Department ──

  async createDepartment(command: CreateDepartmentCommand, context: OrgCommandContext): Promise<Department> {
    const validated = createDepartmentCommandSchema.parse(command);
    const department: Department = {
      id: crypto.randomUUID() as Uuid,
      branchId: validated.branchId as BranchId,
      departmentCode: validated.departmentCode,
      departmentName: validated.departmentName,
      description: validated.description ?? null,
      status: 'Active',
    };

    const saved = await this.repository.createDepartment(department);
    await this.auditLogRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: department.branchId,
      action: 'organization.department_created',
      entityType: 'Department',
      entityId: saved.id,
      occurredAt: new Date(),
      details: { departmentCode: saved.departmentCode },
    });
    return saved;
  }

  async listDepartments(branchId: string): Promise<Department[]> {
    return this.repository.listDepartments(branchId);
  }

  // ── Dashboard summary ──

  async listDashboardSummary() {
    const [institutesResult, branchesResult] = await Promise.all([
      this.repository.listInstitutes({ pageSize: 100 }),
      this.repository.listBranches({ pageSize: 100 }),
    ]);
    return {
      institutes: institutesResult.items,
      branches: branchesResult.items,
      totalInstitutes: institutesResult.total,
      totalBranches: branchesResult.total,
    };
  }
}

// ─── In-Memory implementation (testing only) ─────────────────────────────────

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private institutes: Institute[] = [];
  private branches: Branch[] = [];
  private departments: Department[] = [];

  async createInstitute(input: Institute) { this.institutes = [...this.institutes, input]; return input; }
  async findInstituteById(id: string) { return this.institutes.find((i) => i.id === id) ?? null; }
  async updateInstitute(id: string, updates: Partial<Institute>) {
    this.institutes = this.institutes.map((i) => i.id === id ? { ...i, ...updates } : i);
    return this.institutes.find((i) => i.id === id)!;
  }
  async listInstitutes(filters?: ListFilters): Promise<PaginatedResult<Institute>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const items = this.institutes.slice((page - 1) * pageSize, page * pageSize);
    return { items, total: this.institutes.length, page, pageSize, totalPages: Math.ceil(this.institutes.length / pageSize) };
  }

  async createBranch(input: Branch) { this.branches = [...this.branches, input]; return input; }
  async findBranchById(id: string) { return this.branches.find((b) => b.id === id) ?? null; }
  async updateBranch(id: string, updates: Partial<Branch>) {
    this.branches = this.branches.map((b) => b.id === id ? { ...b, ...updates } : b);
    return this.branches.find((b) => b.id === id)!;
  }
  async listBranches(filters?: ListFilters & { instituteId?: string }): Promise<PaginatedResult<Branch>> {
    let items = this.branches;
    if (filters?.instituteId) items = items.filter((b) => b.instituteId === filters.instituteId);
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total: items.length, page, pageSize, totalPages: Math.ceil(items.length / pageSize) };
  }

  async createDepartment(input: Department) { this.departments = [...this.departments, input]; return input; }
  async listDepartments(branchId: string) { return this.departments.filter((d) => d.branchId === branchId); }
}
