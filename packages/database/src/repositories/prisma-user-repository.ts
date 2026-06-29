import type { PrismaClient } from '@prisma/client';
import type { IUserRepository, User, Person, UserListFilters, UserType, UserStatus } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async ensureEmailAvailable(email: string, excludeUserId?: Uuid): Promise<void> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error('Email already exists.');
    }
  }

  private mapUser(row: any): User {
    return {
      id: row.id as Uuid,
      personId: row.personId as Uuid,
      username: row.username,
      email: row.email,
      userType: row.userType as UserType,
      status: row.status as UserStatus,
      defaultBranchId: row.defaultBranchId as Uuid | null,
      preferredLanguage: row.preferredLanguage,
      failedLoginCount: row.failedLoginCount,
      lockedUntil: row.lockedUntil,
      passwordChangedAt: row.passwordChangedAt,
      version: row.version,
      effectiveStartDate: row.effectiveStartDate,
      effectiveEndDate: row.effectiveEndDate,
      isDeleted: row.isDeleted,
    };
  }

  private mapPerson(row: any): Person {
    return {
      id: row.id as Uuid,
      firstName: row.firstName,
      lastName: row.lastName,
      mobile: row.mobile,
      nationalId: row.nationalId,
      nationality: row.nationality,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      isDeleted: row.isDeleted,
    };
  }

  async findById(id: Uuid): Promise<User | null> {
    const row = await this.prisma.user.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? this.mapUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
    return row ? this.mapUser(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({
      where: { username, isDeleted: false },
    });
    return row ? this.mapUser(row) : null;
  }

  async findPersonById(id: Uuid): Promise<Person | null> {
    const row = await this.prisma.person.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? this.mapPerson(row) : null;
  }

  async findPersonByMobile(mobile: string): Promise<Person | null> {
    const row = await this.prisma.person.findFirst({
      where: { mobile, isDeleted: false },
    });
    return row ? this.mapPerson(row) : null;
  }

  async create(user: User, person: Person): Promise<User> {
    await this.ensureEmailAvailable(user.email);

    return this.prisma.$transaction(async (tx) => {
      await tx.person.create({
        data: {
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            mobile: person.mobile,
            nationalId: person.nationalId,
            nationality: person.nationality,
            dateOfBirth: person.dateOfBirth,
          gender: person.gender,
          createdBy: person.createdBy,
          updatedBy: person.updatedBy,
          deletedAt: person.deletedAt,
          deletedBy: person.deletedBy,
          isDeleted: person.isDeleted ?? false,
        },
      });

      const row = await tx.user.create({
        data: {
          id: user.id,
          personId: user.personId,
          username: user.username,
          email: user.email,
          userType: user.userType,
          status: user.status,
          defaultBranchId: user.defaultBranchId,
          preferredLanguage: user.preferredLanguage,
          failedLoginCount: user.failedLoginCount,
          lockedUntil: user.lockedUntil,
          passwordChangedAt: user.passwordChangedAt,
          version: user.version,
          effectiveStartDate: user.effectiveStartDate,
          effectiveEndDate: user.effectiveEndDate,
          passwordHash: '', // Set by application layer later
        },
      });

      return this.mapUser(row);
    });
  }

  async update(user: User, person?: Person): Promise<User> {
    await this.ensureEmailAvailable(user.email, user.id);

    return this.prisma.$transaction(async (tx) => {
      if (person) {
        await tx.person.update({
          where: { id: person.id },
          data: {
            firstName: person.firstName,
            lastName: person.lastName,
            mobile: person.mobile,
            nationalId: person.nationalId,
            nationality: person.nationality,
            dateOfBirth: person.dateOfBirth,
            gender: person.gender,
            updatedBy: person.updatedBy,
            deletedAt: person.deletedAt,
            deletedBy: person.deletedBy,
            isDeleted: person.isDeleted ?? false,
          },
        });
      }

      const row = await tx.user.update({
        where: { id: user.id },
        data: {
          username: user.username,
          email: user.email,
          userType: user.userType,
          status: user.status,
          defaultBranchId: user.defaultBranchId,
          preferredLanguage: user.preferredLanguage,
          failedLoginCount: user.failedLoginCount,
          lockedUntil: user.lockedUntil,
          passwordChangedAt: user.passwordChangedAt,
          version: { increment: 1 },
          effectiveStartDate: user.effectiveStartDate,
          effectiveEndDate: user.effectiveEndDate,
          isDeleted: user.isDeleted,
        },
      });

      return this.mapUser(row);
    });
  }

  async archive(userId: Uuid, actorId?: Uuid): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'Archived',
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: actorId ?? null,
      },
    });
  }

  async search(
    filters: UserListFilters,
    page: number,
    pageSize: number
  ): Promise<{ items: User[]; total: number }> {
    const where: any = { isDeleted: false };
    
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.userType) {
      where.userType = filters.userType;
    }
    if (filters.branchId) {
      where.branchAccess = {
        some: {
          branchId: filters.branchId,
          status: 'Active',
        },
      };
    }
    if (filters.roleId) {
      where.roles = {
        some: {
          roleId: filters.roleId,
          status: 'Active',
        },
      };
    }
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        {
          person: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { mobile: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.mapUser(r)),
      total,
    };
  }

  async getPasswordHash(userId: Uuid): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return row ? row.passwordHash : null;
  }

  async updatePassword(userId: Uuid, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
  }

  async createResetToken(data: { id: Uuid; userId: Uuid; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        id: data.id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findResetTokenByHash(tokenHash: string): Promise<{ userId: Uuid; expiresAt: Date; usedAt: Date | null } | null> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    return row ? {
      userId: row.userId as Uuid,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
    } : null;
  }

  async markResetTokenAsUsed(tokenHash: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
  }
}
