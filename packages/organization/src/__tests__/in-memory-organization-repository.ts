/**
 * In-memory implementation of OrganizationRepository for use in unit tests.
 * This file must NOT be imported from production code.
 *
 * @packageDocumentation test-only
 */
import { DomainError } from '@ims/shared-kernel';
import type {
  Branch,
  Classroom,
  Department,
  Institute,
  ListFilters,
  OrganizationHierarchyNode,
  PaginatedResult,
} from '../domain/organization';
import type { OrganizationRepository } from '../application/organization-service';

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private institutes: Institute[] = [];
  private branches: Branch[] = [];
  private departments: Department[] = [];
  private classrooms: Classroom[] = [];

  // Institute
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

  // Branch
  async createBranch(input: Branch) { this.branches = [...this.branches, input]; return input; }
  async findBranchById(id: string) { return this.branches.find((b) => b.id === id) ?? null; }
  async findBranchByCode(branchCode: string) { return this.branches.find((b) => b.branchCode === branchCode) ?? null; }
  async updateBranch(id: string, updates: Partial<Branch>) {
    this.branches = this.branches.map((b) => b.id === id ? { ...b, ...updates } : b);
    const updated = this.branches.find((b) => b.id === id)!;
    if (updates.status === 'Inactive' || updates.status === 'Archived') {
      // cascade status to children
      this.departments = this.departments.map((d) => d.branchId === id ? { ...d, status: updates.status! } : d);
      this.classrooms = this.classrooms.map((c) => c.branchId === id ? { ...c, status: updates.status! } : c);
    }
    return updated;
  }
  async listBranches(filters?: ListFilters & { instituteId?: string }): Promise<PaginatedResult<Branch>> {
    let items = this.branches;
    if (filters?.instituteId) items = items.filter((b) => b.instituteId === filters.instituteId);
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total: items.length, page, pageSize, totalPages: Math.ceil(items.length / pageSize) };
  }

  // Department
  async createDepartment(input: Department) { this.departments = [...this.departments, input]; return input; }
  async findDepartmentById(id: string) { return this.departments.find((d) => d.id === id) ?? null; }
  async findDepartmentByCode(branchId: string, departmentCode: string) {
    return this.departments.find((d) => d.branchId === branchId && d.departmentCode === departmentCode) ?? null;
  }
  async updateDepartment(id: string, updates: Partial<Department>) {
    this.departments = this.departments.map((d) => d.id === id ? { ...d, ...updates } : d);
    return this.departments.find((d) => d.id === id)!;
  }
  async listDepartments(branchId: string) { return this.departments.filter((d) => d.branchId === branchId); }

  // Classroom
  async createClassroom(input: Classroom) { this.classrooms = [...this.classrooms, input]; return input; }
  async findClassroomById(id: string) { return this.classrooms.find((c) => c.id === id) ?? null; }
  async findClassroomByName(branchId: string, classroomName: string) {
    return this.classrooms.find((c) => c.branchId === branchId && c.classroomName === classroomName) ?? null;
  }
  async updateClassroom(id: string, updates: Partial<Classroom>) {
    this.classrooms = this.classrooms.map((c) => c.id === id ? { ...c, ...updates } : c);
    return this.classrooms.find((c) => c.id === id)!;
  }
  async listClassrooms(filters?: ListFilters & { branchId?: string }): Promise<PaginatedResult<Classroom>> {
    let items = this.classrooms;
    if (filters?.branchId) items = items.filter((c) => c.branchId === filters.branchId);
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total: items.length, page, pageSize, totalPages: Math.ceil(items.length / pageSize) };
  }

  // Hierarchy Tree
  async getOrganizationHierarchy(instituteId: string): Promise<OrganizationHierarchyNode> {
    const inst = this.institutes.find((i) => i.id === instituteId);
    if (!inst) throw new DomainError('not_found', `Institute ${instituteId} not found for hierarchy.`);

    const instBranches = this.branches.filter((b) => b.instituteId === instituteId);
    const branchNodes: OrganizationHierarchyNode[] = instBranches.map((b) => {
      const branchDepts = this.departments.filter((d) => d.branchId === b.id);
      const branchRooms = this.classrooms.filter((c) => c.branchId === b.id);

      const children: OrganizationHierarchyNode[] = [
        ...branchDepts.map((d) => ({
          id: d.id,
          name: d.departmentName,
          type: 'Department' as const,
          code: d.departmentCode,
          status: d.status,
        })),
        ...branchRooms.map((c) => ({
          id: c.id,
          name: c.classroomName,
          type: 'Classroom' as const,
          status: c.status,
        })),
      ];

      return {
        id: b.id,
        name: b.branchName,
        type: 'Branch' as const,
        code: b.branchCode,
        status: b.status,
        children,
      };
    });

    return {
      id: inst.id,
      name: inst.instituteName,
      type: 'Institute' as const,
      code: inst.instituteCode,
      status: inst.status,
      children: branchNodes,
    };
  }
}
