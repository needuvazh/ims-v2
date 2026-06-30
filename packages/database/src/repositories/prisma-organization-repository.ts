import type { PrismaClient } from '@prisma/client';
import { DomainError } from '@ims/shared-kernel';
import type { OrganizationRepository } from '@ims/organization';
import type {
  Institute,
  Branch,
  Department,
  Classroom,
  ListFilters,
  PaginatedResult,
  OrganizationHierarchyNode,
  RecordStatus,
} from '@ims/organization';
import type { BranchId, Uuid } from '@ims/shared-kernel';

type InstituteRow = {
  id: string;
  instituteCode: string;
  instituteName: string;
  registrationNumber: string | null;
  taxNumber: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  status: string;
  legalNameEnglish: string | null;
  legalNameArabic: string | null;
  tradeName: string | null;
  shortName: string | null;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
  currency: string | null;
  timezone: string | null;
  language: string | null;
};

type BranchRow = {
  id: string;
  instituteId: string;
  parentBranchId: string | null;
  branchCode: string;
  branchName: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  branchManagerId: string | null;
  status: string;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
};

type DepartmentRow = {
  id: string;
  branchId: string;
  departmentCode: string;
  departmentName: string;
  departmentHeadId: string | null;
  description: string | null;
  status: string;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
};

type ClassroomRow = {
  id: string;
  branchId: string;
  classroomName: string;
  capacity: number;
  location: string | null;
  status: string;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
};

function toInstitute(row: InstituteRow): Institute {
  return {
    ...row,
    id: row.id as Uuid,
    status: row.status as Institute['status'],
  };
}

type BranchRowWithRelations = BranchRow & {
  contacts?: any[];
  addresses?: any[];
  settings?: any | null;
  policies?: any[];
};

function toBranch(row: BranchRowWithRelations): Branch {
  return {
    id: row.id as BranchId,
    instituteId: row.instituteId as Uuid,
    parentBranchId: row.parentBranchId,
    branchCode: row.branchCode,
    branchName: row.branchName,
    address: row.address,
    city: row.city,
    country: row.country,
    phone: row.phone,
    email: row.email,
    branchManagerId: row.branchManagerId,
    status: row.status as Branch['status'],
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    contacts: row.contacts?.map((c) => ({
      id: c.id as Uuid,
      branchId: c.branchId as BranchId,
      contactType: c.contactType,
      contactValue: c.contactValue,
      isPrimary: c.isPrimary,
    })),
    addresses: row.addresses?.map((a) => ({
      id: a.id as Uuid,
      branchId: a.branchId as BranchId,
      building: a.building,
      street: a.street,
      city: a.city,
      governorate: a.governorate,
      country: a.country,
      postalCode: a.postalCode,
      latitude: a.latitude,
      longitude: a.longitude,
      mapUrl: a.mapUrl,
    })),
    settings: row.settings ? {
      id: row.settings.id as Uuid,
      branchId: row.settings.branchId as BranchId,
      currency: row.settings.currency,
      timezone: row.settings.timezone,
      weekStartDay: row.settings.weekStartDay,
      workingCalendar: row.settings.workingCalendar,
    } : undefined,
    policies: row.policies?.map((p) => ({
      id: p.id as Uuid,
      branchId: p.branchId as BranchId,
      policyType: p.policyType,
      policyContent: p.policyContent,
    })),
  };
}

function toDepartment(row: DepartmentRow): Department {
  return {
    ...row,
    id: row.id as Uuid,
    branchId: row.branchId as BranchId,
    status: row.status as Department['status'],
  };
}

function toClassroom(row: ClassroomRow): Classroom {
  return {
    ...row,
    id: row.id as Uuid,
    branchId: row.branchId as BranchId,
    status: row.status as Classroom['status'],
  };
}

const PAGE_SIZE = 20;

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Institute ─────────────────────────────────────────────────────────────

  async createInstitute(input: Institute): Promise<Institute> {
    const row = await this.prisma.institute.create({
      data: {
        id: input.id,
        instituteCode: input.instituteCode,
        instituteName: input.instituteName,
        registrationNumber: input.registrationNumber,
        taxNumber: input.taxNumber,
        primaryEmail: input.primaryEmail,
        primaryPhone: input.primaryPhone,
        website: input.website,
        address: input.address,
        country: input.country,
        status: input.status,
        legalNameEnglish: input.legalNameEnglish,
        legalNameArabic: input.legalNameArabic,
        tradeName: input.tradeName,
        shortName: input.shortName,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: input.effectiveEndDate,
        currency: input.currency,
        timezone: input.timezone,
        language: input.language,
      },
    });
    return toInstitute(row);
  }

  async findInstituteById(id: string): Promise<Institute | null> {
    const row = await this.prisma.institute.findUnique({ where: { id } });
    return row && !row.isDeleted ? toInstitute(row) : null;
  }

  async findInstituteByCode(instituteCode: string): Promise<Institute | null> {
    const row = await this.prisma.institute.findFirst({ where: { instituteCode, isDeleted: false } });
    return row ? toInstitute(row) : null;
  }

  async updateInstitute(id: string, updates: Partial<Institute>): Promise<Institute> {
    const row = await this.prisma.institute.update({
      where: { id },
      data: {
        ...(updates.instituteName !== undefined && { instituteName: updates.instituteName }),
        ...(updates.registrationNumber !== undefined && { registrationNumber: updates.registrationNumber }),
        ...(updates.taxNumber !== undefined && { taxNumber: updates.taxNumber }),
        ...(updates.primaryEmail !== undefined && { primaryEmail: updates.primaryEmail }),
        ...(updates.primaryPhone !== undefined && { primaryPhone: updates.primaryPhone }),
        ...(updates.website !== undefined && { website: updates.website }),
        ...(updates.address !== undefined && { address: updates.address }),
        ...(updates.country !== undefined && { country: updates.country }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.legalNameEnglish !== undefined && { legalNameEnglish: updates.legalNameEnglish }),
        ...(updates.legalNameArabic !== undefined && { legalNameArabic: updates.legalNameArabic }),
        ...(updates.tradeName !== undefined && { tradeName: updates.tradeName }),
        ...(updates.shortName !== undefined && { shortName: updates.shortName }),
        ...(updates.effectiveStartDate !== undefined && { effectiveStartDate: updates.effectiveStartDate }),
        ...(updates.effectiveEndDate !== undefined && { effectiveEndDate: updates.effectiveEndDate }),
        ...(updates.currency !== undefined && { currency: updates.currency }),
        ...(updates.timezone !== undefined && { timezone: updates.timezone }),
        ...(updates.language !== undefined && { language: updates.language }),
        updatedAt: new Date(),
      },
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

  // ─── Branch ────────────────────────────────────────────────────────────────

  async createBranch(input: Branch): Promise<Branch> {
    const row = await this.prisma.branch.create({
      data: {
        id: input.id,
        instituteId: input.instituteId,
        parentBranchId: input.parentBranchId,
        branchCode: input.branchCode,
        branchName: input.branchName,
        address: input.address,
        city: input.city,
        country: input.country,
        phone: input.phone,
        email: input.email,
        branchManagerId: input.branchManagerId,
        status: input.status,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: input.effectiveEndDate,
        contacts: input.contacts && input.contacts.length > 0 ? {
          create: input.contacts.map((c) => ({
            id: c.id,
            contactType: c.contactType,
            contactValue: c.contactValue,
            isPrimary: c.isPrimary,
          })),
        } : undefined,
        addresses: input.addresses && input.addresses.length > 0 ? {
          create: input.addresses.map((a) => ({
            id: a.id,
            building: a.building,
            street: a.street,
            city: a.city,
            governorate: a.governorate,
            country: a.country,
            postalCode: a.postalCode,
            latitude: a.latitude,
            longitude: a.longitude,
            mapUrl: a.mapUrl,
          })),
        } : undefined,
        settings: input.settings ? {
          create: {
            id: input.settings.id,
            currency: input.settings.currency,
            timezone: input.settings.timezone,
            weekStartDay: input.settings.weekStartDay,
            workingCalendar: input.settings.workingCalendar,
          },
        } : undefined,
        policies: input.policies && input.policies.length > 0 ? {
          create: input.policies.map((p) => ({
            id: p.id,
            policyType: p.policyType,
            policyContent: p.policyContent,
          })),
        } : undefined,
      },
    });
    return toBranch(row);
  }

  async findBranchById(id: string): Promise<Branch | null> {
    const row = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        contacts: { where: { isDeleted: false } },
        addresses: { where: { isDeleted: false } },
        settings: { where: { isDeleted: false } },
        policies: { where: { isDeleted: false } },
      },
    });
    return row && !row.isDeleted ? toBranch(row) : null;
  }

  async findBranchByCode(branchCode: string): Promise<Branch | null> {
    const row = await this.prisma.branch.findFirst({
      where: { branchCode, isDeleted: false },
      include: {
        contacts: { where: { isDeleted: false } },
        addresses: { where: { isDeleted: false } },
        settings: { where: { isDeleted: false } },
        policies: { where: { isDeleted: false } },
      },
    });
    return row ? toBranch(row) : null;
  }

  async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch> {
    const row = await this.prisma.$transaction(async (tx) => {
      if (updates.contacts !== undefined) {
        await tx.branchContact.deleteMany({ where: { branchId: id } });
        if (updates.contacts && updates.contacts.length > 0) {
          await tx.branchContact.createMany({
            data: updates.contacts.map((c) => ({
              id: c.id,
              branchId: id,
              contactType: c.contactType,
              contactValue: c.contactValue,
              isPrimary: c.isPrimary,
            })),
          });
        }
      }

      if (updates.addresses !== undefined) {
        await tx.branchAddress.deleteMany({ where: { branchId: id } });
        if (updates.addresses && updates.addresses.length > 0) {
          await tx.branchAddress.createMany({
            data: updates.addresses.map((a) => ({
              id: a.id,
              branchId: id,
              building: a.building,
              street: a.street,
              city: a.city,
              governorate: a.governorate,
              country: a.country,
              postalCode: a.postalCode,
              latitude: a.latitude,
              longitude: a.longitude,
              mapUrl: a.mapUrl,
            })),
          });
        }
      }

      if (updates.policies !== undefined) {
        await tx.branchPolicy.deleteMany({ where: { branchId: id } });
        if (updates.policies && updates.policies.length > 0) {
          await tx.branchPolicy.createMany({
            data: updates.policies.map((p) => ({
              id: p.id,
              branchId: id,
              policyType: p.policyType,
              policyContent: p.policyContent,
            })),
          });
        }
      }

      if (updates.settings !== undefined) {
        if (updates.settings) {
          await tx.branchSettings.upsert({
            where: { branchId: id },
            create: {
              id: updates.settings.id,
              branchId: id,
              currency: updates.settings.currency,
              timezone: updates.settings.timezone,
              weekStartDay: updates.settings.weekStartDay,
              workingCalendar: updates.settings.workingCalendar,
            },
            update: {
              currency: updates.settings.currency,
              timezone: updates.settings.timezone,
              weekStartDay: updates.settings.weekStartDay,
              workingCalendar: updates.settings.workingCalendar,
            },
          });
        } else {
          await tx.branchSettings.deleteMany({ where: { branchId: id } });
        }
      }

      const branch = await tx.branch.update({
        where: { id },
        data: {
          ...(updates.branchName !== undefined && { branchName: updates.branchName }),
          ...(updates.address !== undefined && { address: updates.address }),
          ...(updates.city !== undefined && { city: updates.city }),
          ...(updates.country !== undefined && { country: updates.country }),
          ...(updates.phone !== undefined && { phone: updates.phone }),
          ...(updates.email !== undefined && { email: updates.email }),
          ...(updates.branchManagerId !== undefined && { branchManagerId: updates.branchManagerId }),
          ...(updates.parentBranchId !== undefined && { parentBranchId: updates.parentBranchId }),
          ...(updates.status !== undefined && { status: updates.status }),
          ...(updates.effectiveStartDate !== undefined && { effectiveStartDate: updates.effectiveStartDate }),
          ...(updates.effectiveEndDate !== undefined && { effectiveEndDate: updates.effectiveEndDate }),
          updatedAt: new Date(),
        },
        include: {
          contacts: { where: { isDeleted: false } },
          addresses: { where: { isDeleted: false } },
          settings: { where: { isDeleted: false } },
          policies: { where: { isDeleted: false } },
        },
      });

      return branch;
    });
    return toBranch(row);
  }

  async listBranches(filters?: Omit<ListFilters, 'status'> & { status?: Branch['status']; instituteId?: string }): Promise<PaginatedResult<Branch>> {
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

  // ─── Department ────────────────────────────────────────────────────────────

  async createDepartment(input: Department): Promise<Department> {
    const row = await this.prisma.department.create({
      data: {
        id: input.id,
        branchId: input.branchId,
        departmentCode: input.departmentCode,
        departmentName: input.departmentName,
        departmentHeadId: input.departmentHeadId,
        description: input.description,
        status: input.status,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: input.effectiveEndDate,
      },
    });
    return toDepartment(row);
  }

  async findDepartmentById(id: string): Promise<Department | null> {
    const row = await this.prisma.department.findUnique({ where: { id } });
    return row && !row.isDeleted ? toDepartment(row) : null;
  }

  async findDepartmentByCode(branchId: string, departmentCode: string): Promise<Department | null> {
    const row = await this.prisma.department.findFirst({
      where: { branchId, departmentCode, isDeleted: false },
    });
    return row ? toDepartment(row) : null;
  }

  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department> {
    const row = await this.prisma.department.update({
      where: { id },
      data: {
        ...(updates.departmentName !== undefined && { departmentName: updates.departmentName }),
        ...(updates.departmentHeadId !== undefined && { departmentHeadId: updates.departmentHeadId }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.effectiveStartDate !== undefined && { effectiveStartDate: updates.effectiveStartDate }),
        ...(updates.effectiveEndDate !== undefined && { effectiveEndDate: updates.effectiveEndDate }),
        updatedAt: new Date(),
      },
    });
    return toDepartment(row);
  }

  async listDepartments(branchId: string, filters?: { status?: RecordStatus }): Promise<Department[]> {
    const rows = await this.prisma.department.findMany({
      where: {
        branchId,
        isDeleted: false,
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { departmentName: 'asc' },
    });
    return rows.map(toDepartment);
  }

  // ─── Classroom ─────────────────────────────────────────────────────────────

  async createClassroom(input: Classroom): Promise<Classroom> {
    const row = await this.prisma.classroom.create({
      data: {
        id: input.id,
        branchId: input.branchId,
        classroomName: input.classroomName,
        capacity: input.capacity,
        location: input.location,
        status: input.status,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: input.effectiveEndDate,
      },
    });
    return toClassroom(row);
  }

  async findClassroomById(id: string): Promise<Classroom | null> {
    const row = await this.prisma.classroom.findUnique({ where: { id } });
    return row && !row.isDeleted ? toClassroom(row) : null;
  }

  async findClassroomByName(branchId: string, classroomName: string): Promise<Classroom | null> {
    const row = await this.prisma.classroom.findFirst({
      where: { branchId, classroomName, isDeleted: false },
    });
    return row ? toClassroom(row) : null;
  }

  async updateClassroom(id: string, updates: Partial<Classroom>): Promise<Classroom> {
    const row = await this.prisma.classroom.update({
      where: { id },
      data: {
        ...(updates.classroomName !== undefined && { classroomName: updates.classroomName }),
        ...(updates.capacity !== undefined && { capacity: updates.capacity }),
        ...(updates.location !== undefined && { location: updates.location }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.effectiveStartDate !== undefined && { effectiveStartDate: updates.effectiveStartDate }),
        ...(updates.effectiveEndDate !== undefined && { effectiveEndDate: updates.effectiveEndDate }),
        updatedAt: new Date(),
      },
    });
    return toClassroom(row);
  }

  async listClassrooms(filters?: ListFilters & { branchId?: string }): Promise<PaginatedResult<Classroom>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? PAGE_SIZE;
    const where = {
      isDeleted: false,
      ...(filters?.branchId ? { branchId: filters.branchId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search ? {
        classroomName: { contains: filters.search, mode: 'insensitive' as const },
      } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.classroom.count({ where }),
      this.prisma.classroom.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { classroomName: 'asc' } }),
    ]);

    return { items: rows.map(toClassroom), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── Hierarchy Tree ────────────────────────────────────────────────────────

  async getOrganizationHierarchy(instituteId: string): Promise<OrganizationHierarchyNode> {
    const inst = await this.prisma.institute.findFirst({
      where: { id: instituteId, isDeleted: false },
      include: {
        branches: {
          where: { isDeleted: false },
          include: {
            departments: { where: { isDeleted: false } },
            classrooms: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!inst) {
      throw new DomainError('not_found', `Institute ${instituteId} not found for hierarchy.`);
    }

    const branchNodes: OrganizationHierarchyNode[] = inst.branches.map((b) => {
      const children: OrganizationHierarchyNode[] = [
        ...b.departments.map((d) => ({
          id: d.id,
          name: d.departmentName,
          type: 'Department' as const,
          code: d.departmentCode,
          status: d.status as Department['status'],
        })),
        ...b.classrooms.map((c) => ({
          id: c.id,
          name: c.classroomName,
          type: 'Classroom' as const,
          status: c.status as Classroom['status'],
        })),
      ];

      return {
        id: b.id,
        name: b.branchName,
        type: 'Branch' as const,
        code: b.branchCode,
        status: b.status as Branch['status'],
        children,
      };
    });

    return {
      id: inst.id,
      name: inst.instituteName,
      type: 'Institute' as const,
      code: inst.instituteCode,
      status: inst.status as Institute['status'],
      children: branchNodes,
    };
  }
}

