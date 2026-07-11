/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma, PrismaClient } from '@prisma/client';
import type { ISchedulingRepository } from '../domain/repositories';
import type {
  BusinessCalendar,
  BranchCalendarOverride,
  CalendarOperatingDay,
  Holiday,
  ResolvedCalendar,
  CalendarStatus,
  VenueBlock,
} from '../domain/scheduling';

function mapOperatingDay(row: any): CalendarOperatingDay {
  return {
    id: row.id,
    businessCalendarId: row.businessCalendarId,
    branchCalendarOverrideId: row.branchCalendarOverrideId,
    dayOfWeek: row.dayOfWeek,
    isOpen: row.isOpen,
    workingHours: (row.workingHours ?? []).map((wh: any) => ({
      id: wh.id,
      operatingDayId: wh.operatingDayId,
      startTime: wh.startTime,
      endTime: wh.endTime,
    })),
  };
}

function mapBusinessCalendar(row: any): BusinessCalendar {
  return {
    id: row.id,
    instituteId: row.instituteId,
    code: row.code,
    name: row.name,
    nameLocalized: row.nameLocalized ?? { en: row.name, ar: row.name },
    year: row.year,
    countryCode: row.countryCode,
    timezone: row.timezone,
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    status: row.status,
    isActive: row.isActive,
    version: row.version,
    operatingDays: (row.operatingDays ?? []).map(mapOperatingDay),
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
    isDeleted: row.isDeleted,
  };
}

function mapBranchOverride(row: any): BranchCalendarOverride {
  return {
    id: row.id,
    businessCalendarId: row.businessCalendarId,
    branchId: row.branchId,
    year: row.year,
    name: row.name,
    nameLocalized: row.nameLocalized,
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    status: row.status,
    notes: row.notes,
    version: row.version,
    operatingDays: (row.operatingDays ?? []).map(mapOperatingDay),
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
    isDeleted: row.isDeleted,
  };
}

function mapHoliday(row: any): Holiday {
  return {
    id: row.id,
    businessCalendarId: row.businessCalendarId,
    branchCalendarOverrideId: row.branchCalendarOverrideId,
    branchId: row.branchId,
    date: row.date,
    name: row.name,
    nameLocalized: row.nameLocalized,
    holidayType: row.holidayType,
    affectsScheduling: row.affectsScheduling,
    status: row.status,
    description: row.description,
    overridePolicy: row.overridePolicy,
    version: row.version,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
    isDeleted: row.isDeleted,
  };
}

function mapVenueBlock(row: any): VenueBlock {
  return {
    id: row.id,
    branchId: row.branchId,
    classroomId: row.classroomId,
    blockStartDate: row.blockStartDate,
    blockEndDate: row.blockEndDate,
    startTime: row.startTime,
    endTime: row.endTime,
    isFullDay: row.isFullDay,
    reasonCode: row.reasonCode,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
    isDeleted: row.isDeleted,
  };
}

function buildSystemDefaultOperatingDays(): CalendarOperatingDay[] {
  const dayOrder: Array<CalendarOperatingDay['dayOfWeek']> = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  return dayOrder.map((dayOfWeek, index) => ({
    id: `system-default-${dayOfWeek.toLowerCase()}-${index}` as any,
    businessCalendarId: null,
    branchCalendarOverrideId: null,
    dayOfWeek,
    isOpen: true,
    workingHours: [
      {
        id: `system-default-wh-${dayOfWeek.toLowerCase()}-${index}` as any,
        operatingDayId: `system-default-${dayOfWeek.toLowerCase()}-${index}` as any,
        startTime: '00:00',
        endTime: '23:59',
      },
    ],
  }));
}

export class PrismaSchedulingRepository implements ISchedulingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async findBusinessCalendarById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessCalendar | null> {
    const row = await this.client(tx).businessCalendar.findUnique({
      where: { id },
      include: { operatingDays: { include: { workingHours: true } } },
    });
    return row && !row.isDeleted ? mapBusinessCalendar(row) : null;
  }

  async findActiveBusinessCalendarByInstitute(
    instituteId: string,
    date: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessCalendar | null> {
    const row = await this.client(tx).businessCalendar.findFirst({
      where: {
        instituteId,
        status: 'Active',
        isDeleted: false,
        effectiveStartDate: { lte: date },
        OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: date } }],
      },
      include: { operatingDays: { include: { workingHours: true } } },
      orderBy: { effectiveStartDate: 'desc' },
    });
    return row ? mapBusinessCalendar(row) : null;
  }

  async findOverlappingBusinessCalendars(
    instituteId: string,
    startDate: Date,
    endDate: Date | null,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessCalendar[]> {
    const client = this.client(tx);
    const rows = await client.businessCalendar.findMany({
      where: {
        instituteId,
        isDeleted: false,
        OR: [
          {
            effectiveEndDate: null,
            effectiveStartDate: { lte: endDate ?? startDate },
          },
          {
            effectiveStartDate: { lte: endDate ?? startDate },
            effectiveEndDate: { gte: startDate },
          },
        ],
      },
      include: { operatingDays: { include: { workingHours: true } } },
    });
    return rows.map(mapBusinessCalendar);
  }

  async findBusinessCalendarByCode(
    instituteId: string,
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessCalendar | null> {
    const row = await this.client(tx).businessCalendar.findFirst({
      where: { instituteId, code, isDeleted: false },
      include: { operatingDays: { include: { workingHours: true } } },
    });
    return row ? mapBusinessCalendar(row) : null;
  }

  async createBusinessCalendar(
    data: Prisma.BusinessCalendarUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessCalendar> {
    const client = this.client(tx);
    const operatingDays = (data as any).operatingDays?.create ?? [];

    const row = await client.businessCalendar.create({
      data: {
        id: data.id,
        instituteId: data.instituteId,
        code: data.code,
        name: data.name,
        nameLocalized: data.nameLocalized as Prisma.InputJsonValue,
        year: data.year,
        countryCode: data.countryCode,
        timezone: data.timezone,
        effectiveStartDate: data.effectiveStartDate,
        effectiveEndDate: data.effectiveEndDate ?? null,
        status: data.status as any,
        isActive: Boolean(data.isActive),
        version: data.version ?? 1,
        createdBy: data.createdBy ?? null,
        isDeleted: data.isDeleted ?? false,
      },
    });

    for (const day of operatingDays) {
      const dayRow = await client.calendarOperatingDay.create({
        data: {
          id: day.id,
          businessCalendarId: row.id,
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          createdBy: data.createdBy ?? null,
          isDeleted: false,
        },
      });
      const hours = day.workingHours?.create ?? [];
      if (hours.length > 0) {
        await client.calendarWorkingHour.createMany({
          data: hours.map((wh: any) => ({
            id: wh.id,
            operatingDayId: dayRow.id,
            startTime: wh.startTime,
            endTime: wh.endTime,
            createdBy: data.createdBy ?? null,
            isDeleted: false,
          })),
        });
      }
    }

    const hydrated = await client.businessCalendar.findUnique({
      where: { id: row.id },
      include: { operatingDays: { include: { workingHours: true } } },
    });
    if (!hydrated) throw new Error('ERR_SCH_CALENDAR_NOT_FOUND');
    return mapBusinessCalendar(hydrated);
  }

  async updateBusinessCalendar(
    id: string,
    data: Prisma.BusinessCalendarUncheckedUpdateInput,
    version: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessCalendar> {
    const client = this.client(tx);
    const result = await client.businessCalendar.updateMany({
      where: { id, version, isDeleted: false },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) throw new Error('ERR_SCH_CONCURRENCY_VIOLATION');
    const row = await client.businessCalendar.findUnique({
      where: { id },
      include: { operatingDays: { include: { workingHours: true } } },
    });
    if (!row) throw new Error('ERR_SCH_CALENDAR_NOT_FOUND');
    return mapBusinessCalendar(row);
  }

  async listBusinessCalendars(
    filters: {
      instituteId?: string;
      branchId?: string;
      year?: number;
      status?: CalendarStatus;
      q?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessCalendar[]> {
    const rows = await this.client(tx).businessCalendar.findMany({
      where: {
        isDeleted: false,
        ...(filters.instituteId ? { instituteId: filters.instituteId } : {}),
        ...(filters.year ? { year: filters.year } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.q
          ? {
              OR: [
                { code: { contains: filters.q, mode: 'insensitive' } },
                { name: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { operatingDays: { include: { workingHours: true } } },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(mapBusinessCalendar);
  }

  async findBranchOverrideById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BranchCalendarOverride | null> {
    const row = await this.client(tx).branchCalendarOverride.findUnique({
      where: { id },
      include: { operatingDays: { include: { workingHours: true } } },
    });
    return row && !row.isDeleted ? mapBranchOverride(row) : null;
  }

  async findBranchOverrideByBranchAndYear(
    branchId: string,
    year: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BranchCalendarOverride | null> {
    const row = await this.client(tx).branchCalendarOverride.findFirst({
      where: { branchId, year, isDeleted: false },
      include: { operatingDays: { include: { workingHours: true } } },
    });
    return row ? mapBranchOverride(row) : null;
  }

  async createBranchOverride(
    data: Prisma.BranchCalendarOverrideUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BranchCalendarOverride> {
    const client = this.client(tx);
    const operatingDays = (data as any).operatingDays?.create ?? [];

    const row = await client.branchCalendarOverride.create({
      data: {
        id: data.id,
        businessCalendarId: data.businessCalendarId,
        branchId: data.branchId,
        year: data.year,
        name: data.name ?? null,
        nameLocalized:
          data.nameLocalized === null
            ? Prisma.JsonNull
            : (data.nameLocalized as Prisma.InputJsonValue),
        effectiveStartDate: data.effectiveStartDate,
        effectiveEndDate: data.effectiveEndDate ?? null,
        status: data.status as any,
        notes: data.notes ?? null,
        version: data.version ?? 1,
        isDeleted: data.isDeleted ?? false,
        createdBy: data.createdBy ?? null,
      },
    });

    for (const day of operatingDays) {
      const dayRow = await client.calendarOperatingDay.create({
        data: {
          id: day.id,
          branchCalendarOverrideId: row.id,
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          createdBy: data.createdBy ?? null,
          isDeleted: false,
        },
      });
      const hours = day.workingHours?.create ?? [];
      if (hours.length > 0) {
        await client.calendarWorkingHour.createMany({
          data: hours.map((wh: any) => ({
            id: wh.id,
            operatingDayId: dayRow.id,
            startTime: wh.startTime,
            endTime: wh.endTime,
            createdBy: data.createdBy ?? null,
            isDeleted: false,
          })),
        });
      }
    }

    const hydrated = await client.branchCalendarOverride.findUnique({
      where: { id: row.id },
      include: { operatingDays: { include: { workingHours: true } } },
    });
    if (!hydrated) throw new Error('ERR_SCH_OVERRIDE_NOT_FOUND');
    return mapBranchOverride(hydrated);
  }

  async updateBranchOverride(
    id: string,
    data: Prisma.BranchCalendarOverrideUncheckedUpdateInput,
    version: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BranchCalendarOverride> {
    const client = this.client(tx);
    const result = await client.branchCalendarOverride.updateMany({
      where: { id, version, isDeleted: false },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) throw new Error('ERR_SCH_CONCURRENCY_VIOLATION');
    const row = await client.branchCalendarOverride.findUnique({
      where: { id },
      include: { operatingDays: { include: { workingHours: true } } },
    });
    if (!row) throw new Error('ERR_SCH_OVERRIDE_NOT_FOUND');
    return mapBranchOverride(row);
  }

  async createHoliday(
    data: Prisma.HolidayUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Holiday> {
    const row = await this.client(tx).holiday.create({ data });
    return mapHoliday(row);
  }

  async updateHoliday(
    id: string,
    data: Prisma.HolidayUncheckedUpdateInput,
    version: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Holiday> {
    const client = this.client(tx);
    const result = await client.holiday.updateMany({
      where: { id, version, isDeleted: false },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0)
      throw new Error('ERR_SCH_HOLIDAY_CONCURRENCY_VIOLATION');
    const row = await client.holiday.findUnique({ where: { id } });
    if (!row) throw new Error('ERR_SCH_HOLIDAY_NOT_FOUND');
    return mapHoliday(row);
  }

  async findHolidayById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Holiday | null> {
    const row = await this.client(tx).holiday.findUnique({ where: { id } });
    return row && !row.isDeleted ? mapHoliday(row) : null;
  }

  async listHolidays(
    filters: {
      businessCalendarId?: string;
      branchId?: string | null;
      branchCalendarOverrideId?: string | null;
      date?: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Holiday[]> {
    const rows = await this.client(tx).holiday.findMany({
      where: {
        isDeleted: false,
        ...(filters.businessCalendarId
          ? { businessCalendarId: filters.businessCalendarId }
          : {}),
        ...(filters.branchId !== undefined
          ? { branchId: filters.branchId }
          : {}),
        ...(filters.branchCalendarOverrideId !== undefined
          ? { branchCalendarOverrideId: filters.branchCalendarOverrideId }
          : {}),
        ...(filters.date ? { date: filters.date } : {}),
      },
    });
    return rows.map(mapHoliday);
  }

  async createVenueBlock(
    data: Prisma.VenueBlockUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<VenueBlock> {
    const row = await this.client(tx).venueBlock.create({ data });
    return mapVenueBlock(row);
  }

  async updateVenueBlock(
    id: string,
    data: Prisma.VenueBlockUncheckedUpdateInput,
    version: number,
    tx?: Prisma.TransactionClient,
  ): Promise<VenueBlock> {
    const client = this.client(tx);
    const result = await client.venueBlock.updateMany({
      where: { id, version, isDeleted: false },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) throw new Error('ERR_SCH_CONCURRENCY_VIOLATION');
    const row = await client.venueBlock.findUnique({ where: { id } });
    if (!row) throw new Error('ERR_SCH_VENUE_BLOCK_NOT_FOUND');
    return mapVenueBlock(row);
  }

  async findVenueBlockById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VenueBlock | null> {
    const row = await this.client(tx).venueBlock.findUnique({ where: { id } });
    return row && !row.isDeleted ? mapVenueBlock(row) : null;
  }

  async listVenueBlocks(
    filters: {
      branchId?: string;
      classroomId?: string | null;
      date?: Date;
      status?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<VenueBlock[]> {
    const rows = await this.client(tx).venueBlock.findMany({
      where: {
        isDeleted: false,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.classroomId !== undefined
          ? { classroomId: filters.classroomId }
          : {}),
        ...(filters.date
          ? {
              blockStartDate: { lte: filters.date },
              blockEndDate: { gte: filters.date },
            }
          : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: [{ blockStartDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(mapVenueBlock);
  }

  async resolveCalendar(
    branchId: string,
    date: Date,
    instituteId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ResolvedCalendar> {
    const businessCalendar = await this.findActiveBusinessCalendarByInstitute(
      instituteId,
      date,
      tx,
    );
    if (!businessCalendar) {
      const fallbackOperatingDays = buildSystemDefaultOperatingDays();
      return {
        businessCalendar: {
          id: '' as any,
          instituteId: instituteId as any,
          code: 'SYSTEM',
          name: 'System Default',
          nameLocalized: {
            en: 'System Default',
            ar: 'الإعداد الافتراضي للنظام',
          },
          year: date.getUTCFullYear(),
          countryCode: 'OM',
          timezone: 'Asia/Muscat',
          effectiveStartDate: new Date(date),
          effectiveEndDate: null,
          status: 'Active',
          isActive: true,
          version: 1,
          operatingDays: fallbackOperatingDays,
          createdAt: new Date(0),
          createdBy: null,
          updatedAt: null,
          updatedBy: null,
          deletedAt: null,
          deletedBy: null,
          isDeleted: false,
        },
        branchOverride: null,
        holidays: [],
        resolvedOperatingDays: fallbackOperatingDays,
        source: 'system-default',
      };
    }
    const branchOverride = await this.findBranchOverrideByBranchAndYear(
      branchId,
      date.getUTCFullYear(),
      tx,
    );
    const holidays = await this.listHolidays(
      {
        businessCalendarId: businessCalendar.id,
        branchId,
        branchCalendarOverrideId: branchOverride?.id ?? null,
        date,
      },
      tx,
    );
    const resolvedOperatingDays = branchOverride?.operatingDays.length
      ? (() => {
          const merged = new Map(
            businessCalendar.operatingDays.map((day) => [day.dayOfWeek, day]),
          );
          for (const day of branchOverride.operatingDays)
            merged.set(day.dayOfWeek, day);
          return Array.from(merged.values());
        })()
      : businessCalendar.operatingDays;
    return {
      businessCalendar,
      branchOverride,
      holidays,
      resolvedOperatingDays,
      source: branchOverride ? 'branch-override' : 'institute-calendar',
    };
  }
}
