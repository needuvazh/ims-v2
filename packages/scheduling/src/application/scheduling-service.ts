import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createUuid } from '@ims/shared-kernel';
import type { ISchedulingRepository } from '../domain/repositories';
import {
  CalendarDateRangeError,
  CalendarNotFoundError,
  CalendarOverlapError,
  CalendarScopeError,
  CalendarTimezoneImmutableError,
} from '../domain/errors';
import {
  createBusinessCalendarSchema,
  createBranchOverrideSchema,
  createHolidaySchema,
  updateBranchOverrideSchema,
  updateBusinessCalendarSchema as updateCalendarSchema,
  type CreateBusinessCalendarCommand,
  type UpdateBusinessCalendarCommand,
  type CreateBranchOverrideCommand,
  type UpdateBranchOverrideCommand,
  type CreateHolidayCommand,
  type BusinessCalendar,
  type ResolvedCalendar,
  type CalendarStatus,
  type DayOfWeek,
} from '../domain/scheduling';

export interface SchedulingCommandContext {
  actorId?: string | null;
  branchId?: string | null;
  instituteId?: string | null;
  reason?: string | null;
}

function normalizeDays(input: { dayOfWeek: string; isOpen: boolean; workingHours: { startTime: string; endTime: string }[] }[]) {
  return input.map((day) => ({
    id: createUuid(randomUUID()),
    dayOfWeek: day.dayOfWeek as DayOfWeek,
    isOpen: day.isOpen,
    workingHours: day.workingHours.map((window) => ({
      id: createUuid(randomUUID()),
      startTime: window.startTime,
      endTime: window.endTime,
    })),
  }));
}

function ensureChronologicalRange(startDate: Date, endDate: Date | null | undefined) {
  if (endDate && endDate < startDate) {
    throw new CalendarDateRangeError();
  }
}

function toJsonLocalized(nameLocalized: { en: string; ar: string }) {
  return { en: nameLocalized.en, ar: nameLocalized.ar } as const;
}

async function writeAudit(prisma: PrismaClient, payload: {
  actorId?: string | null;
  reason?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  branchId?: string | null;
  newValue: unknown;
}) {
  if (!payload.actorId) return;
  await prisma.auditLog.create({
    data: {
      id: createUuid(randomUUID()),
      module: 'Scheduling',
      performedBy: payload.actorId,
      performedAt: new Date(),
      entityType: payload.entityType,
      entityId: payload.entityId,
      action: payload.action,
      newValue: payload.newValue as Prisma.InputJsonValue,
      branchId: payload.branchId ?? null,
      reason: payload.reason ?? null,
    },
  });
}

export class SchedulingService {
  constructor(private readonly prisma: PrismaClient, private readonly repository: ISchedulingRepository) {}

  async listCalendars(filters: { instituteId?: string; branchId?: string; year?: number; status?: CalendarStatus; q?: string }) {
    return this.repository.listBusinessCalendars(filters);
  }

  async getCalendar(id: string): Promise<BusinessCalendar> {
    const calendar = await this.repository.findBusinessCalendarById(id);
    if (!calendar) throw new CalendarNotFoundError();
    return calendar;
  }

  async createBusinessCalendar(input: CreateBusinessCalendarCommand, context: SchedulingCommandContext = {}) {
    const parsed = createBusinessCalendarSchema.parse(input);
    ensureChronologicalRange(parsed.effectiveStartDate, parsed.effectiveEndDate);

    const overlapping = await this.repository.findOverlappingBusinessCalendars(
      parsed.instituteId,
      parsed.effectiveStartDate,
      parsed.effectiveEndDate ?? null,
    );
    if (overlapping.length > 0) {
      throw new CalendarOverlapError();
    }

    const execute = async (tx: Prisma.TransactionClient) => {
      const created = await this.repository.createBusinessCalendar(
        {
          id: createUuid(randomUUID()),
          instituteId: parsed.instituteId,
          code: parsed.code,
          name: parsed.name,
          nameLocalized: toJsonLocalized(parsed.nameLocalized),
          year: parsed.year,
          countryCode: parsed.countryCode,
          timezone: 'Asia/Muscat',
          effectiveStartDate: parsed.effectiveStartDate,
          effectiveEndDate: parsed.effectiveEndDate ?? null,
          status: parsed.status,
          isActive: parsed.status === 'Active',
          version: 1,
          createdBy: context.actorId ?? null,
          isDeleted: false,
          operatingDays: {
            create: normalizeDays(parsed.operatingDays).map((day) => ({
              id: day.id,
              dayOfWeek: day.dayOfWeek,
              isOpen: day.isOpen,
              workingHours: {
                create: day.workingHours.map((wh) => ({ id: wh.id, startTime: wh.startTime, endTime: wh.endTime })),
              },
            })),
          },
        } as Prisma.BusinessCalendarUncheckedCreateInput,
        tx,
      );

      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'Scheduling',
          performedBy: context.actorId ?? null,
          performedAt: new Date(),
          entityType: 'BusinessCalendar',
          entityId: created.id,
          action: 'Create',
          newValue: created,
          branchId: null,
          reason: context.reason ?? null,
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'BusinessCalendarCreated',
          aggregateType: 'BusinessCalendar',
          aggregateId: created.id,
          payload: { businessCalendarId: created.id, instituteId: parsed.instituteId, code: parsed.code },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      return created;
    };

    return this.prisma.$transaction(execute);
  }

  async updateBusinessCalendar(id: string, input: UpdateBusinessCalendarCommand, version: number, context: SchedulingCommandContext = {}) {
    const parsed = updateCalendarSchema.parse(input);
    const existing = await this.repository.findBusinessCalendarById(id);
    if (!existing) throw new CalendarNotFoundError();
    if (parsed.timezone && parsed.timezone !== 'Asia/Muscat') throw new CalendarTimezoneImmutableError();

    const nextStart = parsed.effectiveStartDate ?? existing.effectiveStartDate;
    const nextEnd = parsed.effectiveEndDate === undefined ? existing.effectiveEndDate : parsed.effectiveEndDate;
    ensureChronologicalRange(nextStart, nextEnd);

    const updated = await this.repository.updateBusinessCalendar(
      id,
      {
        ...(parsed.name ? { name: parsed.name } : {}),
        ...(parsed.nameLocalized ? { nameLocalized: toJsonLocalized(parsed.nameLocalized) } : {}),
        ...(parsed.year ? { year: parsed.year } : {}),
        ...(parsed.countryCode ? { countryCode: parsed.countryCode } : {}),
        ...(parsed.effectiveStartDate ? { effectiveStartDate: parsed.effectiveStartDate } : {}),
        ...(parsed.effectiveEndDate !== undefined ? { effectiveEndDate: parsed.effectiveEndDate } : {}),
        ...(parsed.status ? { status: parsed.status, isActive: parsed.status === 'Active' } : {}),
        ...(context.actorId ? { updatedBy: context.actorId } : {}),
      } as Prisma.BusinessCalendarUncheckedUpdateInput,
      version,
    );

    await writeAudit(this.prisma, {
      actorId: context.actorId,
      reason: context.reason,
      entityType: 'BusinessCalendar',
      entityId: id,
      action: 'Update',
      newValue: updated,
    });

    return updated;
  }

  async activateBusinessCalendar(id: string, version: number, context: SchedulingCommandContext = {}) {
    const updated = await this.repository.updateBusinessCalendar(id, { status: 'Active', isActive: true, updatedBy: context.actorId ?? null } as Prisma.BusinessCalendarUncheckedUpdateInput, version);
    await writeAudit(this.prisma, { actorId: context.actorId, reason: context.reason, entityType: 'BusinessCalendar', entityId: id, action: 'Activate', newValue: updated });
    return updated;
  }

  async closeBusinessCalendar(id: string, version: number, context: SchedulingCommandContext = {}) {
    const updated = await this.repository.updateBusinessCalendar(id, { status: 'Closed', isActive: false, updatedBy: context.actorId ?? null } as Prisma.BusinessCalendarUncheckedUpdateInput, version);
    await writeAudit(this.prisma, { actorId: context.actorId, reason: context.reason, entityType: 'BusinessCalendar', entityId: id, action: 'Close', newValue: updated });
    return updated;
  }

  async archiveBusinessCalendar(id: string, version: number, context: SchedulingCommandContext = {}) {
    const updated = await this.repository.updateBusinessCalendar(id, { status: 'Archived', isActive: false, updatedBy: context.actorId ?? null } as Prisma.BusinessCalendarUncheckedUpdateInput, version);
    await writeAudit(this.prisma, { actorId: context.actorId, reason: context.reason, entityType: 'BusinessCalendar', entityId: id, action: 'Archive', newValue: updated });
    return updated;
  }

  async createBranchOverride(input: CreateBranchOverrideCommand, context: SchedulingCommandContext = {}) {
    const parsed = createBranchOverrideSchema.parse(input);
    const calendar = await this.repository.findBusinessCalendarById(parsed.businessCalendarId);
    if (!calendar) throw new CalendarNotFoundError();
    if (context.branchId && context.branchId !== parsed.branchId) {
      throw new CalendarScopeError('The override branch does not match the active branch context.');
    }
    ensureChronologicalRange(parsed.effectiveStartDate, parsed.effectiveEndDate);

    const existing = await this.repository.findBranchOverrideByBranchAndYear(parsed.branchId, parsed.year);
    if (existing && !existing.isDeleted) {
      throw new CalendarOverlapError('A branch override already exists for this branch and year.');
    }

    const created = await this.repository.createBranchOverride({
      id: createUuid(randomUUID()),
      businessCalendarId: parsed.businessCalendarId,
      branchId: parsed.branchId,
      year: parsed.year,
      name: parsed.name ?? null,
      nameLocalized: parsed.nameLocalized ? toJsonLocalized(parsed.nameLocalized) : null,
      effectiveStartDate: parsed.effectiveStartDate,
      effectiveEndDate: parsed.effectiveEndDate ?? null,
      status: parsed.status,
      notes: parsed.notes ?? null,
      version: 1,
      isDeleted: false,
      createdBy: context.actorId ?? null,
      operatingDays: parsed.operatingDays.length > 0 ? {
        create: normalizeDays(parsed.operatingDays).map((day) => ({
          id: day.id,
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          workingHours: {
            create: day.workingHours.map((wh) => ({ id: wh.id, startTime: wh.startTime, endTime: wh.endTime })),
          },
        })),
      } : undefined,
    } as Prisma.BranchCalendarOverrideUncheckedCreateInput);

    await writeAudit(this.prisma, {
      actorId: context.actorId,
      reason: context.reason,
      entityType: 'BranchCalendarOverride',
      entityId: created.id,
      action: 'Create',
      branchId: parsed.branchId,
      newValue: created,
    });

    return created;
  }

  async updateBranchOverride(id: string, input: UpdateBranchOverrideCommand, version: number, context: SchedulingCommandContext = {}) {
    const parsed = updateBranchOverrideSchema.parse(input);
    const existing = await this.repository.findBranchOverrideById(id);
    if (!existing) throw new CalendarNotFoundError();
    const nextStart = parsed.effectiveStartDate ?? existing.effectiveStartDate;
    const nextEnd = parsed.effectiveEndDate === undefined ? existing.effectiveEndDate : parsed.effectiveEndDate;
    ensureChronologicalRange(nextStart, nextEnd);
    const updated = await this.repository.updateBranchOverride(
      id,
      {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.nameLocalized !== undefined ? { nameLocalized: parsed.nameLocalized ? toJsonLocalized(parsed.nameLocalized) : null } : {}),
        ...(parsed.effectiveStartDate ? { effectiveStartDate: parsed.effectiveStartDate } : {}),
        ...(parsed.effectiveEndDate !== undefined ? { effectiveEndDate: parsed.effectiveEndDate } : {}),
        ...(parsed.status ? { status: parsed.status } : {}),
        ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
        ...(context.actorId ? { updatedBy: context.actorId } : {}),
      } as Prisma.BranchCalendarOverrideUncheckedUpdateInput,
      version,
    );

    await writeAudit(this.prisma, {
      actorId: context.actorId,
      reason: context.reason,
      entityType: 'BranchCalendarOverride',
      entityId: id,
      action: 'Update',
      branchId: context.branchId,
      newValue: updated,
    });

    return updated;
  }

  async createHoliday(input: CreateHolidayCommand, context: SchedulingCommandContext = {}) {
    const parsed = createHolidaySchema.parse(input);
    const calendar = await this.repository.findBusinessCalendarById(parsed.businessCalendarId);
    if (!calendar) throw new CalendarNotFoundError();

    const created = await this.repository.createHoliday({
      id: createUuid(randomUUID()),
      businessCalendarId: parsed.businessCalendarId,
      branchCalendarOverrideId: parsed.branchCalendarOverrideId ?? null,
      branchId: parsed.branchId ?? null,
      date: parsed.date,
      name: parsed.name,
      nameLocalized: toJsonLocalized(parsed.nameLocalized),
      holidayType: parsed.holidayType,
      affectsScheduling: parsed.affectsScheduling,
      status: parsed.status,
      description: parsed.description ?? null,
      overridePolicy: parsed.overridePolicy,
      version: 1,
      isDeleted: false,
      createdBy: context.actorId ?? null,
    } as Prisma.HolidayUncheckedCreateInput);

    await writeAudit(this.prisma, {
      actorId: context.actorId,
      reason: context.reason,
      entityType: 'Holiday',
      entityId: created.id,
      action: 'Create',
      branchId: parsed.branchId ?? null,
      newValue: created,
    });

    return created;
  }

  async resolveCalendar(branchId: string, date: Date, instituteId: string): Promise<ResolvedCalendar> {
    return this.repository.resolveCalendar(branchId, date, instituteId);
  }
}
