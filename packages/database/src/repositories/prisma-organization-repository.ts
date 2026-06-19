import type { PrismaClient } from '@prisma/client';
import type { OrganizationRepository } from '@ims/organization';
import type {
  Institute,
  Branch,
  Department,
  ListFilters,
  PaginatedResult,
} from '@ims/organization';
import type { BranchId, Uuid } from '@ims/shared-kernel';

type InstituteRow = {
  id: string; instituteCode: string; instituteName: string;
  registrationNumber: string | null; primaryEmail: string | null;
  primaryPhone: string | null; website: string | null;
  address: string | null; country: string | null; status: string;
};

type BranchRow = {
  id: string; instituteId: string; branchCode: string; branchName: string;
  address: string | null; city: string | null; country: string | null;
  phone: string | null; email: string | null; branchManagerId: string | null; status: string;
};

type DepartmentRow = {
  id: string; branchId: string; departmentCode: string;
  departmentName: string; description: string | null; status: string;
};

function toInstitute(row: InstituteRow): Institute {
  return { ...row, id: row.id as Uuid, status: row.status as Institute['status'] };
}
function toBranch(row: BranchRow): Branch {
  return { ...row, id: row.id as BranchId, instituteId: row.instituteId as Uuid, status: row.status as Branch['status'] };
}
function toDepartment(row: DepartmentRow): Department {
  return { ...row, id: row.id as Uuid, branchId: row.branchId as BranchId, status: row.status as Department['status'] };
}

const PAGE_SIZE = 20;

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createInstitute(input: Institute): Promise<Institute> {
    const row = await this.prisma.institute.create({
      data: {
        id: input.id,
        instituteCode: input.instituteCode,
        instituteName: input.instituteName,
        registrationNumber: input.registrationNumber,
        primaryEmail: input.primaryEmail,
        primaryPhone: input.primaryPhone,
        website: input.website,
        address: input.address,
        country: input.country,
        status: input.status,
      },
    });
    return toInstitute(row);
  }

  async findInstituteById(id: string): Promise<Institute | null> {
    const row = await this.prisma.institute.findFirst({ where: { id, isDeleted: false } });
    return row ? toInstitute(row) : null;
  }

  async updateInstitute(id: string, updates: Partial<Institute>): Promise<Institute> {
    const row = await this.prisma.institute.update({
      where: { id },
      data: { ...updates, updatedAt: new Date() },
    });
    return toInstitute(row);
  }

  async listInstitutes(filters?: ListFilters): Promise<PaginatedResult<Institute>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? PAGE_SIZE;
    const where = {
      isDeleted: false,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search ? {
        OR: [
          { instituteName: { contains: filters.search, mode: 'insensitive' as const } },
          { instituteCode: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.institute.count({ where }),
      this.prisma.institute.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { instituteName: 'asc' } }),
    ]);

    return { items: rows.map(toInstitute), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createBranch(input: Branch): Promise<Branch> {
    const row = await this.prisma.branch.create({
      data: {
        id: input.id,
        instituteId: input.instituteId,
        branchCode: input.branchCode,
        branchName: input.branchName,
        address: input.address,
        city: input.city,
        country: input.country,
        phone: input.phone,
        email: input.email,
        branchManagerId: input.branchManagerId,
        status: input.status,
      },
    });
    return toBranch(row);
  }

  async findBranchById(id: string): Promise<Branch | null> {
    const row = await this.prisma.branch.findFirst({ where: { id, isDeleted: false } });
    return row ? toBranch(row) : null;
  }

  async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch> {
    const row = await this.prisma.branch.update({ where: { id }, data: { ...updates, updatedAt: new Date() } });
    return toBranch(row);
  }

  async listBranches(filters?: ListFilters & { instituteId?: string }): Promise<PaginatedResult<Branch>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? PAGE_SIZE;
    const where = {
      isDeleted: false,
      ...(filters?.instituteId ? { instituteId: filters.instituteId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search ? {
        OR: [
          { branchName: { contains: filters.search, mode: 'insensitive' as const } },
          { branchCode: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.branch.count({ where }),
      this.prisma.branch.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { branchName: 'asc' } }),
    ]);

    return { items: rows.map(toBranch), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createDepartment(input: Department): Promise<Department> {
    const row = await this.prisma.department.create({
      data: {
        id: input.id,
        branchId: input.branchId,
        departmentCode: input.departmentCode,
        departmentName: input.departmentName,
        description: input.description,
        status: input.status,
      },
    });
    return toDepartment(row);
  }

  async listDepartments(branchId: string): Promise<Department[]> {
    const rows = await this.prisma.department.findMany({
      where: { branchId, isDeleted: false },
      orderBy: { departmentName: 'asc' },
    });
    return rows.map(toDepartment);
  }
}
