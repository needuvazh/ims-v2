import type { AuditLogRepository } from '@ims/audit';
import type { BranchId, Uuid } from '@ims/shared-kernel';
import { DomainError } from '@ims/shared-kernel';
import {
  createInstituteCommandSchema,
  updateInstituteCommandSchema,
  createBranchCommandSchema,
  updateBranchCommandSchema,
  createDepartmentCommandSchema,
  updateDepartmentCommandSchema,
  createClassroomCommandSchema,
  updateClassroomCommandSchema,
  type Institute,
  type Branch,
  type Department,
  type Classroom,
  type CreateInstituteCommand,
  type UpdateInstituteCommand,
  type CreateBranchCommand,
  type UpdateBranchCommand,
  type CreateDepartmentCommand,
  type UpdateDepartmentCommand,
  type CreateClassroomCommand,
  type UpdateClassroomCommand,
  type PaginatedResult,
  type ListFilters,
  type OrganizationHierarchyNode,
  type UserPresenceVerifier,
} from '../domain/organization';

// ─── Repository Interfaces ───────────────────────────────────────────────────

export interface OrganizationRepository {
  // Institute
  createInstitute(input: Institute): Promise<Institute>;
  findInstituteById(id: string): Promise<Institute | null>;
  findInstituteByCode(instituteCode: string): Promise<Institute | null>;
  updateInstitute(id: string, updates: Partial<Institute>): Promise<Institute>;
  listInstitutes(filters?: ListFilters): Promise<PaginatedResult<Institute>>;

  // Branch
  createBranch(input: Branch): Promise<Branch>;
  findBranchById(id: string): Promise<Branch | null>;
  findBranchByCode(branchCode: string): Promise<Branch | null>;
  updateBranch(id: string, updates: Partial<Branch>): Promise<Branch>;
  listBranches(filters?: ListFilters & { instituteId?: string }): Promise<PaginatedResult<Branch>>;

  // Department
  createDepartment(input: Department): Promise<Department>;
  findDepartmentById(id: string): Promise<Department | null>;
  findDepartmentByCode(branchId: string, departmentCode: string): Promise<Department | null>;
  updateDepartment(id: string, updates: Partial<Department>): Promise<Department>;
  listDepartments(branchId: string): Promise<Department[]>;

  // Classroom
  createClassroom(input: Classroom): Promise<Classroom>;
  findClassroomById(id: string): Promise<Classroom | null>;
  findClassroomByName(branchId: string, classroomName: string): Promise<Classroom | null>;
  updateClassroom(id: string, updates: Partial<Classroom>): Promise<Classroom>;
  listClassrooms(filters?: ListFilters & { branchId?: string }): Promise<PaginatedResult<Classroom>>;

  // Hierarchy Tree
  getOrganizationHierarchy(instituteId: string): Promise<OrganizationHierarchyNode>;
}

export type OrganizationAuditAction =
  | 'organization.institute_created'
  | 'organization.institute_updated'
  | 'organization.branch_created'
  | 'organization.branch_updated'
  | 'organization.branch_activated'
  | 'organization.branch_deactivated'
  | 'organization.branch_manager_assigned'
  | 'organization.department_created'
  | 'organization.department_updated'
  | 'organization.department_activated'
  | 'organization.department_deactivated'
  | 'organization.department_head_assigned'
  | 'organization.classroom_created'
  | 'organization.classroom_updated'
  | 'organization.classroom_activated'
  | 'organization.classroom_deactivated';

export type OrgCommandContext = {
  actorId: Uuid;
  branchId?: BranchId | null;
};

// ─── Service ─────────────────────────────────────────────────────────────────

export class OrganizationService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly userVerifier?: UserPresenceVerifier,
  ) {}

  // ── Active Validation Helpers ──

  private isDateWithinRange(date: Date, start: Date | null, end: Date | null): boolean {
    const checkTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    if (start) {
      const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      if (checkTime < startTime) return false;
    }
    if (end) {
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      if (checkTime > endTime) return false;
    }
    return true;
  }

  private async verifyUserIsActive(userId: string | null): Promise<void> {
    if (!userId || !this.userVerifier) return;
    const active = await this.userVerifier.isActiveUser(userId);
    if (!active) {
      throw new DomainError('precondition_failed', `User ${userId} is not a valid active IAM user.`);
    }
  }

  async isBranchActive(branchId: string): Promise<boolean> {
    const branch = await this.repository.findBranchById(branchId);
    if (!branch) return false;
    if (branch.status !== 'Active') return false;
    return this.isDateWithinRange(new Date(), branch.effectiveStartDate, branch.effectiveEndDate);
  }

  async isClassroomActive(classroomId: string): Promise<boolean> {
    const classroom = await this.repository.findClassroomById(classroomId);
    if (!classroom) return false;
    if (classroom.status !== 'Active') return false;
    return this.isDateWithinRange(new Date(), classroom.effectiveStartDate, classroom.effectiveEndDate);
  }

  async isDepartmentActive(departmentId: string): Promise<boolean> {
    const dept = await this.repository.findDepartmentById(departmentId);
    if (!dept) return false;
    if (dept.status !== 'Active') return false;
    return this.isDateWithinRange(new Date(), dept.effectiveStartDate, dept.effectiveEndDate);
  }

  // ── Institute ──

  async createInstitute(command: CreateInstituteCommand, context: OrgCommandContext): Promise<Institute> {
    const validated = createInstituteCommandSchema.parse(command);

    // Uniqueness: Institute Code must be unique
    const duplicate = await this.repository.findInstituteByCode(validated.instituteCode);
    if (duplicate) {
      throw new DomainError('institute_code_already_exists', `Institute with code ${validated.instituteCode} already exists.`);
    }

    const institute: Institute = {
      id: crypto.randomUUID() as Uuid,
      instituteCode: validated.instituteCode,
      instituteName: validated.instituteName,
      registrationNumber: validated.registrationNumber ?? null,
      taxNumber: validated.taxNumber ?? null,
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

    // Uniqueness: Branch Code must be unique
    const duplicate = await this.repository.findBranchByCode(validated.branchCode);
    if (duplicate) {
      throw new DomainError('branch_code_already_exists', `Branch with code ${validated.branchCode} already exists.`);
    }

    // Verify manager status
    if (validated.branchManagerId) {
      await this.verifyUserIsActive(validated.branchManagerId);
    }

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
      branchManagerId: validated.branchManagerId ?? null,
      status: 'Active',
      effectiveStartDate: validated.effectiveStartDate ?? null,
      effectiveEndDate: validated.effectiveEndDate ?? null,
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
      details: { branchCode: saved.branchCode, managerId: saved.branchManagerId },
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

    // Verify manager status
    if (validated.branchManagerId) {
      await this.verifyUserIsActive(validated.branchManagerId);
    }

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

    if (validated.status && validated.status !== existing.status) {
      const action = validated.status === 'Active' ? 'organization.branch_activated' : 'organization.branch_deactivated';
      await this.auditLogRepository.append({
        id: crypto.randomUUID(),
        actorId: context.actorId,
        branchId: existing.id,
        action,
        entityType: 'Branch',
        entityId: branchId,
        occurredAt: new Date(),
        details: { from: existing.status, to: validated.status },
      });
    }

    if (validated.branchManagerId !== undefined && validated.branchManagerId !== existing.branchManagerId) {
      await this.auditLogRepository.append({
        id: crypto.randomUUID(),
        actorId: context.actorId,
        branchId: existing.id,
        action: 'organization.branch_manager_assigned',
        entityType: 'Branch',
        entityId: branchId,
        occurredAt: new Date(),
        details: { managerId: validated.branchManagerId },
      });
    }
    return updated;
  }

  async listBranches(filters?: ListFilters & { instituteId?: string }): Promise<PaginatedResult<Branch>> {
    return this.repository.listBranches(filters);
  }

  // ── Department ──

  async createDepartment(command: CreateDepartmentCommand, context: OrgCommandContext): Promise<Department> {
    const validated = createDepartmentCommandSchema.parse(command);

    // Validate active branch
    const isBranchOk = await this.isBranchActive(validated.branchId);
    if (!isBranchOk) {
      throw new DomainError('inactive_branch_cannot_be_used', `Cannot create department under inactive or expired branch ${validated.branchId}.`);
    }

    // Uniqueness: Department Code must be unique per branch
    const duplicate = await this.repository.findDepartmentByCode(validated.branchId, validated.departmentCode);
    if (duplicate) {
      throw new DomainError('department_code_already_exists', `Department with code ${validated.departmentCode} already exists in branch ${validated.branchId}.`);
    }

    // Verify department head status
    if (validated.departmentHeadId) {
      await this.verifyUserIsActive(validated.departmentHeadId);
    }

    const department: Department = {
      id: crypto.randomUUID() as Uuid,
      branchId: validated.branchId as BranchId,
      departmentCode: validated.departmentCode,
      departmentName: validated.departmentName,
      departmentHeadId: validated.departmentHeadId ?? null,
      description: validated.description ?? null,
      status: 'Active',
      effectiveStartDate: validated.effectiveStartDate ?? null,
      effectiveEndDate: validated.effectiveEndDate ?? null,
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
      details: { departmentCode: saved.departmentCode, headId: saved.departmentHeadId },
    });
    return saved;
  }

  async getDepartment(departmentId: string): Promise<Department> {
    const department = await this.repository.findDepartmentById(departmentId);
    if (!department) throw new DomainError('not_found', `Department ${departmentId} not found.`);
    return department;
  }

  async updateDepartment(
    departmentId: string,
    command: UpdateDepartmentCommand,
    context: OrgCommandContext,
  ): Promise<Department> {
    const validated = updateDepartmentCommandSchema.parse(command);
    const existing = await this.repository.findDepartmentById(departmentId);
    if (!existing) throw new DomainError('not_found', `Department ${departmentId} not found.`);

    if (validated.status === 'Active') {
      const isBranchOk = await this.isBranchActive(existing.branchId);
      if (!isBranchOk) {
        throw new DomainError('inactive_branch_cannot_be_used', `Cannot activate department under inactive or expired branch ${existing.branchId}.`);
      }
    }

    const updated = await this.repository.updateDepartment(departmentId, validated);
    await this.auditLogRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: existing.branchId,
      action: 'organization.department_updated',
      entityType: 'Department',
      entityId: departmentId,
      occurredAt: new Date(),
      details: validated,
    });

    if (validated.status && validated.status !== existing.status) {
      const action = validated.status === 'Active' ? 'organization.department_activated' : 'organization.department_deactivated';
      await this.auditLogRepository.append({
        id: crypto.randomUUID(),
        actorId: context.actorId,
        branchId: existing.branchId,
        action,
        entityType: 'Department',
        entityId: departmentId,
        occurredAt: new Date(),
        details: { from: existing.status, to: validated.status },
      });
    }

    if (validated.departmentHeadId !== undefined && validated.departmentHeadId !== existing.departmentHeadId) {
      if (validated.departmentHeadId) {
        await this.verifyUserIsActive(validated.departmentHeadId);
      }
      await this.auditLogRepository.append({
        id: crypto.randomUUID(),
        actorId: context.actorId,
        branchId: existing.branchId,
        action: 'organization.department_head_assigned',
        entityType: 'Department',
        entityId: departmentId,
        occurredAt: new Date(),
        details: { headId: validated.departmentHeadId },
      });
    }
    return updated;
  }

  async listDepartments(branchId: string): Promise<Department[]> {
    return this.repository.listDepartments(branchId);
  }

  // ── Classroom ──

  async createClassroom(command: CreateClassroomCommand, context: OrgCommandContext): Promise<Classroom> {
    const validated = createClassroomCommandSchema.parse(command);

    // Validate active branch
    const isBranchOk = await this.isBranchActive(validated.branchId);
    if (!isBranchOk) {
      throw new DomainError('inactive_branch_cannot_be_used', `Cannot create classroom under inactive or expired branch ${validated.branchId}.`);
    }

    // Uniqueness: Classroom Name must be unique per branch
    const duplicate = await this.repository.findClassroomByName(validated.branchId, validated.classroomName);
    if (duplicate) {
      throw new DomainError('classroom_name_already_exists', `Classroom with name ${validated.classroomName} already exists in branch ${validated.branchId}.`);
    }

    const classroom: Classroom = {
      id: crypto.randomUUID() as Uuid,
      branchId: validated.branchId as BranchId,
      classroomName: validated.classroomName,
      capacity: validated.capacity,
      location: validated.location ?? null,
      status: 'Active',
      effectiveStartDate: validated.effectiveStartDate ?? null,
      effectiveEndDate: validated.effectiveEndDate ?? null,
    };

    const saved = await this.repository.createClassroom(classroom);
    await this.auditLogRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: classroom.branchId,
      action: 'organization.classroom_created',
      entityType: 'Classroom',
      entityId: saved.id,
      occurredAt: new Date(),
      details: { classroomName: saved.classroomName, capacity: saved.capacity },
    });
    return saved;
  }

  async getClassroom(classroomId: string): Promise<Classroom> {
    const classroom = await this.repository.findClassroomById(classroomId);
    if (!classroom) throw new DomainError('not_found', `Classroom ${classroomId} not found.`);
    return classroom;
  }

  async updateClassroom(
    classroomId: string,
    command: UpdateClassroomCommand,
    context: OrgCommandContext,
  ): Promise<Classroom> {
    const validated = updateClassroomCommandSchema.parse(command);
    const existing = await this.repository.findClassroomById(classroomId);
    if (!existing) throw new DomainError('not_found', `Classroom ${classroomId} not found.`);

    if (validated.status === 'Active') {
      const isBranchOk = await this.isBranchActive(existing.branchId);
      if (!isBranchOk) {
        throw new DomainError('inactive_branch_cannot_be_used', `Cannot activate classroom under inactive or expired branch ${existing.branchId}.`);
      }
    }

    const updated = await this.repository.updateClassroom(classroomId, validated);
    await this.auditLogRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: existing.branchId,
      action: 'organization.classroom_updated',
      entityType: 'Classroom',
      entityId: classroomId,
      occurredAt: new Date(),
      details: validated,
    });

    if (validated.status && validated.status !== existing.status) {
      const action = validated.status === 'Active' ? 'organization.classroom_activated' : 'organization.classroom_deactivated';
      await this.auditLogRepository.append({
        id: crypto.randomUUID(),
        actorId: context.actorId,
        branchId: existing.branchId,
        action,
        entityType: 'Classroom',
        entityId: classroomId,
        occurredAt: new Date(),
        details: { from: existing.status, to: validated.status },
      });
    }
    return updated;
  }

  async listClassrooms(filters?: ListFilters & { branchId?: string }): Promise<PaginatedResult<Classroom>> {
    return this.repository.listClassrooms(filters);
  }

  // ── Hierarchy query ──

  async getOrganizationHierarchy(instituteId: string): Promise<OrganizationHierarchyNode> {
    return this.repository.getOrganizationHierarchy(instituteId);
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

